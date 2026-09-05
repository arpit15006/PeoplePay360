import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { IconArrowLeft, IconLock } from '@tabler/icons-react'

import { useSaveSchedule, useSchedule } from '@/hooks/useSchedules'
import { useAuth } from '@/context/AuthContext'
import {
  SCHEDULE_TYPE_LABELS,
  WEEK_DAYS,
  dayHours,
  defaultShifts,
  weeklyHoursOf,
  type DailyShift,
  type ScheduleType
} from '@/types/schedule'
import type { Role } from '@/types/user'

const CAN_MANAGE: Role[] = ['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']

/** PRD Screen 5 — Working Schedule form. */
export function ScheduleForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const isNew = id === 'new'
  const { data: schedule, isLoading, isError, error } = useSchedule(id)
  const saveSchedule = useSaveSchedule(id)

  const [name, setName] = useState('')
  const [type, setType] = useState<ScheduleType>('STANDARD')
  const [status, setStatus] = useState('Active')
  const [shifts, setShifts] = useState<DailyShift[]>(defaultShifts())
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (schedule) {
      setName(schedule.name)
      setType(schedule.type)
      setStatus(schedule.status)
      // Re-order the server's rows into Monday-first for display.
      setShifts(
        WEEK_DAYS.map(({ dayOfWeek, dayName }) => {
          const existing = schedule.dailyShifts.find(s => s.dayOfWeek === dayOfWeek)
          return (
            existing ?? {
              dayOfWeek,
              dayName,
              startTime: '00:00',
              endTime: '00:00',
              breakMinutes: 0,
              isWorkingDay: false
            }
          )
        })
      )
    }
  }, [schedule])

  const canManage = !!user && CAN_MANAGE.includes(user.role)
  const readOnly = !canManage

  // Live preview only — the persisted value is whatever the server computes.
  const weeklyHours = weeklyHoursOf(shifts)

  const patchShift = (dayOfWeek: number, patch: Partial<DailyShift>) =>
    setShifts(current =>
      current.map(shift => (shift.dayOfWeek === dayOfWeek ? { ...shift, ...patch } : shift))
    )

  if (isLoading && !isNew) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-20 w-full' />
        <Skeleton className='h-96 w-full' />
      </div>
    )
  }

  if (isError && !isNew) {
    return (
      <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
        Could not load this schedule{error instanceof Error ? `: ${error.message}` : '.'}
      </div>
    )
  }

  const submit = async () => {
    setValidationError(null)
    if (!name.trim()) return setValidationError('Enter a schedule name.')

    const invalid = shifts.find(
      shift => shift.isWorkingDay && dayHours(shift) <= 0
    )
    if (invalid) {
      return setValidationError(
        `${invalid.dayName}: end time must be after start time once the break is deducted.`
      )
    }

    await saveSchedule.mutateAsync({ name: name.trim(), type, status, dailyShifts: shifts })
    navigate('/schedules')
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' onClick={() => navigate('/schedules')} aria-label='Back'>
            <IconArrowLeft />
          </Button>
          <div>
            <h1 className='text-foreground text-2xl font-semibold tracking-tight'>
              {isNew ? 'New Working Schedule' : schedule?.name}
            </h1>
            <p className='text-muted-foreground text-sm'>
              Set the weekly pattern; hours are derived from it.
            </p>
          </div>
        </div>

        {canManage && (
          <Button onClick={submit} disabled={saveSchedule.isPending}>
            {saveSchedule.isPending ? 'Saving…' : isNew ? 'Create Schedule' : 'Save'}
          </Button>
        )}
      </div>

      {(validationError || saveSchedule.isError) && (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
          {validationError ??
            (saveSchedule.error instanceof Error
              ? saveSchedule.error.message
              : 'Could not save the schedule.')}
        </div>
      )}

      {/* Identity + computed weekly hours */}
      <Card>
        <CardContent className='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4'>
          <div className='space-y-1.5'>
            <Label htmlFor='name' className='text-muted-foreground text-xs font-medium'>
              Schedule Name
            </Label>
            <Input
              id='name'
              value={name}
              readOnly={readOnly}
              onChange={e => setName(e.target.value)}
              placeholder='Standard 40h Working Schedule'
            />
          </div>

          <div className='space-y-1.5'>
            <Label className='text-muted-foreground text-xs font-medium'>Type</Label>
            <Select value={type} disabled={readOnly} onValueChange={v => setType(v as ScheduleType)}>
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SCHEDULE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-1.5'>
            <Label className='text-muted-foreground text-xs font-medium'>Status</Label>
            <Select value={status} disabled={readOnly} onValueChange={setStatus}>
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='Active'>Active</SelectItem>
                <SelectItem value='Inactive'>Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/*
            PRD Screen 5: "Do not make Weekly Hours a manually entered field."
            Rendered as a read-only derived value, with no input to type into.
          */}
          <div className='space-y-1.5'>
            <Label className='text-muted-foreground flex items-center gap-1 text-xs font-medium'>
              <IconLock className='size-3' />
              Weekly Hours (calculated)
            </Label>
            <div
              data-testid='weekly-hours'
              className='bg-muted/50 flex h-9 items-center rounded-lg border px-3 text-sm font-semibold tabular-nums'
            >
              {weeklyHours}h
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monday → Sunday pattern */}
      <Card>
        <CardContent className='space-y-1'>
          <div className='text-muted-foreground grid grid-cols-12 gap-3 px-1 pb-2 text-xs font-medium'>
            <div className='col-span-3'>Day</div>
            <div className='col-span-2'>Start Time</div>
            <div className='col-span-2'>End Time</div>
            <div className='col-span-2'>Break (min)</div>
            <div className='col-span-3 text-right'>Hours</div>
          </div>

          {shifts.map(shift => (
            <div
              key={shift.dayOfWeek}
              className={`grid grid-cols-12 items-center gap-3 rounded-lg px-1 py-2 ${
                shift.isWorkingDay ? '' : 'opacity-60'
              }`}
            >
              <div className='col-span-3 flex items-center gap-2'>
                <Switch
                  id={`day-${shift.dayOfWeek}`}
                  checked={shift.isWorkingDay}
                  disabled={readOnly}
                  aria-label={`${shift.dayName} is a working day`}
                  onCheckedChange={checked => patchShift(shift.dayOfWeek, { isWorkingDay: checked })}
                />
                <Label htmlFor={`day-${shift.dayOfWeek}`} className='text-sm font-medium'>
                  {shift.dayName}
                </Label>
              </div>

              <div className='col-span-2'>
                <Input
                  type='time'
                  value={shift.startTime}
                  disabled={readOnly || !shift.isWorkingDay}
                  onChange={e => patchShift(shift.dayOfWeek, { startTime: e.target.value })}
                />
              </div>

              <div className='col-span-2'>
                <Input
                  type='time'
                  value={shift.endTime}
                  disabled={readOnly || !shift.isWorkingDay}
                  onChange={e => patchShift(shift.dayOfWeek, { endTime: e.target.value })}
                />
              </div>

              <div className='col-span-2'>
                <Input
                  type='number'
                  min={0}
                  value={shift.breakMinutes}
                  disabled={readOnly || !shift.isWorkingDay}
                  onChange={e =>
                    patchShift(shift.dayOfWeek, { breakMinutes: Number(e.target.value) || 0 })
                  }
                />
              </div>

              <div className='col-span-3 text-right text-sm tabular-nums'>
                {shift.isWorkingDay ? (
                  `${dayHours(shift).toFixed(2)}h`
                ) : (
                  <span className='text-muted-foreground'>Non-working</span>
                )}
              </div>
            </div>
          ))}

          <div className='mt-2 flex items-center justify-between border-t pt-3'>
            <span className='text-sm font-medium'>Total weekly hours</span>
            <span className='text-base font-semibold tabular-nums'>{weeklyHours}h</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ScheduleForm
