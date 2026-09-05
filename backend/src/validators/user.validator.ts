import { z } from 'zod';

const ROLES = ['EMPLOYEE', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'] as const;

export const createUserSchema = z.object({
  email: z.string().email('A valid email is required'),
  name: z.string().min(1, 'name is required'),
  password: z.string().min(8, 'password must be at least 8 characters'),
  role: z.enum(ROLES),
  // null clears the link; undefined leaves it untouched on update.
  employeeId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateUserSchema = createUserSchema.partial();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
