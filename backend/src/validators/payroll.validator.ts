import { z } from 'zod';
import { RuleCategory, RuleCalcType } from '@prisma/client';

export const createSalaryStructureSchema = z.object({
  name: z.string().min(2, 'Structure name is required'),
  status: z.string().default('Active'),
});

export const updateSalaryStructureSchema = createSalaryStructureSchema.partial();

export const createSalaryRuleSchema = z.object({
  structureId: z.string().uuid('Invalid salary structure ID'),
  name: z.string().min(2, 'Rule name is required'),
  code: z.string().min(2, 'Rule code is required').toUpperCase(),
  category: z.nativeEnum(RuleCategory),
  sequence: z.number().int().min(1, 'Sequence must be a positive integer'),
  calculationType: z.nativeEnum(RuleCalcType),
  value: z.string().min(1, 'Value / expression is required'),
  condition: z.string().optional().nullable(),
  status: z.string().default('Active'),
});

export const updateSalaryRuleSchema = createSalaryRuleSchema.partial().omit({ structureId: true });

export type CreateSalaryStructureInput = z.infer<typeof createSalaryStructureSchema>;
export type UpdateSalaryStructureInput = z.infer<typeof updateSalaryStructureSchema>;
export type CreateSalaryRuleInput = z.infer<typeof createSalaryRuleSchema>;
export type UpdateSalaryRuleInput = z.infer<typeof updateSalaryRuleSchema>;

/**
 * Payrun creation (wizard steps 1 and 2).
 *
 * Previously unvalidated: an incomplete body reached Prisma directly and
 * surfaced as a 500 "Internal server error" rather than telling the caller
 * which field was wrong.
 */
export const createPayrunSchema = z.object({
  salaryStructureId: z.string().uuid('salaryStructureId must be a valid id'),
  period: z.string().min(1, 'period is required'),
  periodStartDate: z.union([z.string().datetime(), z.date()]),
  periodEndDate: z.union([z.string().datetime(), z.date()]),
  // Step 2 of the wizard selects the employees; omitted means every eligible one.
  employeeIds: z.array(z.string().uuid()).optional(),
});

export type CreatePayrunInput = z.infer<typeof createPayrunSchema>;
