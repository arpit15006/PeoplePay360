import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

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
import { IconPencil, IconPlus, IconTrash, IconUsers } from '@tabler/icons-react'

import { useDepartmentList, useSaveDepartment, useDeleteDepartment } from '@/hooks/useDepartmentList'
import { useEmployees } from '@/hooks/useEmployees'
import { useAuth } from '@/context/AuthContext'
import type { Department } from '@/types/department'
import type { Role } from '@/types/user'

/**
 * Section 3 lists the HR Manager's modules explicitly — Employees, Attendance,
 * Contracts, Working Schedules and Time Off — and Departments is not among
 * them. Only the Admin holds "full access to all modules and models", so the
 * organisation's structure is theirs to change. Everyone still reads them,
 * since department names label employees, contracts and the dashboard.
 */
const CAN_MANAGE: Role[] = ['ADMIN']
const CAN_DELETE: Role[] = ['ADMIN']

const NONE = 'none'
const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong')

/** Mockup "Menus under Employees" — Departments. */
export function DepartmentsList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: departments = [], isLoading, isError, error } = useDepartmentList()
  const { data: employees = [] } = useEmployees()

  const saveDepartment = useSaveDepartment()
  const deleteDepartment = useDeleteDepartment()

  const canManage = !!user && CAN_MANAGE.includes(user.role)
  const canDelete = !!user && CAN_DELETE.includes(user.role)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [draft, setDraft] = useState<{ name: string; managerId: string | null }>({
    name: '',
    managerId: null
  })
  const [confirmDelete, setConfirmDelete] = useState<Department | null>(null)

  const totalHeadcount = departments.reduce((sum, d) => sum + (d._count?.employees ?? 0), 0)

  const openCreate = () => {
    setEditing(null)
    setDraft({ name: '', managerId: null })
    setDialogOpen(true)
  }

  const openEdit = (department: Department) => {
    setEditing(department)
    setDraft({ name: department.name, managerId: department.managerId })
    setDialogOpen(true)
  }

  const submit = async () => {
    try {
      await saveDepartment.mutateAsync({ id: editing?.id, body: draft })
      toast.success(editing ? `${draft.name} updated` : `${draft.name} created`)
      setDialogOpen(false)
    } catch (err) {
      toast.error(errorText(err))
    }
  }

  const remove = async () => {
    if (!confirmDelete) return
    try {
      await deleteDepartment.mutateAsync(confirmDelete.id)
      toast.success(`${confirmDelete.name} deleted`)
      setConfirmDelete(null)
    } catch (err) {
      // The API refuses while employees or contracts still point at it, and
      // says how many, so the message is worth showing verbatim.
      toast.error(errorText(err))
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Departments</h1>
          <p className='text-muted-foreground text-sm'>
            Organisational units, their managers and headcount.
          </p>
        </div>

        {canManage && (
          <Button onClick={openCreate}>
            <IconPlus />
            New Department
          </Button>
        )}
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
                  <TableHead className='w-64' />
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
                          <div className='flex justify-end gap-1'>
                            <Button
                              variant='ghost'
                              size='sm'
                              // Carries the department through so the employee
                              // list opens already filtered, not just opens.
                              onClick={() => navigate(`/employees?departmentId=${d.id}`)}
                            >
                              <IconUsers />
                              View employees
                            </Button>
                            {canManage && (
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                aria-label={`Edit ${d.name}`}
                                onClick={() => openEdit(d)}
                              >
                                <IconPencil />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                aria-label={`Delete ${d.name}`}
                                onClick={() => setConfirmDelete(d)}
                              >
                                <IconTrash />
                              </Button>
                            )}
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

      {/* Create / edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Department' : 'New Department'}</DialogTitle>
            <DialogDescription>
              Departments group employees and label the salary cost breakdown on the dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='dept-name'>Name</Label>
              <Input
                id='dept-name'
                placeholder='e.g. Customer Success'
                value={draft.name}
                onChange={e => setDraft({ ...draft, name: e.target.value })}
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='dept-manager'>Manager</Label>
              <Select
                value={draft.managerId ?? NONE}
                onValueChange={v => setDraft({ ...draft, managerId: v === NONE ? null : v })}
              >
                <SelectTrigger id='dept-manager' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No manager assigned</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} · {e.employeeCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={saveDepartment.isPending || draft.name.trim().length < 2}
            >
              {saveDepartment.isPending ? 'Saving…' : editing ? 'Save' : 'Create Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={open => !open && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete department</DialogTitle>
            <DialogDescription>
              {confirmDelete?.name} will be removed. A department that still holds employees or
              contracts cannot be deleted — move them first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={remove} disabled={deleteDepartment.isPending}>
              {deleteDepartment.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DepartmentsList
