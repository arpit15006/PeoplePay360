import type { Role } from '@/types/user';

/** PRD Screen 17 — Payroll Dashboard. Mirrors the payload of GET /api/dashboard. */

export interface DashboardKpis {
  totalNetSalaryPaid: number;
  totalGrossSalary: number;
  totalDeductions: number;
  payslipsGenerated: number;
  averageSalary: number;
  approvedTimeOff: number;
}

export interface AttendanceHealth {
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  totalLogs: number;
  /** Hours logged beyond the scheduled day. */
  overtimeHours: number;
  /** Clocked in but never clocked out. */
  missingCheckOuts: number;
  /** Records an authorised user corrected rather than the employee clocking. */
  manualEdits: number;
  /** Percentage of logged days the employee actually attended. */
  coverage: number;
}

/** One point on the monthly net salary trend. */
export interface SalaryTrendPoint {
  period: string;
  totalNet: number;
  totalGross: number;
  payslipsCount: number;
}

export interface DepartmentSalaryCost {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  payslipsCount: number;
  totalNet: number;
  totalGross: number;
}

export interface TimeOffOverviewRow {
  typeName: string;
  unit: string;
  approvedRequestsCount: number;
  totalDuration: number;
}

export type DashboardAlertCode = 'DRAFT_PAYRUNS' | 'PENDING_TIMEOFF';

export interface DashboardAlert {
  /** Absent on responses from an older server; the alert then simply is not a link. */
  code?: DashboardAlertCode;
  type: 'warning' | 'info';
  message: string;
}

/**
 * Where each alert sends you, with the target screen pre-filtered to the very
 * records the alert counted. Keyed by code rather than by message text so
 * rewording a sentence cannot silently break the link.
 *
 * `allow` mirrors the route guard on the destination. The dashboard is open to
 * HR Manager, who cannot reach Payruns — without this the draft-payrun alert
 * would be a link that bounces them straight back off the route. Those alerts
 * stay as plain text: the count is still worth seeing, it is simply not
 * theirs to act on.
 */
export const ALERT_DESTINATIONS: Record<
  DashboardAlertCode,
  { to: string; label: string; allow: Role[] }
> = {
  DRAFT_PAYRUNS: {
    to: '/payroll/payruns?status=DRAFT',
    label: 'View draft payruns',
    allow: ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'],
  },
  PENDING_TIMEOFF: {
    to: '/timeoff/requests?status=TO_APPROVE',
    label: 'Review pending requests',
    allow: ['EMPLOYEE', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'],
  },
};

export interface DashboardMetrics {
  period: string;
  kpis: DashboardKpis;
  attendanceHealth: AttendanceHealth;
  salaryCostByDepartment: DepartmentSalaryCost[];
  salaryTrend: SalaryTrendPoint[];
  timeOffOverview: TimeOffOverviewRow[];
  alerts: DashboardAlert[];
}

export interface DashboardFilters {
  period?: string;
  departmentId?: string;
  employeeType?: string;
}

/**
 * The server derives deductions per department as gross - net. Charting both
 * gross and net as separate bars would double-count the net portion, so the
 * stacked bar shows net + deductions, which sums to gross.
 */
export const departmentDeductions = (row: DepartmentSalaryCost) =>
  Math.round((row.totalGross - row.totalNet) * 100) / 100;

/** Indian numbering, no decimals — matches the payslip screens. */
export const money = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

/** Compact axis labels: 1,69,258 -> ₹1.7L */
export const moneyCompact = (n: number) => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
};
