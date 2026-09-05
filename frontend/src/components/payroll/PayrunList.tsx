import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { IconPlus } from '@tabler/icons-react'

import { usePayruns } from '@/hooks/usePayruns'
import { PAYRUN_STATUS_CLASSES, PAYRUN_STATUS_LABELS, money } from '@/types/payrun'

/** PRD Screen 12/13 entry — the payrun list. New opens the wizard, never a record. */
export function PayrunList() {
  const navigate = useNavigate()
  const { data: payruns = [], isLoading, isError, error } = usePayruns()

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Payruns</h1>
          <p className='text-muted-foreground text-sm'>
            Each payrun groups the payslips for one period. Finalised runs are kept as history.
          </p>
        </div>
        <Button onClick={() => navigate('/payroll/payruns/new')}>
          <IconPlus />
          New
        </Button>
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
                {payruns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='h-24 text-center'>
                      No payruns yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  payruns.map(payrun => (
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
        </Card>
      )}
    </div>
  )
}

export default PayrunList
