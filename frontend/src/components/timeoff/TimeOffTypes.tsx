import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
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
import { IconPlus, IconPencil } from '@tabler/icons-react'

import { useSaveType, useTimeOffTypes } from '@/hooks/useTimeOff'
import { useAuth } from '@/context/AuthContext'
import type { TimeOffType } from '@/types/timeoff'
import type { Role } from '@/types/user'

const CAN_MANAGE: Role[] = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

const YES_NO = (value: boolean) => (
  <Badge
    className={
      value
        ? 'border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400'
        : 'border-none bg-red-600/10 text-red-600 dark:bg-red-400/10 dark:text-red-400'
    }
  >
    {value ? 'Yes' : 'No'}
  </Badge>
)

const emptyType = {
  name: '',
  unit: 'Days',
  allocationRequired: true,
  approvalType: 'Manager Approval',
  payrollIntegration: false,
  status: 'Active'
}

/** PRD Screen 9 — Time Off Types configuration. */
export function TimeOffTypes() {
  const { user } = useAuth()
  const { data: types = [], isLoading, isError, error } = useTimeOffTypes()

  const [editing, setEditing] = useState<TimeOffType | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Partial<TimeOffType>>(emptyType)
  const [formError, setFormError] = useState<string | null>(null)

  const saveType = useSaveType(editing?.id)
  const canManage = !!user && CAN_MANAGE.includes(user.role)
  const open = creating || !!editing

  const startCreate = () => {
    setForm(emptyType)
    setEditing(null)
    setCreating(true)
  }

  const startEdit = (type: TimeOffType) => {
    setForm(type)
    setCreating(false)
    setEditing(type)
  }

  const close = () => {
    setCreating(false)
    setEditing(null)
    setFormError(null)
  }

  const submit = async () => {
    setFormError(null)
    if (!form.name?.trim()) return setFormError('Enter a name.')
    await saveType.mutateAsync({ ...form, name: form.name.trim() })
    close()
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Time Off Types</h1>
          <p className='text-muted-foreground text-sm'>
            Leave policies: unit, whether an allocation is required, approval workflow and payroll
            integration.
          </p>
        </div>

        {canManage && (
          <Button onClick={startCreate}>
            <IconPlus />
            New Type
          </Button>
        )}
      </div>

      {saveType.isError && (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
          {saveType.error instanceof Error ? saveType.error.message : 'Could not save the type.'}
        </div>
      )}

      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      ) : isError ? (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
          Could not load types{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      ) : (
        <Card className='p-0'>
          <CardContent className='overflow-x-auto p-0'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead>Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Allocation Required</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Payroll Integration</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className='w-10' />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map(type => (
                  <TableRow key={type.id}>
                    <TableCell className='font-medium'>{type.name}</TableCell>
                    <TableCell>{type.unit}</TableCell>
                    <TableCell>{YES_NO(type.allocationRequired)}</TableCell>
                    <TableCell>{type.approvalType}</TableCell>
                    <TableCell>{YES_NO(type.payrollIntegration)}</TableCell>
                    <TableCell>
                      <Badge className='border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400'>
                        {type.status}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          aria-label={`Edit ${type.name}`}
                          onClick={() => startEdit(type)}
                        >
                          <IconPencil />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={o => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit time off type' : 'New time off type'}</DialogTitle>
            <DialogDescription>
              Types requiring an allocation consume the employee&apos;s balance when a request is
              approved.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
              {formError}
            </div>
          )}

          <div className='space-y-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='typeName'>Name</Label>
              <Input
                id='typeName'
                value={form.name ?? ''}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder='Annual Leave'
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='Days'>Days</SelectItem>
                    <SelectItem value='Hours'>Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='Active'>Active</SelectItem>
                    <SelectItem value='Inactive'>Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label>Approval workflow</Label>
              <Select
                value={form.approvalType}
                onValueChange={v => setForm({ ...form, approvalType: v })}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='Manager Approval'>Manager Approval</SelectItem>
                  <SelectItem value='No Approval'>No Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='flex items-center justify-between rounded-lg border p-3'>
              <Label htmlFor='allocationRequired' className='text-sm font-medium'>
                Allocation required
              </Label>
              <Switch
                id='allocationRequired'
                checked={!!form.allocationRequired}
                onCheckedChange={c => setForm({ ...form, allocationRequired: c })}
              />
            </div>

            <div className='flex items-center justify-between rounded-lg border p-3'>
              <Label htmlFor='payrollIntegration' className='text-sm font-medium'>
                Payroll integration
              </Label>
              <Switch
                id='payrollIntegration'
                checked={!!form.payrollIntegration}
                onCheckedChange={c => setForm({ ...form, payrollIntegration: c })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={close}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saveType.isPending}>
              {saveType.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TimeOffTypes
