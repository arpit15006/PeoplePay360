import prisma from '../config/db';
import {
  CreateSalaryStructureInput,
  UpdateSalaryStructureInput,
  CreateSalaryRuleInput,
  UpdateSalaryRuleInput,
} from '../validators/payroll.validator';
import { NotFoundError, ConflictError } from '../utils/errors';

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
      include: { _count: { select: { contracts: true, payruns: true } } },
    });
    if (!existing) throw new NotFoundError('Salary Structure');

    if (existing._count.contracts > 0 || existing._count.payruns > 0) {
      throw new ConflictError('Cannot delete salary structure linked to active contracts or payruns');
    }

    await prisma.salaryStructure.delete({ where: { id } });
    return { success: true, message: 'Salary structure deleted' };
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
