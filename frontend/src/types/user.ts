export type Role =
  | 'EMPLOYEE'
  | 'HR_MANAGER'
  | 'HR_PAYROLL_USER'
  | 'HR_PAYROLL_MANAGER'
  | 'ADMIN';

export interface AuthDepartment {
  id: string;
  name: string;
}

export interface AuthEmployee {
  id: string;
  employeeCode: string;
  name: string;
  jobPosition: string;
  department: AuthDepartment | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  employeeId: string | null;
  employee?: AuthEmployee | null;
}

/** Human-readable role labels used across the UI. */
export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: 'Employee',
  HR_MANAGER: 'HR Manager',
  HR_PAYROLL_USER: 'HR Payroll User',
  HR_PAYROLL_MANAGER: 'HR Payroll Manager',
  ADMIN: 'Admin',
};

/**
 * Landing route per role — PRD Screen 1 ("Automatically routes the user to
 * their designated landing page").
 */
export const roleLandingPath = (user: AuthUser): string => {
  switch (user.role) {
    case 'EMPLOYEE':
      return user.employeeId ? `/employees/${user.employeeId}` : '/attendance';
    case 'HR_MANAGER':
      return '/employees';
    case 'HR_PAYROLL_USER':
      return '/payroll/payruns';
    case 'HR_PAYROLL_MANAGER':
    case 'ADMIN':
      return '/dashboard';
    default:
      return '/employees';
  }
};
