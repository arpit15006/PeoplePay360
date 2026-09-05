import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IconPlus, IconSearch, IconUpload, IconX } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import ToggleGroupViewSwitcher, {
  type EmployeesView
} from '@/components/shadcn-studio/toggle-group/toggle-group-05'
import DropdownMenuCheckboxFilter from '@/components/shadcn-studio/dropdown-menu/dropdown-menu-13'
import BulkImportDialog from '@/components/bulk/BulkImportDialog'
import { employeeImportConfig } from '@/components/bulk/importConfigs'
import { useImportContext } from '@/hooks/useImportContext'

import EmployeesDataTable from '@/components/employees/EmployeesDataTable'
import EmployeesKanban from '@/components/employees/EmployeesKanban'
import { useEmployees } from '@/hooks/useEmployees'
import { useDepartmentList } from '@/hooks/useDepartmentList'
import { useAuth } from '@/context/AuthContext'
import type { EmployeeRow, EmployeeStatus } from '@/types/employee'

/** Roles allowed to create employees — PRD §28 (Employee sees own record only). */
const CAN_CREATE = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'TERMINATED', label: 'Terminated' }
]

const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'department', label: 'Department' }
]

/** PRD Screen 2 — Employees (List & Kanban). */
export function EmployeesDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, isLoading, isError, error } = useEmployees()
  const { data: allDepartments = [] } = useDepartmentList()
  const [searchParams, setSearchParams] = useSearchParams()

  const [view, setView] = useState<EmployeesView>('kanban')
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('name')
  const [importing, setImporting] = useState(false)

  const importContext = useImportContext()

  const employees = useMemo(() => data ?? [], [data])

  // Arriving from a department's "View employees" carries the department id.
  // The id is what travels, because it survives a rename, but the row filter
  // matches on the department's name, so it is resolved once the list loads.
  const departmentIdParam = searchParams.get('departmentId')
  useEffect(() => {
    if (!departmentIdParam) return
    const match = allDepartments.find(d => d.id === departmentIdParam)
    if (match) setDepartment(match.name)
  }, [departmentIdParam, allDepartments])

  const clearDepartmentFilter = () => {
    setDepartment('all')
    searchParams.delete('departmentId')
    setSearchParams(searchParams, { replace: true })
  }

  const departmentOptions = useMemo(
    () => [
      { value: 'all', label: 'All Departments' },
      ...Array.from(new Set(employees.map(e => e.department)))
        .sort()
        .map(d => ({ value: d, label: d }))
    ],
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
          <div className='flex items-center gap-2'>
            <Button variant='outline' onClick={() => setImporting(true)}>
              <IconUpload />
              Import CSV
            </Button>
            <Button onClick={() => navigate('/employees/new')}>
              <IconPlus />
              New
            </Button>
          </div>
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

          <DropdownMenuCheckboxFilter
            label='Department'
            options={departmentOptions}
            value={department}
            onValueChange={next => {
              setDepartment(next)
              // Changing it by hand should not leave a stale id in the URL.
              if (departmentIdParam) {
                searchParams.delete('departmentId')
                setSearchParams(searchParams, { replace: true })
              }
            }}
            aria-label='Filter by department'
          />

          {/* Say plainly that the list is narrowed, and offer the way out. */}
          {department !== 'all' && (
            <Button variant='outline' size='sm' onClick={clearDepartmentFilter}>
              <IconX />
              Showing {department} only
            </Button>
          )}

          <DropdownMenuCheckboxFilter
            label='Status'
            options={STATUS_OPTIONS}
            value={status}
            onValueChange={setStatus}
            aria-label='Filter by status'
          />

          <DropdownMenuCheckboxFilter
            label='Sort by'
            triggerPrefix='Sort by: '
            options={SORT_OPTIONS}
            value={sort}
            onValueChange={setSort}
            aria-label='Sort employees'
          />
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

      {/* The list view carries its own "Showing 1 to 10 of 42" footer, so this
          count is only needed behind the Kanban. */}
      {!isLoading && !isError && view === 'kanban' && (
        <p className='text-muted-foreground text-sm'>
          Showing {filtered.length} of {scoped.length} employees
        </p>
      )}

      <BulkImportDialog
        open={importing}
        onOpenChange={setImporting}
        config={employeeImportConfig}
        context={importContext}
      />
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
