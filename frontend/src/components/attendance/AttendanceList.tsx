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
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { IconPencil, IconUpload, IconX } from '@tabler/icons-react'

import { DataTablePaginationBase } from '@/components/shadcn-studio/data-table/data-table-parts'
import BulkImportDialog from '@/components/bulk/BulkImportDialog'
import { attendanceImportConfig } from '@/components/bulk/importConfigs'
import { useImportContext } from '@/hooks/useImportContext'
import { useClientPagination } from '@/hooks/useClientPagination'
import WorkSessionCard from '@/components/attendance/WorkSessionCard'
import { useAttendance, useCreateAttendance, useUpdateAttendance } from '@/hooks/useAttendance'
import { useAuth } from '@/context/AuthContext'
import {
  ATTENDANCE_STATUS_LABELS,
  formatAttendanceDate,
  formatWorkedHours,
  type AttendanceRow,
  type AttendanceStatus
} from '@/types/attendance'
import type { Role } from '@/types/user'

/** PRD: manual corrections are restricted to authorised HR users. */
const CAN_CORRECT: Role[] = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

const STATUS_CLASSES: Record<AttendanceStatus, string> = {
  PRESENT: 'border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400',
  HALF_DAY: 'border-none bg-sky-600/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400',
  ABSENT: 'border-none bg-red-600/10 text-red-600 dark:bg-red-400/10 dark:text-red-400'
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function TimeSelect({
  value,
  onChange,
  allowClear
}: {
  value: string
  onChange: (val: string) => void
  allowClear?: boolean
}) {
  const parts = value ? value.trim().split(':') : []
  const hour = parts[0] ? parts[0].padStart(2, '0') : ''
  const minute = parts[1] ? parts[1].padStart(2, '0') : ''

  const handleHourChange = (newHour: string) => {
    const m = minute || '00'
    onChange(`${newHour}:${m}`)
  }

  const handleMinuteChange = (newMinute: string) => {
    const h = hour || '09'
    onChange(`${h}:${newMinute}`)
  }

  return (
    <div className='flex items-center gap-1.5'>
      <Select value={hour || undefined} onValueChange={handleHourChange}>
        <SelectTrigger className='w-full font-mono text-center'>
          <SelectValue placeholder='HH' />
        </SelectTrigger>
        <SelectContent position='popper' className='max-h-56 min-w-[5.5rem]'>
          <SelectGroup>
            <SelectLabel>Hour</SelectLabel>
            {HOURS.map(h => (
              <SelectItem key={h} value={h} className='font-mono'>
                {h}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <span className='text-muted-foreground font-semibold'>:</span>

      <Select value={minute || undefined} onValueChange={handleMinuteChange}>
        <SelectTrigger className='w-full font-mono text-center'>
          <SelectValue placeholder='MM' />
        </SelectTrigger>
        <SelectContent position='popper' className='max-h-56 min-w-[5.5rem]'>
          <SelectGroup>
            <SelectLabel>Minute</SelectLabel>
            {MINUTES.map(m => (
              <SelectItem key={m} value={m} className='font-mono'>
                {m}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {allowClear && value ? (
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          onClick={() => onChange('')}
          className='text-muted-foreground hover:text-foreground shrink-0'
          title='Clear time'
          aria-label='Clear time'
        >
          <IconX className='size-3.5' />
        </Button>
      ) : null}
    </div>
  )
}

/** PRD Screen 6 — Attendance list, check in/out, and manual correction. */
export function AttendanceList() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const employeeId = searchParams.get('employeeId') ?? undefined

  const { data: records = [], isLoading, isError, error } = useAttendance(employeeId)
  const createAttendance = useCreateAttendance()
  const updateAttendance = useUpdateAttendance()

  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState<AttendanceRow | null>(null)
  const [draft, setDraft] = useState<{ checkIn: string; checkOut: string; status: AttendanceStatus; notes: string }>({
    checkIn: '',
    checkOut: '',
    status: 'PRESENT',
    notes: ''
  })

  const canCorrect = !!user && CAN_CORRECT.includes(user.role)
  const [importing, setImporting] = useState(false)
  const importContext = useImportContext()

  const rows = useMemo(() => {
    const filtered =
      status === 'all' ? records : records.filter(r => r.status === (status as AttendanceStatus))
    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [records, status])

  // A month of attendance for 1,000 employees is ~22,000 rows; render a page
  // of them rather than the lot.
  const { page, pageIndex, pageSize, pageCount, total, onPageChange, onPageSizeChange } =
    useClientPagination(rows, 25)


  const openCorrection = (record: AttendanceRow) => {
    setEditing(record)
    setDraft({
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      status: record.status,
      notes: record.notes ?? ''
    })
  }

  const saveCorrection = async () => {
    if (!editing) return
    await updateAttendance.mutateAsync({
      id: editing.id,
      body: { checkIn: draft.checkIn, checkOut: draft.checkOut, status: draft.status, notes: draft.notes }
    })
    setEditing(null)
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Attendance</h1>
          <p className='text-muted-foreground text-sm'>
            Daily presence and exceptions. Worked hours feed the payrun.
          </p>
        </div>

        {/* Bulk load — a month of punches from a device export. */}
        {canCorrect && (
          <Button variant='outline' onClick={() => setImporting(true)}>
            <IconUpload />
            Import CSV
          </Button>
        )}

      </div>

      {/* The day is a running session now rather than two typed-in times, so
          the card carries the clock and this screen stays the record of it. */}
      <WorkSessionCard />

      {(createAttendance.isError || updateAttendance.isError) && (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
          {(createAttendance.error ?? updateAttendance.error) instanceof Error
            ? (createAttendance.error ?? updateAttendance.error)!.message
            : 'Could not save the attendance record.'}
        </div>
      )}

      {/* Toolbar */}
      <div className='flex flex-wrap items-center gap-2'>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className='w-44'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Statuses</SelectItem>
            {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
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
            <IconX />
            Filtered by {records[0]?.employee?.name ?? 'employee'} — clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      ) : isError ? (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
          Could not load attendance{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      ) : (
        <Card className='p-0'>
          <CardContent className='overflow-x-auto p-0'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead className='text-right'>Worked Hours</TableHead>
                  <TableHead className='text-right'>Overtime</TableHead>
                  <TableHead>Status</TableHead>
                  {canCorrect && <TableHead className='w-10' />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canCorrect ? 8 : 7} className='h-24 text-center'>
                      No attendance records match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  page.map(record => (
                    <TableRow key={record.id}>
                      <TableCell className='font-medium'>
                        <div>{record.employee?.name ?? '—'}</div>
                        <div className='text-muted-foreground text-xs'>
                          {record.employee?.employeeCode}
                        </div>
                      </TableCell>
                      <TableCell>{formatAttendanceDate(record.date)}</TableCell>
                      <TableCell className='tabular-nums'>{record.checkIn || '—'}</TableCell>
                      <TableCell className='tabular-nums'>
                        {record.checkOut || (
                          <span className='text-muted-foreground'>Not checked out</span>
                        )}
                      </TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {formatWorkedHours(record.workedHours)}
                      </TableCell>
                      <TableCell className='text-muted-foreground text-right tabular-nums'>
                        {record.overtimeHours > 0 ? formatWorkedHours(record.overtimeHours) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          <Badge className={STATUS_CLASSES[record.status]}>
                            {ATTENDANCE_STATUS_LABELS[record.status]}
                          </Badge>
                          {record.manuallyEdited && (
                            <Badge
                              variant='secondary'
                              className='text-muted-foreground rounded-md text-[10px] font-medium'
                              title='Corrected by an authorised user'
                            >
                              edited
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {canCorrect && (
                        <TableCell>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            aria-label={`Correct attendance for ${record.employee?.name}`}
                            onClick={() => openCorrection(record)}
                          >
                            <IconPencil />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>

          <DataTablePaginationBase
            pageIndex={pageIndex}
            pageSize={pageSize}
            pageCount={pageCount}
            total={total}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            noun='records'
          />
        </Card>
      )}

      {/* Manual correction — authorised users only */}
      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correct attendance</DialogTitle>
            <DialogDescription>
              {editing?.employee?.name} · {editing && formatAttendanceDate(editing.date)}. Worked
              hours are recalculated by the server from the times you set.
            </DialogDescription>
          </DialogHeader>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label>Check In</Label>
                {draft.checkIn && (
                  <span className='text-muted-foreground font-mono text-xs'>{draft.checkIn}</span>
                )}
              </div>
              <TimeSelect
                value={draft.checkIn}
                onChange={val => setDraft({ ...draft, checkIn: val })}
              />
            </div>
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label>Check Out</Label>
                {draft.checkOut ? (
                  <span className='text-muted-foreground font-mono text-xs'>{draft.checkOut}</span>
                ) : (
                  <span className='text-muted-foreground text-xs'>Not set</span>
                )}
              </div>
              <TimeSelect
                value={draft.checkOut}
                onChange={val => setDraft({ ...draft, checkOut: val })}
                allowClear
              />
            </div>
            <div className='space-y-1.5'>
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={v => setDraft({ ...draft, status: v as AttendanceStatus })}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='notes'>Notes</Label>
              <Input
                id='notes'
                value={draft.notes}
                onChange={e => setDraft({ ...draft, notes: e.target.value })}
                placeholder='Reason for the correction'
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveCorrection} disabled={updateAttendance.isPending}>
              {updateAttendance.isPending ? 'Saving…' : 'Save correction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkImportDialog
        open={importing}
        onOpenChange={setImporting}
        config={attendanceImportConfig}
        context={importContext}
      />
    </div>
  )
}

export default AttendanceList
