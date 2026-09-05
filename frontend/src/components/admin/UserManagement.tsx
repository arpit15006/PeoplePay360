import { useMemo, useState } from 'react'
import { toast } from 'sonner'

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
import { IconPencil, IconPlus, IconTrash, IconSearch } from '@tabler/icons-react'

import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers'
import { useEmployees } from '@/hooks/useEmployees'
import { useAuth } from '@/context/AuthContext'
import { ROLE_LABELS, ROLE_ORDER, type ManagedUser, type UserInput } from '@/types/user-admin'
import type { Role } from '@/types/user'

const ROLE_CLASSES: Record<Role, string> = {
  EMPLOYEE: 'border-none bg-slate-600/10 text-slate-600 dark:bg-slate-400/10 dark:text-slate-400',
  HR_MANAGER: 'border-none bg-sky-600/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400',
  HR_PAYROLL_USER: 'border-none bg-teal-600/10 text-teal-600 dark:bg-teal-400/10 dark:text-teal-400',
  HR_PAYROLL_MANAGER: 'border-none bg-blue-600/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400',
  ADMIN: 'border-none bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400'
}

const EMPTY: UserInput = { email: '', name: '', password: '', role: 'EMPLOYEE', employeeId: null, isActive: true }

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong')

/** PRD section 3 / mockup screen 0 — Admin-only user and role administration. */
export function UserManagement() {
  const { user: currentUser } = useAuth()
  const { data: users = [], isLoading, isError, error } = useUsers()
  const { data: employees = [] } = useEmployees()

  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<UserInput>(EMPTY)
  const [confirmDelete, setConfirmDelete] = useState<ManagedUser | null>(null)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(u => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      const matchesText =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.employee?.name ?? '').toLowerCase().includes(q)
      return matchesRole && matchesText
    })
  }, [users, search, roleFilter])

  // An employee can hold at most one account, so anyone already linked is not
  // offered again — except the person being edited, who keeps their own link.
  const linkableEmployees = useMemo(() => {
    const taken = new Set(users.map(u => u.employeeId).filter(Boolean) as string[])
    return employees.filter(e => !taken.has(e.id) || e.id === editing?.employeeId)
  }, [employees, users, editing])

  const openCreate = () => {
    setDraft(EMPTY)
    setEditing(null)
    setCreating(true)
  }

  const openEdit = (u: ManagedUser) => {
    setDraft({ email: u.email, name: u.name, role: u.role, employeeId: u.employeeId, isActive: u.isActive, password: '' })
    setEditing(u)
    setCreating(true)
  }

  const save = async () => {
    try {
      if (editing) {
        // An empty password box means "leave it alone", not "blank it".
        const { password, ...rest } = draft
        await updateUser.mutateAsync({ id: editing.id, body: password ? { ...rest, password } : rest })
        toast.success(`${draft.name} updated`)
      } else {
        await createUser.mutateAsync(draft)
        toast.success(`${draft.name} created`)
      }
      setCreating(false)
      setEditing(null)
    } catch (err) {
      toast.error(errorText(err))
    }
  }

  const remove = async () => {
    if (!confirmDelete) return
    try {
      await deleteUser.mutateAsync(confirmDelete.id)
      toast.success(`${confirmDelete.name} removed`)
      setConfirmDelete(null)
    } catch (err) {
      toast.error(errorText(err))
    }
  }

  const toggleActive = async (u: ManagedUser) => {
    try {
      await updateUser.mutateAsync({ id: u.id, body: { isActive: !u.isActive } })
      toast.success(`${u.name} ${u.isActive ? 'deactivated' : 'reactivated'}`)
    } catch (err) {
      toast.error(errorText(err))
    }
  }

  const saving = createUser.isPending || updateUser.isPending
  const canSubmit =
    draft.email.trim() && draft.name.trim() && (editing ? true : (draft.password ?? '').length >= 8)

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <div className='flex items-center gap-3'>
            <h1 className='text-foreground text-2xl font-semibold tracking-tight'>User Management</h1>
            <Badge className='border-none bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400'>
              Admin only
            </Badge>
          </div>
          <p className='text-muted-foreground text-sm'>
            Accounts, roles and access. Roles decide which modules a user sees after signing in.
          </p>
        </div>

        <Button onClick={openCreate}>
          <IconPlus />
          New User
        </Button>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <div className='relative'>
          <IconSearch className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
          <Input
            className='w-72 pl-9'
            placeholder='Search users, employees or email…'
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className='w-52'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Roles</SelectItem>
            {ROLE_ORDER.map(r => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      ) : isError ? (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
          Could not load users{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      ) : (
        <Card className='p-0'>
          <CardContent className='overflow-x-auto p-0'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead>User</TableHead>
                  <TableHead>Linked Employee</TableHead>
                  <TableHead>Work Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='w-24' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className='h-24 text-center'>
                      No users match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(u => {
                    const isSelf = u.id === currentUser?.id
                    return (
                      <TableRow key={u.id}>
                        <TableCell className='font-medium'>
                          {u.name}
                          {isSelf && <span className='text-muted-foreground text-xs'> · you</span>}
                        </TableCell>
                        <TableCell>
                          {u.employee ? (
                            <div>
                              <div>{u.employee.name}</div>
                              <div className='text-muted-foreground text-xs'>{u.employee.employeeCode}</div>
                            </div>
                          ) : (
                            <span className='text-muted-foreground text-sm'>Not linked</span>
                          )}
                        </TableCell>
                        <TableCell className='text-muted-foreground'>{u.email}</TableCell>
                        <TableCell>
                          <Badge className={ROLE_CLASSES[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            <Switch
                              checked={u.isActive}
                              disabled={isSelf || updateUser.isPending}
                              onCheckedChange={() => toggleActive(u)}
                              aria-label={`Toggle access for ${u.name}`}
                            />
                            <span className='text-sm'>{u.isActive ? 'Active' : 'Inactive'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='flex justify-end gap-1'>
                            <Button variant='ghost' size='icon-sm' aria-label={`Edit ${u.name}`} onClick={() => openEdit(u)}>
                              <IconPencil />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon-sm'
                              aria-label={`Delete ${u.name}`}
                              disabled={isSelf}
                              onClick={() => setConfirmDelete(u)}
                            >
                              <IconTrash />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && (
        <p className='text-muted-foreground text-sm'>
          {rows.length} user{rows.length === 1 ? '' : 's'}
        </p>
      )}

      {/* Create / Edit */}
      <Dialog open={creating} onOpenChange={open => !open && setCreating(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit User' : 'Create User'}</DialogTitle>
            <DialogDescription>
              Link the account to an employee and assign the role that controls their access.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='u-name'>Name</Label>
              <Input id='u-name' value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='u-email'>Work Email</Label>
              <Input
                id='u-email'
                type='email'
                placeholder='employee@company.com'
                value={draft.email}
                onChange={e => setDraft({ ...draft, email: e.target.value })}
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='u-employee'>Employee</Label>
              <Select
                value={draft.employeeId ?? 'none'}
                onValueChange={v => setDraft({ ...draft, employeeId: v === 'none' ? null : v })}
              >
                <SelectTrigger id='u-employee' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>Not linked</SelectItem>
                  {linkableEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} · {e.employeeCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='u-role'>Role</Label>
              <Select value={draft.role} onValueChange={v => setDraft({ ...draft, role: v as Role })}>
                <SelectTrigger id='u-role' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_ORDER.map(r => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5 sm:col-span-2'>
              <Label htmlFor='u-password'>{editing ? 'New Password' : 'Password'}</Label>
              <Input
                id='u-password'
                type='password'
                placeholder={editing ? 'Leave blank to keep the current password' : 'At least 8 characters'}
                value={draft.password ?? ''}
                onChange={e => setDraft({ ...draft, password: e.target.value })}
              />
            </div>

            <div className='flex items-center gap-3 sm:col-span-2'>
              <Switch
                id='u-active'
                checked={draft.isActive ?? true}
                onCheckedChange={v => setDraft({ ...draft, isActive: v })}
              />
              <Label htmlFor='u-active'>Account active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !canSubmit}>
              {saving ? 'Saving…' : editing ? 'Save Access' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={open => !open && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              {confirmDelete?.name} ({confirmDelete?.email}) will lose access immediately. The linked
              employee record is kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={remove} disabled={deleteUser.isPending}>
              {deleteUser.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UserManagement
