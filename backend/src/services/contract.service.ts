import prisma from '../config/db';
import { CreateContractInput, UpdateContractInput } from '../validators/contract.validator';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../utils/errors';
import { AuthUser } from '../middleware/auth';
import { Prisma, ContractStatus } from '@prisma/client';

export interface ContractFilters {
  employeeId?: string;
  departmentId?: string;
  status?: string;
  q?: string;
}


/**
 * Reject a contract that would run concurrently with another active one.
 *
 * The spec requires payroll to use the contract applicable to a period while
 * "avoiding concurrent active contracts". Without this, an employee could hold
 * two overlapping ACTIVE contracts and the payrun would silently pick whichever
 * the resolver happened to see first, changing someone's pay by accident.
 *
 * An open-ended contract (no endDate) runs forever, so it overlaps anything
 * that has not already finished before it starts. Draft, expired and terminated
 * contracts are history and never conflict.
 */
async function assertNoOverlappingContract(
  employeeId: string,
  startDate: Date,
  endDate: Date | null,
  ignoreContractId?: string
): Promise<void> {
  const clash = await prisma.contract.findFirst({
    where: {
      employeeId,
      status: ContractStatus.ACTIVE,
      ...(ignoreContractId ? { id: { not: ignoreContractId } } : {}),
      // Two ranges overlap when each starts before the other ends. A null
      // endDate is treated as "no end", so only the start bound applies.
      AND: [
        endDate ? { startDate: { lte: endDate } } : {},
        { OR: [{ endDate: null }, { endDate: { gte: startDate } }] },
      ],
    },
    select: { id: true, startDate: true, endDate: true },
  });

  if (clash) {
    const until = clash.endDate ? clash.endDate.toISOString().slice(0, 10) : 'open-ended';
    throw new ConflictError(
      `This employee already has an active contract from ${clash.startDate
        .toISOString()
        .slice(0, 10)} to ${until}. End or terminate it before adding another.`
    );
  }
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

    if (endDate && endDate < startDate) {
      throw new ValidationError('The contract end date cannot be before its start date');
    }

    if ((input.status ?? ContractStatus.DRAFT) === ContractStatus.ACTIVE) {
      await assertNoOverlappingContract(input.employeeId, startDate, endDate);
    }

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

    // Activating a contract, or moving its dates, can create the same overlap
    // that creation guards against, so the check applies here too.
    const nextStatus = input.status ?? existing.status;
    const nextStart = startDate ?? existing.startDate;
    const nextEnd = endDate !== undefined ? endDate : existing.endDate;

    if (nextEnd && nextEnd < nextStart) {
      throw new ValidationError('The contract end date cannot be before its start date');
    }

    if (nextStatus === ContractStatus.ACTIVE) {
      await assertNoOverlappingContract(existing.employeeId, nextStart, nextEnd, id);
    }

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
