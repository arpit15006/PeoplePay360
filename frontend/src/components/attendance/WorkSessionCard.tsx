import { useState } from 'react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  IconAlertTriangle,
  IconCoffee,
  IconPlayerPause,
  IconPlayerPlay,
  IconPower,
  IconClockHour4,
  IconPlugConnectedX
} from '@tabler/icons-react'

import { useAttendanceSession, formatClock, formatDuration } from '@/hooks/useAttendanceSession'
import { useAuth } from '@/context/AuthContext'
import { ATTENDANCE_STATUS_LABELS, type AttendanceStatus } from '@/types/attendance'
import type { SessionEnd, SessionSegment } from '@/api/attendanceSession'

/**
 * The employee's working day: start it, pause for a break, and end it.
 *
 * The clock on screen is for the person watching it. Every figure that counts
 * is recorded by the server when an action is posted, so the day cannot be
 * lengthened by changing the machine's time.
 */

const STATUS_CLASSES: Record<AttendanceStatus, string> = {
  PRESENT: 'border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400',
  HALF_DAY: 'border-none bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400',
  ABSENT: 'border-none bg-destructive/10 text-destructive'
}

const END_LABELS: Record<SessionEnd, string> = {
  USER: 'ended',
  SIGN_OUT: 'signed out',
  TIMEOUT: 'connection lost',
  MIDNIGHT: 'day rolled over'
}

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/** One stretch of the day, in the order it happened. */
const SegmentRow = ({ segment }: { segment: SessionSegment }) => {
  const isBreak = segment.kind === 'BREAK'
  const lost = segment.endedBy === 'TIMEOUT'

  return (
    <div className='flex items-start gap-3 py-2'>
      <div
        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
          lost
            ? 'bg-destructive/10 text-destructive'
            : isBreak
              ? 'bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400'
              : 'bg-primary/10 text-primary'
        }`}
      >
        {lost ? (
          <IconPlugConnectedX className='size-3.5' />
        ) : isBreak ? (
          <IconCoffee className='size-3.5' />
        ) : (
          <IconClockHour4 className='size-3.5' />
        )}
      </div>

      <div className='min-w-0 flex-1'>
        <p className='text-sm font-medium'>
          {isBreak ? 'Break' : 'Working'}{' '}
          <span className='text-muted-foreground font-normal tabular-nums'>
            {timeOf(segment.startedAt)} — {segment.endedAt ? timeOf(segment.endedAt) : 'now'}
          </span>
        </p>
        {segment.endedBy && segment.endedBy !== 'USER' && (
          <p className='text-muted-foreground text-xs'>{END_LABELS[segment.endedBy]}</p>
        )}
        {segment.reason && (
          <p className='text-muted-foreground text-xs italic'>“{segment.reason}”</p>
        )}
      </div>
    </div>
  )
}

export function WorkSessionCard({ className }: { className?: string }) {
  const { user } = useAuth()
  const {
    state,
    enabled,
    isLoading,
    liveWorkedSeconds,
    liveBreakSeconds,
    checkIn,
    pause,
    resume,
    stop,
    explain
  } = useAttendanceSession()

  const [confirmStop, setConfirmStop] = useState(false)
  const [reason, setReason] = useState('')

  // Nothing to show for an account with no employee record behind it.
  if (!enabled) return null

  if (isLoading || !state) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className='h-5 w-48' />
          <Skeleton className='h-4 w-72' />
        </CardHeader>
        <CardContent className='space-y-4'>
          <Skeleton className='h-12 w-40' />
          <Skeleton className='h-2 w-full' />
          <Skeleton className='h-9 w-56' />
        </CardContent>
      </Card>
    )
  }

  const working = state.running === 'WORK'
  const onBreak = state.running === 'BREAK'
  const started = state.segments.length > 0

  const scheduledSeconds = state.scheduledHours * 3600
  const progress = scheduledSeconds > 0 ? Math.min(100, (liveWorkedSeconds / scheduledSeconds) * 100) : 0

  const breakAllowanceSeconds = state.breakAllowanceMinutes * 60
  const overBreak = breakAllowanceSeconds > 0 && liveBreakSeconds > breakAllowanceSeconds

  const busy = checkIn.isPending || pause.isPending || resume.isPending || stop.isPending

  const endDay = async () => {
    try {
      await stop.mutateAsync()
      setConfirmStop(false)
      toast.success('Day ended', { description: `${formatDuration(liveWorkedSeconds)} recorded.` })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not end the day.')
    }
  }

  const sendReason = async () => {
    if (!state.unexplained) return
    try {
      await explain.mutateAsync({ sessionId: state.unexplained.id, reason })
      setReason('')
      toast.success('Thanks — that gap is explained.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the reason.')
    }
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <CardTitle className='font-semibold'>
                {greeting()}, {user?.name?.split(' ')[0] ?? 'there'}
              </CardTitle>
              <CardDescription>
                {state.isWorkingDay
                  ? `Your shift today is ${state.shiftStart} to ${state.shiftEnd}, with ${state.breakAllowanceMinutes} minutes of break.`
                  : 'Today is not a scheduled working day. Anything you log counts as overtime.'}
              </CardDescription>
            </div>

            <div className='flex items-center gap-2'>
              {state.wasLate && (
                <Badge className='border-none bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400'>
                  Late arrival
                </Badge>
              )}
              <Badge className={STATUS_CLASSES[state.status]}>
                {ATTENDANCE_STATUS_LABELS[state.status]}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className='space-y-5'>
          {/* A stretch the server cut short is asked about before anything else. */}
          {state.unexplained && (
            <Alert variant='destructive'>
              <IconPlugConnectedX />
              <AlertTitle>
                Your session stopped at {timeOf(state.unexplained.endedAt)}
              </AlertTitle>
              <AlertDescription className='space-y-3'>
                <p>
                  The connection went quiet, so the clock was stopped there and the{' '}
                  {state.unexplained.minutesLost} minutes since were not counted. What happened?
                </p>
                <div className='w-full space-y-2'>
                  <Label htmlFor='session-reason' className='sr-only'>
                    Reason
                  </Label>
                  <Textarea
                    id='session-reason'
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder='Wifi dropped, laptop went to sleep, power cut…'
                    rows={2}
                  />
                  <Button
                    size='sm'
                    onClick={sendReason}
                    disabled={explain.isPending || reason.trim().length < 3}
                  >
                    {explain.isPending && <Spinner />}
                    Submit reason
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {!started ? (
            <Empty className='border-none py-4'>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <IconClockHour4 />
                </EmptyMedia>
                <EmptyTitle>You have not started yet</EmptyTitle>
                <EmptyDescription>
                  Check in to start the clock. Your hours are recorded by the server, not this
                  browser.
                </EmptyDescription>
              </EmptyHeader>
              <Button size='lg' onClick={() => checkIn.mutate()} disabled={busy}>
                {checkIn.isPending ? <Spinner /> : <IconPlayerPlay />}
                Check in
              </Button>
            </Empty>
          ) : (
            <>
              <div className='flex flex-wrap items-end justify-between gap-4'>
                <div>
                  <p className='text-muted-foreground text-xs font-medium'>
                    {working ? 'Working' : onBreak ? 'On a break' : 'Day ended'}
                  </p>
                  <p className='text-4xl font-semibold tabular-nums'>
                    {formatClock(liveWorkedSeconds)}
                  </p>
                  {state.scheduledHours > 0 && (
                    <p className='text-muted-foreground text-xs'>
                      of {formatDuration(scheduledSeconds)} scheduled
                    </p>
                  )}
                </div>

                <div className='text-right'>
                  <p className='text-muted-foreground text-xs font-medium'>Break</p>
                  <p
                    className={`text-lg font-semibold tabular-nums ${
                      overBreak ? 'text-amber-600 dark:text-amber-400' : ''
                    }`}
                  >
                    {formatDuration(liveBreakSeconds)}
                  </p>
                  {state.breakAllowanceMinutes > 0 && (
                    <p className='text-muted-foreground text-xs'>
                      {overBreak
                        ? `${state.breakAllowanceMinutes}m allowed`
                        : `of ${state.breakAllowanceMinutes}m`}
                    </p>
                  )}
                </div>
              </div>

              {state.scheduledHours > 0 && <Progress value={progress} className='h-1.5' />}

              <div className='flex flex-wrap gap-2'>
                {working && (
                  <Button variant='outline' onClick={() => pause.mutate()} disabled={busy}>
                    {pause.isPending ? <Spinner /> : <IconPlayerPause />}
                    Take a break
                  </Button>
                )}
                {onBreak && (
                  <Button onClick={() => resume.mutate()} disabled={busy}>
                    {resume.isPending ? <Spinner /> : <IconPlayerPlay />}
                    Back to work
                  </Button>
                )}
                {!state.running && started && (
                  <Button onClick={() => checkIn.mutate()} disabled={busy}>
                    {checkIn.isPending ? <Spinner /> : <IconPlayerPlay />}
                    Start again
                  </Button>
                )}

                {state.running && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='destructive'
                        onClick={() => setConfirmStop(true)}
                        disabled={busy}
                      >
                        <IconPower />
                        End day
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Stops the clock and records today&apos;s attendance</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {state.segments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className='mb-1 text-sm font-medium'>Today&apos;s timeline</p>
                    <ScrollArea className='h-44 pr-3'>
                      <div className='divide-y'>
                        {state.segments.map(segment => (
                          <SegmentRow key={segment.id} segment={segment} />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Ending the day is worth a second look when it would not be a full one. */}
      <AlertDialog open={confirmStop} onOpenChange={setConfirmStop}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End your day?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3'>
                <div className='flex justify-between text-sm'>
                  <span>Worked</span>
                  <span className='text-foreground font-medium tabular-nums'>
                    {formatDuration(liveWorkedSeconds)}
                  </span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span>Break</span>
                  <span className='text-foreground font-medium tabular-nums'>
                    {formatDuration(liveBreakSeconds)}
                  </span>
                </div>
                {state.scheduledHours > 0 && (
                  <div className='flex justify-between text-sm'>
                    <span>Scheduled</span>
                    <span className='text-foreground font-medium tabular-nums'>
                      {formatDuration(scheduledSeconds)}
                    </span>
                  </div>
                )}

                {state.isWorkingDay && state.status !== 'PRESENT' && (
                  <div className='border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border p-3 text-sm'>
                    <IconAlertTriangle className='mt-0.5 size-4 shrink-0' />
                    <span>
                      Stopping now records today as{' '}
                      <strong>{ATTENDANCE_STATUS_LABELS[state.status]}</strong>. Working until{' '}
                      {formatDuration(scheduledSeconds * 0.75)} would make it a full day.
                    </span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={stop.isPending}>Keep working</AlertDialogCancel>
            <AlertDialogAction onClick={endDay} disabled={stop.isPending}>
              {stop.isPending ? 'Ending…' : 'End day'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default WorkSessionCard
