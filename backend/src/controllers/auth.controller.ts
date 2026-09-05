import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { env } from '../config/env';
import { UnauthorizedError, ValidationError } from '../utils/errors';

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { success, token, user }
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            jobPosition: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Checked after the password so a wrong password and a suspended account
    // are indistinguishable to someone probing for valid addresses.
    if (!user.isActive) {
      throw new UnauthorizedError('This account has been deactivated. Contact an administrator.');
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      env.JWT_SECRET,
      { expiresIn: '7d' as any }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        employeeId: user.employeeId,
        employee: user.employee,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 * Requires: authenticate middleware
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employeeId: true,
        employee: {
          select: {
            id: true,
            employeeCode: true,
            name: true,
            email: true,
            phone: true,
            jobPosition: true,
            employeeType: true,
            status: true,
            department: { select: { id: true, name: true } },
            manager: { select: { id: true, name: true } },
            workingSchedule: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Clears the auth cookie
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
}
