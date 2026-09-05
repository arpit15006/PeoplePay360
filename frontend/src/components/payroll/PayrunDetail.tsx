import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Alert, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
  IconInfoCircle
} from '@tabler/icons-react'

import { usePayrun, usePayrunAction, usePayrunWarnings } from '@/hooks/usePayruns'
import { useAuth } from '@/context/AuthContext'
import {
  PAYRUN_FLOW,
  PAYRUN_STATUS_CLASSES,
  PAYRUN_STATUS_LABELS,
  PAYSLIP_STATUS_LABELS,
  money
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
  const [recipients, setRecipients] = useState<string[]>([])

  const canProcess = !!user && CAN_PROCESS.includes(user.role)
  const canSend = !!user && CAN_SEND.includes(user.role)

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
  const blocking = warnings.filter(w => w.severity === 'error')

  const run = async (
    act: 'compute' | 'validate' | 'markPaid' | 'send',
    label: string
  ) => {
    const toastId = toast.loading(`${label}…`)
    try {
      await action.mutateAsync({ id: payrun.id, action: act })
      toast.success(`${label} complete`, { id: toastId })
      if (act === 'send') setSending(false)
    } catch (err) {
      toast.error(`${label} failed`, {
        id: toastId,
        description: err instanceof Error ? err.message : undefined
      })
    }
  }

  const openSend = () => {
    setRecipients(payrun.payslips.map(p => p.id))
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
      <Card className='p-0'>
        <CardContent className='overflow-x-auto p-0'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/50'>
                <TableHead>Employee</TableHead>
                <TableHead className='text-right'>Worked Days</TableHead>
                <TableHead className='text-right'>Gross</TableHead>
                <TableHead className='text-right'>Deductions</TableHead>
                <TableHead className='text-right'>Net</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrun.payslips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className='h-24 text-center'>
                    No payslips yet. Run Compute to generate them.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {payrun.payslips.map(payslip => (
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
                      <TableCell className='text-right tabular-nums'>{payslip.workedDays}</TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {money(payslip.grossSalary)}
                      </TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {money(payslip.totalDeductions)}
                      </TableCell>
                      <TableCell className='text-right font-semibold tabular-nums'>
                        {money(payslip.netSalary)}
                      </TableCell>
                      <TableCell>
                        <Badge className='border-none bg-slate-600/10 text-slate-600 dark:bg-slate-400/10 dark:text-slate-400'>
                          {PAYSLIP_STATUS_LABELS[payslip.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className='bg-muted/30 font-semibold'>
                    <TableCell colSpan={2}>Totals</TableCell>
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
        </CardContent>
      </Card>

      {/* Screen 16 — bulk email distribution */}
      <Dialog open={sending} onOpenChange={setSending}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Payslips</DialogTitle>
            <DialogDescription>
              {recipients.length} employee{recipients.length === 1 ? '' : 's'} selected. Each
              payslip is emailed to the employee and marked as sent.
            </DialogDescription>
          </DialogHeader>

          {blocking.length > 0 && (
            <Alert variant='destructive' className='border-destructive *:[svg]:row-span-1'>
              <IconAlertTriangle />
              <AlertTitle>
                Resolve {blocking.length} blocking issue{blocking.length === 1 ? '' : 's'} before
                sending.
              </AlertTitle>
            </Alert>
          )}

          <div className='divide-y rounded-md border'>
            {payrun.payslips.map(payslip => (
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

          <DialogFooter>
            <Button variant='outline' onClick={() => setSending(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => run('send', 'Sending payslips')}
              disabled={action.isPending || recipients.length === 0}
            >
              <IconMail />
              Send All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PayrunDetail
