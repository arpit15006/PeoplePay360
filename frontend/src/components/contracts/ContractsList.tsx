import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import type { ColumnDef, ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table'
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
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useContracts } from '@/hooks/useContracts'
import { useAuth } from '@/context/AuthContext'
import { initialsOf } from '@/types/employee'
import { formatDate, formatWage, type ContractRow, type ContractStatus } from '@/types/contract'
import type { Role } from '@/types/user'

/** PRD section 28 — Contracts is CRUD for every role except Employee. */
const CAN_MANAGE: Role[] = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  DRAFT: 'Draft',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated'
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

  const canManage = !!user && CAN_MANAGE.includes(user.role)

  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [importing, setImporting] = useState(false)

  const importContext = useImportContext()

  // Free text is applied before the table so the faceted selects only offer
  // values that survive the search.
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const matched = !term
      ? contracts
      : contracts.filter(
          c =>
            (c.employee?.name ?? '').toLowerCase().includes(term) ||
            (c.employee?.employeeCode ?? '').toLowerCase().includes(term) ||
            c.position.toLowerCase().includes(term)
        )

    // Newest first, so the current contract sits above the historical ones.
    return [...matched].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    )
  }, [contracts, search])

  const columns = useMemo<ColumnDef<ContractRow>[]>(
    () => [
      {
        id: 'employee',
        header: 'Employee',
        accessorFn: row => row.employee?.name ?? '',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <Avatar className='size-9'>
              <AvatarFallback className='text-xs'>
                {initialsOf(row.original.employee?.name ?? '?')}
              </AvatarFallback>
            </Avatar>
            <div className='flex min-w-0 flex-col'>
              <span className='truncate font-medium'>{row.original.employee?.name ?? '—'}</span>
              <span className='text-muted-foreground truncate text-xs'>
                {row.original.employee?.employeeCode ?? ''}
              </span>
            </div>
          </div>
        ),
        size: 260
      },
      {
        id: 'startDate',
        header: 'Start Date',
        accessorFn: row => new Date(row.startDate).getTime(),
        cell: ({ row }) => formatDate(row.original.startDate)
      },
      {
        id: 'endDate',
        header: 'End Date',
        // Open-ended contracts sort last rather than first, which is where an
        // empty value would otherwise land.
        accessorFn: row => (row.endDate ? new Date(row.endDate).getTime() : Number.MAX_SAFE_INTEGER),
        cell: ({ row }) =>
          row.original.endDate ? (
            formatDate(row.original.endDate)
          ) : (
            <span className='text-muted-foreground'>Open-ended</span>
          )
      },
      {
        id: 'wage',
        header: 'Wage',
        accessorKey: 'wage',
        cell: ({ row }) => (
          <div className='text-right font-medium tabular-nums'>{formatWage(row.original.wage)}</div>
        )
      },
      {
        id: 'department',
        header: 'Department',
        accessorFn: row => row.department?.name ?? NO_DEPARTMENT,
        filterFn: 'equalsString',
        cell: ({ getValue }) => <span className='text-muted-foreground'>{getValue<string>()}</span>
      },
      {
        id: 'position',
        header: 'Position',
        accessorKey: 'position',
        filterFn: 'equalsString'
      },
      {
        id: 'structure',
        header: 'Salary Structure',
        accessorFn: row => row.salaryStructure?.name ?? NO_STRUCTURE,
        filterFn: 'equalsString',
        cell: ({ getValue }) => <span className='text-muted-foreground'>{getValue<string>()}</span>
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        filterFn: 'equalsString',
        cell: ({ row }) => <ContractStatusBadge status={row.original.status as ContractStatus} />
      },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: () => '',
              enableSorting: false,
              size: 60,
              cell: ({ row }) => (
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
                          onClick={() => navigate(`/contracts/${row.original.id}?action=terminate`)}
                        >
                          <IconBan />
                          <span>Terminate</span>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            } as ColumnDef<ContractRow>
          ]
        : [])
    ],
    [canManage, navigate]
  )

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: row => row.id,
    state: { sorting, columnFilters, pagination },
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
                <DataTableFacetFilter column={table.getColumn('department')} label='Department' />
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

                      return (
                        <TableRow
                          key={row.id}
                          onClick={() => navigate(`/contracts/${row.original.id}`)}
                          // PRD: "Active contract must be identifiable" — the badge
                          // is reinforced with a tinted row and a left accent border.
                          className={`h-14 cursor-pointer ${
                            isActive
                              ? 'bg-green-600/5 hover:bg-green-600/10 dark:bg-green-400/5'
                              : 'opacity-80'
                          }`}
                        >
                          {row.getVisibleCells().map((cell, index) => (
                            <TableCell
                              key={cell.id}
                              className={`first:pl-4 last:px-4 ${
                                index === 0
                                  ? isActive
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
