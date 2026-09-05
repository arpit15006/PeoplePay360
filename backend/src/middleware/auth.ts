import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  employeeId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Verifies the session JWT from the httpOnly `token` cookie, falling back to an
 * `Authorization: Bearer` header. Attaches the decoded payload to `req.user`.
 */
export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. No token provided.' });
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session token.' });
  }
};
