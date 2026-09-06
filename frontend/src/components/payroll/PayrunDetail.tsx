import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import type {
  ColumnDef,
  PaginationState,
  RowSelectionState,
  SortingState
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import { PersonAvatar } from '@/components/common/PersonAvatar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DataTablePagination,
  DataTablePaginationBase
} from '@/components/shadcn-studio/data-table/data-table-parts'
import { useClientPagination } from '@/hooks/useClientPagination'

/**
 * Mirrors SEND_BLOCKING_CODES in backend/src/payroll/payrunWarnings.ts, which
 * is the authority — this copy only lets the dialog disable its own button.
 */
const SEND_BLOCKING_CODES = [
  'DUPLICATE_PAYSLIP',
  'MISSING_EMAIL',
  'NON_POSITIVE_NET',
  'NO_APPLICABLE_CONTRACT'
]
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  IconArrowLeft,
  IconAlertTriangle,
  IconCalculator,
  IconCheck,
  IconCash,
  IconMail,
  IconInfoCircle,
  IconChevronDown,
  IconChevronUp,
  IconX
} from '@tabler/icons-react'

import PayslipSendProgress, { type SendProgressResult } from '@/components/payroll/PayslipSendProgress'

import { usePayrun, usePayrunAction, usePayrunWarnings } from '@/hooks/usePayruns'
import { useAuth } from '@/context/AuthContext'
import {
  PAYRUN_FLOW,
  PAYRUN_STATUS_CLASSES,
  PAYRUN_STATUS_LABELS,
  PAYSLIP_STATUS_CLASSES,
  PAYSLIP_STATUS_LABELS,
  money,
  type Payslip
} from '@/types/payrun'
import type { Role } from '@/types/user'

/** Compute, Validate and Mark Paid can be performed by Payroll Users, Managers and Admins. */
const CAN_PROCESS: Role[] = ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

/** Sending payslips via email is restricted to Payroll Managers and Admins only. */
const CAN_SEND: Role[] = ['HR_PAYROLL_MANAGER', 'ADMIN']

/** PRD Screen 13 — Payrun processing, plus Screen 16 bulk send. */
export function PayrunDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: payrun, isLoading, isError, error } = usePayrun(id)
  const { data: warnings = [] } = usePayrunWarnings(id)
  const action = usePayrunAction()

  const [sending, setSending] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 })
  const [recipients, setRecipients] = useState<string[]>([])
  const [sendStarted, setSendStarted] = useState(false)
  const [sendResult, setSendResult] = useState<SendProgressResult | undefined>()
  const [sendError, setSendError] = useState<string | undefined>()

  // The recipient list is one row per employee, so a full payrun fills it with
  // hundreds. Paging it keeps the dialog a fixed height; `recipients` holds ids
  // rather than rows, so a tick survives turning the page.
  const sendableSlips = useMemo(() => payrun?.payslips ?? [], [payrun])
  const recipientPages = useClientPagination(sendableSlips, 10)

  const canProcess = !!user && CAN_PROCESS.includes(user.role)
  const canSend = !!user && CAN_SEND.includes(user.role)

  // These hooks sit above the loading and error returns below: React requires
  // the same hooks on every render, and the payrun is undefined on the first
  // pass. The table is therefore built over an empty list until it arrives.
  const columns = useMemo<ColumnDef<Payslip>[]>(
    () => [
      {
        id: 'select',
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllRowsSelected() || (table.getIsSomeRowsSelected() && 'indeterminate')
            }
            onCheckedChange={value => table.toggleAllRowsSelected(!!value)}
            aria-label='Select every payslip'
          />
        ),
        cell: ({ row }) => (
          // The row opens the payslip, so the tick must keep its click.
          <div onClick={e => e.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={value => row.toggleSelected(!!value)}
              aria-label={`Select payslip for ${row.original.employee?.name ?? 'employee'}`}
            />
          </div>
        ),
        size: 50
      },
      {
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
        size: 280
      },
      {
        id: 'workedDays',
        header: 'Worked Days',
        accessorKey: 'workedDays',
        cell: ({ row }) => <div className='text-right tabular-nums'>{row.original.workedDays}</div>
      },
      {
        id: 'gross',
        header: 'Gross',
        accessorKey: 'grossSalary',
        cell: ({ row }) => (
          <div className='text-right tabular-nums'>{money(row.original.grossSalary)}</div>
        )
      },
      {
        id: 'deductions',
        header: 'Deductions',
        accessorKey: 'totalDeductions',
        cell: ({ row }) => (
          <div className='text-right tabular-nums'>{money(row.original.totalDeductions)}</div>
        )
      },
      {
        id: 'net',
        header: 'Net',
        accessorKey: 'netSalary',
        cell: ({ row }) => (
          <div className='text-right font-semibold tabular-nums'>{money(row.original.netSalary)}</div>
        )
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => (
          <Badge className={PAYSLIP_STATUS_CLASSES[row.original.status]}>
            {PAYSLIP_STATUS_LABELS[row.original.status]}
          </Badge>
        )
      }
    ],
    []
  )

  const table = useReactTable({
    data: payrun?.payslips ?? [],
    columns,
    // Keyed by payslip id because the selection is handed straight to the send
    // dialog as its recipient list.
    getRowId: row => row.id,
    state: { sorting, rowSelection, pagination },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // A payrun holds one payslip per employee — ~1,000 rows at full headcount.
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false
  })

  const selectedRows = table.getSelectedRowModel().rows
  const selectedTotals = selectedRows.reduce(
    (acc, row) => ({
      gross: acc.gross + row.original.grossSalary,
      deductions: acc.deductions + row.original.totalDeductions,
      net: acc.net + row.original.netSalary
    }),
    { gross: 0, deductions: 0, net: 0 }
  )

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-20 w-full' />
        <Skeleton className='h-64 w-full' />
      </div>
    )
  }

  if (isError || !payrun) {
    return (
      <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
        Could not load this payrun{error instanceof Error ? `: ${error.message}` : '.'}
      </div>
    )
  }

  const stage = PAYRUN_FLOW.indexOf(payrun.status)
  /**
   * The subset of errors that actually stop an email going out, narrowed to the
   * employees currently ticked. Missing bank details stop someone being *paid*
   * and belong on the page above, but they do not stop a PDF being emailed, so
   * they are not counted here. The server applies the same rule.
   */
  const sendBlockers = useMemo(() => {
    const chosen = new Set(
      sendableSlips.filter(p => recipients.includes(p.id)).map(p => p.employeeId)
    )
    return warnings.filter(
      w =>
        SEND_BLOCKING_CODES.includes(w.code) &&
        w.severity === 'error' &&
        (!w.employeeId || chosen.has(w.employeeId))
    )
  }, [warnings, sendableSlips, recipients])

  const run = async (
    act: 'compute' | 'validate' | 'markPaid',
    label: string
  ) => {
    const toastId = toast.loading(`${label}…`)
    try {
      await action.mutateAsync({ id: payrun.id, action: act })
      toast.success(`${label} complete`, { id: toastId })
    } catch (err) {
      toast.error(`${label} failed`, {
        id: toastId,
        description: err instanceof Error ? err.message : undefined
      })
    }
  }

  /**
   * Sending is the one action worth watching: a PDF is built and emailed per
   * employee, so it takes long enough that a spinner in the corner says
   * nothing useful. The dialog stays open and shows real progress, reported by
   * the server as each send settles.
   */
  const runSend = async () => {
    setSendError(undefined)
    setSendResult(undefined)
    setSendStarted(true)
    try {
      const res = (await action.mutateAsync({
        id: payrun.id,
        action: 'send',
        payslipIds: recipients
      })) as {
        sent?: number
        failed?: number
      }
      setSendResult({ sent: res?.sent ?? recipients.length, failed: res?.failed ?? 0 })
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not send the payslips.')
    }
  }

  const closeSendDialog = () => {
    setSending(false)
    setSendStarted(false)
    setSendResult(undefined)
    setSendError(undefined)
  }

  // Ticking rows in the table is the same act as choosing who to email, so the
  // send dialog opens on that selection rather than starting from everyone
  // again. With nothing ticked it still means "all of them".
  const openSend = () => {
    const ticked = Object.keys(rowSelection).filter(id => rowSelection[id])
    setRecipients(ticked.length > 0 ? ticked : payrun.payslips.map(p => p.id))
    setSendStarted(false)
    setSendResult(undefined)
    setSendError(undefined)
    setSending(true)
  }

  const totals = payrun.payslips.reduce(
    (acc, p) => ({
      gross: acc.gross + p.grossSalary,
      deductions: acc.deductions + p.totalDeductions,
      net: acc.net + p.netSalary
    }),
    { gross: 0, deductions: 0, net: 0 }
  )

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => navigate('/payroll/payruns')}
            aria-label='Back'
          >
            <IconArrowLeft />
          </Button>
          <div>
            <div className='flex items-center gap-3'>
              <h1 className='text-foreground text-2xl font-semibold tracking-tight'>
                {payrun.period}
              </h1>
              <Badge className={PAYRUN_STATUS_CLASSES[payrun.status]}>
                {PAYRUN_STATUS_LABELS[payrun.status]}
              </Badge>
            </div>
            <p className='text-muted-foreground text-sm'>
              {payrun.salaryStructure?.name} · {payrun.payslips.length} employee
              {payrun.payslips.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* Lifecycle actions */}
        <div className='flex flex-wrap gap-2'>
          <Button
            variant='outline'
            disabled={action.isPending || !canProcess || stage >= 2}
            onClick={() => run('compute', 'Compute')}
          >
            <IconCalculator />
            Compute
          </Button>
          <Button
            variant='outline'
            disabled={action.isPending || !canProcess || stage < 1 || stage >= 2}
            onClick={() => run('validate', 'Validate')}
          >
            <IconCheck />
            Validate
          </Button>
          <Button
            variant='outline'
            disabled={action.isPending || !canProcess || stage < 2 || stage >= 3}
            onClick={() => run('markPaid', 'Mark Paid')}
          >
            <IconCash />
            Mark Paid
          </Button>
          <Button
            disabled={action.isPending || !canSend || stage < 2}
            onClick={openSend}
            title={!canSend ? 'Only HR Payroll Manager and Admin can send payslips' : undefined}
          >
            <IconMail />
            Send Payslips
          </Button>
        </div>
      </div>

      {/* Warnings before finalisation */}
      {warnings.length > 0 ? (
        <div className='space-y-2'>
          {warnings.map((warning, index) => (
            <Alert
              key={`${warning.code}-${index}`}
              variant={warning.severity === 'error' ? 'destructive' : 'default'}
              className={warning.severity === 'error' ? 'border-destructive *:[svg]:row-span-1' : '*:[svg]:row-span-1'}
            >
              <IconAlertTriangle />
              <AlertTitle>{warning.message}</AlertTitle>
            </Alert>
          ))}
        </div>
      ) : (
        payrun.payslips.length > 0 && (
          <Alert className='*:[svg]:row-span-1'>
            <IconInfoCircle />
            <AlertTitle>No issues found. This payrun is ready to finalise.</AlertTitle>
          </Alert>
        )
      )}

      {/* Payslips summary */}
      <Card className='w-full py-0'>
        {selectedRows.length > 0 && (
          <div className='bg-primary/5 flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3'>
            <p className='text-sm'>
              <span className='font-semibold'>{selectedRows.length}</span> of{' '}
              {payrun.payslips.length} selected ·{' '}
              <span className='text-muted-foreground'>Gross</span>{' '}
              <span className='font-medium tabular-nums'>{money(selectedTotals.gross)}</span> ·{' '}
              <span className='text-muted-foreground'>Deductions</span>{' '}
              <span className='font-medium tabular-nums'>{money(selectedTotals.deductions)}</span> ·{' '}
              <span className='text-muted-foreground'>Net</span>{' '}
              <span className='font-semibold tabular-nums'>{money(selectedTotals.net)}</span>
            </p>
            <Button variant='ghost' size='sm' onClick={() => setRowSelection({})}>
              <IconX />
              Clear selection
            </Button>
          </div>
        )}

        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id} className='bg-muted/50 h-14'>
                  {headerGroup.headers.map(header => {
                    const numeric = ['workedDays', 'gross', 'deductions', 'net'].includes(
                      header.column.id
                    )
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() ? `${header.getSize()}px` : undefined }}
                        className='text-muted-foreground first:pl-4 last:px-4'
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
              {payrun.payslips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className='h-24 text-center'>
                    No payslips yet. Run Compute to generate them.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {table.getRowModel().rows.map(row => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className='h-14 cursor-pointer'
                      onClick={() => navigate(`/payroll/payslips/${row.original.id}`)}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id} className='first:w-12.5 first:pl-4 last:px-4'>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  <TableRow className='bg-muted/30 font-semibold hover:bg-muted/30'>
                    <TableCell colSpan={3} className='pl-4'>
                      Totals
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>{money(totals.gross)}</TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {money(totals.deductions)}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>{money(totals.net)}</TableCell>
                    <TableCell />
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination table={table} noun='payslips' />
      </Card>

      {/* Screen 16 — bulk email distribution */}
      <Dialog open={sending} onOpenChange={open => (open ? setSending(true) : closeSendDialog())}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Send Payslips</DialogTitle>
            <DialogDescription>
              Each payslip is emailed to the employee and marked as sent.
            </DialogDescription>
          </DialogHeader>

          {/* A warning about what to resolve "before sending" contradicts the
              progress bar once sending has begun, so it belongs to the
              pre-send step only. */}
          {!sendStarted && sendBlockers.length > 0 && (
            <Alert variant='destructive' className='border-destructive *:[svg]:row-span-1'>
              <IconAlertTriangle />
              <AlertTitle>
                Resolve {sendBlockers.length} blocking issue
                {sendBlockers.length === 1 ? '' : 's'} before sending.
              </AlertTitle>
              {/* A count alone cannot be acted on — say which employees and why. */}
              <AlertDescription>
                <ul className='max-h-24 list-disc space-y-0.5 overflow-y-auto pl-4'>
                  {sendBlockers.slice(0, 6).map((warning, index) => (
                    <li key={index}>{warning.message}</li>
                  ))}
                  {sendBlockers.length > 6 && (
                    <li>and {sendBlockers.length - 6} more, listed on the payrun above.</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {sendStarted ? (
            <PayslipSendProgress
              payrunId={payrun.id}
              total={recipients.length}
              result={sendResult}
              error={sendError}
            />
          ) : (
          <div className='rounded-md border'>
            {/* With the list paged, ticking everyone by hand is no longer
                possible, so the all/none control acts on the whole payrun. */}
            <div className='flex items-center justify-between gap-3 border-b px-4 py-2'>
              <span className='text-muted-foreground text-xs'>
                {recipients.length} of {sendableSlips.length} selected
              </span>
              <Button
                variant='ghost'
                size='sm'
                onClick={() =>
                  setRecipients(
                    recipients.length === sendableSlips.length
                      ? []
                      : sendableSlips.map(p => p.id)
                  )
                }
              >
                {recipients.length === sendableSlips.length ? 'Clear all' : 'Select all'}
              </Button>
            </div>

            <div className='divide-y'>
              {recipientPages.page.map(payslip => (
                <label
                  key={payslip.id}
                  className='hover:bg-muted/40 flex cursor-pointer items-center gap-3 px-4 py-2.5'
                >
                  <Checkbox
                    checked={recipients.includes(payslip.id)}
                    onCheckedChange={() =>
                      setRecipients(current =>
                        current.includes(payslip.id)
                          ? current.filter(x => x !== payslip.id)
                          : [...current, payslip.id]
                      )
                    }
                    aria-label={`Send to ${payslip.employee?.name}`}
                  />
                  <span className='flex-1 text-sm'>{payslip.employee?.name}</span>
                  <span className='text-muted-foreground text-xs tabular-nums'>
                    {money(payslip.netSalary)}
                  </span>
                </label>
              ))}
            </div>

            <div className='border-t'>
              <DataTablePaginationBase
                pageIndex={recipientPages.pageIndex}
                pageSize={recipientPages.pageSize}
                pageCount={recipientPages.pageCount}
                total={recipientPages.total}
                onPageChange={recipientPages.onPageChange}
                noun='employees'
                itemsToDisplay={3}
                className='px-3 py-2'
              />
            </div>
          </div>
          )}

          <DialogFooter>
            {sendResult || sendError ? (
              <Button onClick={closeSendDialog}>Done</Button>
            ) : (
              <>
                <Button
                  variant='outline'
                  onClick={closeSendDialog}
                  disabled={sendStarted && action.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={runSend}
                  disabled={
                    action.isPending ||
                    recipients.length === 0 ||
                    sendStarted ||
                    sendBlockers.length > 0
                  }
                >
                  <IconMail />
                  {sendStarted ? 'Sending…' : 'Send All'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PayrunDetail
