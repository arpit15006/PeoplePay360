import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  IconArrowLeft,
  IconFileDescription,
  IconClock,
  IconCalendarTime,
  IconWallet,
  IconChevronRight
} from '@tabler/icons-react'

import EmployeeStatusBadge from '@/components/employees/EmployeeStatusBadge'
import { useAuth } from '@/context/AuthContext'
import {
  useDepartments,
  useEmployee,
  useEmployeeRelated,
  useSchedules,
  useUpdateEmployee,
  useCreateEmployee
} from '@/hooks/useEmployee'
import { useEmployees } from '@/hooks/useEmployees'
import {
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_TYPE_LABELS,
  initialsOf,
  type EmployeeStatus,
  type EmployeeType,
  type EmployeeUpdate,
  type EmployeeCreate
} from '@/types/employee'
import type { Role } from '@/types/user'

/** PRD section 28 — Employees is CRUD for everyone except the Employee role. */
const CAN_EDIT: Role[] = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

const NONE = '__none__'

/** One read-only labelled value. */
const ReadField = ({ label, value }: { label: string; value: string }) => (
  <div className='space-y-1'>
    <p className='text-muted-foreground text-xs font-medium'>{label}</p>
    <p className='text-sm'>{value || '—'}</p>
  </div>
)

/** PRD Screen 3 — Employee Form and related-record smart buttons. */
export function EmployeeForm({ mode }: { mode?: 'create' } = {}) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  // A brand new record shares this form rather than duplicating every field.
  // The create route is its own path, so it carries no :id param to read;
  // the mode prop is what distinguishes it.
  const isNew = mode === 'create' || id === 'new'
  const { data: employee, isLoading, isError, error } = useEmployee(isNew ? undefined : id)
  const { data: counts } = useEmployeeRelated(id)
  const { data: departments = [] } = useDepartments()
  const { data: schedules = [] } = useSchedules()
  const { data: colleagues = [] } = useEmployees()
  const updateEmployee = useUpdateEmployee(id ?? '')
  const createEmployee = useCreateEmployee()

  // A new record opens straight into edit mode; there is nothing to read yet.
  const [isEditing, setIsEditing] = useState(isNew)
  const [draft, setDraft] = useState<EmployeeUpdate>(
    isNew ? { employeeType: 'FULL_TIME', status: 'ACTIVE' } : {}
  )

  // Reset the draft whenever the record loads or editing is cancelled.
  useEffect(() => {
    if (employee) {
      setDraft({
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        jobPosition: employee.jobPosition,
        bankName: employee.bankName,
        bankAccountNumber: employee.bankAccountNumber,
        ifscCode: employee.ifscCode,
        employeeType: employee.employeeType,
        status: employee.status,
        departmentId: employee.departmentId ?? undefined,
        managerId: employee.managerId,
        scheduleId: employee.scheduleId
      })
    }
  }, [employee, isEditing])

  const canEdit = !!user && CAN_EDIT.includes(user.role)

  // Name, email, phone, department and job position are required by the API.
  const canCreate =
    !!draft.name?.trim() &&
    !!draft.email?.trim() &&
    !!draft.phone?.trim() &&
    !!draft.departmentId &&
    !!draft.jobPosition?.trim()

  const saveNew = async () => {
    try {
      const created = await createEmployee.mutateAsync(draft as EmployeeCreate)
      toast.success(`${created.name} created`)
      navigate(`/employees/${created.id}`, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the employee')
    }
  }

  if (isLoading && !isNew) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-24 w-full' />
        <Skeleton className='h-20 w-full' />
        <Skeleton className='h-72 w-full' />
      </div>
    )
  }

  if (!isNew && (isError || !employee)) {
    return (
      <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
        Could not load this employee{error instanceof Error ? `: ${error.message}` : '.'}
      </div>
    )
  }

  const smartButtons = employee ? [
    {
      label: 'Contracts',
      icon: IconFileDescription,
      count: counts?.contracts,
      to: `/contracts?employeeId=${employee.id}`
    },
    {
      label: 'Attendance',
      icon: IconClock,
      count: counts?.attendances,
      to: `/attendance?employeeId=${employee.id}`
    },
    {
      label: 'Time Off',
      icon: IconCalendarTime,
      count: counts?.timeOffRequests,
      to: `/timeoff/requests?employeeId=${employee.id}`
    },
    {
      label: 'Allocations',
      icon: IconWallet,
      count: counts?.timeOffAllocations,
      to: `/timeoff/allocations?employeeId=${employee.id}`
    }
  ] : []

  const handleSave = async () => {
    await updateEmployee.mutateAsync(draft)
    setIsEditing(false)
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' onClick={() => navigate('/employees')} aria-label='Back'>
            <IconArrowLeft />
          </Button>
          <Avatar size='lg'>
            <AvatarFallback>{initialsOf(employee?.name ?? draft.name ?? 'N E')}</AvatarFallback>
          </Avatar>
          <div>
            <div className='flex items-center gap-3'>
              <h1 className='text-foreground text-2xl font-semibold tracking-tight'>
                {employee?.name ?? 'New Employee'}
              </h1>
              {employee && <EmployeeStatusBadge status={employee.status} />}
            </div>
            <p className='text-muted-foreground text-sm'>
              {employee
                ? `${employee.employeeCode} · ${employee.jobPosition}`
                : 'The employee code is generated on save.'}
            </p>
          </div>
        </div>

        {canEdit &&
          (isEditing ? (
            <div className='flex gap-2'>
              <Button
                variant='outline'
                onClick={() => (isNew ? navigate('/employees') : setIsEditing(false))}
                disabled={updateEmployee.isPending || createEmployee.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={isNew ? saveNew : handleSave}
                disabled={
                  updateEmployee.isPending || createEmployee.isPending || (isNew && !canCreate)
                }
              >
                {createEmployee.isPending || updateEmployee.isPending
                  ? 'Saving…'
                  : isNew
                    ? 'Create Employee'
                    : 'Save'}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit</Button>
          ))}
      </div>

      {updateEmployee.isError && (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
          {updateEmployee.error instanceof Error ? updateEmployee.error.message : 'Could not save changes.'}
        </div>
      )}

      {/* Smart buttons — functional navigation to filtered related records */}
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        {smartButtons.map(({ label, icon: Icon, count, to }) => (
          <button
            key={label}
            type='button'
            onClick={() => navigate(to)}
            className='hover:bg-muted/50 hover:border-ring flex items-center justify-between gap-3 rounded-lg border p-4 text-left transition-colors'
          >
            <span className='flex items-center gap-3'>
              <Icon className='text-muted-foreground size-5' />
              <span>
                <span className='block text-sm font-medium'>{label}</span>
                <span className='text-muted-foreground block text-xs'>
                  {count ?? '—'} record{count === 1 ? '' : 's'}
                </span>
              </span>
            </span>
            <span className='flex items-center gap-1'>
              <span className='bg-primary/10 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold'>
                {count ?? '—'}
              </span>
              <IconChevronRight className='text-muted-foreground size-4' />
            </span>
          </button>
        ))}
      </div>

      {/* Employee form */}
      <Card>
        <CardContent className='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
          {isEditing ? (
            <>
              <LabelledField label='Employee Name'>
                <Input value={draft.name ?? ''} onChange={e => setDraft({ ...draft, name: e.target.value })} />
              </LabelledField>

              <ReadField
                label='Employee ID'
                value={employee?.employeeCode ?? 'Generated on save'}
              />

              <LabelledField label='Email'>
                <Input
                  type='email'
                  value={draft.email ?? ''}
                  onChange={e => setDraft({ ...draft, email: e.target.value })}
                />
              </LabelledField>

              <LabelledField label='Phone'>
                <Input value={draft.phone ?? ''} onChange={e => setDraft({ ...draft, phone: e.target.value })} />
              </LabelledField>

              <LabelledField label='Department'>
                <Select
                  value={draft.departmentId ?? undefined}
                  onValueChange={value => setDraft({ ...draft, departmentId: value })}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select department' />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </LabelledField>

              <LabelledField label='Manager'>
                <Select
                  value={draft.managerId ?? NONE}
                  onValueChange={value => setDraft({ ...draft, managerId: value === NONE ? null : value })}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='No manager' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No manager</SelectItem>
                    {colleagues
                      .filter(c => c.id !== employee?.id)
                      .map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </LabelledField>

              <LabelledField label='Job Position'>
                <Input
                  value={draft.jobPosition ?? ''}
                  onChange={e => setDraft({ ...draft, jobPosition: e.target.value })}
                />
              </LabelledField>

              {/* Payment details. A payrun refuses to finalise while any of the
                  three are blank, so they are edited alongside the work details. */}
              <LabelledField label='Bank Name'>
                <Input
                  value={draft.bankName ?? ''}
                  placeholder='HDFC Bank'
                  onChange={e => setDraft({ ...draft, bankName: e.target.value || null })}
                />
              </LabelledField>

              <LabelledField label='Account Number'>
                <Input
                  value={draft.bankAccountNumber ?? ''}
                  placeholder='50100234567801'
                  onChange={e => setDraft({ ...draft, bankAccountNumber: e.target.value || null })}
                />
              </LabelledField>

              <LabelledField label='IFSC Code'>
                <Input
                  value={draft.ifscCode ?? ''}
                  placeholder='HDFC0001234'
                  onChange={e =>
                    setDraft({ ...draft, ifscCode: e.target.value.toUpperCase() || null })
                  }
                />
              </LabelledField>

              <LabelledField label='Employee Type'>
                <Select
                  value={draft.employeeType}
                  onValueChange={value => setDraft({ ...draft, employeeType: value as EmployeeType })}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EMPLOYEE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </LabelledField>

              <LabelledField label='Working Schedule'>
                <Select
                  value={draft.scheduleId ?? NONE}
                  onValueChange={value => setDraft({ ...draft, scheduleId: value === NONE ? null : value })}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='No schedule' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No schedule</SelectItem>
                    {schedules.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </LabelledField>

              <LabelledField label='Status'>
                <Select
                  value={draft.status}
                  onValueChange={value => setDraft({ ...draft, status: value as EmployeeStatus })}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EMPLOYEE_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </LabelledField>
            </>
          ) : employee ? (
            <>
              <ReadField label='Employee Name' value={employee.name} />
              <ReadField label='Employee ID' value={employee.employeeCode} />
              <ReadField label='Email' value={employee.email} />
              <ReadField label='Phone' value={employee.phone} />
              <ReadField label='Department' value={employee.department?.name ?? ''} />
              <ReadField label='Manager' value={employee.manager?.name ?? ''} />
              <ReadField label='Job Position' value={employee.jobPosition} />
              <ReadField label='Employee Type' value={EMPLOYEE_TYPE_LABELS[employee.employeeType]} />
              <ReadField
                label='Working Schedule'
                value={
                  employee.workingSchedule
                    ? `${employee.workingSchedule.name} (${employee.workingSchedule.weeklyHours}h/week)`
                    : ''
                }
              />
              <ReadField label='Status' value={EMPLOYEE_STATUS_LABELS[employee.status]} />

              {/* Payment details. Shown here too, not only in edit mode, because
                  a payrun refuses to finalise while any of them is blank. */}
              <ReadField label='Bank Name' value={employee.bankName ?? ''} />
              <ReadField label='Account Number' value={employee.bankAccountNumber ?? ''} />
              <ReadField label='IFSC Code' value={employee.ifscCode ?? ''} />
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Direct reports, when present */}
      {employee?.subordinates && employee.subordinates.length > 0 && (
        <Card>
          <CardContent className='space-y-3'>
            <h2 className='text-foreground text-sm font-semibold'>
              Direct Reports ({employee.subordinates.length})
            </h2>
            <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
              {employee.subordinates.map(person => (
                <button
                  key={person.id}
                  type='button'
                  onClick={() => navigate(`/employees/${person.id}`)}
                  className='hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 text-left transition-colors'
                >
                  <Avatar>
                    <AvatarFallback>{initialsOf(person.name)}</AvatarFallback>
                  </Avatar>
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-medium'>{person.name}</p>
                    <p className='text-muted-foreground truncate text-xs'>{person.jobPosition}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const LabelledField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className='space-y-1.5'>
    <p className='text-muted-foreground text-xs font-medium'>{label}</p>
    {children}
  </div>
)

export default EmployeeForm
