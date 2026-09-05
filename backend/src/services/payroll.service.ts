import prisma from '../config/db';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';
import { AuthUser } from '../middleware/auth';
import { PayrunStatus, PayslipStatus, Prisma } from '@prisma/client';
import { PayrunCalculator } from '../payroll/payrunCalculator';
import { validatePayrunTransition } from '../payroll/payrollValidator';
import { STRUCTURE_ACTIVE } from './salaryStructure.service';
import { emitEvent, SocketEvents } from '../socket/emitter';

export interface CreatePayrunInput {
  salaryStructureId: string;
  period: string; // e.g. "September 2026"
  periodStartDate: string | Date;
  periodEndDate: string | Date;
  employeeIds?: string[];
}

export class PayrollService {
  /**
   * Wizard Step 1 & 2: Create payrun and initialize payslips for selected employees.
   */
  static async createPayrun(input: CreatePayrunInput) {
    const structure = await prisma.salaryStructure.findUnique({
      where: { id: input.salaryStructureId },
    });
    if (!structure) throw new NotFoundError('Salary Structure');

    // An inactive structure is retired: it keeps its history but takes no new work.
    if (structure.status !== STRUCTURE_ACTIVE) {
      throw new ValidationError(
        `Salary structure "${structure.name}" is ${structure.status.toLowerCase()}, so no payrun can be created from it. ` +
          'Reactivate it, or pick an active structure.'
      );
    }

    const startDate = new Date(input.periodStartDate);
    const endDate = new Date(input.periodEndDate);

    // Determine target employees
    let targetEmployeeIds = input.employeeIds;

    if (!targetEmployeeIds || targetEmployeeIds.length === 0) {
      // Auto-select active employees who have an active contract matching this structure
      const activeContracts = await prisma.contract.findMany({
        where: {
          salaryStructureId: input.salaryStructureId,
          status: 'ACTIVE',
          startDate: { lte: endDate },
          OR: [{ endDate: null }, { endDate: { gte: startDate } }],
        },
        select: { employeeId: true },
      });
      targetEmployeeIds = activeContracts.map((c) => c.employeeId);
    }

    if (targetEmployeeIds.length === 0) {
      throw new ValidationError(
        'No eligible employees found with an active contract for this salary structure in this period'
      );
    }

    // A payrun runs one structure's rules, so everyone in it must actually be on
    // that structure. The wizard already lists only those employees; this is the
    // same rule at the API, so a hand-made request cannot pay someone under
    // rules their contract was never placed on.
    if (input.employeeIds && input.employeeIds.length > 0) {
      const eligible = await prisma.contract.findMany({
        where: {
          employeeId: { in: targetEmployeeIds },
          salaryStructureId: input.salaryStructureId,
          status: 'ACTIVE',
          startDate: { lte: endDate },
          OR: [{ endDate: null }, { endDate: { gte: startDate } }],
        },
        select: { employeeId: true },
      });

      const eligibleIds = new Set(eligible.map((c) => c.employeeId));
      const rejected = targetEmployeeIds.filter((id) => !eligibleIds.has(id));

      if (rejected.length > 0) {
        const people = await prisma.employee.findMany({
          where: { id: { in: rejected } },
          select: { name: true, employeeCode: true },
        });
        const named = people.map((p) => `${p.name} (${p.employeeCode})`).join(', ');
        throw new ValidationError(
          `${named} ${people.length === 1 ? 'has' : 'have'} no active contract on salary structure ` +
            `"${structure.name}" for this period, so ${people.length === 1 ? 'they cannot' : 'they cannot'} ` +
            'be included in this payrun.'
        );
      }
    }

    // Create Payrun and initial draft payslips in a transaction
    const payrun = await prisma.$transaction(async (tx) => {
      const createdPayrun = await tx.payrun.create({
        data: {
          salaryStructureId: input.salaryStructureId,
          period: input.period,
          periodStartDate: startDate,
          periodEndDate: endDate,
          status: PayrunStatus.DRAFT,
        },
      });

      // Create draft payslips for each employee
      for (const empId of targetEmployeeIds!) {
        await tx.payslip.create({
          data: {
            payrunId: createdPayrun.id,
            employeeId: empId,
            salaryStructureId: input.salaryStructureId,
            period: input.period,
            workedDays: 0,
            grossSalary: 0,
            totalDeductions: 0,
            netSalary: 0,
            status: PayslipStatus.DRAFT,
          },
        });
      }

      return tx.payrun.findUnique({
        where: { id: createdPayrun.id },
        include: {
          salaryStructure: { select: { id: true, name: true } },
          payslips: {
            include: {
              employee: { select: { id: true, name: true, employeeCode: true, jobPosition: true } },
            },
          },
        },
      });
    });

    return payrun;
  }

  /**
   * List payruns
   */
  static async listPayruns() {
    return prisma.payrun.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        salaryStructure: { select: { id: true, name: true } },
        _count: { select: { payslips: true } },
        // Net amounts only, so the list can show a period total without
        // pulling every payslip line.
        payslips: { select: { netSalary: true } },
      },
    });
  }

  /**
   * Get single payrun by ID
   */
  static async getPayrunById(id: string) {
    const payrun = await prisma.payrun.findUnique({
      where: { id },
      include: {
        salaryStructure: {
          include: { rules: { orderBy: { sequence: 'asc' } } },
        },
        payslips: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                employeeCode: true,
                jobPosition: true,
                department: { select: { name: true } },
              },
            },
            lines: { orderBy: { sequence: 'asc' } },
          },
        },
      },
    });

    if (!payrun) throw new NotFoundError('Payrun');
    return payrun;
  }

  /**
   * Compute payrun (Payroll Engine execution)
   */
  static async computePayrun(id: string) {
    return PayrunCalculator.computePayrun(id);
  }

  /**
   * Transition payrun to VALIDATED status
   */
  static async validatePayrun(id: string) {
    const payrun = await prisma.payrun.findUnique({ where: { id } });
    if (!payrun) throw new NotFoundError('Payrun');

    validatePayrunTransition(payrun.status, PayrunStatus.VALIDATED);

    const updated = await prisma.payrun.update({
      where: { id },
      data: { status: PayrunStatus.VALIDATED },
      include: {
        salaryStructure: { select: { id: true, name: true } },
        payslips: { include: { employee: true } },
      },
    });

    emitEvent(SocketEvents.PAYRUN_STATUS_CHANGED, { id, status: PayrunStatus.VALIDATED });
    return updated;
  }

  /**
   * Transition payrun to PAID status (and mark all payslips PAID)
   */
  static async markPayrunPaid(id: string) {
    const payrun = await prisma.payrun.findUnique({ where: { id } });
    if (!payrun) throw new NotFoundError('Payrun');

    validatePayrunTransition(payrun.status, PayrunStatus.PAID);

    const updated = await prisma.$transaction(async (tx) => {
      // Mark all payslips PAID
      await tx.payslip.updateMany({
        where: { payrunId: id },
        data: { status: PayslipStatus.PAID },
      });

      return tx.payrun.update({
        where: { id },
        data: { status: PayrunStatus.PAID },
        include: {
          salaryStructure: { select: { id: true, name: true } },
          payslips: {
            include: {
              employee: { select: { id: true, name: true, employeeCode: true } },
            },
          },
        },
      });
    });

    emitEvent(SocketEvents.PAYRUN_STATUS_CHANGED, { id, status: PayrunStatus.PAID });
    return updated;
  }

  // ─── PAYSLIPS ────────────────────────────────────────────────

  /**
   * List payslips with RBAC scoping.
   * If user is EMPLOYEE, restrict to their own payslips.
   */
  static async listPayslips(filters: { payrunId?: string; employeeId?: string }, user: AuthUser) {
    const where: Prisma.PayslipWhereInput = {};

    if (user.role === 'EMPLOYEE') {
      if (!user.employeeId) return [];
      where.employeeId = user.employeeId;
    } else if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.payrunId) {
      where.payrunId = filters.payrunId;
    }

    return prisma.payslip.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            jobPosition: true,
            department: { select: { name: true } },
          },
        },
        salaryStructure: { select: { id: true, name: true } },
        payrun: { select: { id: true, period: true, status: true } },
      },
    });
  }

  /**
   * Get single payslip by ID with all its calculated line items.
   */
  static async getPayslipById(id: string, user: AuthUser) {
    const payslip = await prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            email: true,
            phone: true,
            jobPosition: true,
            department: { select: { id: true, name: true } },
          },
        },
        salaryStructure: { select: { id: true, name: true } },
        payrun: { select: { id: true, period: true, status: true } },
        lines: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!payslip) throw new NotFoundError('Payslip');

    if (user.role === 'EMPLOYEE' && payslip.employeeId !== user.employeeId) {
      throw new ForbiddenError('You can only view your own payslip');
    }

    return payslip;
  }
}
