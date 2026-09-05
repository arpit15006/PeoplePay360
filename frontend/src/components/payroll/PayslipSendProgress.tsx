'use client'

import { useEffect, useState } from 'react'

import { Progress } from '@/components/ui/progress'
import { Field, FieldLabel } from '@/components/ui/field'
import { IconAlertTriangle, IconCircleCheck, IconMail } from '@tabler/icons-react'

import { socket } from '@/socket'

/**
 * Progress while a payrun's payslips are emailed.
 *
 * Built on the shadcn-studio progress-20 layout, but the bar is driven by the
 * server rather than a timer: the send runs a pool of workers and emits an
 * event as each one settles, so this counts real completions. Sends can settle
 * out of order, which is why the count comes from the server rather than from
 * a position in the recipient list.
 *
 * `result` arrives when the request returns; until then the bar reflects what
 * has actually been sent and never reads 100%.
 */
export interface SendProgressResult {
  sent: number
  failed: number
}

export function PayslipSendProgress({
  payrunId,
  total,
  result,
  error
}: {
  payrunId: string
  total: number
  result?: SendProgressResult
  error?: string
}) {
  const [done, setDone] = useState(0)
  const [failed, setFailed] = useState(0)
  const [current, setCurrent] = useState<string | null>(null)

  useEffect(() => {
    const onProgress = (payload: {
      payrunId: string
      done: number
      total: number
      employee: string
      ok: boolean
    }) => {
      // The socket is a broadcast, so another payrun's send must not move this bar.
      if (payload.payrunId !== payrunId) return
      setDone(payload.done)
      setCurrent(payload.employee)
      if (!payload.ok) setFailed(f => f + 1)
    }

    socket.on('payslip:send_progress', onProgress)
    return () => {
      socket.off('payslip:send_progress', onProgress)
    }
  }, [payrunId])

  const finished = Boolean(result) || Boolean(error)
  // Only the response can declare the job finished; progress events alone
  // leave it just short, so the bar never claims completion the server has
  // not confirmed.
  const settled = result ? result.sent + result.failed : done
  const value = finished ? 100 : total > 0 ? Math.min(99, (settled / total) * 100) : 0
  const failures = result ? result.failed : failed

  const heading = error
    ? 'Sending failed'
    : result
      ? failures > 0
        ? `Sent ${result.sent} of ${total}, ${failures} failed`
        : `All ${result.sent} payslips sent`
      : `Sending payslip ${Math.min(settled + 1, total)} of ${total}…`

  const detail = error
    ? error
    : result
      ? 'Each employee has been emailed their payslip as a PDF.'
      : current
        ? `Last completed: ${current}`
        : 'Building PDFs and emailing each employee.'

  return (
    <div className='bg-card w-full rounded-xl border p-4 shadow-sm'>
      <Field>
        <div className='mb-4 flex items-center gap-4 max-sm:flex-wrap max-sm:gap-2'>
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg max-sm:size-8 ${
              error || failures > 0
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary'
            }`}
          >
            {error || failures > 0 ? (
              <IconAlertTriangle className='size-5 max-sm:size-4' />
            ) : result ? (
              <IconCircleCheck className='size-5 max-sm:size-4' />
            ) : (
              <IconMail className='size-5 max-sm:size-4' />
            )}
          </div>

          <div className='min-w-0 flex-1'>
            <FieldLabel
              htmlFor='payslip-send-progress'
              className='m-0 mb-1 text-sm font-medium max-sm:text-xs'
            >
              {heading}
            </FieldLabel>
            <p className='text-muted-foreground truncate text-sm max-sm:text-xs'>{detail}</p>
          </div>

          <div className='flex flex-col items-end max-sm:items-start'>
            <div className='text-sm font-medium tabular-nums max-sm:text-xs'>
              {Math.round(value)}%
            </div>
            <div className='text-muted-foreground text-sm font-medium tabular-nums max-sm:text-xs'>
              {settled} / {total}
            </div>
          </div>
        </div>

        <Progress value={value} id='payslip-send-progress' className='h-1.5' />
      </Field>
    </div>
  )
}

export default PayslipSendProgress
