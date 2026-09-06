import { useState } from 'react'

import { PersonAvatar } from '@/components/common/PersonAvatar'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { IconMail, IconBriefcase } from '@tabler/icons-react'

import EmployeeStatusBadge from '@/components/employees/EmployeeStatusBadge'
import { type EmployeeRow } from '@/types/employee'

/**
 * PRD Screen 2 Kanban view — the shadcn-studio empty-state-10 layout
 * (Accordion of Card grids) repurposed to group real employees by department.
 */
type Props = {
  data: EmployeeRow[]
  onCardClick?: (employee: EmployeeRow) => void
}

/**
 * Cards revealed per department before the "Show more" button, and the size of
 * each further reveal. A multiple of three, so a full row of the lg:grid-cols-3
 * grid is added at a time.
 */
const CHUNK = 12

const EmployeesKanban = ({ data, onCardClick }: Props) => {
  // Group by department, preserving first-seen order.
  const groups = data.reduce<Record<string, EmployeeRow[]>>((acc, employee) => {
    ;(acc[employee.department] ??= []).push(employee)
    return acc
  }, {})

  const departments = Object.keys(groups)

  // The board has no pager to page — a department at full headcount is a few
  // hundred cards — so each column reveals a chunk at a time instead.
  const [shown, setShown] = useState<Record<string, number>>({})

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
          <AccordionContent className='mt-1 px-5 pb-5'>
            <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
              {groups[department].slice(0, shown[department] ?? CHUNK).map(employee => (
                <Card
                  key={employee.id}
                  onClick={() => onCardClick?.(employee)}
                  className={onCardClick ? 'cursor-pointer transition-colors hover:bg-muted/40' : undefined}
                >
                  <CardContent className='h-full space-y-3'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex min-w-0 items-center gap-3'>
                        <PersonAvatar name={employee.name} />
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
            </div>

            {groups[department].length > (shown[department] ?? CHUNK) && (
              <div className='mt-6 flex justify-center'>
                <Button
                  variant='outline'
                  onClick={() =>
                    setShown(prev => ({
                      ...prev,
                      [department]: (prev[department] ?? CHUNK) + CHUNK
                    }))
                  }
                >
                  Show {CHUNK} more
                  <span className='text-muted-foreground'>
                    ({groups[department].length - (shown[department] ?? CHUNK)} remaining)
                  </span>
                </Button>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export default EmployeesKanban
