import type { Role } from './user'

/** PRD Screen 0 / section 3 — Admin user management. */
export interface ManagedUser {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
  employeeId: string | null
  createdAt: string
  updatedAt: string
  employee?: { id: string; name: string; employeeCode: string; jobPosition: string } | null
}

export interface UserInput {
  email: string
  name: string
  password?: string
  role: Role
  employeeId?: string | null
  isActive?: boolean
}

export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: 'Employee',
  HR_MANAGER: 'HR Manager',
  HR_PAYROLL_USER: 'HR Payroll User',
  HR_PAYROLL_MANAGER: 'HR Payroll Manager',
  ADMIN: 'Admin',
}

export const ROLE_ORDER: Role[] = [
  'EMPLOYEE',
  'HR_MANAGER',
  'HR_PAYROLL_USER',
  'HR_PAYROLL_MANAGER',
  'ADMIN',
]
