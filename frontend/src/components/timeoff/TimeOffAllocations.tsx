import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import type { ColumnDef, ColumnFiltersState, PaginationState, RowSelectionState, SortingState } from '@tanstack/react-table'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  IconPlus,
  IconUpload,
  IconFilterOff,
  IconPencil,
  IconChevronDown,
  IconChevronUp,
  IconAlertTriangle
} from '@tabler/icons-react'

import {
  DataTableFacetFilter,
  DataTablePagination
} from '@/components/shadcn-studio/data-table/data-table-parts'
import BulkImportDialog from '@/components/bulk/BulkImportDialog'
import { allocationImportConfig } from '@/components/bulk/importConfigs'
import { useImportContext } from '@/hooks/useImportContext'
import { runBulk } from '@/lib/bulk'

import {
  useCreateAllocation,
  useUpdateAllocation,
  useTimeOffAllocations,
  useTimeOffTypes
} from '@/hooks/useTimeOff'
import { useEmployees } from '@/hooks/useEmployees'
import { useAuth } from '@/context/AuthContext'
import type { Role } from '@/types/user'
import type { TimeOffAllocation } from '@/types/timeoff'

const CAN_MANAGE: Role[] = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

/**
 * The badge was hardcoded green, so a balance held back from use still read as
 * a healthy one. Only an Approved allocation can be drawn against — the server
 * refuses a request against anything else.
 */
/** Mirrors the server's own bounds, so the form rejects what it would reject. */
const MIN_YEAR = 2020
const MAX_YEAR = 2050

const STATUS_CLASSES: Record<string, string> = {
  Approved: 'border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400',
  Draft: 'border-none bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400'
}

/** PRD Screen 8 — Time Off Allocations (balances). */
export function TimeOffAllocations() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const employeeId = searchParams.get('employeeId') ?? undefined

  const { data: allocations = [], isLoading, isError, error } = useTimeOffAllocations(employeeId)
  const { data: types = [] } = useTimeOffTypes()
  const { data: employees = [] } = useEmployees()
  const createAllocation = useCreateAllocation()
  const updateAllocation = useUpdateAllocation()

  const [creating, setCreating] = useState(false)
  // Set when correcting an existing balance rather than granting a new one.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    employeeId: '',
    timeOffTypeId: '',
    allocated: 24,
    validityYear: new Date().getFullYear()
  })
  const [formError, setFormError] = useState<string | null>(null)

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [bulkGrant, setBulkGrant] = useState(false)
  const [bulkTargets, setBulkTargets] = useState<{ id: string; name: string }[]>([])
  /** What to do about employees who already hold the allocation being granted. */
  const [onExisting, setOnExisting] = useState<'skip' | 'update'>('skip')
  const [bulkAction, setBulkAction] = useState<'days' | 'status' | null>(null)
  const [bulkDays, setBulkDays] = useState(24)
  const [bulkStatus, setBulkStatus] = useState('Approved')
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkFailures, setBulkFailures] = useState<{ label: string; message: string }[]>([])

  const [importing, setImporting] = useState(false)
  const importContext = useImportContext()

  const canManage = !!user && CAN_MANAGE.includes(user.role)
  /** An Employee sees only their own balances, so the name repeats on every row. */
  const isSelf = user?.role === 'EMPLOYEE'

  /**
   * Opens the grant dialog for every employee in the current selection.
   *
   * The rows are allocations, and one employee can hold several (one per leave
   * type and year), so the selection is reduced to distinct employees before
   * anything is granted — otherwise picking someone's Annual and Sick balances
   * would try to grant them the same new allocation twice.
   */
  const openBulkGrant = () => {
    const seen = new Map<string, string>()
    for (const a of selectedAllocations) {
      if (!seen.has(a.employeeId)) seen.set(a.employeeId, a.employee?.name ?? 'Employee')
    }
    setBulkTargets(Array.from(seen, ([id, name]) => ({ id, name })))
    setOnExisting('skip')
    setEditingId(null)
    setBulkGrant(true)
    setForm({
      employeeId: '',
      timeOffTypeId: '',
      allocated: 24,
      validityYear: new Date().getFullYear()
    })
    setFormError(null)
    setCreating(true)
  }

  const openCreate = () => {
    setBulkGrant(false)
    setEditingId(null)
    setForm({
      employeeId: '',
      timeOffTypeId: '',
      allocated: 24,
      validityYear: new Date().getFullYear()
    })
    setFormError(null)
    setCreating(true)
  }

  const openEdit = (allocation: TimeOffAllocation) => {
    setBulkGrant(false)
    setEditingId(allocation.id)
    setForm({
      employeeId: allocation.employeeId,
      timeOffTypeId: allocation.timeOffTypeId,
      allocated: allocation.allocated,
      validityYear: allocation.validityYear
    })
    setFormError(null)
    setCreating(true)
  }

  const submit = async () => {
    setFormError(null)
    if (bulkGrant) return submitBulkGrant()
    if (!form.employeeId) return setFormError('Select an employee.')
    if (!form.timeOffTypeId) return setFormError('Select a time off type.')
    if (!form.allocated || form.allocated <= 0) return setFormError('Allocated days must be above zero.')
    if (form.validityYear < MIN_YEAR || form.validityYear > MAX_YEAR)
      return setFormError(`Validity year must be between ${MIN_YEAR} and ${MAX_YEAR}.`)

    try {
      if (editingId) {
        // Days already taken are not editable here; the server recomputes what
        // remains so a correction cannot silently erase consumed leave.
        await updateAllocation.mutateAsync({
          id: editingId,
          body: { allocated: form.allocated, validityYear: form.validityYear }
        })
      } else {
        await createAllocation.mutateAsync({ ...form })
      }
      setCreating(false)
      setEditingId(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the allocation.')
    }
  }

  const columns = useMemo<ColumnDef<TimeOffAllocation>[]>(
    () => [
      // No row is selectable without the right to manage balances, so the
      // column would be a header box above a column of blanks.
      ...(canManage
        ? [{
        id: 'select',
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllRowsSelected() || (table.getIsSomeRowsSelected() && 'indeterminate')
            }
            onCheckedChange={value => table.toggleAllRowsSelected(!!value)}
            aria-label='Select every allocation'
          />
        ),
        // Your own balance is never yours to change, so it carries no box.
        cell: ({ row }) =>
          row.getCanSelect() ? (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={value => row.toggleSelected(!!value)}
              aria-label={`Select allocation for ${row.original.employee?.name ?? 'employee'}`}
            />
          ) : null,
        size: 50
      } as ColumnDef<TimeOffAllocation>]
        : []),
      ...(isSelf
        ? []
        : [{
        id: 'employee',
        header: 'Employee',
        accessorFn: row => row.employee?.name ?? '',
        filterFn: 'equalsString',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <PersonAvatar
              name={row.original.employee?.name}
              className='size-9'
              fallbackClassName='text-xs'
            />
            <div className='flex min-w-0 flex-col'>
              <span className='truncate font-medium'>{row.original.employee?.name ?? '—'}</span>
              <span className='text-muted-foreground truncate text-xs'>
                {row.original.employee?.employeeCode ?? ''}
              </span>
            </div>
          </div>
        ),
        size: 240
      }] as ColumnDef<TimeOffAllocation>[]),
      {
        id: 'type',
        header: 'Time Off Type',
        accessorFn: row => row.timeOffType?.name ?? '—',
        filterFn: 'equalsString'
      },
      {
        id: 'allocated',
        header: 'Allocated',
        accessorKey: 'allocated',
        cell: ({ row }) => (
          <div className='text-right tabular-nums'>
            {row.original.allocated} {row.original.timeOffType?.unit ?? 'Days'}
          </div>
        )
      },
      {
        id: 'taken',
        header: 'Taken',
        accessorKey: 'taken',
        cell: ({ row }) => (
          <div className='text-right tabular-nums'>
            {row.original.taken} {row.original.timeOffType?.unit ?? 'Days'}
          </div>
        )
      },
      {
        id: 'remaining',
        header: 'Remaining',
        accessorKey: 'remaining',
        cell: ({ row }) => {
          const used = row.original.allocated
            ? Math.min(100, (row.original.taken / row.original.allocated) * 100)
            : 0
          return (
            <div className='text-right'>
              <div className='font-semibold tabular-nums'>
                {row.original.remaining} {row.original.timeOffType?.unit ?? 'Days'}
              </div>
              <div className='bg-muted mt-1 ml-auto h-1 w-20 overflow-hidden rounded-full'>
                <div className='bg-primary h-full' style={{ width: `${used}%` }} aria-hidden='true' />
              </div>
            </div>
          )
        }
      },
      {
        id: 'validityYear',
        header: 'Validity',
        accessorKey: 'validityYear',
        filterFn: 'equalsString',
        cell: ({ row }) => (
          <div className='text-right tabular-nums'>{row.original.validityYear}</div>
        )
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        filterFn: 'equalsString',
        cell: ({ row }) => (
          <Badge className={STATUS_CLASSES[row.original.status] ?? STATUS_CLASSES.Draft}>
            {row.original.status}
          </Badge>
        )
      },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: () => '',
              enableSorting: false,
              size: 60,
              cell: ({ row }) => (
                <Button
                  variant='ghost'
                  size='icon-sm'
                  aria-label={`Edit allocation for ${row.original.employee?.name ?? 'employee'}`}
                  onClick={() => openEdit(row.original)}
                >
                  <IconPencil />
                </Button>
              )
            } as ColumnDef<TimeOffAllocation>
          ]
        : [])
    ],
    [canManage, isSelf]
  )

  const table = useReactTable({
    data: allocations,
    columns,
    getRowId: row => row.id,
    // Nothing is selectable for a role that cannot change balances, nor for
    // one's own balance — the server refuses that, so the tick would go
    // nowhere. Seniority is still left to the server to judge.
    enableRowSelection: row => canManage && row.original.employeeId !== user?.employeeId,
    state: { rowSelection, sorting, columnFilters, pagination },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false
  })

  const selectedAllocations = table.getSelectedRowModel().rows.map(r => r.original)

  /**
   * Which of the chosen employees already hold this leave type for this year.
   *
   * The screen already has every allocation loaded, so this is decided before
   * anything is sent rather than by firing calls that are certain to be
   * refused. An employee/type/year is unique in the database.
   */
  const grantSplit = useMemo(() => {
    if (!bulkGrant || !form.timeOffTypeId) return { fresh: bulkTargets, existing: [] as typeof bulkTargets }
    const held = new Map(
      allocations
        .filter(a => a.timeOffTypeId === form.timeOffTypeId && a.validityYear === form.validityYear)
        .map(a => [a.employeeId, a])
    )
    return {
      fresh: bulkTargets.filter(t => !held.has(t.id)),
      existing: bulkTargets.filter(t => held.has(t.id))
    }
  }, [bulkGrant, bulkTargets, allocations, form.timeOffTypeId, form.validityYear])

  /**
   * Grants the same allocation to every employee behind the selection.
   *
   * One call per employee, through the same endpoint the single grant uses, so
   * the server still refuses a duplicate for that employee/type/year and still
   * refuses anyone granting themselves leave. Both come back per row rather
   * than stopping the run.
   */
  const submitBulkGrant = async () => {
    if (!form.timeOffTypeId) return setFormError('Select a time off type.')
    if (!form.allocated || form.allocated <= 0)
      return setFormError('Allocated days must be above zero.')
    if (form.validityYear < MIN_YEAR || form.validityYear > MAX_YEAR)
      return setFormError(`Validity year must be between ${MIN_YEAR} and ${MAX_YEAR}.`)
    if (bulkTargets.length === 0) return setFormError('No employees are selected.')

    const { fresh, existing } = grantSplit
    const targets =
      onExisting === 'update' ? [...fresh, ...existing] : fresh

    if (targets.length === 0) {
      return setFormError(
        'Every selected employee already holds this allocation. Choose "update" to change their days instead.'
      )
    }

    // An employee who already holds it is updated rather than created; the
    // create would be refused as a duplicate, and updating is what "give
    // everyone 24 days" actually means.
    const heldId = new Map(
      allocations
        .filter(a => a.timeOffTypeId === form.timeOffTypeId && a.validityYear === form.validityYear)
        .map(a => [a.employeeId, a.id])
    )

    setBulkRunning(true)
    const outcome = await runBulk(
      targets,
      t => t.name,
      t => {
        const id = heldId.get(t.id)
        return id
          ? updateAllocation.mutateAsync({ id, body: { allocated: form.allocated } })
          : createAllocation.mutateAsync({
              employeeId: t.id,
              timeOffTypeId: form.timeOffTypeId,
              allocated: form.allocated,
              validityYear: form.validityYear
            })
      }
    )
    setBulkRunning(false)
    setCreating(false)
    setBulkGrant(false)
    setRowSelection({})
    setBulkFailures(outcome.failed.map(f => ({ label: f.label, message: f.message })))

    const skipped = onExisting === 'skip' ? existing.length : 0
    if (outcome.succeeded.length > 0) {
      const notes = [
        skipped > 0 ? `${skipped} already had it` : null,
        outcome.failed.length > 0 ? `${outcome.failed.length} could not be saved` : null
      ].filter(Boolean)
      toast.success(
        `${onExisting === 'update' ? 'Applied to' : 'Granted'} ${outcome.succeeded.length} employee${outcome.succeeded.length === 1 ? '' : 's'}`,
        { description: notes.length > 0 ? notes.join(' · ') : undefined }
      )
    } else {
      toast.error('No allocation could be granted.')
    }
  }

  /**
   * Applies one change to every ticked balance.
   *
   * Each row goes through the same endpoint the edit dialog uses, so the
   * server still refuses anyone adjusting their own balance — that row alone
   * fails and is reported, and the rest are applied.
   */
  const runBulkUpdate = async () => {
    if (!bulkAction) return

    const body =
      bulkAction === 'days' ? { allocated: bulkDays } : { status: bulkStatus }

    setBulkRunning(true)
    const outcome = await runBulk(
      selectedAllocations,
      a => `${a.employee?.name ?? 'Employee'} · ${a.timeOffType?.name ?? 'leave'} ${a.validityYear}`,
      a => updateAllocation.mutateAsync({ id: a.id, body })
    )
    setBulkRunning(false)
    setBulkAction(null)
    setRowSelection({})
    setBulkFailures(outcome.failed.map(f => ({ label: f.label, message: f.message })))

    if (outcome.succeeded.length > 0) {
      toast.success(
        `Updated ${outcome.succeeded.length} allocation${outcome.succeeded.length === 1 ? '' : 's'}`,
        {
          description:
            outcome.failed.length > 0 ? `${outcome.failed.length} could not be updated.` : undefined
        }
      )
    } else {
      toast.error('No allocation could be updated.')
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Time Off Allocations</h1>
          <p className='text-muted-foreground text-sm'>
            Leave balances per employee and type. Remaining falls as approved requests consume days.
          </p>
        </div>

        {canManage && (
          <div className='flex items-center gap-2'>
            <Button variant='outline' onClick={() => setImporting(true)}>
              <IconUpload />
              Import CSV
            </Button>

            {/* With rows ticked this grants to all of them; with none it is the
                plain single-employee form, which is what it has always been. */}
            <Button onClick={selectedAllocations.length > 0 ? openBulkGrant : openCreate}>
              <IconPlus />
              {selectedAllocations.length > 0
                ? `New Allocation (${new Set(selectedAllocations.map(a => a.employeeId)).size})`
                : 'New Allocation'}
            </Button>
          </div>
        )}
      </div>

      {createAllocation.isError && (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
          {createAllocation.error instanceof Error
            ? createAllocation.error.message
            : 'Could not create the allocation.'}
        </div>
      )}

      {bulkFailures.length > 0 && (
        <div className='border-destructive/30 bg-destructive/10 rounded-lg border p-4 text-sm'>
          <div className='text-destructive flex items-center gap-2 font-medium'>
            <IconAlertTriangle className='size-4' />
            {bulkFailures.length} allocation{bulkFailures.length === 1 ? '' : 's'} could not be
            updated
          </div>
          <ul className='text-destructive/90 mt-2 list-disc space-y-1 pl-6'>
            {bulkFailures.map((f, i) => (
              <li key={i}>
                <span className='font-medium'>{f.label}</span> — {f.message}
              </li>
            ))}
          </ul>
          <Button variant='ghost' size='sm' className='mt-2' onClick={() => setBulkFailures([])}>
            Dismiss
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      ) : isError ? (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
          Could not load allocations{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      ) : (
        <Card className='w-full py-0'>
          <div className='border-b'>
            <div className='flex flex-col gap-4 p-6'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <span className='text-xl font-semibold'>Filter</span>
                {employeeId && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      searchParams.delete('employeeId')
                      setSearchParams(searchParams)
                    }}
                  >
                    <IconFilterOff />
                    Filtered by {allocations[0]?.employee?.name ?? 'employee'} — clear
                  </Button>
                )}
              </div>
              <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
                {!isSelf && (
                  <DataTableFacetFilter column={table.getColumn('employee')} label='Employee' />
                )}
                <DataTableFacetFilter column={table.getColumn('type')} label='Time Off Type' />
                <DataTableFacetFilter column={table.getColumn('validityYear')} label='Validity Year' />
                <DataTableFacetFilter column={table.getColumn('status')} label='Status' />
              </div>
            </div>

            {selectedAllocations.length > 0 && (
              <div className='bg-primary/5 flex flex-wrap items-center justify-between gap-3 border-t px-6 py-3'>
                <p className='text-sm'>
                  <span className='font-semibold'>{selectedAllocations.length}</span> allocation
                  {selectedAllocations.length === 1 ? '' : 's'} selected
                </p>
                <div className='flex flex-wrap items-center gap-2'>
                  <Button size='sm' onClick={openBulkGrant} disabled={bulkRunning}>
                    <IconPlus />
                    Allocate to selected…
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setBulkAction('days')}
                    disabled={bulkRunning}
                  >
                    Set allocated days…
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setBulkAction('status')}
                    disabled={bulkRunning}
                  >
                    Set status…
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
                      {headerGroup.headers.map(header => {
                        const numeric = ['allocated', 'taken', 'remaining', 'validityYear'].includes(
                          header.column.id
                        )
                        return (
                          <TableHead
                            key={header.id}
                            style={{ width: header.getSize() ? `${header.getSize()}px` : undefined }}
                            className={`text-muted-foreground first:pl-4 last:px-4 ${numeric ? 'text-right' : ''}`}
                          >
                            {header.isPlaceholder ? null : header.column.getCanSort() ? (
                              <div
                                className={`flex h-full cursor-pointer items-center gap-2 select-none ${numeric ? 'justify-end' : 'justify-between'}`}
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
                        )
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className='h-24 text-center'>
                        {allocations.length === 0
                          ? 'No allocations yet.'
                          : 'No allocations match the current filters.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map(row => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        className='h-14'
                      >
                        {row.getVisibleCells().map(cell => (
                          <TableCell key={cell.id} className='first:w-12.5 first:pl-4 last:px-4'>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DataTablePagination table={table} noun='allocations' />
        </Card>
      )}

      {/* Bulk update */}
      <Dialog open={!!bulkAction} onOpenChange={open => !open && setBulkAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'days' ? 'Set allocated days' : 'Set status'} for{' '}
              {selectedAllocations.length} allocation{selectedAllocations.length === 1 ? '' : 's'}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'days'
                ? 'Days already taken are preserved; the server recomputes what remains for each balance.'
                : 'Only an Approved allocation can be drawn against. A Draft balance blocks new requests against it.'}
            </DialogDescription>
          </DialogHeader>

          {bulkAction === 'days' ? (
            <div className='space-y-1.5'>
              <Label htmlFor='bulk-days'>Allocated days</Label>
              <Input
                id='bulk-days'
                type='number'
                min={1}
                value={bulkDays}
                onChange={e => setBulkDays(Number(e.target.value))}
              />
            </div>
          ) : (
            <div className='space-y-1.5'>
              <Label htmlFor='bulk-status'>Status</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger id='bulk-status' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='Approved'>Approved</SelectItem>
                  <SelectItem value='Draft'>Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className='max-h-48 divide-y overflow-y-auto rounded-md border text-sm'>
            {selectedAllocations.map(a => (
              <div key={a.id} className='flex items-center justify-between px-3 py-2'>
                <span>
                  {a.employee?.name} · {a.timeOffType?.name}
                </span>
                <span className='text-muted-foreground tabular-nums'>
                  {a.allocated} → {bulkAction === 'days' ? bulkDays : a.allocated}
                </span>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setBulkAction(null)} disabled={bulkRunning}>
              Cancel
            </Button>
            <Button
              onClick={runBulkUpdate}
              disabled={bulkRunning || (bulkAction === 'days' && bulkDays <= 0)}
            >
              {bulkRunning ? 'Working…' : 'Apply to all'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? 'Edit allocation'
                : bulkGrant
                  ? `Grant to ${bulkTargets.length} employee${bulkTargets.length === 1 ? '' : 's'}`
                  : 'New allocation'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Updates the leave balance granted for this validity year.'
                : bulkGrant
                  ? 'The same leave type, days and validity year is granted to each employee below. Anyone who already holds this allocation is skipped and listed afterwards.'
                  : 'Grants a leave balance for a validity year. Taken starts at zero.'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
              {formError}
            </div>
          )}

          <div className='space-y-4'>
            {bulkGrant ? (
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <Label>Employees</Label>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      setBulkGrant(false)
                      setFormError(null)
                    }}
                  >
                    Grant to one employee instead
                  </Button>
                </div>
                <div className='max-h-40 divide-y overflow-y-auto rounded-md border text-sm'>
                  {bulkTargets.map(t => {
                    const already = grantSplit.existing.some(e => e.id === t.id)
                    return (
                      <div key={t.id} className='flex items-center justify-between px-3 py-2'>
                        <span className={already && onExisting === 'skip' ? 'text-muted-foreground' : ''}>
                          {t.name}
                        </span>
                        {already && (
                          <span className='text-muted-foreground text-xs'>
                            {onExisting === 'skip' ? 'already has it — skipped' : 'will be updated'}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Worked out from the loaded balances before anything is sent,
                    rather than by firing calls that are certain to be refused. */}
                {grantSplit.existing.length > 0 && (
                  <div className='rounded-md border border-amber-600/30 bg-amber-600/10 p-3 text-sm dark:border-amber-400/30 dark:bg-amber-400/10'>
                    <div className='flex items-start gap-2 text-amber-700 dark:text-amber-300'>
                      <IconAlertTriangle className='mt-0.5 size-4 shrink-0' />
                      <span>
                        {grantSplit.existing.length} of {bulkTargets.length} already hold this leave
                        type for {form.validityYear}.
                      </span>
                    </div>
                    <div className='mt-2 flex flex-wrap gap-2'>
                      <Button
                        type='button'
                        size='sm'
                        variant={onExisting === 'skip' ? 'default' : 'outline'}
                        onClick={() => setOnExisting('skip')}
                      >
                        Skip them
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        variant={onExisting === 'update' ? 'default' : 'outline'}
                        onClick={() => setOnExisting('update')}
                      >
                        Update their days to {form.allocated}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className='space-y-1.5'>
                <Label>Employee</Label>
                <Select
                  value={form.employeeId}
                  onValueChange={v => setForm({ ...form, employeeId: v })}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select employee' />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.employeeCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className='space-y-1.5'>
              <Label>Time Off Type</Label>
              <Select
                value={form.timeOffTypeId}
                onValueChange={v => setForm({ ...form, timeOffTypeId: v })}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select type' />
                </SelectTrigger>
                <SelectContent>
                  {types.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='allocated'>Allocated</Label>
                <Input
                  id='allocated'
                  type='number'
                  min={1}
                  value={form.allocated}
                  onChange={e => setForm({ ...form, allocated: Number(e.target.value) })}
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='validityYear'>Validity Year</Label>
                <Input
                  id='validityYear'
                  type='number'
                  min={MIN_YEAR}
                  max={MAX_YEAR}
                  value={form.validityYear}
                  onChange={e => setForm({ ...form, validityYear: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={createAllocation.isPending || updateAllocation.isPending || bulkRunning}
            >
              {editingId
                ? updateAllocation.isPending
                  ? 'Saving…'
                  : 'Edit'
                : bulkGrant
                  ? bulkRunning
                    ? 'Granting…'
                    : `Grant to ${onExisting === 'update' ? bulkTargets.length : grantSplit.fresh.length}`
                  : createAllocation.isPending
                    ? 'Creating…'
                    : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkImportDialog
        open={importing}
        onOpenChange={setImporting}
        config={allocationImportConfig}
        context={importContext}
      />
    </div>
  )
}

export default TimeOffAllocations
