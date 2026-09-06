import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import prisma from '../config/db';
import { UnauthorizedError } from '../utils/errors';
import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  employeeId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

/**
 * Short-lived cache of the authenticated user.
 *
 * The token only carries `userId`, so the role and employeeId that authorisation
 * depends on have to come from the database. Doing that on every request cost a
 * full round-trip to a remote database before any handler ran, which dominated
 * the response time of otherwise trivial endpoints.
 *
 * The database stays the source of truth; entries simply expire quickly. The TTL
 * is deliberately short because it bounds how long a role change takes to apply:
 * revoke someone's access and it takes effect within TTL_MS, not on their next
 * login. Use `invalidateUserCache` to drop an entry immediately.
 */
const TTL_MS = 15_000;
const userCache = new Map<string, { user: AuthUser; expiresAt: number }>();

export function invalidateUserCache(userId?: string): void {
  if (userId) userCache.delete(userId);
  else userCache.clear();
}

/** Exported so the socket handshake identifies a connection the same way. */
export async function loadUser(userId: string): Promise<AuthUser | null> {
  const now = Date.now();

  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      employeeId: true,
      isActive: true,
    },
  });

  // A suspended account must lose access immediately, not when its token
  // expires. Treated as absent so an already-issued token stops working.
  if (user && !user.isActive) {
    userCache.delete(userId);
    return null;
  }

  if (!user) {
    // Negative results are not cached, so a deleted user cannot be resurrected
    // by a stale entry and a restored one is picked up immediately.
    userCache.delete(userId);
    return null;
  }

  const { isActive: _isActive, ...authUser } = user;
  userCache.set(userId, { user: authUser, expiresAt: now + TTL_MS });

  // Opportunistic sweep so the map cannot grow without bound.
  if (userCache.size > 500) {
    for (const [key, entry] of userCache) {
      if (entry.expiresAt <= now) userCache.delete(key);
    }
  }

  return authUser;
}

/**
 * JWT authentication middleware.
 * Extracts token from Authorization header (Bearer <token>) or cookie.
 * Loads user from DB and attaches to req.user.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required. Please provide a valid token.');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await loadUser(decoded.userId);

    if (!user) {
      throw new UnauthorizedError('User not found. Token may be invalid.');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      next(err);
    } else if ((err as any).name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid token'));
    } else if ((err as any).name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token has expired'));
    } else {
      next(err);
    }
  }
}
