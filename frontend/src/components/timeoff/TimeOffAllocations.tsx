import { useState } from 'react'
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
import { IconPlus, IconFilterOff, IconPencil } from '@tabler/icons-react'

import {
  useCreateAllocation,
  useUpdateAllocation,
  useTimeOffAllocations,
  useTimeOffTypes
} from '@/hooks/useTimeOff'
import { useEmployees } from '@/hooks/useEmployees'
import { useAuth } from '@/context/AuthContext'
import type { Role } from '@/types/user'
import type { TimeOffAllocation } from '@/types/timeoff'

const CAN_MANAGE: Role[] = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

/** PRD Screen 8 — Time Off Allocations (balances). */
export function TimeOffAllocations() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const employeeId = searchParams.get('employeeId') ?? undefined

  const { data: allocations = [], isLoading, isError, error } = useTimeOffAllocations(employeeId)
  const { data: types = [] } = useTimeOffTypes()
  const { data: employees = [] } = useEmployees()
  const createAllocation = useCreateAllocation()
  const updateAllocation = useUpdateAllocation()

  const [creating, setCreating] = useState(false)
  // Set when correcting an existing balance rather than granting a new one.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    employeeId: '',
    timeOffTypeId: '',
    allocated: 24,
    validityYear: new Date().getFullYear()
  })
  const [formError, setFormError] = useState<string | null>(null)

  const canManage = !!user && CAN_MANAGE.includes(user.role)

  const openCreate = () => {
    setEditingId(null)
    setForm({
      employeeId: '',
      timeOffTypeId: '',
      allocated: 24,
      validityYear: new Date().getFullYear()
    })
    setFormError(null)
    setCreating(true)
  }

  const openEdit = (allocation: TimeOffAllocation) => {
    setEditingId(allocation.id)
    setForm({
      employeeId: allocation.employeeId,
      timeOffTypeId: allocation.timeOffTypeId,
      allocated: allocation.allocated,
      validityYear: allocation.validityYear
    })
    setFormError(null)
    setCreating(true)
  }

  const submit = async () => {
    setFormError(null)
    if (!form.employeeId) return setFormError('Select an employee.')
    if (!form.timeOffTypeId) return setFormError('Select a time off type.')
    if (!form.allocated || form.allocated <= 0) return setFormError('Allocated days must be above zero.')

    try {
      if (editingId) {
        // Days already taken are not editable here; the server recomputes what
        // remains so a correction cannot silently erase consumed leave.
        await updateAllocation.mutateAsync({
          id: editingId,
          body: { allocated: form.allocated, validityYear: form.validityYear }
        })
      } else {
        await createAllocation.mutateAsync({ ...form })
      }
      setCreating(false)
      setEditingId(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the allocation.')
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Time Off Allocations</h1>
          <p className='text-muted-foreground text-sm'>
            Leave balances per employee and type. Remaining falls as approved requests consume days.
          </p>
        </div>

        {canManage && (
          <Button onClick={openCreate}>
            <IconPlus />
            New Allocation
          </Button>
        )}
      </div>

      {createAllocation.isError && (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
          {createAllocation.error instanceof Error
            ? createAllocation.error.message
            : 'Could not create the allocation.'}
        </div>
      )}

      {employeeId && (
        <Button
          variant='outline'
          onClick={() => {
            searchParams.delete('employeeId')
            setSearchParams(searchParams)
          }}
        >
          <IconFilterOff />
          Filtered by {allocations[0]?.employee?.name ?? 'employee'} — clear
        </Button>
      )}

      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      ) : isError ? (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
          Could not load allocations{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      ) : (
        <Card className='p-0'>
          <CardContent className='overflow-x-auto p-0'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead>Employee</TableHead>
                  <TableHead>Time Off Type</TableHead>
                  <TableHead className='text-right'>Allocated</TableHead>
                  <TableHead className='text-right'>Taken</TableHead>
                  <TableHead className='text-right'>Remaining</TableHead>
                  <TableHead className='text-right'>Validity</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className='w-10' />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='h-24 text-center'>
                      No allocations yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  allocations.map(allocation => {
                    const unit = allocation.timeOffType?.unit ?? 'Days'
                    const used = allocation.allocated
                      ? Math.min(100, (allocation.taken / allocation.allocated) * 100)
                      : 0

                    return (
                      <TableRow key={allocation.id}>
                        <TableCell className='font-medium'>
                          <div>{allocation.employee?.name ?? '—'}</div>
                          <div className='text-muted-foreground text-xs'>
                            {allocation.employee?.employeeCode}
                          </div>
                        </TableCell>
                        <TableCell>{allocation.timeOffType?.name ?? '—'}</TableCell>
                        <TableCell className='text-right tabular-nums'>
                          {allocation.allocated} {unit}
                        </TableCell>
                        <TableCell className='text-right tabular-nums'>
                          {allocation.taken} {unit}
                        </TableCell>
                        <TableCell className='text-right'>
                          <div className='font-semibold tabular-nums'>
                            {allocation.remaining} {unit}
                          </div>
                          <div className='bg-muted mt-1 ml-auto h-1 w-20 overflow-hidden rounded-full'>
                            <div
                              className='bg-primary h-full'
                              style={{ width: `${used}%` }}
                              aria-hidden='true'
                            />
                          </div>
                        </TableCell>
                        <TableCell className='text-right tabular-nums'>
                          {allocation.validityYear}
                        </TableCell>
                        <TableCell>
                          <Badge className='border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400'>
                            {allocation.status}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <Button
                              variant='ghost'
                              size='icon-sm'
                              aria-label={`Edit allocation for ${allocation.employee?.name ?? 'employee'}`}
                              onClick={() => openEdit(allocation)}
                            >
                              <IconPencil />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit allocation' : 'New allocation'}</DialogTitle>
            <DialogDescription>
              Grants a leave balance for a validity year. Taken starts at zero.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
              {formError}
            </div>
          )}

          <div className='space-y-4'>
            <div className='space-y-1.5'>
              <Label>Employee</Label>
              <Select
                value={form.employeeId}
                onValueChange={v => setForm({ ...form, employeeId: v })}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select employee' />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label>Time Off Type</Label>
              <Select
                value={form.timeOffTypeId}
                onValueChange={v => setForm({ ...form, timeOffTypeId: v })}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select type' />
                </SelectTrigger>
                <SelectContent>
                  {types.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='allocated'>Allocated</Label>
                <Input
                  id='allocated'
                  type='number'
                  min={0}
                  value={form.allocated}
                  onChange={e => setForm({ ...form, allocated: Number(e.target.value) })}
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='validityYear'>Validity Year</Label>
                <Input
                  id='validityYear'
                  type='number'
                  value={form.validityYear}
                  onChange={e => setForm({ ...form, validityYear: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={createAllocation.isPending || updateAllocation.isPending}
            >
              {createAllocation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TimeOffAllocations
