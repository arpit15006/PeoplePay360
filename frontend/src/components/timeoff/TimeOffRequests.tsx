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
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
  IconCheck,
  IconX,
  IconFilterOff,
  IconChevronDown,
  IconChevronUp,
  IconAlertTriangle
} from '@tabler/icons-react'

import {
  DataTableFacetFilter,
  DataTablePagination
} from '@/components/shadcn-studio/data-table/data-table-parts'
import DatePicker from '@/components/common/DatePicker'
import { runBulk } from '@/lib/bulk'
import {
  useCreateRequest,
  useDecideRequest,
  useTimeOffRequests,
  useTimeOffTypes
} from '@/hooks/useTimeOff'
import { useAuth } from '@/context/AuthContext'
import {
  TIMEOFF_STATUS_LABELS,
  durationBetween,
  formatTimeOffDate,
  toUtcIso,
  type TimeOffRequest,
  type TimeOffStatus
} from '@/types/timeoff'
import type { Role } from '@/types/user'

/**
 * HR Manager approves or refuses. HR Payroll User inherits all HR Manager
 * permissions per the role definitions, so they are included too.
 */
const CAN_DECIDE: Role[] = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

const NO_DEPARTMENT = 'No department'

/**
 * The month a request starts in, stored sortable ("2026-09") and shown as
 * "September 2026" — the same vocabulary payruns use.
 */
const periodValue = (iso: string) => {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

const periodLabel = (value: string) => {
  const [year, month] = value.split('-')
  if (!year || !month) return value
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

const STATUS_CLASSES: Record<TimeOffStatus, string> = {
  TO_APPROVE: 'border-none bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400',
  APPROVED: 'border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400',
  REFUSED: 'border-none bg-red-600/10 text-red-600 dark:bg-red-400/10 dark:text-red-400'
}

/** PRD Screen 7 — Time Off Requests, with the approve / refuse workflow. */
export function TimeOffRequests() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const employeeId = searchParams.get('employeeId') ?? undefined

  const { data: requests = [], isLoading, isError, error } = useTimeOffRequests(employeeId)
  const { data: types = [] } = useTimeOffTypes()
  const createRequest = useCreateRequest()
  const decide = useDecideRequest()

  const [creating, setCreating] = useState(false)
  const [reviewing, setReviewing] = useState<TimeOffRequest | null>(null)

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  // Arriving from a dashboard alert carries the status it counted, so the list
  // opens on exactly those rows instead of on everything. The facet select
  // shows the value, so it is visible and can be cleared like any other filter.
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
    const status = searchParams.get('status')
    return status ? [{ id: 'status', value: status }] : []
  })
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [bulkDecision, setBulkDecision] = useState<'approve' | 'refuse' | null>(null)
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkFailures, setBulkFailures] = useState<{ label: string; message: string }[]>([])

  const [typeId, setTypeId] = useState('')
  const [start, setStart] = useState<Date | undefined>()
  const [end, setEnd] = useState<Date | undefined>()
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const canDecide = !!user && CAN_DECIDE.includes(user.role)
  /**
   * An Employee only ever sees their own requests, so every row carries the
   * same name and the same department. Columns and filters that cannot tell
   * one row from another are dropped rather than shown holding one value.
   */
  const isSelf = user?.role === 'EMPLOYEE'
  const canRequest = !!user?.employeeId

  const duration = durationBetween(start, end)

  // Newest first; the status filter now lives in the table's facet.
  const rows = useMemo(
    () =>
      [...requests].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    [requests]
  )

  const submitRequest = async () => {
    setFormError(null)
    if (!typeId) return setFormError('Select a time off type.')
    if (!start || !end) return setFormError('Select both a start and an end date.')
    if (duration <= 0) return setFormError('End date must be on or after the start date.')
    if (!reason.trim()) return setFormError('Enter a reason.')

    await createRequest.mutateAsync({
      employeeId: user!.employeeId,
      timeOffTypeId: typeId,
      startDate: toUtcIso(start),
      endDate: toUtcIso(end),
      duration,
      reason: reason.trim()
    })
    setCreating(false)
    setTypeId(''); setStart(undefined); setEnd(undefined); setReason('')
  }

  const columns = useMemo<ColumnDef<TimeOffRequest>[]>(
    () => [
      // Ticking rows exists to approve or refuse them in bulk; for anyone who
      // cannot decide, the column is a row of boxes that do nothing.
      ...(canDecide
        ? [{
        id: 'select',
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllRowsSelected() || (table.getIsSomeRowsSelected() && 'indeterminate')
            }
            // Only the pending rows are selectable, so this only ever ticks those.
            onCheckedChange={value => table.toggleAllRowsSelected(!!value)}
            aria-label='Select every pending request'
          />
        ),
        // A request already decided, or the approver's own, can never be
        // ticked — so it shows nothing rather than a box that does nothing.
        cell: ({ row }) =>
          row.getCanSelect() ? (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={value => row.toggleSelected(!!value)}
              aria-label={`Select request from ${row.original.employee?.name ?? 'employee'}`}
            />
          ) : null,
        size: 50
      } as ColumnDef<TimeOffRequest>]
        : []),
      ...(isSelf
        ? []
        : [{
        id: 'employee',
        header: 'Employee',
        accessorFn: row => row.employee?.name ?? '',
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
      },
      {
        id: 'department',
        header: 'Department',
        accessorFn: row => row.employee?.department?.name ?? NO_DEPARTMENT,
        filterFn: 'equalsString',
        cell: ({ getValue }) => <span className='text-muted-foreground'>{getValue<string>()}</span>
      }] as ColumnDef<TimeOffRequest>[]),
      {
        // Filter-only: the Start Date column already shows the exact day, so a
        // second date column would repeat it. Facets read the row model, not
        // what is on screen, so a hidden column still filters.
        id: 'period',
        header: 'Period',
        accessorFn: row => periodValue(row.startDate),
        filterFn: 'equalsString'
      },
      {
        id: 'type',
        header: 'Time Off Type',
        accessorFn: row => row.timeOffType?.name ?? '—',
        filterFn: 'equalsString'
      },
      {
        id: 'startDate',
        header: 'Start Date',
        accessorFn: row => new Date(row.startDate).getTime(),
        cell: ({ row }) => formatTimeOffDate(row.original.startDate)
      },
      {
        id: 'endDate',
        header: 'End Date',
        accessorFn: row => new Date(row.endDate).getTime(),
        cell: ({ row }) => formatTimeOffDate(row.original.endDate)
      },
      {
        id: 'duration',
        header: 'Duration',
        accessorKey: 'duration',
        cell: ({ row }) => (
          <div className='text-right tabular-nums'>
            {row.original.duration} {row.original.timeOffType?.unit ?? 'Days'}
          </div>
        )
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        filterFn: 'equalsString',
        cell: ({ row }) => (
          <Badge className={STATUS_CLASSES[row.original.status]}>
            {TIMEOFF_STATUS_LABELS[row.original.status]}
          </Badge>
        )
      },
      {
        id: 'actions',
        header: () => '',
        enableSorting: false,
        size: 100,
        cell: ({ row }) =>
          canDecide && row.original.status === 'TO_APPROVE' ? (
            <Button size='sm' variant='outline' onClick={() => setReviewing(row.original)}>
              Review
            </Button>
          ) : (
            <Button size='sm' variant='ghost' onClick={() => setReviewing(row.original)}>
              View
            </Button>
          )
      }
    ],
    [canDecide, isSelf]
  )

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: row => row.id,
    // Only a pending request, only for a role that may decide, and never the
    // approver's own — the server refuses that anyway, so offering the tick
    // would only lead to a dead end. The seniority rule cannot be evaluated
    // here, so those rows stay selectable and surface the server's reason.
    enableRowSelection: row =>
      canDecide &&
      row.original.status === 'TO_APPROVE' &&
      row.original.employeeId !== user?.employeeId,
    initialState: { columnVisibility: { period: false } },
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

  const selectedRequests = table.getSelectedRowModel().rows.map(r => r.original)
  const selectedDays = selectedRequests.reduce((sum, r) => sum + r.duration, 0)

  /**
   * Applies one decision to every ticked request.
   *
   * Each row goes through the same endpoint a single decision uses, so the
   * server's own rules still apply per row — an approver cannot slip their own
   * request through by including it in a batch. Rows that are refused by those
   * rules are reported rather than silently dropped.
   */
  const runBulkDecision = async () => {
    const decision = bulkDecision
    if (!decision) return

    setBulkRunning(true)
    const outcome = await runBulk(
      selectedRequests,
      r => `${r.employee?.name ?? 'Employee'} · ${r.timeOffType?.name ?? 'leave'}`,
      r => decide.mutateAsync({ id: r.id, decision })
    )
    setBulkRunning(false)
    setBulkDecision(null)
    setRowSelection({})
    setBulkFailures(outcome.failed.map(f => ({ label: f.label, message: f.message })))

    const verb = decision === 'approve' ? 'Approved' : 'Refused'
    if (outcome.succeeded.length > 0) {
      toast.success(`${verb} ${outcome.succeeded.length} request${outcome.succeeded.length === 1 ? '' : 's'}`, {
        description:
          outcome.failed.length > 0 ? `${outcome.failed.length} could not be processed.` : undefined
      })
    } else {
      toast.error(`No request could be ${decision === 'approve' ? 'approved' : 'refused'}.`)
    }
  }

  const decideOn = async (decision: 'approve' | 'refuse') => {
    if (!reviewing) return
    await decide.mutateAsync({ id: reviewing.id, decision })
    setReviewing(null)
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Time Off Requests</h1>
          <p className='text-muted-foreground text-sm'>
            Approving a request automatically deducts the days from the employee&apos;s allocation.
          </p>
        </div>

        {canRequest && (
          <Button onClick={() => setCreating(true)}>
            <IconPlus />
            New Request
          </Button>
        )}
      </div>

      {(createRequest.isError || decide.isError) && (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
          {(createRequest.error ?? decide.error) instanceof Error
            ? (createRequest.error ?? decide.error)!.message
            : 'Could not complete the action.'}
        </div>
      )}

      {bulkFailures.length > 0 && (
        <div className='border-destructive/30 bg-destructive/10 rounded-lg border p-4 text-sm'>
          <div className='text-destructive flex items-center gap-2 font-medium'>
            <IconAlertTriangle className='size-4' />
            {bulkFailures.length} request{bulkFailures.length === 1 ? '' : 's'} could not be
            processed
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
          Could not load requests{error instanceof Error ? `: ${error.message}` : '.'}
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
                    Filtered by {requests[0]?.employee?.name ?? 'employee'} — clear
                  </Button>
                )}
              </div>
              <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
                {!isSelf && (
                  <DataTableFacetFilter column={table.getColumn('department')} label='Department' />
                )}
                <DataTableFacetFilter column={table.getColumn('type')} label='Time Off Type' />
                <DataTableFacetFilter
                  column={table.getColumn('period')}
                  label='Period'
                  format={periodLabel}
                  orderBy='value'
                />
                <DataTableFacetFilter
                  column={table.getColumn('status')}
                  label='Status'
                  format={value => TIMEOFF_STATUS_LABELS[value as TimeOffStatus] ?? value}
                />
              </div>
            </div>

            {selectedRequests.length > 0 && (
              <div className='bg-primary/5 flex flex-wrap items-center justify-between gap-3 border-t px-6 py-3'>
                <p className='text-sm'>
                  <span className='font-semibold'>{selectedRequests.length}</span> pending request
                  {selectedRequests.length === 1 ? '' : 's'} selected ·{' '}
                  <span className='font-medium tabular-nums'>{selectedDays}</span> day
                  {selectedDays === 1 ? '' : 's'} in total
                </p>
                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setBulkDecision('refuse')}
                    disabled={decide.isPending || bulkRunning}
                  >
                    <IconX />
                    Refuse selected
                  </Button>
                  <Button
                    size='sm'
                    onClick={() => setBulkDecision('approve')}
                    disabled={decide.isPending || bulkRunning}
                  >
                    <IconCheck />
                    Approve selected
                  </Button>
                  <Button variant='ghost' size='sm' onClick={() => setRowSelection({})}>
                    Clear
                  </Button>
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id} className='h-14 border-t'>
                    {headerGroup.headers.map(header => (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() ? `${header.getSize()}px` : undefined }}
                        className={`text-muted-foreground first:pl-4 last:px-4 ${
                          header.column.id === 'duration' ? 'text-right' : ''
                        }`}
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <div
                            className={`flex h-full cursor-pointer items-center gap-2 select-none ${
                              header.column.id === 'duration' ? 'justify-end' : 'justify-between'
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
                      No time off requests match the current filters.
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

          <DataTablePagination table={table} noun='requests' />
        </Card>
      )}

      {/* Bulk decision confirmation */}
      <Dialog open={!!bulkDecision} onOpenChange={open => !open && setBulkDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkDecision === 'approve' ? 'Approve' : 'Refuse'} {selectedRequests.length} request
              {selectedRequests.length === 1 ? '' : 's'}?
            </DialogTitle>
            <DialogDescription>
              {bulkDecision === 'approve'
                ? `${selectedDays} day${selectedDays === 1 ? '' : 's'} will be deducted from the employees' allocations.`
                : 'Refusing does not change any allocation.'}
            </DialogDescription>
          </DialogHeader>

          <div className='max-h-56 divide-y overflow-y-auto rounded-md border text-sm'>
            {selectedRequests.map(r => (
              <div key={r.id} className='flex items-center justify-between px-3 py-2'>
                <span>
                  {r.employee?.name} · {r.timeOffType?.name}
                </span>
                <span className='text-muted-foreground tabular-nums'>
                  {r.duration} {r.timeOffType?.unit ?? 'Days'}
                </span>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setBulkDecision(null)} disabled={bulkRunning}>
              Cancel
            </Button>
            <Button
              variant={bulkDecision === 'refuse' ? 'destructive' : 'default'}
              onClick={runBulkDecision}
              disabled={bulkRunning}
            >
              {bulkRunning
                ? 'Working…'
                : bulkDecision === 'approve'
                  ? 'Approve all'
                  : 'Refuse all'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New request */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New time off request</DialogTitle>
            <DialogDescription>
              Duration is counted in whole days, inclusive of both dates.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
              {formError}
            </div>
          )}

          <div className='space-y-4'>
            <div className='space-y-1.5'>
              <Label>Time Off Type</Label>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select type' />
                </SelectTrigger>
                <SelectContent>
                  {types.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label>Start Date</Label>
                <DatePicker value={start} onChange={setStart} placeholder='Start' />
              </div>
              <div className='space-y-1.5'>
                <Label>End Date</Label>
                <DatePicker
                  value={end}
                  onChange={setEnd}
                  placeholder='End'
                  disabledDate={date => (start ? date < start : false)}
                />
              </div>
            </div>

            <div className='bg-muted/50 rounded-lg border px-3 py-2 text-sm'>
              Duration: <span className='font-semibold'>{duration}</span> day
              {duration === 1 ? '' : 's'}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='reason'>Reason</Label>
              <Input
                id='reason'
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder='Family function'
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={submitRequest} disabled={createRequest.isPending}>
              {createRequest.isPending ? 'Submitting…' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve / refuse */}
      <Dialog open={!!reviewing} onOpenChange={open => !open && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Time off request</DialogTitle>
            <DialogDescription>
              {reviewing?.employee?.name} · {reviewing?.timeOffType?.name}
            </DialogDescription>
          </DialogHeader>

          {reviewing && (
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>From</span>
                <span>{formatTimeOffDate(reviewing.startDate)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>To</span>
                <span>{formatTimeOffDate(reviewing.endDate)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Duration</span>
                <span>
                  {reviewing.duration} {reviewing.timeOffType?.unit ?? 'Days'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Status</span>
                <Badge className={STATUS_CLASSES[reviewing.status]}>
                  {TIMEOFF_STATUS_LABELS[reviewing.status]}
                </Badge>
              </div>
              <div className='pt-2'>
                <p className='text-muted-foreground'>Reason</p>
                <p>{reviewing.reason}</p>
              </div>
            </div>
          )}

          {canDecide && reviewing?.status === 'TO_APPROVE' && (
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => decideOn('refuse')}
                disabled={decide.isPending}
              >
                <IconX />
                Refuse
              </Button>
              <Button onClick={() => decideOn('approve')} disabled={decide.isPending}>
                <IconCheck />
                Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TimeOffRequests
