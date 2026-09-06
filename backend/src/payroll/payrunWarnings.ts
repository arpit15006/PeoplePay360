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
 * The error-severity codes that genuinely stop a payslip being emailed.
 *
 * MISSING_BANK_DETAILS is deliberately absent. It stops an employee being
 * *paid*; it has no bearing on emailing them a PDF of what they are owed, and
 * blocking a 200-person send over one missing IFSC would be wrong.
 */
export const SEND_BLOCKING_CODES = [
  'DUPLICATE_PAYSLIP',
  'MISSING_EMAIL',
  'NON_POSITIVE_NET',
  'NO_APPLICABLE_CONTRACT',
] as const;

/** Whether a warning should stop the send for the employee it names. */
export function blocksSending(warning: PayrunWarning): boolean {
  return (
    warning.severity === 'error' &&
    (SEND_BLOCKING_CODES as readonly string[]).includes(warning.code)
  );
}

/**
 * Collects the issues a payroll officer should see before finalising a payrun.
 *
 * The spec asks for warnings such as missing bank details and duplicate payslips
 * to be surfaced prior to finalisation.
 */
export async function collectPayrunWarnings(payrunId: string): Promise<PayrunWarning[]> {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    include: {
      payslips: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              bankName: true,
              bankAccountNumber: true,
              ifscCode: true,
            },
          },
          lines: true,
        },
      },
    },
  });

  if (!payrun) return [];

  const warnings: PayrunWarning[] = [];

  // Missing bank details. Payroll cannot pay someone it has no account for, so
  // this blocks finalisation rather than merely noting it.
  for (const payslip of payrun.payslips) {
    const e = payslip.employee;
    const missing = [
      !e.bankName && 'bank name',
      !e.bankAccountNumber && 'account number',
      !e.ifscCode && 'IFSC code',
    ].filter(Boolean) as string[];

    if (missing.length > 0) {
      warnings.push({
        code: 'MISSING_BANK_DETAILS',
        severity: 'error',
        employeeId: e.id,
        message: `${e.name} is missing ${missing.join(', ')} and cannot be paid.`,
      });
    }
  }

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
