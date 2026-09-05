import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { IconMail, IconBriefcase } from '@tabler/icons-react'

import EmployeeStatusBadge from '@/components/employees/EmployeeStatusBadge'
import { initialsOf, type EmployeeRow } from '@/types/employee'

/**
 * PRD Screen 2 Kanban view — the shadcn-studio empty-state-10 layout
 * (Accordion of Card grids) repurposed to group real employees by department.
 */
type Props = {
  data: EmployeeRow[]
  onCardClick?: (employee: EmployeeRow) => void
}

const EmployeesKanban = ({ data, onCardClick }: Props) => {
  // Group by department, preserving first-seen order.
  const groups = data.reduce<Record<string, EmployeeRow[]>>((acc, employee) => {
    ;(acc[employee.department] ??= []).push(employee)
    return acc
  }, {})

  const departments = Object.keys(groups)

  if (departments.length === 0) {
    return (
      <div className='text-muted-foreground rounded-lg border p-10 text-center text-sm'>
        No employees match the current filters.
      </div>
    )
  }

  return (
    <Accordion
      type='multiple'
      defaultValue={departments}
      className='w-full space-y-2 overflow-visible border-0 [&>*>[data-slot="accordion-content"]]:px-0'
    >
      {departments.map(department => (
        <AccordionItem key={department} value={department} className='rounded-lg border bg-transparent'>
          <AccordionTrigger className='px-5'>
            {department} ({groups[department].length})
          </AccordionTrigger>
          <AccordionContent className='mt-1 grid grid-cols-1 gap-6 px-5 pb-5 lg:grid-cols-3'>
            {groups[department].map(employee => (
              <Card
                key={employee.id}
                onClick={() => onCardClick?.(employee)}
                className={onCardClick ? 'cursor-pointer transition-colors hover:bg-muted/40' : undefined}
              >
                <CardContent className='h-full space-y-3'>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex min-w-0 items-center gap-3'>
                      <Avatar>
                        <AvatarFallback>{initialsOf(employee.name)}</AvatarFallback>
                      </Avatar>
                      <div className='min-w-0'>
                        <h3 className='truncate text-base font-medium'>{employee.name}</h3>
                        <p className='text-muted-foreground truncate text-sm'>{employee.jobPosition}</p>
                      </div>
                    </div>
                    <EmployeeStatusBadge status={employee.status} />
                  </div>

                  <div className='text-muted-foreground space-y-1 text-sm'>
                    <div className='flex items-center gap-2'>
                      <IconMail className='size-4 shrink-0' />
                      <span className='truncate'>{employee.email}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <IconBriefcase className='size-4 shrink-0' />
                      <span className='truncate'>
                        {employee.employeeCode} · {employee.workingSchedule ?? 'No schedule'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export default EmployeesKanban
