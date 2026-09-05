import prisma from '../config/db';
import { NotFoundError, ValidationError } from '../utils/errors';
import { resolveEmployeeContract } from './contractResolver';
import { calculateEmployeeWorkedDays } from './workedDaysCalculator';
import { executeSalaryRules } from './salaryRuleEngine';
import { PayrunStatus, PayslipStatus } from '@prisma/client';
import { emitEvent, SocketEvents } from '../socket/emitter';
import { STRUCTURE_ACTIVE } from '../services/salaryStructure.service';

export class PayrunCalculator {
  /**
   * Orchestrates the entire payroll computation for a payrun.
   */
  static async computePayrun(payrunId: string) {
    const payrun = await prisma.payrun.findUnique({
      where: { id: payrunId },
      include: {
        salaryStructure: {
          include: {
            rules: {
              where: { status: 'Active' },
              orderBy: { sequence: 'asc' },
            },
          },
        },
        payslips: {
          include: { employee: true },
        },
      },
    });

    if (!payrun) throw new NotFoundError('Payrun');

    if (payrun.status === PayrunStatus.PAID || payrun.status === PayrunStatus.SENT) {
      throw new ValidationError(`Cannot recompute a payrun with status '${payrun.status}'`);
    }

    // Checked here as well as at payrun creation: a structure can be retired
    // after its payrun exists, and computing would then generate payslips from
    // rules the organisation has withdrawn.
    if (payrun.salaryStructure.status !== STRUCTURE_ACTIVE) {
      throw new ValidationError(
        `Payslips cannot be generated: salary structure "${payrun.salaryStructure.name}" is ` +
          `${payrun.salaryStructure.status.toLowerCase()}. Reactivate it, or move these employees ` +
          'to an active structure.'
      );
    }

    const rules = payrun.salaryStructure.rules;
    if (rules.length === 0) {
      throw new ValidationError(`Salary structure '${payrun.salaryStructure.name}' has no active rules`);
    }

    const computedPayslips = [];

    // Process each payslip in the payrun
    for (const payslip of payrun.payslips) {
      const employeeId = payslip.employeeId;

      // 1. Resolve applicable contract
      const contract = await resolveEmployeeContract(
        employeeId,
        payrun.periodStartDate,
        payrun.periodEndDate
      );

      if (!contract) {
        console.warn(`[Payroll Warning] No active contract found for employee ${employeeId} in period`);
        continue;
      }

      // The payrun's own structure being active is not enough. An employee's
      // contract can sit on a different, retired structure, and paying them
      // under some other structure's rules would quietly ignore that the
      // organisation withdrew the terms they are actually on. Named per
      // employee so it is obvious who has to be moved.
      if (contract.salaryStructure && contract.salaryStructure.status !== STRUCTURE_ACTIVE) {
        throw new ValidationError(
          `Payslip cannot be generated for ${payslip.employee.name} (${payslip.employee.employeeCode}): ` +
            `their contract uses salary structure "${contract.salaryStructure.name}", which is ` +
            `${contract.salaryStructure.status.toLowerCase()}. Move them to an active structure, or reactivate it.`
        );
      }

      // 2. Calculate worked days & leaves
      const workedResult = await calculateEmployeeWorkedDays(
        employeeId,
        payrun.periodStartDate,
        payrun.periodEndDate
      );

      const workedRatio =
        workedResult.standardWorkingDays > 0
          ? workedResult.totalPayableDays / workedResult.standardWorkingDays
          : 1.0;

      // 3. Execute sequential rules
      const ruleResult = executeSalaryRules(rules, {
        contract: {
          wage: contract.wage,
          position: contract.position,
        },
        workedRatio,
        workedDays: workedResult.totalPayableDays,
        standardWorkingDays: workedResult.standardWorkingDays,
      });

      // 4. Save payslip lines and update payslip in a transaction
      const updatedPayslip = await prisma.$transaction(async (tx) => {
        // Delete old lines if any
        await tx.payslipLine.deleteMany({ where: { payslipId: payslip.id } });

        // Create new lines
        await tx.payslipLine.createMany({
          data: ruleResult.lines.map((line) => ({
            payslipId: payslip.id,
            code: line.code,
            name: line.name,
            category: line.category,
            sequence: line.sequence,
            amount: line.amount,
          })),
        });

        // Update payslip totals
        return tx.payslip.update({
          where: { id: payslip.id },
          data: {
            workedDays: workedResult.totalPayableDays,
            grossSalary: ruleResult.grossSalary,
            totalDeductions: ruleResult.totalDeductions,
            netSalary: ruleResult.netSalary,
            status: PayslipStatus.CONFIRMED,
          },
          include: {
            employee: { select: { id: true, name: true, employeeCode: true, jobPosition: true } },
            lines: { orderBy: { sequence: 'asc' } },
          },
        });
      });

      computedPayslips.push(updatedPayslip);
    }

    // 5. Update payrun status to COMPUTED
    const updatedPayrun = await prisma.payrun.update({
      where: { id: payrunId },
      data: { status: PayrunStatus.COMPUTED },
      include: {
        salaryStructure: { select: { id: true, name: true } },
        payslips: {
          include: {
            employee: { select: { id: true, name: true, employeeCode: true } },
            lines: { orderBy: { sequence: 'asc' } },
          },
        },
      },
    });

    emitEvent(SocketEvents.PAYRUN_STATUS_CHANGED, {
      payrunId,
      status: PayrunStatus.COMPUTED,
    });

    return {
      payrun: updatedPayrun,
      computedCount: computedPayslips.length,
      payslips: computedPayslips,
    };
  }
}
