export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type EmployeeType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';

/** One row of the PRD Screen 2 employees list. Mirrors the Prisma Employee model. */
export interface EmployeeRow {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  department: string;
  jobPosition: string;
  manager: string | null;
  workingSchedule: string | null;
  employeeType: EmployeeType;
  status: EmployeeStatus;
}

/** Full record behind PRD Screen 3 (GET /api/employees/:id). */
export interface EmployeeDetail {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  jobPosition: string;
  employeeType: EmployeeType;
  status: EmployeeStatus;
  departmentId: string | null;
  managerId: string | null;
  scheduleId: string | null;
  department: { id: string; name: string } | null;
  manager: { id: string; name: string } | null;
  workingSchedule: { id: string; name: string; weeklyHours: number } | null;
  subordinates?: { id: string; name: string; employeeCode: string; jobPosition: string }[];
  /** Payment details. The payrun blocks finalisation while any are missing. */
  bankName: string | null;
  bankAccountNumber: string | null;
  ifscCode: string | null;
}

/** Counts behind the four smart buttons. */
export interface EmployeeRelatedCounts {
  contracts: number;
  attendances: number;
  timeOffRequests: number;
  timeOffAllocations: number;
  payslips: number;
}

export type EmployeeUpdate = Partial<{
  name: string;
  email: string;
  phone: string;
  jobPosition: string;
  employeeType: EmployeeType;
  status: EmployeeStatus;
  departmentId: string;
  managerId: string | null;
  scheduleId: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  ifscCode: string | null;
}>;

export const EMPLOYEE_TYPE_LABELS: Record<EmployeeType, string> = {
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  CONTRACT: 'Contract',
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: 'Active',
  ON_LEAVE: 'On Leave',
  TERMINATED: 'Terminated',
};

/** Initials used by the avatar fallback, e.g. "Aarav Sharma" -> "AS". */
export const initialsOf = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');

/** Payload the backend requires to create an employee. */
export interface EmployeeCreate {
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  jobPosition: string;
  employeeType: EmployeeType;
  status: EmployeeStatus;
  scheduleId?: string | null;
  managerId?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  ifscCode?: string | null;
}
