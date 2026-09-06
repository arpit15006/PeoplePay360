import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState
} from '@tanstack/react-table'
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

import { PersonAvatar } from '@/components/common/PersonAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  IconPlus,
  IconUpload,
  IconDotsVertical,
  IconEdit,
  IconBan,
  IconChevronDown,
  IconChevronUp,
  IconFilePlus,
  IconAlertTriangle,
  IconSearch,
  IconX
} from '@tabler/icons-react'

import {
  DataTableFacetFilter,
  DataTablePagination
} from '@/components/shadcn-studio/data-table/data-table-parts'
import ContractStatusBadge from '@/components/contracts/ContractStatusBadge'
import BulkImportDialog from '@/components/bulk/BulkImportDialog'
import { contractImportConfig } from '@/components/bulk/importConfigs'
import { useImportContext } from '@/hooks/useImportContext'
import { useContracts, useSalaryStructures } from '@/hooks/useContracts'
import { useEmployees } from '@/hooks/useEmployees'
import { useDepartments } from '@/hooks/useEmployee'
import { contractsApi } from '@/api/contracts'
import { useAuth } from '@/context/AuthContext'
import { runBulk } from '@/lib/bulk'
import DatePicker from '@/components/common/DatePicker'
import { formatDate, formatWage, localDateToIso, type ContractStatus } from '@/types/contract'
import type { Role } from '@/types/user'

/** PRD section 28 — Contracts is CRUD for every role except Employee. */
const CAN_MANAGE: Role[] = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

/** Only Payroll may put a contract on a salary structure, so only they can assign in bulk. */
const CAN_ASSIGN: Role[] = ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

/**
 * Not a contract status the database knows about — it is the absence of one.
 * An employee with no contract at all is exactly who this screen should be
 * prompting about, so they are listed here rather than being invisible until
 * someone notices payroll skipped them.
 */
const UNASSIGNED = 'UNASSIGNED'

/** Sentinel for "do not override the department", since a Select needs a value. */
const FOLLOW_EMPLOYEE = '__follow__'

/**
 * The rows here are tinted — green for the active contract, amber for someone
 * without one — and the default checkbox border is light enough to disappear
 * against them. A darker border keeps the box visible on any row, and the
 * disabled ones fade less far so they read as unavailable rather than absent.
 */
const SELECT_BOX = 'border-muted-foreground/60 disabled:opacity-40'

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  DRAFT: 'Draft',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated',
  [UNASSIGNED]: 'No contract'
}

/** A contract, or an employee who has none. */
type Row = {
  id: string
  kind: 'contract' | 'unassigned'
  employeeId: string
  employeeName: string
  employeeCode: string
  startDate: string | null
  endDate: string | null
  wage: number | null
  departmentName: string
  position: string
  structureName: string
  status: string
}

const NO_DEPARTMENT = 'No department'
const NO_STRUCTURE = 'No structure'

/** PRD Screen 4 — Contract List. */
export function ContractsList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Set by the Employee Form smart button: /contracts?employeeId=...
  const employeeId = searchParams.get('employeeId') ?? undefined
  const { data: contracts = [], isLoading, isError, error } = useContracts(employeeId)
  const { data: employees = [] } = useEmployees()

  const canManage = !!user && CAN_MANAGE.includes(user.role)
  const canAssign = !!user && CAN_ASSIGN.includes(user.role)
  /** An Employee sees only their own contracts — one name, one department. */
  const isSelf = user?.role === 'EMPLOYEE'
  const { data: structures = [] } = useSalaryStructures(canAssign)
  const { data: departments = [] } = useDepartments()

  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignFailures, setAssignFailures] = useState<{ label: string; message: string }[]>([])
  const [draft, setDraft] = useState<{
    startDate: Date | undefined
    endDate: Date | undefined
    wage: number
    departmentId: string
    position: string
    salaryStructureId: string
    status: ContractStatus
  }>({
    startDate: undefined,
    endDate: undefined,
    wage: 0,
    departmentId: '',
    position: '',
    salaryStructureId: '',
    status: 'ACTIVE'
  })
  const [importing, setImporting] = useState(false)

  const importContext = useImportContext()

  // Free text is applied before the table so the faceted selects only offer
  // values that survive the search.
  const rows = useMemo<Row[]>(() => {
    const fromContracts: Row[] = contracts.map(c => ({
      id: c.id,
      kind: 'contract',
      employeeId: c.employeeId,
      employeeName: c.employee?.name ?? '—',
      employeeCode: c.employee?.employeeCode ?? '',
      startDate: c.startDate,
      endDate: c.endDate,
      wage: c.wage,
      departmentName: c.department?.name ?? NO_DEPARTMENT,
      position: c.position,
      structureName: c.salaryStructure?.name ?? NO_STRUCTURE,
      status: c.status
    }))

    // Anyone with no contract on record at all. Filtering by employee narrows
    // to one person, so the unassigned list follows that same filter.
    const covered = new Set(contracts.map(c => c.employeeId))
    const unassigned: Row[] = employees
      .filter(e => !covered.has(e.id) && (!employeeId || e.id === employeeId))
      .map(e => ({
        id: `unassigned:${e.id}`,
        kind: 'unassigned' as const,
        employeeId: e.id,
        employeeName: e.name,
        employeeCode: e.employeeCode,
        startDate: null,
        endDate: null,
        wage: null,
        departmentName: e.department || NO_DEPARTMENT,
        position: e.jobPosition || '—',
        structureName: NO_STRUCTURE,
        status: UNASSIGNED
      }))

    const term = search.trim().toLowerCase()
    const all = [...unassigned, ...fromContracts]
    const matched = !term
      ? all
      : all.filter(
          r =>
            r.employeeName.toLowerCase().includes(term) ||
            r.employeeCode.toLowerCase().includes(term) ||
            r.position.toLowerCase().includes(term)
        )

    // People still waiting for a contract come first — they are the ones that
    // need doing. The rest stay newest first.
    return [...matched].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'unassigned' ? -1 : 1
      if (a.kind === 'unassigned') return a.employeeName.localeCompare(b.employeeName)
      return new Date(b.startDate ?? 0).getTime() - new Date(a.startDate ?? 0).getTime()
    })
  }, [contracts, employees, employeeId, search])

  const hasUnassigned = rows.some(r => r.kind === 'unassigned')

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      // No employee is waiting for a contract, so the column would be a row of
      // blanks. It appears when there is something to assign.
      ...(canAssign && hasUnassigned
        ? [
            {
              id: 'select',
              enableSorting: false,
              size: 50,
              header: ({ table }) => (
                <Checkbox
                  checked={
                    table.getIsAllRowsSelected() ||
                    (table.getIsSomeRowsSelected() && 'indeterminate')
                  }
                  onCheckedChange={value => table.toggleAllRowsSelected(!!value)}
                  className={SELECT_BOX}
                  aria-label='Select every employee without a contract'
                />
              ),
              // A row that already has a contract can never be ticked, so it
              // gets no box at all rather than a dead one.
              cell: ({ row }) =>
                row.getCanSelect() ? (
                  <div onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={row.getIsSelected()}
                      onCheckedChange={value => row.toggleSelected(!!value)}
                      className={SELECT_BOX}
                      aria-label={`Select ${row.original.employeeName}`}
                    />
                  </div>
                ) : null
            } as ColumnDef<Row>
          ]
        : []),
      ...(isSelf
        ? []
        : [{
        id: 'employee',
        header: 'Employee',
        accessorFn: row => row.employeeName,
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <PersonAvatar
              name={row.original.employeeName}
              className='size-9'
              fallbackClassName='text-xs'
            />
            <div className='flex min-w-0 flex-col'>
              <span className='truncate font-medium'>{row.original.employeeName}</span>
              <span className='text-muted-foreground truncate text-xs'>
                {row.original.employeeCode}
              </span>
            </div>
          </div>
        ),
        size: 260
      },
      {
        id: 'startDate',
        header: 'Start Date',
        accessorFn: row => (row.startDate ? new Date(row.startDate).getTime() : 0),
        cell: ({ row }) =>
          row.original.startDate ? (
            formatDate(row.original.startDate)
          ) : (
            <span className='text-muted-foreground'>—</span>
          )
      },
      {
        id: 'endDate',
        header: 'End Date',
        // Open-ended contracts sort last rather than first, which is where an
        // empty value would otherwise land.
        accessorFn: row =>
          row.kind === 'unassigned'
            ? 0
            : row.endDate
              ? new Date(row.endDate).getTime()
              : Number.MAX_SAFE_INTEGER,
        cell: ({ row }) =>
          row.original.kind === 'unassigned' ? (
            <span className='text-muted-foreground'>—</span>
          ) : row.original.endDate ? (
            formatDate(row.original.endDate)
          ) : (
            <span className='text-muted-foreground'>Open-ended</span>
          )
      },
      {
        id: 'wage',
        header: 'Wage',
        accessorFn: row => row.wage ?? -1,
        cell: ({ row }) => (
          <div className='text-right font-medium tabular-nums'>
            {row.original.wage === null ? (
              <span className='text-muted-foreground font-normal'>—</span>
            ) : (
              formatWage(row.original.wage)
            )}
          </div>
        )
      },
      {
        id: 'department',
        header: 'Department',
        accessorFn: row => row.departmentName,
        filterFn: 'equalsString',
        cell: ({ getValue }) => <span className='text-muted-foreground'>{getValue<string>()}</span>
      }] as ColumnDef<Row>[]),
      {
        id: 'position',
        header: 'Position',
        accessorFn: row => row.position,
        filterFn: 'equalsString'
      },
      {
        id: 'structure',
        header: 'Salary Structure',
        accessorFn: row => row.structureName,
        filterFn: 'equalsString',
        cell: ({ row }) => (
          <span className='text-muted-foreground'>
            {row.original.kind === 'unassigned' ? '—' : row.original.structureName}
          </span>
        )
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: row => row.status,
        filterFn: 'equalsString',
        cell: ({ row }) =>
          row.original.kind === 'unassigned' ? (
            <Badge className='border-none bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400'>
              No contract
            </Badge>
          ) : (
            <ContractStatusBadge status={row.original.status as ContractStatus} />
          )
      },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: () => '',
              enableSorting: false,
              size: 60,
              cell: ({ row }) =>
                row.original.kind === 'unassigned' ? (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={event => {
                      event.stopPropagation()
                      navigate(`/contracts/new?employeeId=${row.original.employeeId}`)
                    }}
                  >
                    <IconFilePlus />
                    Assign
                  </Button>
                ) : (
                  <div onClick={event => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='icon-sm' aria-label='Contract actions'>
                          <IconDotsVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' className='w-40'>
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => navigate(`/contracts/${row.original.id}`)}>
                            <IconEdit />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant='destructive'
                            onClick={() =>
                              navigate(`/contracts/${row.original.id}?action=terminate`)
                            }
                          >
                            <IconBan />
                            <span>Terminate</span>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
            } as ColumnDef<Row>
          ]
        : [])
    ],
    [canAssign, canManage, hasUnassigned, isSelf, navigate]
  )

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: row => row.id,
    // Only someone without a contract can be given one in bulk; an existing
    // contract has to be edited on its own terms.
    enableRowSelection: row => canAssign && row.original.kind === 'unassigned',
    state: { sorting, columnFilters, pagination, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false
  })

  const selected = table.getSelectedRowModel().rows.map(r => r.original)
  const unassignedCount = rows.filter(r => r.kind === 'unassigned').length

  /**
   * Creates one contract per selected employee.
   *
   * Each goes through the same endpoint a single contract uses, so the overlap
   * check and the active-structure check still apply per person, and anyone
   * refused is listed rather than taking the batch down.
   *
   * The department follows each employee unless one is chosen for everybody —
   * a group of interns starting together is usually spread across teams.
   */
  const runBulkAssign = async () => {
    if (!draft.startDate) return setAssignError('Choose a start date.')
    if (!draft.position.trim()) return setAssignError('Enter a position.')
    if (!draft.wage || draft.wage <= 0) return setAssignError('Enter a wage above zero.')
    if (!draft.salaryStructureId) return setAssignError('Choose a salary structure.')
    setAssignError(null)

    const byName = new Map(departments.map(d => [d.name, d.id]))
    const missingDepartment = draft.departmentId
      ? []
      : selected.filter(r => !byName.has(r.departmentName))
    if (missingDepartment.length > 0) {
      return setAssignError(
        `No department on record for ${missingDepartment
          .map(r => r.employeeName)
          .join(', ')}. Pick one for everybody instead.`
      )
    }

    setAssigning(true)
    const outcome = await runBulk(
      selected,
      r => r.employeeName,
      r =>
        contractsApi.create({
          employeeId: r.employeeId,
          startDate: localDateToIso(draft.startDate)!,
          endDate: localDateToIso(draft.endDate),
          wage: draft.wage,
          departmentId: draft.departmentId || byName.get(r.departmentName)!,
          position: draft.position.trim(),
          salaryStructureId: draft.salaryStructureId,
          status: draft.status
        })
    )
    setAssigning(false)
    setAssignOpen(false)
    setRowSelection({})
    setAssignFailures(outcome.failed.map(f => ({ label: f.label, message: f.message })))

    if (outcome.succeeded.length > 0) {
      toast.success(
        `Assigned ${outcome.succeeded.length} contract${outcome.succeeded.length === 1 ? '' : 's'}`,
        {
          description:
            outcome.failed.length > 0 ? `${outcome.failed.length} could not be created.` : undefined
        }
      )
    } else {
      toast.error('No contract could be created.')
    }
  }

  const filteredEmployeeName = employeeId ? contracts[0]?.employee?.name : undefined

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Contracts</h1>
          <p className='text-muted-foreground text-sm'>
            Employment terms over time. Payroll always uses the contract valid for the payrun
            period.
          </p>
          {/* Worth stating up front: someone with no contract is silently
              skipped by every payrun until this is dealt with. */}
          {unassignedCount > 0 && (
            <p className='mt-1 text-sm text-amber-700 dark:text-amber-400'>
              {unassignedCount} employee{unassignedCount === 1 ? '' : 's'} without a contract —
              they cannot be paid until one is assigned.
            </p>
          )}
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {employeeId && (
            <Button
              variant='outline'
              onClick={() => {
                searchParams.delete('employeeId')
                setSearchParams(searchParams)
              }}
            >
              <IconX />
              Filtered by {filteredEmployeeName ?? 'employee'} — clear
            </Button>
          )}
          {canManage && (
            <>
              <Button variant='outline' onClick={() => setImporting(true)}>
                <IconUpload />
                Import CSV
              </Button>
              <Button onClick={() => navigate('/contracts/new')}>
                <IconPlus />
                New
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      ) : isError ? (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
          Could not load contracts{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      ) : (
        <Card className='w-full py-0'>
          <div className='border-b'>
            <div className='flex flex-col gap-4 p-6'>
              <span className='text-xl font-semibold'>Filter</span>
              <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
                <div className='w-full space-y-2'>
                  <Label htmlFor='contract-search'>Search</Label>
                  <div className='relative'>
                    <IconSearch className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
                    <Input
                      id='contract-search'
                      className='pl-9'
                      placeholder='Employee, code or position…'
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                {!isSelf && (
                  <DataTableFacetFilter column={table.getColumn('department')} label='Department' />
                )}
                <DataTableFacetFilter
                  column={table.getColumn('structure')}
                  label='Salary Structure'
                />
                <DataTableFacetFilter
                  column={table.getColumn('status')}
                  label='Status'
                  format={value => STATUS_LABELS[value] ?? value}
                />
              </div>
            </div>

            {selected.length > 0 && (
              <div className='bg-primary/5 flex flex-wrap items-center justify-between gap-3 border-t px-6 py-3'>
                <p className='text-sm'>
                  <span className='font-semibold'>{selected.length}</span> employee
                  {selected.length === 1 ? '' : 's'} without a contract selected
                </p>
                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    size='sm'
                    onClick={() => {
                      setAssignError(null)
                      setAssignOpen(true)
                    }}
                  >
                    <IconFilePlus />
                    Assign contract to selected…
                  </Button>
                  <Button variant='ghost' size='sm' onClick={() => setRowSelection({})}>
                    Clear
                  </Button>
                </div>
              </div>
            )}

            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map(headerGroup => (
                    <TableRow key={headerGroup.id} className='h-14 border-t'>
                      {headerGroup.headers.map(header => (
                        <TableHead
                          key={header.id}
                          style={{ width: header.getSize() ? `${header.getSize()}px` : undefined }}
                          className={`text-muted-foreground first:pl-4 last:px-4 ${
                            header.column.id === 'wage' ? 'text-right' : ''
                          }`}
                        >
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <div
                              className={`flex h-full cursor-pointer items-center gap-2 select-none ${
                                header.column.id === 'wage' ? 'justify-end' : 'justify-between'
                              }`}
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
                  {table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className='h-24 text-center'>
                        No contracts match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map(row => {
                      const isActive = row.original.status === 'ACTIVE'
                      const isUnassigned = row.original.kind === 'unassigned'

                      return (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && 'selected'}
                          onClick={() =>
                            navigate(
                              isUnassigned
                                ? `/contracts/new?employeeId=${row.original.employeeId}`
                                : `/contracts/${row.original.id}`
                            )
                          }
                          // PRD: "Active contract must be identifiable" — the badge
                          // is reinforced with a tinted row and a left accent border.
                          className={`h-14 cursor-pointer ${
                            isUnassigned
                              ? 'bg-amber-600/5 hover:bg-amber-600/10 dark:bg-amber-400/5'
                              : isActive
                                ? 'bg-green-600/5 hover:bg-green-600/10 dark:bg-green-400/5'
                                : 'opacity-80'
                          }`}
                        >
                          {row.getVisibleCells().map((cell, index) => (
                            <TableCell
                              key={cell.id}
                              className={`first:pl-4 last:px-4 ${
                                index === 0
                                  ? isUnassigned
                                    ? 'border-l-2 border-l-amber-600 dark:border-l-amber-400'
                                    : isActive
                                      ? 'border-l-2 border-l-green-600 dark:border-l-green-400'
                                      : 'border-l-2 border-l-transparent'
                                  : ''
                              }`}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DataTablePagination table={table} noun='contracts' />
        </Card>
      )}

      {assignFailures.length > 0 && (
        <div className='border-destructive/30 bg-destructive/10 rounded-lg border p-4 text-sm'>
          <div className='text-destructive flex items-center gap-2 font-medium'>
            <IconAlertTriangle className='size-4' />
            {assignFailures.length} contract{assignFailures.length === 1 ? '' : 's'} could not be
            created
          </div>
          <ul className='text-destructive/90 mt-2 list-disc space-y-1 pl-6'>
            {assignFailures.map((f, i) => (
              <li key={i}>
                <span className='font-medium'>{f.label}</span> — {f.message}
              </li>
            ))}
          </ul>
          <Button variant='ghost' size='sm' className='mt-2' onClick={() => setAssignFailures([])}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Bulk assign — one contract each, on the same terms */}
      <Dialog open={assignOpen} onOpenChange={open => !open && setAssignOpen(false)}>
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>
              Assign a contract to {selected.length} employee{selected.length === 1 ? '' : 's'}
            </DialogTitle>
            <DialogDescription>
              Everyone gets the same dates, position, wage and salary structure. Each department
              follows the employee unless you set one for all.
            </DialogDescription>
          </DialogHeader>

          {assignError && (
            <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
              {assignError}
            </div>
          )}

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='bulk-start'>Start Date</Label>
              <DatePicker
                id='bulk-start'
                value={draft.startDate}
                onChange={date => setDraft({ ...draft, startDate: date })}
                placeholder='Pick a start date'
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='bulk-end'>End Date</Label>
              <DatePicker
                id='bulk-end'
                value={draft.endDate}
                onChange={date => setDraft({ ...draft, endDate: date })}
                placeholder='Open-ended'
                // A contract may run indefinitely, so this one clears back to none,
                // and cannot be set before the start date.
                clearable
                disabledDate={date => (draft.startDate ? date < draft.startDate : false)}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='bulk-position'>Position</Label>
              <Input
                id='bulk-position'
                value={draft.position}
                onChange={e => setDraft({ ...draft, position: e.target.value })}
                placeholder='e.g. Software Engineering Intern'
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='bulk-wage'>Wage (monthly)</Label>
              <Input
                id='bulk-wage'
                type='number'
                min={1}
                value={draft.wage || ''}
                onChange={e => setDraft({ ...draft, wage: Number(e.target.value) })}
                placeholder='25000'
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='bulk-structure'>Salary Structure</Label>
              <Select
                value={draft.salaryStructureId}
                onValueChange={v => setDraft({ ...draft, salaryStructureId: v })}
              >
                <SelectTrigger id='bulk-structure' className='w-full'>
                  <SelectValue placeholder='Select structure' />
                </SelectTrigger>
                <SelectContent>
                  {structures
                    .filter(x => x.status === 'Active')
                    .map(x => (
                      <SelectItem key={x.id} value={x.id}>
                        {x.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='bulk-department'>Department</Label>
              <Select
                value={draft.departmentId || FOLLOW_EMPLOYEE}
                onValueChange={v =>
                  setDraft({ ...draft, departmentId: v === FOLLOW_EMPLOYEE ? '' : v })
                }
              >
                <SelectTrigger id='bulk-department' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FOLLOW_EMPLOYEE}>Each employee&apos;s own</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1.5 sm:col-span-2'>
              <Label htmlFor='bulk-status'>Status</Label>
              <Select
                value={draft.status}
                onValueChange={v => setDraft({ ...draft, status: v as ContractStatus })}
              >
                <SelectTrigger id='bulk-status' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['ACTIVE', 'DRAFT'] as ContractStatus[]).map(v => (
                    <SelectItem key={v} value={v}>
                      {STATUS_LABELS[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='max-h-32 divide-y overflow-y-auto rounded-md border text-sm'>
            {selected.map(r => (
              <div key={r.id} className='flex items-center justify-between px-3 py-2'>
                <span>{r.employeeName}</span>
                <span className='text-muted-foreground text-xs'>
                  {draft.departmentId
                    ? (departments.find(d => d.id === draft.departmentId)?.name ?? '')
                    : r.departmentName}
                </span>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setAssignOpen(false)} disabled={assigning}>
              Cancel
            </Button>
            <Button onClick={runBulkAssign} disabled={assigning}>
              {assigning ? 'Assigning…' : `Assign ${selected.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkImportDialog
        open={importing}
        onOpenChange={setImporting}
        config={contractImportConfig}
        context={importContext}
      />
    </div>
  )
}

export default ContractsList
