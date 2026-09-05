import { useNavigate, useSearchParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { usePayslips } from '@/hooks/usePayruns'
import { PAYSLIP_STATUS_LABELS, money } from '@/types/payrun'

/** PRD Screen 14 — Payslips list. */
export function PayslipList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const payrunId = searchParams.get('payrunId') ?? undefined
  const { data: payslips = [], isLoading, isError, error } = usePayslips(payrunId)

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
        <Card className='p-0'>
          <CardContent className='overflow-x-auto p-0'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead>Employee</TableHead>
                  <TableHead>Salary Structure</TableHead>
                  <TableHead>Payrun</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className='text-right'>Worked Days</TableHead>
                  <TableHead className='text-right'>Gross</TableHead>
                  <TableHead className='text-right'>Net</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className='h-24 text-center'>
                      No payslips yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  payslips.map(payslip => (
                    <TableRow
                      key={payslip.id}
                      className='cursor-pointer'
                      onClick={() => navigate(`/payroll/payslips/${payslip.id}`)}
                    >
                      <TableCell className='font-medium'>
                        <div>{payslip.employee?.name ?? '—'}</div>
                        <div className='text-muted-foreground text-xs'>
                          {payslip.employee?.employeeCode}
                        </div>
                      </TableCell>
                      <TableCell>{payslip.salaryStructure?.name ?? '—'}</TableCell>
                      <TableCell>{payslip.payrun?.period ?? '—'}</TableCell>
                      <TableCell>{payslip.period}</TableCell>
                      <TableCell className='text-right tabular-nums'>{payslip.workedDays}</TableCell>
                      <TableCell className='text-right tabular-nums'>{money(payslip.grossSalary)}</TableCell>
                      <TableCell className='text-right font-semibold tabular-nums'>{money(payslip.netSalary)}</TableCell>
                      <TableCell>
                        <Badge className='border-none bg-slate-600/10 text-slate-600 dark:bg-slate-400/10 dark:text-slate-400'>
                          {PAYSLIP_STATUS_LABELS[payslip.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PayslipList
