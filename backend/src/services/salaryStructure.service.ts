import prisma from '../config/db';
import {
  CreateSalaryStructureInput,
  UpdateSalaryStructureInput,
  CreateSalaryRuleInput,
  UpdateSalaryRuleInput,
} from '../validators/payroll.validator';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';

/** The only status a structure may be used under. Stored as a plain string. */
export const STRUCTURE_ACTIVE = 'Active';

/**
 * Refuses anything that would put an inactive structure to work.
 *
 * The status column existed from the start but nothing read it, so a structure
 * marked Inactive still accepted new contracts, still appeared in the payrun
 * wizard and still computed payslips. Deactivating is meant to retire a
 * structure: existing payslips keep their history, but nothing new may use it.
 */
export async function assertStructureIsActive(structureId: string, action: string): Promise<void> {
  const structure = await prisma.salaryStructure.findUnique({
    where: { id: structureId },
    select: { name: true, status: true },
  });
  if (!structure) throw new NotFoundError('Salary Structure');

  if (structure.status !== STRUCTURE_ACTIVE) {
    throw new ValidationError(
      `Salary structure "${structure.name}" is ${structure.status.toLowerCase()}, so it cannot ${action}. ` +
        'Reactivate it, or pick an active structure.'
    );
  }
}

export class SalaryStructureService {
  // ─── 1. STRUCTURES ──────────────────────────────────────────

  static async listStructures() {
    return prisma.salaryStructure.findMany({
      orderBy: { name: 'asc' },
      include: {
        rules: { orderBy: { sequence: 'asc' } },
        _count: { select: { contracts: true, payruns: true } },
      },
    });
  }

  static async getStructureById(id: string) {
    const structure = await prisma.salaryStructure.findUnique({
      where: { id },
      include: {
        rules: { orderBy: { sequence: 'asc' } },
        contracts: {
          take: 10,
          include: { employee: { select: { id: true, name: true, employeeCode: true } } },
        },
      },
    });

    if (!structure) throw new NotFoundError('Salary Structure');
    return structure;
  }

  static async createStructure(input: CreateSalaryStructureInput) {
    const existing = await prisma.salaryStructure.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError('A salary structure with this name already exists');

    return prisma.salaryStructure.create({
      data: input,
      include: { rules: true },
    });
  }

  static async updateStructure(id: string, input: UpdateSalaryStructureInput) {
    const existing = await prisma.salaryStructure.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Salary Structure');

    return prisma.salaryStructure.update({
      where: { id },
      data: input,
      include: { rules: { orderBy: { sequence: 'asc' } } },
    });
  }

  static async deleteStructure(id: string) {
    const existing = await prisma.salaryStructure.findUnique({
      where: { id },
      include: { _count: { select: { contracts: true, payruns: true, payslips: true } } },
    });
    if (!existing) throw new NotFoundError('Salary Structure');

    // Payslips are the record of what someone was actually paid, so a structure
    // they point at can never be removed — it would strand that history. The
    // message names every blocker and its count rather than saying only that
    // something is linked, so it is clear what has to move first.
    const { contracts, payruns, payslips } = existing._count;
    if (contracts > 0 || payruns > 0 || payslips > 0) {
      const blockers = [
        contracts > 0 ? `${contracts} contract(s)` : null,
        payruns > 0 ? `${payruns} payrun(s)` : null,
        payslips > 0 ? `${payslips} payslip(s)` : null,
      ].filter(Boolean);
      throw new ConflictError(
        `"${existing.name}" is still used by ${blockers.join(', ')}. ` +
          'Move them to another structure first, or mark this one Inactive to retire it instead.'
      );
    }

    // Rules belong to the structure alone, so they go with it.
    await prisma.$transaction([
      prisma.salaryRule.deleteMany({ where: { structureId: id } }),
      prisma.salaryStructure.delete({ where: { id } }),
    ]);
    return { success: true, message: `Salary structure "${existing.name}" deleted` };
  }

  // ─── 2. RULES ───────────────────────────────────────────────

  static async listRules(structureId?: string) {
    return prisma.salaryRule.findMany({
      where: structureId ? { structureId } : undefined,
      orderBy: [{ structureId: 'asc' }, { sequence: 'asc' }],
      include: {
        structure: { select: { id: true, name: true } },
      },
    });
  }

  static async getRuleById(id: string) {
    const rule = await prisma.salaryRule.findUnique({
      where: { id },
      include: { structure: true },
    });
    if (!rule) throw new NotFoundError('Salary Rule');
    return rule;
  }

  static async createRule(input: CreateSalaryRuleInput) {
    const existing = await prisma.salaryRule.findUnique({
      where: {
        structureId_code: {
          structureId: input.structureId,
          code: input.code,
        },
      },
    });
    if (existing) {
      throw new ConflictError(`Rule with code '${input.code}' already exists in this structure`);
    }

    return prisma.salaryRule.create({
      data: input,
      include: { structure: { select: { id: true, name: true } } },
    });
  }

  static async updateRule(id: string, input: UpdateSalaryRuleInput) {
    const existing = await prisma.salaryRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Salary Rule');

    return prisma.salaryRule.update({
      where: { id },
      data: input,
      include: { structure: { select: { id: true, name: true } } },
    });
  }

  static async deleteRule(id: string) {
    const existing = await prisma.salaryRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Salary Rule');

    await prisma.salaryRule.delete({ where: { id } });
    return { success: true, message: 'Salary rule deleted' };
  }
}
