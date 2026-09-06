import prisma from '../config/db';
import { NotFoundError, ValidationError } from '../utils/errors';
import { pickApplicableContract } from './contractResolver';
import { workedDaysFrom } from './workedDaysCalculator';
import { getWorkingDaysInRange } from '../utils/dates';
import { executeSalaryRules } from './salaryRuleEngine';
import { Prisma, PayrunStatus, PayslipStatus, RuleCategory, TimeOffStatus } from '@prisma/client';
import { emitEvent, PAYROLL_AUDIENCE, SocketEvents } from '../socket/emitter';
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

    /**
     * Everything the whole payrun needs, in three queries instead of three per
     * employee.
     *
     * The old loop issued a contract lookup, an attendance lookup and a
     * time-off lookup for each person, then opened an interactive transaction
     * to write their lines — roughly eight sequential round trips each. Against
     * a hosted database that was about a second per employee and grew straight
     * up with headcount. The work itself is arithmetic; it was the waiting that
     * cost. Fetch once for everyone, compute in memory, write once.
     */
    const employeeIds = [...new Set(payrun.payslips.map((p) => p.employeeId))];

    const [contractRows, attendanceRows, timeOffRows] = await Promise.all([
      prisma.contract.findMany({
        where: {
          employeeId: { in: employeeIds },
          startDate: { lte: payrun.periodEndDate },
          OR: [{ endDate: null }, { endDate: { gte: payrun.periodStartDate } }],
        },
        include: {
          salaryStructure: { select: { id: true, name: true, status: true } },
        },
      }),
      prisma.attendance.findMany({
        where: {
          employeeId: { in: employeeIds },
          date: { gte: payrun.periodStartDate, lte: payrun.periodEndDate },
        },
        select: { employeeId: true, status: true },
      }),
      prisma.timeOffRequest.findMany({
        where: {
          employeeId: { in: employeeIds },
          status: TimeOffStatus.APPROVED,
          startDate: { lte: payrun.periodEndDate },
          endDate: { gte: payrun.periodStartDate },
        },
        select: { employeeId: true, duration: true, timeOffType: { select: { name: true } } },
      }),
    ]);

    const groupBy = <T extends { employeeId: string }>(rows: T[]) => {
      const map = new Map<string, T[]>();
      for (const row of rows) {
        const bucket = map.get(row.employeeId);
        if (bucket) bucket.push(row);
        else map.set(row.employeeId, [row]);
      }
      return map;
    };

    const contractsByEmployee = groupBy(contractRows);
    const attendanceByEmployee = groupBy(attendanceRows);
    const timeOffByEmployee = groupBy(timeOffRows);

    // The same for everyone in the payrun, so it is worked out once.
    const standardWorkingDays = getWorkingDaysInRange(
      payrun.periodStartDate,
      payrun.periodEndDate
    );

    const computedIds: string[] = [];
    const lineRows: {
      payslipId: string;
      code: string;
      name: string;
      category: RuleCategory;
      sequence: number;
      amount: number;
    }[] = [];
    const payslipUpdates: {
      id: string;
      workedDays: number;
      grossSalary: number;
      totalDeductions: number;
      netSalary: number;
    }[] = [];

    // Same order as before, so the same employee is named if one has to be
    // rejected for sitting on a retired structure.
    for (const payslip of payrun.payslips) {
      const employeeId = payslip.employeeId;

      // 1. Resolve applicable contract
      const contract = pickApplicableContract(contractsByEmployee.get(employeeId) ?? []);

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
      const workedResult = workedDaysFrom(
        attendanceByEmployee.get(employeeId) ?? [],
        timeOffByEmployee.get(employeeId) ?? [],
        standardWorkingDays
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

      computedIds.push(payslip.id);
      for (const line of ruleResult.lines) {
        lineRows.push({
          payslipId: payslip.id,
          code: line.code,
          name: line.name,
          category: line.category,
          sequence: line.sequence,
          amount: line.amount,
        });
      }
      payslipUpdates.push({
        id: payslip.id,
        workedDays: workedResult.totalPayableDays,
        grossSalary: ruleResult.grossSalary,
        totalDeductions: ruleResult.totalDeductions,
        netSalary: ruleResult.netSalary,
      });
    }

    // 4. Write everything in one transaction. Only the payslips that actually
    //    computed are touched: an employee skipped for want of a contract keeps
    //    whatever they had, exactly as before.
    if (computedIds.length > 0) {
      // Each payslip gets different totals, and there is no bulk update that
      // takes a different value per row — one `update` each would put the
      // round trip back that the batching above removed. A single statement
      // joined against a VALUES list does the lot. Values are still bound as
      // parameters, so nothing is interpolated into the SQL.
      //
      // updatedAt is set by hand because @updatedAt is a Prisma-side default
      // and does not apply to a raw statement.
      const totals = Prisma.join(
        payslipUpdates.map(
          (u) =>
            Prisma.sql`(${u.id}, ${u.workedDays}::double precision, ${u.grossSalary}::double precision, ${u.totalDeductions}::double precision, ${u.netSalary}::double precision)`
        )
      );

      await prisma.$transaction([
        prisma.payslipLine.deleteMany({ where: { payslipId: { in: computedIds } } }),
        prisma.payslipLine.createMany({ data: lineRows }),
        prisma.$executeRaw`
          UPDATE "payslips" AS p
          SET "workedDays" = v.worked_days,
              "grossSalary" = v.gross_salary,
              "totalDeductions" = v.total_deductions,
              "netSalary" = v.net_salary,
              "status" = ${PayslipStatus.CONFIRMED}::"PayslipStatus",
              "updatedAt" = NOW()
          FROM (VALUES ${totals}) AS v(id, worked_days, gross_salary, total_deductions, net_salary)
          WHERE p."id" = v.id
        `,
      ]);
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

    emitEvent(
      SocketEvents.PAYRUN_STATUS_CHANGED,
      { payrunId, status: PayrunStatus.COMPUTED },
      { roles: PAYROLL_AUDIENCE }
    );

    const computed = new Set(computedIds);
    return {
      payrun: updatedPayrun,
      computedCount: computedIds.length,
      payslips: updatedPayrun.payslips.filter((p) => computed.has(p.id)),
    };
  }
}
