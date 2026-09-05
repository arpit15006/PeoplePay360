import bcrypt from 'bcryptjs';

import prisma from '../config/db';
import { ConflictError, NotFoundError, ForbiddenError } from '../utils/errors';
import { AuthUser } from '../middleware/auth';
import { invalidateUserCache } from '../middleware/auth';
import { Role } from '@prisma/client';

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: Role;
  employeeId?: string | null;
  isActive?: boolean;
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'password'>> & {
  password?: string;
};

/** Never return the password hash, whatever the caller asks for. */
const PUBLIC_FIELDS = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  employeeId: true,
  createdAt: true,
  updatedAt: true,
  employee: {
    select: { id: true, name: true, employeeCode: true, jobPosition: true },
  },
} as const;

export class UserService {
  static async listUsers(filters: { role?: string; q?: string }) {
    return prisma.user.findMany({
      where: {
        ...(filters.role ? { role: filters.role as Role } : {}),
        ...(filters.q
          ? {
              OR: [
                { name: { contains: filters.q, mode: 'insensitive' as const } },
                { email: { contains: filters.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: PUBLIC_FIELDS,
      orderBy: { createdAt: 'asc' },
    });
  }

  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({ where: { id }, select: PUBLIC_FIELDS });
    if (!user) throw new NotFoundError('User');
    return user;
  }

  static async createUser(input: CreateUserInput) {
    const email = input.email.trim().toLowerCase();

    if (await prisma.user.findUnique({ where: { email } })) {
      throw new ConflictError('A user with this email already exists');
    }

    // employeeId is unique on User, so a second account for the same employee
    // would fail at the database with an opaque error. Say so plainly instead.
    if (input.employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: input.employeeId },
        select: { id: true, user: { select: { id: true } } },
      });
      if (!employee) throw new NotFoundError('Employee');
      if (employee.user) throw new ConflictError('That employee already has a user account');
    }

    return prisma.user.create({
      data: {
        email,
        name: input.name.trim(),
        password: await bcrypt.hash(input.password, 10),
        role: input.role,
        employeeId: input.employeeId || null,
        isActive: input.isActive ?? true,
      },
      select: PUBLIC_FIELDS,
    });
  }

  static async updateUser(id: string, input: UpdateUserInput, actor: AuthUser) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('User');

    // An admin who demotes or suspends themselves locks themselves out, and
    // with it the only route back in. Block both rather than rely on care.
    if (existing.id === actor.id) {
      if (input.role && input.role !== existing.role) {
        throw new ForbiddenError('You cannot change your own role');
      }
      if (input.isActive === false) {
        throw new ForbiddenError('You cannot deactivate your own account');
      }
    }

    if (input.email && input.email.trim().toLowerCase() !== existing.email) {
      const clash = await prisma.user.findUnique({
        where: { email: input.email.trim().toLowerCase() },
      });
      if (clash) throw new ConflictError('A user with this email already exists');
    }

    if (input.employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: input.employeeId },
        select: { id: true, user: { select: { id: true } } },
      });
      if (!employee) throw new NotFoundError('Employee');
      if (employee.user && employee.user.id !== id) {
        throw new ConflictError('That employee already has a user account');
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.role ? { role: input.role } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.employeeId !== undefined ? { employeeId: input.employeeId || null } : {}),
        ...(input.password ? { password: await bcrypt.hash(input.password, 10) } : {}),
      },
      select: PUBLIC_FIELDS,
    });

    // The authenticated-user cache would otherwise serve the old role or the
    // old active flag until its TTL expired.
    invalidateUserCache(id);

    return updated;
  }

  static async deleteUser(id: string, actor: AuthUser) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('User');

    if (existing.id === actor.id) {
      throw new ForbiddenError('You cannot delete your own account');
    }

    // Removing the last admin would leave nobody able to manage users.
    if (existing.role === Role.ADMIN) {
      const admins = await prisma.user.count({ where: { role: Role.ADMIN, isActive: true } });
      if (admins <= 1) throw new ForbiddenError('The last active admin cannot be removed');
    }

    await prisma.user.delete({ where: { id } });
    invalidateUserCache(id);

    return { id };
  }
}
