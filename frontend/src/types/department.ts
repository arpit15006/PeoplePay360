/** Mockup "Menus under Employees" — Departments. */
export interface Department {
  id: string
  name: string
  managerId: string | null
  manager?: { id: string; name: string; employeeCode: string } | null
  _count?: { employees: number; contracts: number }
  createdAt: string
  updatedAt: string
}

export interface DepartmentInput {
  name: string
  managerId?: string | null
}
