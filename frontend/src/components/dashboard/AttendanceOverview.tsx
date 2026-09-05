import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { IconAlertTriangle, IconClockHour4, IconPencil } from '@tabler/icons-react'

import type { AttendanceHealth } from '@/types/dashboard'

/**
 * PRD B9 — "Attendance Overview can show Present, Late, Absent, Overtime,
 * missing check-outs, manual edits, and attendance coverage."
 *
 * The status split lives in the donut alongside Time Off; this card carries the
 * quality signals, which are what a payroll officer acts on before a payrun.
 */

const Stat = ({
  icon,
  label,
  value,
  hint,
  warn
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
  warn?: boolean
}) => (
  <div className='flex items-start gap-3'>
    <div
      className={
        warn
          ? 'rounded-lg bg-amber-600/10 p-2 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400'
          : 'bg-muted text-muted-foreground rounded-lg p-2'
      }
    >
      {icon}
    </div>
    <div className='min-w-0'>
      <p className='text-lg font-semibold tabular-nums'>{value}</p>
      <p className='text-sm font-medium'>{label}</p>
      <p className='text-muted-foreground text-xs'>{hint}</p>
    </div>
  </div>
)

export function AttendanceOverview({
  attendance,
  className
}: {
  attendance: AttendanceHealth
  className?: string
}) {
  const { totalLogs, coverage, overtimeHours, missingCheckOuts, manualEdits } = attendance

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className='font-semibold'>Attendance Overview</CardTitle>
        <CardDescription>
          Data quality across {totalLogs} logged day{totalLogs === 1 ? '' : 's'} in this period.
        </CardDescription>
      </CardHeader>

      <CardContent className='space-y-6'>
        <div>
          <div className='mb-2 flex items-baseline justify-between'>
            <span className='text-sm font-medium'>Attendance coverage</span>
            <span className='text-lg font-semibold tabular-nums'>{coverage}%</span>
          </div>
          <Progress value={coverage} />
          <p className='text-muted-foreground mt-2 text-xs'>
            Share of logged days the employee actually attended, counting late and half days as
            present.
          </p>
        </div>

        <div className='grid gap-5 sm:grid-cols-3'>
          <Stat
            icon={<IconClockHour4 className='size-4' />}
            label='Overtime'
            value={`${overtimeHours}h`}
            hint='Beyond scheduled hours'
          />
          <Stat
            icon={<IconAlertTriangle className='size-4' />}
            label='Missing check-outs'
            value={String(missingCheckOuts)}
            hint='Clocked in, never out'
            warn={missingCheckOuts > 0}
          />
          <Stat
            icon={<IconPencil className='size-4' />}
            label='Manual edits'
            value={String(manualEdits)}
            hint='Corrected by HR'
            warn={manualEdits > 0}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default AttendanceOverview
