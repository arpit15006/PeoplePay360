import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { IconPlus, IconCheck, IconX, IconFilterOff } from '@tabler/icons-react'

import DatePicker from '@/components/common/DatePicker'
import {
  useCreateRequest,
  useDecideRequest,
  useTimeOffRequests,
  useTimeOffTypes
} from '@/hooks/useTimeOff'
import { useAuth } from '@/context/AuthContext'
import {
  TIMEOFF_STATUS_LABELS,
  durationBetween,
  formatTimeOffDate,
  toUtcIso,
  type TimeOffRequest,
  type TimeOffStatus
} from '@/types/timeoff'
import type { Role } from '@/types/user'

/**
 * HR Manager approves or refuses. HR Payroll User inherits all HR Manager
 * permissions per the role definitions, so they are included too.
 */
const CAN_DECIDE: Role[] = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

const STATUS_CLASSES: Record<TimeOffStatus, string> = {
  TO_APPROVE: 'border-none bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400',
  APPROVED: 'border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400',
  REFUSED: 'border-none bg-red-600/10 text-red-600 dark:bg-red-400/10 dark:text-red-400'
}

/** PRD Screen 7 — Time Off Requests, with the approve / refuse workflow. */
export function TimeOffRequests() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const employeeId = searchParams.get('employeeId') ?? undefined

  const { data: requests = [], isLoading, isError, error } = useTimeOffRequests(employeeId)
  const { data: types = [] } = useTimeOffTypes()
  const createRequest = useCreateRequest()
  const decide = useDecideRequest()

  const [status, setStatus] = useState('all')
  const [creating, setCreating] = useState(false)
  const [reviewing, setReviewing] = useState<TimeOffRequest | null>(null)

  const [typeId, setTypeId] = useState('')
  const [start, setStart] = useState<Date | undefined>()
  const [end, setEnd] = useState<Date | undefined>()
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const canDecide = !!user && CAN_DECIDE.includes(user.role)
  const canRequest = !!user?.employeeId

  const duration = durationBetween(start, end)

  const rows = useMemo(() => {
    const filtered =
      status === 'all' ? requests : requests.filter(r => r.status === (status as TimeOffStatus))
    return [...filtered].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    )
  }, [requests, status])

  const submitRequest = async () => {
    setFormError(null)
    if (!typeId) return setFormError('Select a time off type.')
    if (!start || !end) return setFormError('Select both a start and an end date.')
    if (duration <= 0) return setFormError('End date must be on or after the start date.')
    if (!reason.trim()) return setFormError('Enter a reason.')

    await createRequest.mutateAsync({
      employeeId: user!.employeeId,
      timeOffTypeId: typeId,
      startDate: toUtcIso(start),
      endDate: toUtcIso(end),
      duration,
      reason: reason.trim()
    })
    setCreating(false)
    setTypeId(''); setStart(undefined); setEnd(undefined); setReason('')
  }

  const decideOn = async (decision: 'approve' | 'refuse') => {
    if (!reviewing) return
    await decide.mutateAsync({ id: reviewing.id, decision })
    setReviewing(null)
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Time Off Requests</h1>
          <p className='text-muted-foreground text-sm'>
            Approving a request automatically deducts the days from the employee&apos;s allocation.
          </p>
        </div>

        {canRequest && (
          <Button onClick={() => setCreating(true)}>
            <IconPlus />
            New Request
          </Button>
        )}
      </div>

      {(createRequest.isError || decide.isError) && (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
          {(createRequest.error ?? decide.error) instanceof Error
            ? (createRequest.error ?? decide.error)!.message
            : 'Could not complete the action.'}
        </div>
      )}

      <div className='flex flex-wrap items-center gap-2'>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className='w-44'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Statuses</SelectItem>
            {Object.entries(TIMEOFF_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {employeeId && (
          <Button
            variant='outline'
            onClick={() => {
              searchParams.delete('employeeId')
              setSearchParams(searchParams)
            }}
          >
            <IconFilterOff />
            Filtered by {requests[0]?.employee?.name ?? 'employee'} — clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      ) : isError ? (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
          Could not load requests{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      ) : (
        <Card className='p-0'>
          <CardContent className='overflow-x-auto p-0'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead>Employee</TableHead>
                  <TableHead>Time Off Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className='text-right'>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='w-24' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='h-24 text-center'>
                      No time off requests match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(request => (
                    <TableRow key={request.id}>
                      <TableCell className='font-medium'>
                        <div>{request.employee?.name ?? '—'}</div>
                        <div className='text-muted-foreground text-xs'>
                          {request.employee?.employeeCode}
                        </div>
                      </TableCell>
                      <TableCell>{request.timeOffType?.name ?? '—'}</TableCell>
                      <TableCell>{formatTimeOffDate(request.startDate)}</TableCell>
                      <TableCell>{formatTimeOffDate(request.endDate)}</TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {request.duration} {request.timeOffType?.unit ?? 'Days'}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_CLASSES[request.status]}>
                          {TIMEOFF_STATUS_LABELS[request.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {canDecide && request.status === 'TO_APPROVE' ? (
                          <Button size='sm' variant='outline' onClick={() => setReviewing(request)}>
                            Review
                          </Button>
                        ) : (
                          <Button size='sm' variant='ghost' onClick={() => setReviewing(request)}>
                            View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* New request */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New time off request</DialogTitle>
            <DialogDescription>
              Duration is counted in whole days, inclusive of both dates.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
              {formError}
            </div>
          )}

          <div className='space-y-4'>
            <div className='space-y-1.5'>
              <Label>Time Off Type</Label>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select type' />
                </SelectTrigger>
                <SelectContent>
                  {types.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label>Start Date</Label>
                <DatePicker value={start} onChange={setStart} placeholder='Start' />
              </div>
              <div className='space-y-1.5'>
                <Label>End Date</Label>
                <DatePicker
                  value={end}
                  onChange={setEnd}
                  placeholder='End'
                  disabledDate={date => (start ? date < start : false)}
                />
              </div>
            </div>

            <div className='bg-muted/50 rounded-lg border px-3 py-2 text-sm'>
              Duration: <span className='font-semibold'>{duration}</span> day
              {duration === 1 ? '' : 's'}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='reason'>Reason</Label>
              <Input
                id='reason'
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder='Family function'
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={submitRequest} disabled={createRequest.isPending}>
              {createRequest.isPending ? 'Submitting…' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve / refuse */}
      <Dialog open={!!reviewing} onOpenChange={open => !open && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Time off request</DialogTitle>
            <DialogDescription>
              {reviewing?.employee?.name} · {reviewing?.timeOffType?.name}
            </DialogDescription>
          </DialogHeader>

          {reviewing && (
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>From</span>
                <span>{formatTimeOffDate(reviewing.startDate)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>To</span>
                <span>{formatTimeOffDate(reviewing.endDate)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Duration</span>
                <span>
                  {reviewing.duration} {reviewing.timeOffType?.unit ?? 'Days'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Status</span>
                <Badge className={STATUS_CLASSES[reviewing.status]}>
                  {TIMEOFF_STATUS_LABELS[reviewing.status]}
                </Badge>
              </div>
              <div className='pt-2'>
                <p className='text-muted-foreground'>Reason</p>
                <p>{reviewing.reason}</p>
              </div>
            </div>
          )}

          {canDecide && reviewing?.status === 'TO_APPROVE' && (
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => decideOn('refuse')}
                disabled={decide.isPending}
              >
                <IconX />
                Refuse
              </Button>
              <Button onClick={() => decideOn('approve')} disabled={decide.isPending}>
                <IconCheck />
                Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TimeOffRequests
