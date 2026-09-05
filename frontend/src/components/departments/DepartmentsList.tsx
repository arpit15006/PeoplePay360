import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { IconUsers } from '@tabler/icons-react'

import { useDepartmentList } from '@/hooks/useDepartmentList'

/** Mockup "Menus under Employees" — Departments. */
export function DepartmentsList() {
  const navigate = useNavigate()
  const { data: departments = [], isLoading, isError, error } = useDepartmentList()

  const totalHeadcount = departments.reduce((sum, d) => sum + (d._count?.employees ?? 0), 0)

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Departments</h1>
        <p className='text-muted-foreground text-sm'>
          Organisational units, their managers and headcount.
        </p>
      </div>

      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      ) : isError ? (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
          Could not load departments{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      ) : (
        <Card className='p-0'>
          <CardContent className='overflow-x-auto p-0'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead>Department</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead className='text-right'>Headcount</TableHead>
                  <TableHead className='w-40' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className='h-24 text-center'>
                      No departments yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {departments.map(d => (
                      <TableRow key={d.id}>
                        <TableCell className='font-medium'>{d.name}</TableCell>
                        <TableCell>
                          {d.manager?.name ?? (
                            <span className='text-muted-foreground'>No manager assigned</span>
                          )}
                        </TableCell>
                        <TableCell className='text-right'>
                          <Badge className='border-none bg-slate-600/10 text-slate-600 dark:bg-slate-400/10 dark:text-slate-400'>
                            {d._count?.employees ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='flex justify-end'>
                            <Button
                              variant='ghost'
                              size='sm'
                              // The employees list filters by department, so this
                              // is the same drill-down the smart buttons use.
                              onClick={() => navigate(`/employees?departmentId=${d.id}`)}
                            >
                              <IconUsers />
                              View employees
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className='bg-muted/30 font-semibold'>
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className='text-right tabular-nums'>{totalHeadcount}</TableCell>
                      <TableCell />
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default DepartmentsList
