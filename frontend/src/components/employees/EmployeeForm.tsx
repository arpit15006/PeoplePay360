import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
  IconBriefcase,
  IconBuilding,
  IconBuildingBank,
  IconCalendar,
  IconCalendarEvent,
  IconCalendarTime,
  IconChevronRight,
  IconClock,
  IconCreditCard,
  IconDots,
  IconFileDescription,
  IconId,
  IconMail,
  IconMapPin,
  IconPencil,
  IconPhone,
  IconSettings,
  IconShieldCheck,
  IconUser,
  IconUsers,
  IconWallet
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

/** Row inside details cards with icon, label and aligned value */
const InfoRow = ({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) => (
  <div className='grid grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr] items-center gap-3 py-1 text-sm'>
    <div className='flex items-center gap-2.5 text-muted-foreground'>
      <Icon className='size-4 shrink-0 text-muted-foreground' />
      <span>{label}</span>
    </div>
    <div className='min-w-0 font-medium text-foreground truncate'>
      {value || '—'}
    </div>
  </div>
)

const LabelledField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className='space-y-1.5'>
    <p className='text-muted-foreground text-xs font-medium'>{label}</p>
    {children}
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
    isNew
      ? {
          name: '',
          email: '',
          phone: '',
          jobPosition: '',
          bankName: '',
          bankAccountNumber: '',
          ifscCode: '',
          departmentId: '',
          managerId: null,
          scheduleId: null,
          employeeType: 'FULL_TIME',
          status: 'ACTIVE'
        }
      : {}
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

  const smartButtons = employee
    ? [
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
      ]
    : []

  const handleSave = async () => {
    await updateEmployee.mutateAsync(draft)
    setIsEditing(false)
  }

  return (
    <div className='space-y-6'>
      {/* Header Card */}
      <Card className='p-6'>
        <div className='flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex items-start gap-4'>
            <Button
              variant='outline'
              size='icon'
              onClick={() => navigate('/employees')}
              aria-label='Back'
              className='h-10 w-10 shrink-0 rounded-lg'
            >
              <IconArrowLeft className='size-4' />
            </Button>
            <Avatar className='h-16 w-16 shrink-0 text-xl font-medium'>
              <AvatarFallback className='bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
                {initialsOf(employee?.name ?? draft.name ?? 'N E')}
              </AvatarFallback>
            </Avatar>
            <div className='space-y-1.5'>
              <div className='flex flex-wrap items-center gap-3'>
                <h1 className='text-2xl font-bold tracking-tight text-foreground'>
                  {employee?.name ?? 'New Employee'}
                </h1>
                {employee && <EmployeeStatusBadge status={employee.status} />}
              </div>
              <p className='text-sm text-muted-foreground'>
                {employee
                  ? `${employee.employeeCode} · ${employee.jobPosition || '—'}`
                  : 'The employee code is generated on save.'}
              </p>
              {employee && (
                <div className='flex flex-wrap items-center gap-2 pt-1'>
                  {employee.department?.name && (
                    <span className='inline-flex items-center gap-1.5 rounded-md border bg-muted/20 px-2.5 py-1 text-xs text-muted-foreground'>
                      <IconBuilding className='size-3.5' />
                      {employee.department.name}
                    </span>
                  )}
                  <span className='inline-flex items-center gap-1.5 rounded-md border bg-muted/20 px-2.5 py-1 text-xs text-muted-foreground'>
                    <IconBriefcase className='size-3.5' />
                    {EMPLOYEE_TYPE_LABELS[employee.employeeType] ?? 'Full Time'}
                  </span>
                  {employee.bankName && (
                    <span className='inline-flex items-center gap-1.5 rounded-md border bg-muted/20 px-2.5 py-1 text-xs text-muted-foreground'>
                      <IconBuildingBank className='size-3.5' />
                      {employee.bankName}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className='flex flex-col items-start lg:items-end gap-2'>
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
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    onClick={() => setIsEditing(true)}
                    className='gap-2 rounded-lg font-medium text-sm'
                  >
                    <IconPencil className='size-4' />
                    Edit Employee
                  </Button>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-9 w-9 rounded-lg'
                    aria-label='More actions'
                  >
                    <IconDots className='size-4' />
                  </Button>
                </div>
              ))}
            <p className='text-xs italic text-muted-foreground mt-2'>
              &ldquo;Building great products with great people.&rdquo;
            </p>
          </div>
        </div>
      </Card>

      {updateEmployee.isError && (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
          {updateEmployee.error instanceof Error ? updateEmployee.error.message : 'Could not save changes.'}
        </div>
      )}

      {/* Smart Metric Cards */}
      {!isNew && (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {smartButtons.map(({ label, icon: Icon, count, to }) => (
            <Card
              key={label}
              onClick={() => navigate(to)}
              className='cursor-pointer p-4 transition-all hover:border-ring hover:shadow-xs'
            >
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'>
                    <Icon className='size-5' />
                  </div>
                  <div>
                    <p className='text-sm font-semibold text-foreground'>{label}</p>
                    <p className='text-xs text-muted-foreground'>
                      {count ?? 0} record{count === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-1.5'>
                  <span className='rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300'>
                    {count ?? 0}
                  </span>
                  <IconChevronRight className='size-4 text-muted-foreground' />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Main Details Section */}
      {isEditing ? (
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2 items-start'>
          {/* Left Column: Personal Information Form */}
          <Card className='p-6'>
            <div className='flex items-center gap-2.5 pb-5'>
              <IconUser className='size-5 text-muted-foreground' />
              <h2 className='text-base font-semibold text-foreground'>Personal Information</h2>
            </div>
            <div className='space-y-4'>
              <LabelledField label='Employee Name'>
                <Input
                  value={draft.name ?? ''}
                  placeholder='Full Name'
                  onChange={e => setDraft({ ...draft, name: e.target.value })}
                />
              </LabelledField>

              <LabelledField label='Employee ID'>
                <Input
                  value={employee?.employeeCode ?? 'Generated on save'}
                  disabled
                  className='bg-muted/50'
                />
              </LabelledField>

              <LabelledField label='Email'>
                <Input
                  type='email'
                  value={draft.email ?? ''}
                  placeholder='email@company.com'
                  onChange={e => setDraft({ ...draft, email: e.target.value })}
                />
              </LabelledField>

              <LabelledField label='Phone'>
                <Input
                  value={draft.phone ?? ''}
                  placeholder='+91 98765 43210'
                  onChange={e => setDraft({ ...draft, phone: e.target.value })}
                />
              </LabelledField>

              <LabelledField label='Job Position'>
                <Input
                  value={draft.jobPosition ?? ''}
                  placeholder='e.g. Lead Fullstack Engineer'
                  onChange={e => setDraft({ ...draft, jobPosition: e.target.value })}
                />
              </LabelledField>

              <LabelledField label='Department'>
                <Select
                  value={draft.departmentId ?? ''}
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

              <LabelledField label='Employee Type'>
                <Select
                  value={draft.employeeType}
                  onValueChange={value =>
                    setDraft({ ...draft, employeeType: value as EmployeeType })
                  }
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

              <LabelledField label='Manager'>
                <Select
                  value={draft.managerId ?? NONE}
                  onValueChange={value =>
                    setDraft({ ...draft, managerId: value === NONE ? null : value })
                  }
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

              <LabelledField label='Status'>
                <Select
                  value={draft.status}
                  onValueChange={value =>
                    setDraft({ ...draft, status: value as EmployeeStatus })
                  }
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
            </div>
          </Card>

          {/* Right Column: Work & Schedule and Bank Details */}
          <div className='space-y-6'>
            <Card className='p-6'>
              <div className='flex items-center gap-2.5 pb-5'>
                <IconCalendar className='size-5 text-muted-foreground' />
                <h2 className='text-base font-semibold text-foreground'>Work & Schedule</h2>
              </div>
              <div className='space-y-4'>
                <LabelledField label='Working Schedule'>
                  <Select
                    value={draft.scheduleId ?? NONE}
                    onValueChange={value =>
                      setDraft({ ...draft, scheduleId: value === NONE ? null : value })
                    }
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
              </div>
            </Card>

            <Card className='p-6'>
              <div className='flex items-center gap-2.5 pb-5'>
                <IconBuildingBank className='size-5 text-muted-foreground' />
                <h2 className='text-base font-semibold text-foreground'>Bank & Financial Details</h2>
              </div>
              <div className='space-y-4'>
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
                    placeholder='50100987654321'
                    onChange={e =>
                      setDraft({ ...draft, bankAccountNumber: e.target.value || null })
                    }
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
              </div>
            </Card>
          </div>
        </div>
      ) : employee ? (
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2 items-start'>
          {/* Left Column: Personal Information Card */}
          <Card className='p-6'>
            <div className='flex items-center gap-2.5 pb-5'>
              <IconUser className='size-5 text-muted-foreground' />
              <h2 className='text-base font-semibold text-foreground'>Personal Information</h2>
            </div>
            <div className='space-y-3.5'>
              <InfoRow icon={IconUser} label='Full Name' value={employee.name} />
              <InfoRow icon={IconId} label='Employee ID' value={employee.employeeCode} />
              <InfoRow
                icon={IconMail}
                label='Email'
                value={
                  <a
                    href={`mailto:${employee.email}`}
                    className='text-blue-600 hover:underline dark:text-blue-400'
                  >
                    {employee.email}
                  </a>
                }
              />
              <InfoRow icon={IconPhone} label='Phone' value={employee.phone} />
              <InfoRow icon={IconBriefcase} label='Job Position' value={employee.jobPosition} />
              <InfoRow
                icon={IconBuilding}
                label='Department'
                value={employee.department?.name ?? '—'}
              />
              <InfoRow
                icon={IconClock}
                label='Employee Type'
                value={EMPLOYEE_TYPE_LABELS[employee.employeeType] ?? 'Full Time'}
              />
              <InfoRow icon={IconUser} label='Manager' value={employee.manager?.name ?? '—'} />
              <InfoRow
                icon={IconSettings}
                label='Status'
                value={<EmployeeStatusBadge status={employee.status} />}
              />
              <InfoRow icon={IconCalendar} label='Joining Date' value='—' />
            </div>
          </Card>

          {/* Right Column: Work & Schedule and Bank & Financial Details */}
          <div className='space-y-6'>
            <Card className='p-6'>
              <div className='flex items-center gap-2.5 pb-5'>
                <IconCalendar className='size-5 text-muted-foreground' />
                <h2 className='text-base font-semibold text-foreground'>Work & Schedule</h2>
              </div>
              <div className='space-y-3.5'>
                <InfoRow
                  icon={IconCalendarEvent}
                  label='Working Schedule'
                  value={
                    employee.workingSchedule
                      ? `${employee.workingSchedule.name} (${employee.workingSchedule.weeklyHours}h/week)`
                      : '—'
                  }
                />
                <InfoRow icon={IconCalendarTime} label='Start Date' value='—' />
                <InfoRow
                  icon={IconMail}
                  label='Work Email'
                  value={
                    <a
                      href={`mailto:${employee.email}`}
                      className='text-foreground hover:underline'
                    >
                      {employee.email}
                    </a>
                  }
                />
                <InfoRow icon={IconMapPin} label='Office Location' value='—' />
              </div>
            </Card>

            <Card className='p-6'>
              <div className='flex items-center gap-2.5 pb-5'>
                <IconBuildingBank className='size-5 text-muted-foreground' />
                <h2 className='text-base font-semibold text-foreground'>Bank & Financial Details</h2>
              </div>
              <div className='space-y-3.5'>
                <InfoRow icon={IconCreditCard} label='Bank Name' value={employee.bankName || '—'} />
                <InfoRow
                  icon={IconCreditCard}
                  label='Account Number'
                  value={employee.bankAccountNumber || '—'}
                />
                <InfoRow icon={IconShieldCheck} label='IFSC Code' value={employee.ifscCode || '—'} />
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Direct reports section */}
      {!isNew && (
        <Card className='p-6'>
          <div className='flex items-center justify-between pb-5'>
            <div className='flex items-center gap-2.5'>
              <IconUsers className='size-5 text-muted-foreground' />
              <h2 className='text-base font-semibold text-foreground'>
                Direct Reports ({employee?.subordinates?.length ?? 0})
              </h2>
            </div>
            {employee?.subordinates && employee.subordinates.length > 0 && (
              <Button variant='outline' size='sm' className='h-8 text-xs font-medium'>
                View All
              </Button>
            )}
          </div>
          {employee?.subordinates && employee.subordinates.length > 0 ? (
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {employee.subordinates.map(person => (
                <div
                  key={person.id}
                  onClick={() => navigate(`/employees/${person.id}`)}
                  className='flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all hover:bg-muted/50'
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    <Avatar className='size-9 shrink-0'>
                      <AvatarFallback className='bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300'>
                        {initialsOf(person.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold text-foreground'>{person.name}</p>
                      <p className='truncate text-xs text-muted-foreground'>{person.jobPosition || '—'}</p>
                    </div>
                  </div>
                  <IconChevronRight className='size-4 shrink-0 text-muted-foreground' />
                </div>
              ))}
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>No direct reports assigned.</p>
          )}
        </Card>
      )}
    </div>
  )
}

export default EmployeeForm
