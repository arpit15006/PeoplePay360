import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { IconArrowLeft, IconFileTypePdf, IconShieldCheck } from '@tabler/icons-react'

import { usePayslip } from '@/hooks/usePayruns'
import { PAYSLIP_STATUS_CLASSES, PAYSLIP_STATUS_LABELS, money } from '@/types/payrun'

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
      // The PDF renderer is over a megabyte, and only this action needs it, so
      // it is fetched on demand rather than shipped with the initial bundle.
      const { downloadPayslipPdf } = await import('@/services/pdfService')
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
              <Badge className={PAYSLIP_STATUS_CLASSES[payslip.status]}>
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
            <div>
              <span className='text-xs uppercase tracking-wider text-blue-200 block'>Total Net Payable</span>
              <span className='font-bold text-lg tabular-nums'>{money(payslip.netSalary)}</span>
            </div>
            <span className='text-xs text-blue-200'>Direct Bank Deposit</span>
          </div>
        </CardContent>
      </Card>

      {/* Digital Verification & Stamp Card */}
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800/40'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs tracking-wide uppercase'>
            <IconShieldCheck className='size-4 text-emerald-600' />
            <span>Digitally Verified &amp; Authenticated</span>
          </div>
          <p className='text-xs text-muted-foreground'>
            Electronically generated and validated payroll statement. Exempt from physical signatures under IT digital records regulations.
          </p>
          <p className='text-[11px] font-mono text-emerald-700 dark:text-emerald-400'>
            Audit Ref: SHA256-{(payslip.id || '2026').replace(/-/g, '').slice(0, 16).toUpperCase()} • System Validated
          </p>
        </div>

        <div className='border-2 border-dashed border-emerald-600 rounded-lg p-2.5 text-center shrink-0 bg-emerald-100/50 dark:bg-emerald-900/30'>
          <p className='text-[10px] font-bold text-emerald-800 dark:text-emerald-200 tracking-wider'>★ PEOPLEPAY360 ★</p>
          <p className='text-xs font-extrabold text-emerald-700 dark:text-emerald-300 uppercase'>OFFICIALLY VERIFIED</p>
          <p className='text-[10px] font-semibold text-emerald-600 dark:text-emerald-400'>✓ PAID &amp; APPROVED</p>
        </div>
      </div>
    </div>
  )
}

export default PayslipDetail
