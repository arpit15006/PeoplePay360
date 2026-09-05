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
