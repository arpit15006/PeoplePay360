import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { ColumnDef, ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import { PersonAvatar } from '@/components/common/PersonAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  IconCash,
  IconChevronDown,
  IconChevronUp,
  IconCrown,
  IconDotsVertical,
  IconPencil,
  IconPlus,
  IconUpload,
  IconSearch,
  IconShieldLock,
  IconTrash,
  IconUser,
  IconUsers
} from '@tabler/icons-react'

import BulkImportDialog from '@/components/bulk/BulkImportDialog'
import { userImportConfig } from '@/components/bulk/importConfigs'
import { useImportContext } from '@/hooks/useImportContext'
import {
  DataTableFacetFilter,
  DataTablePagination
} from '@/components/shadcn-studio/data-table/data-table-parts'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers'
import { useEmployees } from '@/hooks/useEmployees'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { ROLE_LABELS, ROLE_ORDER, type ManagedUser, type UserInput } from '@/types/user-admin'
import type { Role } from '@/types/user'

const ROLE_CLASSES: Record<Role, string> = {
  EMPLOYEE: 'border-none bg-slate-600/10 text-slate-600 dark:bg-slate-400/10 dark:text-slate-400',
  HR_MANAGER: 'border-none bg-sky-600/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400',
  HR_PAYROLL_USER: 'border-none bg-teal-600/10 text-teal-600 dark:bg-teal-400/10 dark:text-teal-400',
  HR_PAYROLL_MANAGER: 'border-none bg-blue-600/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400',
  ADMIN: 'border-none bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400'
}

/**
 * An icon per role, ordered by seniority so the hierarchy is readable at a
 * glance rather than by reading five similar labels. Colours match the badge.
 */
const ROLE_ICONS: Record<Role, { icon: typeof IconUser; className: string }> = {
  EMPLOYEE: { icon: IconUser, className: 'text-slate-600 dark:text-slate-400' },
  HR_MANAGER: { icon: IconUsers, className: 'text-sky-600 dark:text-sky-400' },
  HR_PAYROLL_USER: { icon: IconCash, className: 'text-teal-600 dark:text-teal-400' },
  HR_PAYROLL_MANAGER: { icon: IconShieldLock, className: 'text-blue-600 dark:text-blue-400' },
  ADMIN: { icon: IconCrown, className: 'text-amber-600 dark:text-amber-400' }
}

const STATUS_CLASSES: Record<string, string> = {
  Active:
    'bg-green-600/10 text-green-600 focus-visible:ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:focus-visible:ring-green-400/40',
  Inactive:
    'bg-destructive/10 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive'
}

const EMPTY: UserInput = { email: '', name: '', password: '', role: 'EMPLOYEE', employeeId: null, isActive: true }

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong')

/** PRD Screen 0 / section 3 — Admin-only user and role administration. */
export function UserManagement() {
  const { user: currentUser } = useAuth()
  const { data: users = [], isLoading, isError, error } = useUsers()
  const { data: employees = [] } = useEmployees()

  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<UserInput>(EMPTY)
  const [confirmDelete, setConfirmDelete] = useState<ManagedUser | null>(null)

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 8 })
  const [importing, setImporting] = useState(false)

  const importContext = useImportContext()

  // Free text stays outside the table so the three faceted selects only ever
  // offer values that survive the search, rather than options that match nothing.
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.employee?.name ?? '').toLowerCase().includes(q)
    )
  }, [users, search])

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

  const togglePending = updateUser.isPending

  const columns = useMemo<ColumnDef<ManagedUser>[]>(
    () => [
      {
        id: 'user',
        header: 'User',
        accessorKey: 'name',
        cell: ({ row }) => {
          const isSelf = row.original.id === currentUser?.id
          return (
            <div className='flex items-center gap-3'>
              <PersonAvatar name={row.original.name} className='size-9' fallbackClassName='text-xs' />
              <div className='flex min-w-0 flex-col'>
                <span className='truncate font-medium'>
                  {row.original.name}
                  {isSelf && <span className='text-muted-foreground text-xs font-normal'> · you</span>}
                </span>
                <span className='text-muted-foreground truncate'>{row.original.email}</span>
              </div>
            </div>
          )
        },
        size: 320
      },
      {
        id: 'employee',
        header: 'Linked Employee',
        // The facet filter needs a plain string, so the column value is the
        // link state and the employee's own details are read off the row.
        accessorFn: row => (row.employee ? 'Linked' : 'Not linked'),
        filterFn: 'equalsString',
        cell: ({ row }) =>
          row.original.employee ? (
            <div className='min-w-0'>
              <div className='truncate'>{row.original.employee.name}</div>
              <div className='text-muted-foreground truncate text-xs'>
                {row.original.employee.employeeCode}
              </div>
            </div>
          ) : (
            <span className='text-muted-foreground text-sm'>Not linked</span>
          )
      },
      {
        id: 'role',
        header: 'Role',
        accessorKey: 'role',
        filterFn: 'equalsString',
        // Seniority order, not alphabetical — Admin belongs at one end.
        sortingFn: (a, b) => ROLE_ORDER.indexOf(a.original.role) - ROLE_ORDER.indexOf(b.original.role),
        cell: ({ row }) => {
          const { icon: Icon, className } = ROLE_ICONS[row.original.role]
          return (
            <div className='flex items-center gap-2'>
              <Icon className={cn('size-4 shrink-0', className)} />
              <Badge className={ROLE_CLASSES[row.original.role]}>{ROLE_LABELS[row.original.role]}</Badge>
            </div>
          )
        }
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: row => (row.isActive ? 'Active' : 'Inactive'),
        filterFn: 'equalsString',
        cell: ({ row }) => {
          const isSelf = row.original.id === currentUser?.id
          const label = row.original.isActive ? 'Active' : 'Inactive'
          return (
            <div className='flex items-center gap-2'>
              {/* Locking yourself out is not recoverable from inside the app,
                  so your own row carries the badge alone rather than a switch
                  that refuses to move. */}
              {!isSelf && (
                <Switch
                  checked={row.original.isActive}
                  disabled={togglePending}
                  onCheckedChange={() => toggleActive(row.original)}
                  aria-label={`Toggle access for ${row.original.name}`}
                />
              )}
              <Badge
                className={cn('h-auto rounded-sm border-none focus-visible:outline-none', STATUS_CLASSES[label])}
              >
                {label}
              </Badge>
            </div>
          )
        }
      },
      {
        id: 'actions',
        header: () => 'Actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const u = row.original
          const isSelf = u.id === currentUser?.id
          return (
            <div className='flex items-center justify-center gap-1'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant='ghost' size='icon' aria-label={`Edit ${u.name}`} onClick={() => openEdit(u)}>
                    <IconPencil className='size-4.5' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit</p>
                </TooltipContent>
              </Tooltip>
              {!isSelf && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      aria-label={`Delete ${u.name}`}
                      onClick={() => setConfirmDelete(u)}
                    >
                      <IconTrash className='size-4.5' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size='icon' variant='ghost' aria-label={`More actions for ${u.name}`}>
                    <IconDotsVertical className='size-4.5' aria-hidden='true' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => openEdit(u)}>
                      <span>Edit access</span>
                    </DropdownMenuItem>
                    {!isSelf && (
                      <DropdownMenuItem onSelect={() => toggleActive(u)}>
                        <span>{u.isActive ? 'Deactivate' : 'Reactivate'}</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        }
      }
    ],
    // toggleActive and openEdit are recreated every render but close over
    // nothing that changes the rendered output beyond these two values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser?.id, togglePending]
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false
  })

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

        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={() => setImporting(true)}>
            <IconUpload />
            Import CSV
          </Button>
          <Button onClick={openCreate}>
            <IconPlus />
            New User
          </Button>
        </div>
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
        <Card className='w-full py-0'>
          <div className='border-b'>
            <div className='flex flex-col gap-4 p-6'>
              <span className='text-xl font-semibold'>Filter</span>
              <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
                <div className='w-full space-y-2'>
                  <Label htmlFor='user-search'>Search</Label>
                  <div className='relative'>
                    <IconSearch className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
                    <Input
                      id='user-search'
                      className='pl-9'
                      placeholder='Name, email or employee…'
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <DataTableFacetFilter
                  column={table.getColumn('role')}
                  label='Role'
                  format={value => ROLE_LABELS[value as Role] ?? value}
                />
                <DataTableFacetFilter column={table.getColumn('status')} label='Status' />
                <DataTableFacetFilter column={table.getColumn('employee')} label='Employee Link' />
              </div>
            </div>

            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id} className='h-14 border-t'>
                    {headerGroup.headers.map(header => (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() ? `${header.getSize()}px` : undefined }}
                        className='text-muted-foreground first:pl-4 last:px-4 last:text-center'
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <div
                            className='flex h-full cursor-pointer items-center justify-between gap-2 select-none'
                            onClick={header.column.getToggleSortingHandler()}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                header.column.getToggleSortingHandler()?.(e)
                              }
                            }}
                            tabIndex={0}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: <IconChevronUp className='size-4 shrink-0 opacity-60' aria-hidden='true' />,
                              desc: <IconChevronDown className='size-4 shrink-0 opacity-60' aria-hidden='true' />
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map(row => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id} className='h-14 first:pl-4 last:w-40 last:px-4'>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className='h-24 text-center'>
                      No users match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination table={table} noun='users' />
        </Card>
      )}

      {/* Create / Edit */}
      <Dialog open={creating} onOpenChange={open => !open && setCreating(false)}>
        <DialogContent className='sm:max-w-xl p-6'>
          <DialogHeader>
            <DialogTitle className='text-lg'>{editing ? 'Edit User' : 'Create User'}</DialogTitle>
            <DialogDescription>
              Link the account to an employee and assign the role that controls their access.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 sm:grid-cols-2 py-1'>
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

      <BulkImportDialog
        open={importing}
        onOpenChange={setImporting}
        config={userImportConfig}
        context={importContext}
      />
    </div>
  )
}

export default UserManagement
