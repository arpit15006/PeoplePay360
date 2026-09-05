import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { IconPlus } from '@tabler/icons-react'

import { useSchedulesList } from '@/hooks/useSchedules'
import { useAuth } from '@/context/AuthContext'
import { SCHEDULE_TYPE_LABELS } from '@/types/schedule'
import type { Role } from '@/types/user'

/** PRD: schedule patterns are configured by HR Manager, Payroll Manager and Admin. */
const CAN_MANAGE: Role[] = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

/** PRD Screen 5 — Working Schedules list. */
export function SchedulesList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: schedules = [], isLoading, isError, error } = useSchedulesList()

  const canManage = !!user && CAN_MANAGE.includes(user.role)

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Working Schedules</h1>
          <p className='text-muted-foreground text-sm'>
            Weekly working patterns. Weekly hours are calculated from the daily shifts, never
            entered by hand.
          </p>
        </div>

        {canManage && (
          <Button onClick={() => navigate('/schedules/new')}>
            <IconPlus />
            New
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      ) : isError ? (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
          Could not load schedules{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      ) : (
        <div className='overflow-x-auto rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/50'>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className='text-right'>Weekly Hours</TableHead>
                <TableHead className='text-right'>Employees</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className='h-24 text-center'>
                    No working schedules yet.
                  </TableCell>
                </TableRow>
              ) : (
                schedules.map(schedule => (
                  <TableRow
                    key={schedule.id}
                    onClick={() => navigate(`/schedules/${schedule.id}`)}
                    className='cursor-pointer'
                  >
                    <TableCell className='font-medium'>{schedule.name}</TableCell>
                    <TableCell>{SCHEDULE_TYPE_LABELS[schedule.type] ?? schedule.type}</TableCell>
                    <TableCell className='text-right font-medium tabular-nums'>
                      {schedule.weeklyHours}h
                    </TableCell>
                    <TableCell className='text-muted-foreground text-right tabular-nums'>
                      {schedule._count?.employees ?? 0}
                    </TableCell>
                    <TableCell>
                      <Badge className='border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400'>
                        <span
                          className='size-1.5 rounded-full bg-green-600 dark:bg-green-400'
                          aria-hidden='true'
                        />
                        {schedule.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default SchedulesList
