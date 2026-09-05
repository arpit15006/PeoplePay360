import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { IconArrowLeft, IconFileTypePdf } from '@tabler/icons-react'

import { usePayslip } from '@/hooks/usePayruns'
import { downloadPayslipPdf } from '@/services/pdfService'
import { PAYSLIP_STATUS_LABELS, money } from '@/types/payrun'

const Meta = ({ label, value }: { label: string; value: string }) => (
  <div className='space-y-1'>
    <p className='text-muted-foreground text-xs font-medium'>{label}</p>
    <p className='text-sm font-medium'>{value || '—'}</p>
  </div>
)

/** PRD Screen 14 detail — salary computation breakdown, plus Print Payslip. */
export function PayslipDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: payslip, isLoading, isError, error } = usePayslip(id)
  const [printing, setPrinting] = useState(false)

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-20 w-full' />
        <Skeleton className='h-80 w-full' />
      </div>
    )
  }

  if (isError || !payslip) {
    return (
      <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
        Could not load this payslip{error instanceof Error ? `: ${error.message}` : '.'}
      </div>
    )
  }

  const lines = [...(payslip.lines ?? [])].sort((a, b) => a.sequence - b.sequence)
  const earnings = lines.filter(l => l.category === 'BASIC' || l.category === 'ALLOWANCE')
  const deductions = lines.filter(l => l.category === 'DEDUCTION')

  const print = async () => {
    setPrinting(true)
    try {
      await downloadPayslipPdf(payslip)
      toast.success('Payslip PDF downloaded')
    } catch (err) {
      toast.error('Could not generate the PDF', {
        description: err instanceof Error ? err.message : undefined
      })
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' onClick={() => navigate(-1)} aria-label='Back'>
            <IconArrowLeft />
          </Button>
          <div>
            <div className='flex items-center gap-3'>
              <h1 className='text-foreground text-2xl font-semibold tracking-tight'>
                {payslip.employee?.name}
              </h1>
              <Badge className='border-none bg-slate-600/10 text-slate-600 dark:bg-slate-400/10 dark:text-slate-400'>
                {PAYSLIP_STATUS_LABELS[payslip.status]}
              </Badge>
            </div>
            <p className='text-muted-foreground text-sm'>
              {payslip.employee?.employeeCode} · {payslip.period}
            </p>
          </div>
        </div>

        <Button onClick={print} disabled={printing}>
          <IconFileTypePdf />
          {printing ? 'Generating…' : 'Print Payslip'}
        </Button>
      </div>

      {/* Identification */}
      <Card>
        <CardContent className='grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5'>
          <Meta label='Employee' value={payslip.employee?.name ?? ''} />
          <Meta label='Structure' value={payslip.salaryStructure?.name ?? ''} />
          <Meta label='Payrun' value={payslip.payrun?.period ?? ''} />
          <Meta label='Period' value={payslip.period} />
          <Meta label='Worked Days' value={String(payslip.workedDays)} />
        </CardContent>
      </Card>

      {/* Salary computation */}
      <Card>
        <CardContent className='space-y-1'>
          <h2 className='text-foreground mb-3 text-sm font-semibold'>Salary Computation</h2>

          {earnings.map(line => (
            <div key={line.id} className='flex items-center justify-between py-1.5 text-sm'>
              <span>{line.name}</span>
              <span className='tabular-nums'>{money(line.amount)}</span>
            </div>
          ))}

          <div className='mt-1 flex items-center justify-between border-t pt-2 text-sm font-semibold'>
            <span>Gross Salary</span>
            <span className='tabular-nums'>{money(payslip.grossSalary)}</span>
          </div>

          <div className='mt-4'>
            {deductions.map(line => (
              <div key={line.id} className='flex items-center justify-between py-1.5 text-sm'>
                <span>{line.name}</span>
                <span className='tabular-nums'>{money(line.amount)}</span>
              </div>
            ))}
          </div>

          <div className='flex items-center justify-between border-t pt-2 text-sm font-semibold'>
            <span>Total Deductions</span>
            <span className='tabular-nums'>{money(payslip.totalDeductions)}</span>
          </div>

          <div className='bg-primary text-primary-foreground mt-4 flex items-center justify-between rounded-lg px-4 py-3'>
            <span className='font-semibold'>NET SALARY</span>
            <span className='text-lg font-bold tabular-nums'>{money(payslip.netSalary)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PayslipDetail
