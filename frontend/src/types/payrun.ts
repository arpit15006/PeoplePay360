import type { RuleCategory } from '@/types/payroll';

export type PayrunStatus = 'DRAFT' | 'COMPUTED' | 'VALIDATED' | 'PAID' | 'SENT';
export type PayslipStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'SENT';

export interface PayslipLine {
  id: string;
  code: string;
  name: string;
  category: RuleCategory;
  sequence: number;
  amount: number;
}

export interface Payslip {
  id: string;
  payrunId: string;
  employeeId: string;
  period: string;
  workedDays: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  status: PayslipStatus;
  sentAt: string | null;
  employee: { id: string; name: string; employeeCode: string; jobPosition?: string; department?: { name: string } | null } | null;
  salaryStructure?: { id: string; name: string } | null;
  payrun?: { id: string; period: string; status: PayrunStatus } | null;
  lines?: PayslipLine[];
}

export interface Payrun {
  id: string;
  salaryStructureId: string;
  period: string;
  periodStartDate: string;
  periodEndDate: string;
  status: PayrunStatus;
  salaryStructure?: { id: string; name: string } | null;
  /** The list endpoint returns only { netSalary }; the detail endpoint returns full payslips. */
  payslips: Payslip[];
  _count?: { payslips: number };
}

export interface PayrunWarning {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  employeeId?: string;
  employeeName?: string;
}

export const PAYRUN_STATUS_LABELS: Record<PayrunStatus, string> = {
  DRAFT: 'Draft', COMPUTED: 'Computed', VALIDATED: 'Validated', PAID: 'Paid', SENT: 'Sent',
};

export const PAYSLIP_STATUS_LABELS: Record<PayslipStatus, string> = {
  DRAFT: 'Draft', CONFIRMED: 'Confirmed', PAID: 'Paid', SENT: 'Sent',
};

export const PAYRUN_STATUS_CLASSES: Record<PayrunStatus, string> = {
  DRAFT: 'border-none bg-slate-600/10 text-slate-600 dark:bg-slate-400/10 dark:text-slate-400',
  COMPUTED: 'border-none bg-sky-600/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400',
  VALIDATED: 'border-none bg-blue-600/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400',
  PAID: 'border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400',
  SENT: 'border-none bg-emerald-600/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400',
};

/** The payrun lifecycle order the server enforces. */
export const PAYRUN_FLOW: PayrunStatus[] = ['DRAFT', 'COMPUTED', 'VALIDATED', 'PAID', 'SENT'];

export const money = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export const monthOptions = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

/** First and last day of a month as UTC instants, matching how periods are stored. */
export const periodBounds = (monthIndex: number, year: number) => ({
  periodStartDate: new Date(Date.UTC(year, monthIndex, 1)).toISOString(),
  periodEndDate: new Date(Date.UTC(year, monthIndex + 1, 0)).toISOString(),
});
