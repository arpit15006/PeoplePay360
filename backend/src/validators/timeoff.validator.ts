import { z } from 'zod';

export const createTimeOffTypeSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  unit: z.enum(['Days', 'Hours']).default('Days'),
  allocationRequired: z.boolean().default(true),
  approvalType: z.string().default('Manager Approval'),
  payrollIntegration: z.boolean().default(false),
  status: z.string().default('Active'),
});

export const updateTimeOffTypeSchema = createTimeOffTypeSchema.partial();

export const createAllocationSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  timeOffTypeId: z.string().uuid('Invalid time off type ID'),
  allocated: z.number().positive('Allocated amount must be positive'),
  validityYear: z.number().int().min(2020).max(2050),
  status: z.string().default('Approved'),
});

export const updateAllocationSchema = z.object({
  allocated: z.number().positive().optional(),
  taken: z.number().min(0).optional(),
  status: z.string().optional(),
});

export const createTimeOffRequestSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID').optional(), // defaults to self
  timeOffTypeId: z.string().uuid('Invalid time off type ID'),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  duration: z.number().positive('Duration must be greater than 0'),
  reason: z.string().min(2, 'Reason is required'),
});

export type CreateTimeOffTypeInput = z.infer<typeof createTimeOffTypeSchema>;
export type UpdateTimeOffTypeInput = z.infer<typeof updateTimeOffTypeSchema>;
export type CreateAllocationInput = z.infer<typeof createAllocationSchema>;
export type UpdateAllocationInput = z.infer<typeof updateAllocationSchema>;
export type CreateTimeOffRequestInput = z.infer<typeof createTimeOffRequestSchema>;
