import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

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
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { IconChevronDown, IconChevronUp, IconEye, IconX } from '@tabler/icons-react'

import {
  DataTableFacetFilter,
  DataTablePagination
} from '@/components/shadcn-studio/data-table/data-table-parts'
import { usePayslips } from '@/hooks/usePayruns'
import { useAuth } from '@/context/AuthContext'
import { PAYSLIP_STATUS_CLASSES, PAYSLIP_STATUS_LABELS, money, type Payslip, type PayslipStatus } from '@/types/payrun'

const NO_DEPARTMENT = 'No department'

/** PRD Screen 14 — Payslips list. */
export function PayslipList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  /**
   * An Employee only sees their own payslips, so name and department repeat on
   * every row, and ticking rows to total them is a payroll job, not theirs.
   */
  const isSelf = user?.role === 'EMPLOYEE'

  const [searchParams] = useSearchParams()
  const payrunId = searchParams.get('payrunId') ?? undefined
  const { data: payslips = [], isLoading, isError, error } = usePayslips(payrunId)

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

  const columns = useMemo<ColumnDef<Payslip>[]>(
    () => [
      // Selection exists to total gross and net against a bank file — payroll
      // work, and meaningless on a single person's own payslips.
      ...(isSelf
        ? []
        : [{
        id: 'select',
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
            aria-label='Select all payslips on this page'
          />
        ),
        cell: ({ row }) => (
          // The row itself opens the payslip, so the checkbox has to keep its
          // click to itself or every tick would navigate away.
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
              <span className='text-muted-foreground truncate'>
                {row.original.employee?.employeeCode ?? ''}
              </span>
            </div>
          </div>
        ),
        size: 260
      },
      {
        id: 'department',
        header: 'Department',
        accessorFn: row => row.employee?.department?.name ?? NO_DEPARTMENT,
        filterFn: 'equalsString',
        cell: ({ getValue }) => <span className='text-muted-foreground'>{getValue<string>()}</span>
      }] as ColumnDef<Payslip>[]),
      {
        id: 'structure',
        header: 'Salary Structure',
        accessorFn: row => row.salaryStructure?.name ?? '—',
        filterFn: 'equalsString',
        cell: ({ getValue }) => <span className='text-muted-foreground'>{getValue<string>()}</span>
      },
      {
        id: 'period',
        header: 'Period',
        accessorKey: 'period',
        filterFn: 'equalsString',
        cell: ({ row }) => <span>{row.original.period}</span>
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
        cell: ({ row }) => <div className='text-right tabular-nums'>{money(row.original.grossSalary)}</div>
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
        filterFn: 'equalsString',
        cell: ({ row }) => (
          <Badge className={PAYSLIP_STATUS_CLASSES[row.original.status]}>
            {PAYSLIP_STATUS_LABELS[row.original.status]}
          </Badge>
        )
      },
      {
        id: 'actions',
        header: () => 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className='flex items-center justify-center'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={`View payslip for ${row.original.employee?.name ?? 'employee'}`}
                  onClick={e => {
                    e.stopPropagation()
                    navigate(`/payroll/payslips/${row.original.id}`)
                  }}
                >
                  <IconEye className='size-4.5' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View payslip</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )
      }
    ],
    [navigate, isSelf]
  )

  const table = useReactTable({
    data: payslips,
    columns,
    // Keyed by payslip id so a selection survives filtering, sorting and paging
    // rather than following whichever row happens to sit at that index.
    getRowId: row => row.id,
    state: { sorting, columnFilters, rowSelection, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false
  })

  // Totals for whatever is ticked, so a payroll run can be cross-checked
  // against a bank file without exporting anything.
  const selected = table.getSelectedRowModel().rows
  const selectedTotals = selected.reduce(
    (acc, row) => ({
      gross: acc.gross + row.original.grossSalary,
      net: acc.net + row.original.netSalary
    }),
    { gross: 0, net: 0 }
  )

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Payslips</h1>
        <p className='text-muted-foreground text-sm'>
          Computed from the contract that applies to each payrun period.
        </p>
      </div>

      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className='h-12 w-full' />)}
        </div>
      ) : isError ? (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
          Could not load payslips{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      ) : (
        <Card className='w-full py-0'>
          <div className='border-b'>
            <div className='flex flex-col gap-4 p-6'>
              <span className='text-xl font-semibold'>Filter</span>
              <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
                <DataTableFacetFilter column={table.getColumn('period')} label='Period' />
                {!isSelf && (
                  <DataTableFacetFilter column={table.getColumn('department')} label='Department' />
                )}
                <DataTableFacetFilter column={table.getColumn('structure')} label='Salary Structure' />
                <DataTableFacetFilter
                  column={table.getColumn('status')}
                  label='Status'
                  format={value => PAYSLIP_STATUS_LABELS[value as PayslipStatus] ?? value}
                />
              </div>
            </div>

            {selected.length > 0 && (
              <div className='bg-primary/5 flex flex-wrap items-center justify-between gap-3 border-t px-6 py-3'>
                <p className='text-sm'>
                  <span className='font-semibold'>{selected.length}</span> payslip
                  {selected.length === 1 ? '' : 's'} selected ·{' '}
                  <span className='text-muted-foreground'>Gross</span>{' '}
                  <span className='font-medium tabular-nums'>{money(selectedTotals.gross)}</span> ·{' '}
                  <span className='text-muted-foreground'>Net</span>{' '}
                  <span className='font-semibold tabular-nums'>{money(selectedTotals.net)}</span>
                </p>
                <Button variant='ghost' size='sm' onClick={() => setRowSelection({})}>
                  <IconX />
                  Clear selection
                </Button>
              </div>
            )}

            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id} className='h-14 border-t'>
                    {headerGroup.headers.map(header => {
                      const numeric = ['workedDays', 'gross', 'net'].includes(header.column.id)
                      return (
                        <TableHead
                          key={header.id}
                          style={{ width: header.getSize() ? `${header.getSize()}px` : undefined }}
                          className='text-muted-foreground first:pl-4 last:px-4 last:text-center'
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
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map(row => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className='cursor-pointer'
                      onClick={() => navigate(`/payroll/payslips/${row.original.id}`)}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id} className='h-14 first:w-12.5 first:pl-4 last:w-20 last:px-4'>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className='h-24 text-center'>
                      {payslips.length === 0
                        ? 'No payslips yet.'
                        : 'No payslips match the current filters.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination table={table} noun='payslips' />
        </Card>
      )}
    </div>
  )
}

export default PayslipList
