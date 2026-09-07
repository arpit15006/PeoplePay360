'use client'

import { useEffect, useState } from 'react'

import { Progress } from '@/components/ui/progress'
import { IconAlertTriangle, IconCircleCheck, IconMail } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

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
  const isSuccess = Boolean(result && failures === 0)
  const isFailed = Boolean(error || failures > 0)

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
        ? `Sending to ${current}…`
        : 'Building PDFs and emailing each employee…'

  return (
    <div className='bg-card w-full rounded-xl border p-5 shadow-xs space-y-4'>
      <div className='flex items-center gap-3.5 max-sm:flex-wrap max-sm:gap-2'>
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors max-sm:size-8',
            isFailed
              ? 'bg-destructive/10 text-destructive'
              : isSuccess
                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-primary/10 text-primary animate-pulse'
          )}
        >
          {isFailed ? (
            <IconAlertTriangle className='size-5 max-sm:size-4' />
          ) : isSuccess ? (
            <IconCircleCheck className='size-5 max-sm:size-4' />
          ) : (
            <IconMail className='size-5 max-sm:size-4' />
          )}
        </div>

        <div className='min-w-0 flex-1'>
          <h4 className='m-0 text-sm font-semibold leading-tight text-foreground'>
            {heading}
          </h4>
          <p className='text-muted-foreground truncate text-xs mt-1'>{detail}</p>
        </div>

        <div className='flex flex-col items-end shrink-0 pl-2'>
          <span
            className={cn(
              'text-sm font-bold tabular-nums',
              isFailed
                ? 'text-destructive'
                : isSuccess
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-foreground'
            )}
          >
            {Math.round(value)}%
          </span>
          <span className='text-muted-foreground text-xs font-medium tabular-nums'>
            {settled} / {total}
          </span>
        </div>
      </div>

      <Progress
        value={value}
        id='payslip-send-progress'
        className='h-2 w-full bg-muted/80 rounded-full'
        indicatorClassName={cn(
          'transition-all duration-300 ease-in-out',
          isFailed
            ? 'bg-destructive'
            : isSuccess
              ? 'bg-emerald-500 dark:bg-emerald-400'
              : 'bg-primary'
        )}
      />
    </div>
  )
}

export default PayslipSendProgress
