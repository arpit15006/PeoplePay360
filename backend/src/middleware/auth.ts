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

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employeeId: true,
      },
    });

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
