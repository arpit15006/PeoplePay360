import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import type { ColumnDef, PaginationState, RowSelectionState, SortingState } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger
} from '@/components/ui/stepper'
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowRight,
  IconChevronDown,
  IconChevronUp,
  IconSearch
} from '@tabler/icons-react'

import EmployeeStatusBadge from '@/components/employees/EmployeeStatusBadge'
import {
  DataTableFacetFilter,
  DataTablePagination
} from '@/components/shadcn-studio/data-table/data-table-parts'
import { useContracts } from '@/hooks/useContracts'
import { useCreatePayrun } from '@/hooks/usePayruns'
import { useSalaryStructures } from '@/hooks/useSalary'
import { useEmployees } from '@/hooks/useEmployees'
import {
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_TYPE_LABELS,
  initialsOf,
  type EmployeeRow,
  type EmployeeStatus
} from '@/types/employee'
import { monthOptions, periodBounds } from '@/types/payrun'

const STEPS = [
  { id: 'scope', title: 'Payrun Configuration' },
  { id: 'employees', title: 'Select Employees' }
]

/**
 * PRD Screen 12 — the two step payrun wizard.
 *
 * Nothing is written on Continue: the payrun record is only created when
 * "Create Payrun" is pressed on step 2, and it contains only the employees
 * explicitly selected there.
 */
export function PayrunWizard() {
  const navigate = useNavigate()
  const { data: structures = [] } = useSalaryStructures()
  const { data: employees = [] } = useEmployees()
  const { data: contracts = [] } = useContracts()
  const createPayrun = useCreatePayrun()

  const now = new Date()
  const [step, setStep] = useState<'scope' | 'employees'>('scope')
  const [structureId, setStructureId] = useState('')
  const [month, setMonth] = useState(String(now.getMonth()))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [search, setSearch] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 8 })
  const [error, setError] = useState<string | null>(null)

  // The table owns the ticks, keyed by employee id, so a selection survives
  // searching, filtering, sorting and paging.
  const selected = useMemo(() => Object.keys(rowSelection).filter(id => rowSelection[id]), [rowSelection])

  const period = `${monthOptions[Number(month)]} ${year}`

  // A retired structure is refused by the server, so it is not offered here.
  const activeStructures = useMemo(() => structures.filter(s => s.status === 'Active'), [structures])
  const structureName = structures.find(s => s.id === structureId)?.name ?? 'this structure'

  // Selection is keyed by employee id and `selected` is derived from it, so a
  // tick made under one structure would otherwise survive a switch to another
  // and be submitted even though that employee is no longer listed.
  useEffect(() => {
    setRowSelection({})
  }, [structureId, month, year])

  /**
   * Only employees the chosen structure actually applies to.
   *
   * A payrun runs one salary structure's rules, so listing everybody invited
   * the mistake of paying a Regular Salary employee under Executive Salary
   * rules. The test mirrors what the server does when it auto-selects: an
   * ACTIVE contract on this structure, valid at some point in the period.
   */
  const eligible = useMemo(() => {
    if (!structureId) return []

    const bounds = periodBounds(Number(month), Number(year))
    const periodStart = new Date(bounds.periodStartDate)
    const periodEnd = new Date(bounds.periodEndDate)

    const eligibleIds = new Set(
      contracts
        .filter(c => {
          if (c.salaryStructureId !== structureId) return false
          if (c.status !== 'ACTIVE') return false
          // An open-ended contract has no end date, so it never expires.
          const start = new Date(c.startDate)
          const end = c.endDate ? new Date(c.endDate) : null
          return start <= periodEnd && (end === null || end >= periodStart)
        })
        .map(c => c.employeeId)
    )

    return employees.filter(e => eligibleIds.has(e.id))
  }, [contracts, employees, structureId, month, year])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return eligible.filter(
      e =>
        !term ||
        e.name.toLowerCase().includes(term) ||
        e.employeeCode.toLowerCase().includes(term) ||
        e.department.toLowerCase().includes(term)
    )
  }, [eligible, search])

  const columns = useMemo<ColumnDef<EmployeeRow>[]>(
    () => [
      {
        id: 'select',
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            // Everything the current filters leave visible, not just this page —
            // paging through to tick each one would be the wrong default here.
            checked={
              table.getIsAllRowsSelected() || (table.getIsSomeRowsSelected() && 'indeterminate')
            }
            onCheckedChange={value => table.toggleAllRowsSelected(!!value)}
            aria-label='Include every listed employee'
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={value => row.toggleSelected(!!value)}
            aria-label={`Include ${row.original.name}`}
          />
        ),
        size: 50
      },
      {
        id: 'employee',
        header: 'Employee',
        accessorKey: 'name',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <Avatar className='size-9'>
              <AvatarFallback className='text-xs'>{initialsOf(row.original.name)}</AvatarFallback>
            </Avatar>
            <div className='flex min-w-0 flex-col'>
              <span className='truncate font-medium'>{row.original.name}</span>
              <span className='text-muted-foreground truncate'>{row.original.employeeCode}</span>
            </div>
          </div>
        ),
        size: 280
      },
      {
        id: 'department',
        header: 'Department',
        accessorKey: 'department',
        filterFn: 'equalsString',
        cell: ({ getValue }) => <span className='text-muted-foreground'>{getValue<string>()}</span>
      },
      {
        id: 'jobPosition',
        header: 'Job Position',
        accessorKey: 'jobPosition',
        filterFn: 'equalsString',
        cell: ({ getValue }) => <span className='text-muted-foreground'>{getValue<string>()}</span>
      },
      {
        id: 'employeeType',
        header: 'Type',
        accessorKey: 'employeeType',
        filterFn: 'equalsString',
        cell: ({ row }) => (
          <span className='text-muted-foreground'>
            {EMPLOYEE_TYPE_LABELS[row.original.employeeType]}
          </span>
        )
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        filterFn: 'equalsString',
        cell: ({ row }) => <EmployeeStatusBadge status={row.original.status} />
      }
    ],
    []
  )

  const table = useReactTable({
    data: filtered,
    columns,
    getRowId: row => row.id,
    state: { rowSelection, sorting, pagination },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false
  })

  // Someone can tick a row, then narrow the filters until it is out of sight.
  // A payrun is not the place to include people the screen is no longer
  // showing, so the count is stated rather than left to be discovered later.
  const visibleIds = new Set(table.getFilteredRowModel().rows.map(r => r.id))
  const hiddenSelectedCount = selected.filter(id => !visibleIds.has(id)).length

  const goToEmployees = () => {
    setError(null)
    if (!structureId) return setError('Select a salary structure.')
    // Explicitly does not create anything — just advances the wizard.
    setStep('employees')
  }

  const create = async () => {
    setError(null)
    if (selected.length === 0) return setError('Select at least one employee.')

    try {
      const payrun = await createPayrun.mutateAsync({
        salaryStructureId: structureId,
        period,
        ...periodBounds(Number(month), Number(year)),
        employeeIds: selected
      })
      toast.success(`Payrun created for ${period}`, {
        description: `${selected.length} employee${selected.length === 1 ? '' : 's'} included.`
      })
      navigate(`/payroll/payruns/${payrun.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the payrun.')
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => navigate('/payroll/payruns')}
          aria-label='Back to payruns'
        >
          <IconArrowLeft />
        </Button>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Create Payrun</h1>
          <p className='text-muted-foreground text-sm'>
            Define the scope, then choose exactly who is included.
          </p>
        </div>
      </div>

      <Card>
        <CardContent>
          <Stepper steps={STEPS} value={step} className='flex w-full items-center'>
            <StepperNav>
              {STEPS.map((s, index) => (
                <StepperItem key={s.id} stepId={s.id} className='relative flex-1'>
                  <StepperTrigger className='flex flex-col gap-2.5' disabled>
                    <StepperIndicator>{index + 1}</StepperIndicator>
                    <StepperTitle>{s.title}</StepperTitle>
                  </StepperTrigger>
                  {STEPS.length > index + 1 && (
                    <StepperSeparator className='absolute inset-x-0 top-2 right-[calc(-50%+18px)] left-[calc(50%+18px)]' />
                  )}
                </StepperItem>
              ))}
            </StepperNav>
          </Stepper>
        </CardContent>
      </Card>

      {error && (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
          {error}
        </div>
      )}

      {step === 'scope' ? (
        <Card>
          <CardContent className='space-y-5'>
            <div className='space-y-1.5'>
              <Label>Salary Structure</Label>
              <Select value={structureId} onValueChange={setStructureId}>
                <SelectTrigger className='w-full max-w-md'>
                  <SelectValue placeholder='Select salary structure' />
                </SelectTrigger>
                <SelectContent>
                  {activeStructures.length === 0 ? (
                    <div className='text-muted-foreground p-3 text-sm'>
                      No active salary structure. Activate one first.
                    </div>
                  ) : (
                    activeStructures.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label>Period</Label>
              <div className='flex max-w-md gap-3'>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className='flex-1'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((m, i) => (
                      <SelectItem key={m} value={String(i)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className='w-32'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className='text-muted-foreground text-xs'>Payrun period: {period}</p>
            </div>

            <div className='flex justify-end'>
              <Button onClick={goToEmployees}>
                Continue
                <IconArrowRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className='w-full py-0'>
          <div className='border-b'>
            <div className='flex flex-col gap-4 p-6'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <span className='text-xl font-semibold'>Filter</span>
                <div className='flex flex-wrap items-center gap-2'>
                  {hiddenSelectedCount > 0 && (
                    <Badge className='border-none bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400'>
                      <IconAlertTriangle className='size-3.5' />
                      {hiddenSelectedCount} selected but hidden by filters
                    </Badge>
                  )}
                  <Badge className='border-none bg-primary/10 text-primary'>
                    Selected: {selected.length}
                  </Badge>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
                <div className='w-full space-y-2'>
                  <Label htmlFor='payrun-employee-search'>Search</Label>
                  <InputGroup>
                    <InputGroupAddon align='inline-start'>
                      <IconSearch className='size-4' />
                    </InputGroupAddon>
                    <InputGroupInput
                      id='payrun-employee-search'
                      placeholder='Name, code or department…'
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      aria-label='Search employees'
                    />
                  </InputGroup>
                </div>
                <DataTableFacetFilter column={table.getColumn('department')} label='Department' />
                <DataTableFacetFilter column={table.getColumn('jobPosition')} label='Job Position' />
                <DataTableFacetFilter
                  column={table.getColumn('status')}
                  label='Status'
                  format={value => EMPLOYEE_STATUS_LABELS[value as EmployeeStatus] ?? value}
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id} className='h-14 border-t'>
                    {headerGroup.headers.map(header => (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() ? `${header.getSize()}px` : undefined }}
                        className='text-muted-foreground first:pl-4 last:px-4'
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <div
                            className='flex h-full cursor-pointer items-center justify-between gap-2 select-none'
                            onClick={header.column.getToggleSortingHandler()}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                header.column.getToggleSortingHandler()?.(e)
                              }
                            }}
                            tabIndex={0}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: <IconChevronUp className='size-4 shrink-0 opacity-60' aria-hidden='true' />,
                              desc: <IconChevronDown className='size-4 shrink-0 opacity-60' aria-hidden='true' />
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map(row => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className='cursor-pointer'
                      // The whole row toggles, the way the old list of labels did.
                      onClick={() => row.toggleSelected(!row.getIsSelected())}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id} className='h-14 first:w-12.5 first:pl-4 last:px-4'>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className='h-24 text-center'>
                      {eligible.length === 0 ? (
                        <span className='text-muted-foreground text-sm'>
                          No employee has an active contract on <strong>{structureName}</strong> for{' '}
                          {period}. Assign one from the Contracts screen first.
                        </span>
                      ) : (
                        'No employees match.'
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination table={table} noun='employees' />

          <div className='flex justify-between border-t px-6 py-4'>
            <Button variant='outline' onClick={() => setStep('scope')}>
              <IconArrowLeft />
              Back
            </Button>
            <Button onClick={create} disabled={createPayrun.isPending}>
              {createPayrun.isPending ? 'Creating…' : 'Create Payrun'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

export default PayrunWizard
