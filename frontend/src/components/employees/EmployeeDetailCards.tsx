import {
  IconBriefcase,
  IconBuilding,
  IconBuildingBank,
  IconCalendar,
  IconCalendarEvent,
  IconCalendarTime,
  IconClock,
  IconCreditCard,
  IconId,
  IconMail,
  IconMapPin,
  IconPhone,
  IconSettings,
  IconShieldCheck,
  IconUser
} from '@tabler/icons-react'

import { Card } from '@/components/ui/card'
import EmployeeStatusBadge from '@/components/employees/EmployeeStatusBadge'
import { EMPLOYEE_TYPE_LABELS, type EmployeeDetail } from '@/types/employee'

/**
 * The read-only detail cards on the Employee screen: identity, work context and
 * payment details.
 *
 * Pulled out of EmployeeForm so the layout can be reworked in one place. The
 * form's edit mode still renders its own inputs; only the read view lives here.
 *
 * Two fields are placeholders because the schema has nowhere to put them yet:
 * an employee has no joining date or office location, and the start date shown
 * under Work & Schedule belongs to the contract rather than the employee. They
 * are kept visible so the layout matches the intended design, and each is
 * marked below so it is obvious they are not wired to anything.
 */

/** One label/value row. The fixed first column keeps values aligned down the card. */
export const InfoRow = ({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) => (
  <div className='grid grid-cols-[140px_1fr] items-center gap-3 py-1 text-sm sm:grid-cols-[160px_1fr]'>
    <div className='text-muted-foreground flex items-center gap-2.5'>
      <Icon className='text-muted-foreground size-4 shrink-0' />
      <span>{label}</span>
    </div>
    {/* An empty string, null and 0 all read as "nothing recorded" here. */}
    <div className='text-foreground min-w-0 truncate font-medium'>{value || '—'}</div>
  </div>
)

const SectionCard = ({
  icon: Icon,
  title,
  children
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) => (
  <Card className='p-6'>
    <div className='flex items-center gap-2.5 pb-5'>
      <Icon className='text-muted-foreground size-5' />
      <h2 className='text-foreground text-base font-semibold'>{title}</h2>
    </div>
    <div className='space-y-3.5'>{children}</div>
  </Card>
)

export function EmployeePersonalCard({ employee }: { employee: EmployeeDetail }) {
  return (
    <SectionCard icon={IconUser} title='Personal Information'>
      <InfoRow icon={IconUser} label='Full Name' value={employee.name} />
      <InfoRow icon={IconId} label='Employee ID' value={employee.employeeCode} />
      <InfoRow
        icon={IconMail}
        label='Email'
        value={
          <a
            href={`mailto:${employee.email}`}
            className='text-primary hover:underline'
          >
            {employee.email}
          </a>
        }
      />
      <InfoRow icon={IconPhone} label='Phone' value={employee.phone} />
      <InfoRow icon={IconBriefcase} label='Job Position' value={employee.jobPosition} />
      <InfoRow icon={IconBuilding} label='Department' value={employee.department?.name} />
      <InfoRow
        icon={IconClock}
        label='Employee Type'
        value={EMPLOYEE_TYPE_LABELS[employee.employeeType]}
      />
      <InfoRow icon={IconUser} label='Manager' value={employee.manager?.name} />
      <InfoRow
        icon={IconSettings}
        label='Status'
        value={<EmployeeStatusBadge status={employee.status} />}
      />
      {/* No joining date on the employee record; the contract carries dates. */}
      <InfoRow icon={IconCalendar} label='Joining Date' value={null} />
    </SectionCard>
  )
}

export function EmployeeWorkCard({ employee }: { employee: EmployeeDetail }) {
  return (
    <SectionCard icon={IconCalendar} title='Work & Schedule'>
      <InfoRow
        icon={IconCalendarEvent}
        label='Working Schedule'
        value={
          employee.workingSchedule
            ? `${employee.workingSchedule.name} (${employee.workingSchedule.weeklyHours}h/week)`
            : null
        }
      />
      {/* Belongs to the applicable contract, not the employee record. */}
      <InfoRow icon={IconCalendarTime} label='Start Date' value={null} />
      <InfoRow
        icon={IconMail}
        label='Work Email'
        value={
          <a href={`mailto:${employee.email}`} className='hover:underline'>
            {employee.email}
          </a>
        }
      />
      {/* No office location column exists yet. */}
      <InfoRow icon={IconMapPin} label='Office Location' value={null} />
    </SectionCard>
  )
}

export function EmployeeBankCard({ employee }: { employee: EmployeeDetail }) {
  return (
    <SectionCard icon={IconBuildingBank} title='Bank & Financial Details'>
      {/* A payrun refuses to finalise while any of these three is blank, which
          is why they are shown even when empty rather than hidden. */}
      <InfoRow icon={IconCreditCard} label='Bank Name' value={employee.bankName} />
      <InfoRow icon={IconCreditCard} label='Account Number' value={employee.bankAccountNumber} />
      <InfoRow icon={IconShieldCheck} label='IFSC Code' value={employee.ifscCode} />
    </SectionCard>
  )
}

/** The three cards in the two-column arrangement the detail screen uses. */
export function EmployeeDetailCards({ employee }: { employee: EmployeeDetail }) {
  return (
    <div className='grid grid-cols-1 items-start gap-6 lg:grid-cols-2'>
      <EmployeePersonalCard employee={employee} />
      <div className='space-y-6'>
        <EmployeeWorkCard employee={employee} />
        <EmployeeBankCard employee={employee} />
      </div>
    </div>
  )
}

export default EmployeeDetailCards
