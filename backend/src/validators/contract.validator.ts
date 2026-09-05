import { z } from 'zod';
import { ContractStatus } from '@prisma/client';

export const createContractSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  wage: z.number().positive('Wage must be positive'),
  departmentId: z.string().uuid('Invalid department ID'),
  position: z.string().min(2, 'Position is required'),
  salaryStructureId: z.string().uuid('Invalid salary structure ID'),
  status: z.nativeEnum(ContractStatus).default(ContractStatus.DRAFT),
});

export const updateContractSchema = createContractSchema.partial();

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
