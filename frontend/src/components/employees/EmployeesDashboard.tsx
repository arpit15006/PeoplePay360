import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconPlus, IconSearch } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import ToggleGroupViewSwitcher, {
  type EmployeesView
} from '@/components/shadcn-studio/toggle-group/toggle-group-05'

import EmployeesDataTable from '@/components/employees/EmployeesDataTable'
import EmployeesKanban from '@/components/employees/EmployeesKanban'
import { useEmployees } from '@/hooks/useEmployees'
import { useAuth } from '@/context/AuthContext'
import type { EmployeeRow, EmployeeStatus } from '@/types/employee'

/** Roles allowed to create employees — PRD §28 (Employee sees own record only). */
const CAN_CREATE = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

const SELECT_CLASS =
  'border-input bg-background h-8 rounded-lg border px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

/** PRD Screen 2 — Employees (List & Kanban). */
export function EmployeesDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, isLoading, isError, error } = useEmployees()

  const [view, setView] = useState<EmployeesView>('kanban')
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('name')

  const employees = useMemo(() => data ?? [], [data])

  const departments = useMemo(
    () => Array.from(new Set(employees.map(e => e.department))).sort(),
    [employees]
  )

  // PRD §28: an Employee may only see their own record.
  const scoped = useMemo(() => {
    if (user?.role === 'EMPLOYEE') {
      return employees.filter(e => e.id === user.employeeId)
    }
    return employees
  }, [employees, user])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    const rows = scoped.filter(e => {
      const matchesSearch =
        !term ||
        e.name.toLowerCase().includes(term) ||
        e.email.toLowerCase().includes(term) ||
        e.employeeCode.toLowerCase().includes(term) ||
        e.jobPosition.toLowerCase().includes(term)

      const matchesDepartment = department === 'all' || e.department === department
      const matchesStatus = status === 'all' || e.status === (status as EmployeeStatus)

      return matchesSearch && matchesDepartment && matchesStatus
    })

    return [...rows].sort((a, b) =>
      sort === 'department'
        ? a.department.localeCompare(b.department) || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name)
    )
  }, [scoped, search, department, status, sort])

  const openEmployee = (employee: EmployeeRow) => navigate(`/employees/${employee.id}`)

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Employees</h1>
          <p className='text-muted-foreground text-sm'>
            Manage your organization&apos;s employees and their employment information.
          </p>
        </div>

        {user && CAN_CREATE.includes(user.role) && (
          <Button onClick={() => navigate('/employees/new')}>
            <IconPlus />
            New
          </Button>
        )}
      </div>

      {/* Toolbar: search, filters, view switcher */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <InputGroup className='w-64'>
            <InputGroupAddon align='inline-start'>
              <IconSearch className='size-4' />
            </InputGroupAddon>
            <InputGroupInput
              placeholder='Search...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label='Search employees'
            />
          </InputGroup>

          {/* Plain selects until a shadcn select variant is supplied. */}
          <select
            className={SELECT_CLASS}
            value={department}
            onChange={e => setDepartment(e.target.value)}
            aria-label='Filter by department'
          >
            <option value='all'>All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            className={SELECT_CLASS}
            value={status}
            onChange={e => setStatus(e.target.value)}
            aria-label='Filter by status'
          >
            <option value='all'>All Statuses</option>
            <option value='ACTIVE'>Active</option>
            <option value='ON_LEAVE'>On Leave</option>
            <option value='TERMINATED'>Terminated</option>
          </select>

          <select
            className={SELECT_CLASS}
            value={sort}
            onChange={e => setSort(e.target.value)}
            aria-label='Sort employees'
          >
            <option value='name'>Sort by: Name (A–Z)</option>
            <option value='department'>Sort by: Department</option>
          </select>
        </div>

        <ToggleGroupViewSwitcher value={view} onValueChange={setView} />
      </div>

      {/* Body */}
      {isLoading ? (
        <EmployeesLoadingSkeleton />
      ) : isError ? (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
          Could not load employees{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      ) : view === 'list' ? (
        <EmployeesDataTable data={filtered} onRowClick={openEmployee} />
      ) : (
        <EmployeesKanban data={filtered} onCardClick={openEmployee} />
      )}

      {!isLoading && !isError && (
        <p className='text-muted-foreground text-sm'>
          Showing {filtered.length} of {scoped.length} employees
        </p>
      )}
    </div>
  )
}

/** skeleton-11 layout, sized for the employees table. */
const EmployeesLoadingSkeleton = () => (
  <div className='flex w-full flex-col gap-4'>
    <div className='flex items-center gap-4 border-b pb-2'>
      <Skeleton className='size-8 rounded-md' />
      <Skeleton className='h-8 flex-1' />
      <Skeleton className='h-8 w-24' />
      <Skeleton className='h-8 w-20' />
    </div>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className='flex items-center gap-4'>
        <Skeleton className='size-8 rounded-md' />
        <Skeleton className='h-8 flex-1' />
        <Skeleton className='h-8 w-24' />
        <Skeleton className='h-8 w-20' />
      </div>
    ))}
  </div>
)

export default EmployeesDashboard
