import prisma from '../config/db';

export type PayrunWarningSeverity = 'error' | 'warning';

export interface PayrunWarning {
  code: string;
  severity: PayrunWarningSeverity;
  message: string;
  employeeId?: string;
  employeeName?: string;
}

/**
 * Collects the issues a payroll officer should see before finalising a payrun.
 *
 * The spec asks for warnings such as duplicate payslips and incomplete employee
 * data to be surfaced prior to finalisation. Note that the Employee model has no
 * bank detail columns, so the literal "missing bank details" check from the spec
 * cannot be performed; the closest available signals are checked instead.
 */
export async function collectPayrunWarnings(payrunId: string): Promise<PayrunWarning[]> {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    include: {
      payslips: {
        include: {
          employee: { select: { id: true, name: true, email: true, status: true } },
          lines: true,
        },
      },
    },
  });

  if (!payrun) return [];

  const warnings: PayrunWarning[] = [];

  // Duplicate payslips: the same employee already has a payslip for this period
  // in a different payrun. The unique constraint only covers one payrun, so this
  // has to be checked across them.
  const duplicates = await prisma.payslip.findMany({
    where: {
      period: payrun.period,
      payrunId: { not: payrunId },
      employeeId: { in: payrun.payslips.map((p) => p.employeeId) },
    },
    include: { employee: { select: { id: true, name: true } } },
  });

  for (const duplicate of duplicates) {
    warnings.push({
      code: 'DUPLICATE_PAYSLIP',
      severity: 'error',
      employeeId: duplicate.employeeId,
      employeeName: duplicate.employee?.name,
      message: `${duplicate.employee?.name} already has a payslip for ${payrun.period} in another payrun.`,
    });
  }

  for (const payslip of payrun.payslips) {
    const employee = payslip.employee;

    // Needed by the bulk email step.
    if (!employee?.email) {
      warnings.push({
        code: 'MISSING_EMAIL',
        severity: 'error',
        employeeId: payslip.employeeId,
        employeeName: employee?.name,
        message: `${employee?.name ?? 'An employee'} has no email address, so their payslip cannot be sent.`,
      });
    }

    if (employee?.status === 'TERMINATED') {
      warnings.push({
        code: 'TERMINATED_EMPLOYEE',
        severity: 'warning',
        employeeId: payslip.employeeId,
        employeeName: employee.name,
        message: `${employee.name} is terminated but is included in this payrun.`,
      });
    }

    if (payslip.lines.length === 0) {
      warnings.push({
        code: 'NOT_COMPUTED',
        severity: 'warning',
        employeeId: payslip.employeeId,
        employeeName: employee?.name,
        message: `${employee?.name ?? 'An employee'} has no computed salary lines. Run Compute first.`,
      });
    } else if (payslip.netSalary <= 0) {
      warnings.push({
        code: 'NON_POSITIVE_NET',
        severity: 'error',
        employeeId: payslip.employeeId,
        employeeName: employee?.name,
        message: `${employee?.name ?? 'An employee'} has a net salary of ${payslip.netSalary}.`,
      });
    }

    // No contract covering the period means the engine had nothing to price.
    const contract = await prisma.contract.findFirst({
      where: {
        employeeId: payslip.employeeId,
        startDate: { lte: payrun.periodEndDate },
        OR: [{ endDate: null }, { endDate: { gte: payrun.periodStartDate } }],
      },
    });

    if (!contract) {
      warnings.push({
        code: 'NO_APPLICABLE_CONTRACT',
        severity: 'error',
        employeeId: payslip.employeeId,
        employeeName: employee?.name,
        message: `${employee?.name ?? 'An employee'} has no contract covering ${payrun.period}.`,
      });
    }
  }

  return warnings;
}
