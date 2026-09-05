import prisma from '../config/db';
import { CreateContractInput, UpdateContractInput } from '../validators/contract.validator';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { AuthUser } from '../middleware/auth';
import { Prisma } from '@prisma/client';

export interface ContractFilters {
  employeeId?: string;
  departmentId?: string;
  status?: string;
  q?: string;
}

export class ContractService {
  /**
   * List contracts.
   * If user is EMPLOYEE, restrict to contracts belonging to their own employeeId.
   */
  static async listContracts(filters: ContractFilters, user: AuthUser) {
    const where: Prisma.ContractWhereInput = {};

    if (user.role === 'EMPLOYEE') {
      if (!user.employeeId) return [];
      where.employeeId = user.employeeId;
    } else {
      if (filters.employeeId) {
        where.employeeId = filters.employeeId;
      }
      if (filters.departmentId) {
        where.departmentId = filters.departmentId;
      }
      if (filters.status) {
        where.status = filters.status as any;
      }
      if (filters.q) {
        const query = filters.q.trim();
        where.OR = [
          { employee: { name: { contains: query, mode: 'insensitive' } } },
          { employee: { employeeCode: { contains: query, mode: 'insensitive' } } },
          { position: { contains: query, mode: 'insensitive' } },
        ];
      }
    }

    const contracts = await prisma.contract.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        employee: {
          select: { id: true, name: true, employeeCode: true, email: true },
        },
        department: { select: { id: true, name: true } },
        salaryStructure: { select: { id: true, name: true } },
      },
    });

    return contracts;
  }

  /**
   * Get single contract by ID
   */
  static async getContractById(id: string, user: AuthUser) {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, name: true, employeeCode: true, email: true, jobPosition: true },
        },
        department: true,
        salaryStructure: {
          include: {
            rules: {
              where: { status: 'Active' },
              orderBy: { sequence: 'asc' },
            },
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    if (user.role === 'EMPLOYEE' && contract.employeeId !== user.employeeId) {
      throw new ForbiddenError('You can only access your own contract');
    }

    return contract;
  }

  /**
   * Create a new contract (HR Manager+)
   */
  static async createContract(input: CreateContractInput) {
    // Validate employee exists
    const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee) throw new NotFoundError('Employee');

    // Parse dates to standard Date objects
    const startDate = new Date(input.startDate);
    const endDate = input.endDate ? new Date(input.endDate) : null;

    const contract = await prisma.contract.create({
      data: {
        ...input,
        startDate,
        endDate,
      },
      include: {
        employee: { select: { id: true, name: true, employeeCode: true } },
        department: { select: { id: true, name: true } },
        salaryStructure: { select: { id: true, name: true } },
      },
    });

    return contract;
  }

  /**
   * Update an existing contract
   */
  static async updateContract(id: string, input: UpdateContractInput) {
    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Contract');

    const startDate = input.startDate ? new Date(input.startDate) : undefined;
    const endDate = input.endDate !== undefined ? (input.endDate ? new Date(input.endDate) : null) : undefined;

    const updated = await prisma.contract.update({
      where: { id },
      data: {
        ...input,
        startDate,
        endDate,
      },
      include: {
        employee: { select: { id: true, name: true, employeeCode: true } },
        department: { select: { id: true, name: true } },
        salaryStructure: { select: { id: true, name: true } },
      },
    });

    return updated;
  }

  /**
   * Delete a contract (Admin only)
   */
  static async deleteContract(id: string) {
    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Contract');

    await prisma.contract.delete({ where: { id } });
    return { success: true, message: 'Contract deleted successfully' };
  }

  /**
   * CORE PAYROLL HELPER: Find applicable contract for an employee during a given payrun period.
   * PRD Section 6 requirement:
   * Finds contract where startDate <= periodEndDate AND (endDate IS NULL OR endDate >= periodStartDate)
   * If multiple exist, prefers ACTIVE contract, or highest startDate.
   */
  static async findApplicableContract(employeeId: string, periodStartDate: Date, periodEndDate: Date) {
    const contracts = await prisma.contract.findMany({
      where: {
        employeeId,
        startDate: { lte: periodEndDate },
        OR: [
          { endDate: null },
          { endDate: { gte: periodStartDate } },
        ],
      },
      orderBy: [
        { status: 'asc' }, // 'ACTIVE' precedes 'DRAFT' / 'EXPIRED'
        { startDate: 'desc' },
      ],
      include: {
        salaryStructure: {
          include: {
            rules: {
              where: { status: 'Active' },
              orderBy: { sequence: 'asc' },
            },
          },
        },
      },
    });

    if (!contracts || contracts.length === 0) {
      return null;
    }

    // Prefer ACTIVE status contract if available
    const activeContract = contracts.find((c) => c.status === 'ACTIVE');
    return activeContract || contracts[0];
  }
}
