import prisma from '../config/db';
import { NotFoundError, ValidationError } from '../utils/errors';
import { resolveEmployeeContract } from './contractResolver';
import { calculateEmployeeWorkedDays } from './workedDaysCalculator';
import { executeSalaryRules } from './salaryRuleEngine';
import { PayrunStatus, PayslipStatus } from '@prisma/client';
import { emitEvent, SocketEvents } from '../socket/emitter';

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
