import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

/**
 * Role hierarchy from lowest to highest privilege.
 * Each higher role implicitly has all lower-role permissions.
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  EMPLOYEE: 0,
  HR_MANAGER: 1,
  HR_PAYROLL_USER: 2,
  HR_PAYROLL_MANAGER: 3,
  ADMIN: 4,
};

/**
 * Authorization middleware factory.
 * Checks if the authenticated user's role is in the allowed roles list.
 *
 * Usage: authorize('HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN')
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Role '${req.user.role}' does not have permission for this action. Required: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}

/**
 * Check if the user has at least the given minimum role level.
 * Useful for checking "HR Manager or higher" etc.
 */
export function authorizeMinRole(minRole: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userLevel = ROLE_HIERARCHY[req.user.role];
    const requiredLevel = ROLE_HIERARCHY[minRole];

    if (userLevel < requiredLevel) {
      return next(
        new ForbiddenError(
          `Insufficient role level. Your role: '${req.user.role}', Required minimum: '${minRole}'`
        )
      );
    }

    next();
  };
}

/**
 * Check if user is accessing their own resource or has HR+ role.
 * For Employee endpoints where employees can see their own data.
 */
export function authorizeOwnOrRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // If user has an allowed role, let them through
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    // For EMPLOYEE role — check if they're accessing their own resource
    // The controller must handle the actual "own" filtering logic
    // We just mark that this is an employee accessing the endpoint
    next();
  };
}

/**
 * Helper to check if user is accessing own employee record.
 */
export function isOwnEmployee(req: Request, targetEmployeeId: string): boolean {
  return req.user?.employeeId === targetEmployeeId;
}

/**
 * Helper to check if user has at least the given role level.
 */
export function hasMinRole(req: Request, minRole: Role): boolean {
  if (!req.user) return false;
  return ROLE_HIERARCHY[req.user.role] >= ROLE_HIERARCHY[minRole];
}
