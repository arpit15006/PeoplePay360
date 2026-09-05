export type TimeOffStatus = 'TO_APPROVE' | 'APPROVED' | 'REFUSED';

export interface TimeOffType {
  id: string;
  name: string;
  unit: string;
  allocationRequired: boolean;
  approvalType: string;
  payrollIntegration: boolean;
  status: string;
  _count?: { requests: number; allocations: number };
}

export interface TimeOffAllocation {
  id: string;
  employeeId: string;
  timeOffTypeId: string;
  allocated: number;
  taken: number;
  remaining: number;
  validityYear: number;
  status: string;
  employee: { id: string; name: string; employeeCode: string } | null;
  timeOffType: { id: string; name: string; unit: string } | null;
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  timeOffTypeId: string;
  startDate: string;
  endDate: string;
  duration: number;
  reason: string;
  status: TimeOffStatus;
  approvedById: string | null;
  /** The list endpoint already returns the department and job position. */
  employee: {
    id: string;
    name: string;
    employeeCode: string;
    jobPosition?: string;
    department?: { name: string } | null;
  } | null;
  timeOffType: { id: string; name: string; unit: string } | null;
  approvedBy?: { id: string; name: string } | null;
}

export const TIMEOFF_STATUS_LABELS: Record<TimeOffStatus, string> = {
  TO_APPROVE: 'To Approve',
  APPROVED: 'Approved',
  REFUSED: 'Refused',
};

export const formatTimeOffDate = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', { timeZone: 'UTC' });

export const toUtcIso = (date: Date | undefined): string | null =>
  date ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString() : null;

export const fromUtcIso = (value: string | null | undefined): Date | undefined => {
  if (!value) return undefined;
  const d = new Date(value);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

/** Inclusive whole-day count between two dates, as the PRD counts leave. */
export const durationBetween = (start: Date | undefined, end: Date | undefined): number => {
  if (!start || !end) return 0;
  const ms = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
    Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  return ms < 0 ? 0 : Math.floor(ms / 86400000) + 1;
};
