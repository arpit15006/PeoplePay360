import { z } from 'zod';
import { EmployeeStatus, EmployeeType } from '@prisma/client';

export const createEmployeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Phone must be at least 5 characters'),
  departmentId: z.string().uuid('Invalid department ID'),
  jobPosition: z.string().min(2, 'Job position is required'),
  employeeType: z.nativeEnum(EmployeeType).default(EmployeeType.FULL_TIME),
  scheduleId: z.string().uuid('Invalid schedule ID').optional().nullable(),
  managerId: z.string().uuid('Invalid manager ID').optional().nullable(),
  status: z.nativeEnum(EmployeeStatus).default(EmployeeStatus.ACTIVE),
  employeeCode: z.string().optional(), // Auto-generated if not provided
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
