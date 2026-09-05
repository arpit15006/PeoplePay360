/** Mockup "Menus under Employees" — Departments list. */
export interface Department {
  id: string
  name: string
  managerId: string | null
  manager?: { id: string; name: string } | null
  _count?: { employees: number }
  createdAt: string
  updatedAt: string
}
