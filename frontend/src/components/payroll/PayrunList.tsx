import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { IconPlus, IconX } from '@tabler/icons-react'

import { DataTablePaginationBase } from '@/components/shadcn-studio/data-table/data-table-parts'
import { useClientPagination } from '@/hooks/useClientPagination'
import { usePayruns } from '@/hooks/usePayruns'
import {
  PAYRUN_STATUS_CLASSES,
  PAYRUN_STATUS_LABELS,
  money,
  type PayrunStatus
} from '@/types/payrun'

/** PRD Screen 12/13 entry — the payrun list. New opens the wizard, never a record. */
export function PayrunList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: payruns = [], isLoading, isError, error } = usePayruns()

  // Arriving from a dashboard alert carries the status it counted, so the list
  // opens on exactly the payruns that alert was about.
  const statusFilter = searchParams.get('status') as PayrunStatus | null
  const rows = useMemo(
    () => (statusFilter ? payruns.filter(p => p.status === statusFilter) : payruns),
    [payruns, statusFilter]
  )

  const clearStatus = () => {
    searchParams.delete('status')
    setSearchParams(searchParams, { replace: true })
  }

  // Payruns accrue a row a month rather than one an employee, but the list is
  // append-only and never pruned, so it pages like the rest.
  const { page, pageIndex, pageSize, pageCount, total, onPageChange, onPageSizeChange } =
    useClientPagination(rows)

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Payruns</h1>
          <p className='text-muted-foreground text-sm'>
            Each payrun groups the payslips for one period. Finalised runs are kept as history.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {/* Say plainly that the list is narrowed, and offer the way out. */}
          {statusFilter && (
            <Button variant='outline' onClick={clearStatus}>
              <IconX />
              Showing {PAYRUN_STATUS_LABELS[statusFilter] ?? statusFilter} only
            </Button>
          )}
          <Button onClick={() => navigate('/payroll/payruns/new')}>
            <IconPlus />
            New
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className='h-12 w-full' />)}
        </div>
      ) : isError ? (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
          Could not load payruns{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      ) : (
        <Card className='p-0'>
          <CardContent className='overflow-x-auto p-0'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead>Period</TableHead>
                  <TableHead>Salary Structure</TableHead>
                  <TableHead className='text-right'>Employees</TableHead>
                  <TableHead className='text-right'>Total Net</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='h-24 text-center'>
                      {payruns.length === 0
                        ? 'No payruns yet.'
                        : 'No payruns match the current filter.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  page.map(payrun => (
                    <TableRow
                      key={payrun.id}
                      className='cursor-pointer'
                      onClick={() => navigate(`/payroll/payruns/${payrun.id}`)}
                    >
                      <TableCell className='font-medium'>{payrun.period}</TableCell>
                      <TableCell>{payrun.salaryStructure?.name ?? '—'}</TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {payrun._count?.payslips ?? payrun.payslips?.length ?? 0}
                      </TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {money((payrun.payslips ?? []).reduce((s, p) => s + p.netSalary, 0))}
                      </TableCell>
                      <TableCell>
                        <Badge className={PAYRUN_STATUS_CLASSES[payrun.status]}>
                          {PAYRUN_STATUS_LABELS[payrun.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>

          <DataTablePaginationBase
            pageIndex={pageIndex}
            pageSize={pageSize}
            pageCount={pageCount}
            total={total}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            noun='payruns'
          />
        </Card>
      )}
    </div>
  )
}

export default PayrunList
