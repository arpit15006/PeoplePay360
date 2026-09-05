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

export interface DashboardAlert {
  type: 'warning' | 'info';
  message: string;
}

export interface DashboardMetrics {
  period: string;
  kpis: DashboardKpis;
  attendanceHealth: AttendanceHealth;
  salaryCostByDepartment: DepartmentSalaryCost[];
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
