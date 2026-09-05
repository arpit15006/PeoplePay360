export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export interface ContractRow {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string | null;
  wage: number;
  departmentId: string;
  position: string;
  salaryStructureId: string;
  status: ContractStatus;
  employee: { id: string; name: string; employeeCode: string } | null;
  department: { id: string; name: string } | null;
  salaryStructure: { id: string; name: string } | null;
}

export type ContractInput = {
  employeeId: string;
  startDate: string;
  endDate: string | null;
  wage: number;
  departmentId: string;
  position: string;
  salaryStructureId: string;
  status: ContractStatus;
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated',
};

/** Indian rupee formatting, matching the PRD's wage examples (₹75,000). */
export const formatWage = (wage: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(wage);

/**
 * Contract dates are calendar dates, not instants. The API stores them as UTC
 * (the seed uses 2026-12-31T23:59:59Z), so formatting in local time shifts the
 * boundary a day forward in any positive-offset zone — IST rendered that end
 * date as 01/01/2027. Everything below therefore works in UTC.
 */
export const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : '—';

/** ISO instant -> a local Date at midnight on the same calendar day. */
export const isoToLocalDate = (value: string | null | undefined): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
};

/** Local Date -> a UTC-midnight ISO instant on the same calendar day. */
export const localDateToIso = (date: Date | undefined): string | null =>
  date ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString() : null;

/**
 * A contract applies to a period when it starts on or before the period ends
 * and has not already ended when the period starts. This mirrors the server's
 * ContractService.findApplicableContract query used by payroll.
 */
export const appliesToDate = (contract: ContractRow, when: Date) => {
  const start = new Date(contract.startDate);
  const end = contract.endDate ? new Date(contract.endDate) : null;
  return start <= when && (!end || end >= when);
};
