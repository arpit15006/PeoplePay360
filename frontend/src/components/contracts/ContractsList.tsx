import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { IconPlus, IconDotsVertical, IconEdit, IconBan, IconX } from '@tabler/icons-react'

import ContractStatusBadge from '@/components/contracts/ContractStatusBadge'
import { useContracts } from '@/hooks/useContracts'
import { useAuth } from '@/context/AuthContext'
import { formatDate, formatWage, type ContractStatus } from '@/types/contract'
import type { Role } from '@/types/user'

/** PRD section 28 — Contracts is CRUD for every role except Employee. */
const CAN_MANAGE: Role[] = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

/** PRD Screen 4 — Contract List. */
export function ContractsList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Set by the Employee Form smart button: /contracts?employeeId=...
  const employeeId = searchParams.get('employeeId') ?? undefined
  const { data: contracts = [], isLoading, isError, error } = useContracts(employeeId)

  const [status, setStatus] = useState<string>('all')

  const canManage = !!user && CAN_MANAGE.includes(user.role)

  const rows = useMemo(() => {
    const filtered =
      status === 'all' ? contracts : contracts.filter(c => c.status === (status as ContractStatus))

    // Newest first, so the current contract sits above the historical ones.
    return [...filtered].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    )
  }, [contracts, status])

  const filteredEmployeeName = employeeId ? contracts[0]?.employee?.name : undefined

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Contracts</h1>
          <p className='text-muted-foreground text-sm'>
            Employment terms over time. Payroll always uses the contract valid for the payrun
            period.
          </p>
        </div>

        {canManage && (
          <Button onClick={() => navigate('/contracts/new')}>
            <IconPlus />
            New
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className='flex flex-wrap items-center gap-2'>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className='w-44'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Statuses</SelectItem>
            <SelectItem value='ACTIVE'>Active</SelectItem>
            <SelectItem value='DRAFT'>Draft</SelectItem>
            <SelectItem value='EXPIRED'>Expired</SelectItem>
            <SelectItem value='TERMINATED'>Terminated</SelectItem>
          </SelectContent>
        </Select>

        {employeeId && (
          <Button
            variant='outline'
            onClick={() => {
              searchParams.delete('employeeId')
              setSearchParams(searchParams)
            }}
          >
            <IconX />
            Filtered by {filteredEmployeeName ?? 'employee'} — clear
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      ) : isError ? (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
          Could not load contracts{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      ) : (
        <div className='overflow-x-auto rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/50'>
                <TableHead>Employee</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className='text-right'>Wage</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Salary Structure</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className='w-10' />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 9 : 8} className='h-24 text-center'>
                    No contracts match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(contract => {
                  const isActive = contract.status === 'ACTIVE'

                  return (
                    <TableRow
                      key={contract.id}
                      onClick={() => navigate(`/contracts/${contract.id}`)}
                      // PRD: "Active contract must be identifiable" — the badge is
                      // reinforced with a tinted row and a left accent border.
                      className={`cursor-pointer ${
                        isActive
                          ? 'bg-green-600/5 hover:bg-green-600/10 dark:bg-green-400/5'
                          : 'opacity-80'
                      }`}
                    >
                      <TableCell
                        className={`font-medium ${
                          isActive ? 'border-l-2 border-l-green-600 dark:border-l-green-400' : 'border-l-2 border-l-transparent'
                        }`}
                      >
                        <div>{contract.employee?.name ?? '—'}</div>
                        <div className='text-muted-foreground text-xs'>
                          {contract.employee?.employeeCode}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(contract.startDate)}</TableCell>
                      <TableCell>
                        {contract.endDate ? (
                          formatDate(contract.endDate)
                        ) : (
                          <span className='text-muted-foreground'>Open-ended</span>
                        )}
                      </TableCell>
                      <TableCell className='text-right font-medium'>
                        {formatWage(contract.wage)}
                      </TableCell>
                      <TableCell>{contract.department?.name ?? '—'}</TableCell>
                      <TableCell>{contract.position}</TableCell>
                      <TableCell>{contract.salaryStructure?.name ?? '—'}</TableCell>
                      <TableCell>
                        <ContractStatusBadge status={contract.status} />
                      </TableCell>

                      {canManage && (
                        <TableCell onClick={event => event.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant='ghost' size='icon-sm' aria-label='Contract actions'>
                                <IconDotsVertical />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' className='w-40'>
                              <DropdownMenuGroup>
                                <DropdownMenuItem
                                  onClick={() => navigate(`/contracts/${contract.id}`)}
                                >
                                  <IconEdit />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant='destructive'
                                  onClick={() =>
                                    navigate(`/contracts/${contract.id}?action=terminate`)
                                  }
                                >
                                  <IconBan />
                                  <span>Terminate</span>
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && !isError && (
        <p className='text-muted-foreground text-sm'>
          {rows.length} contract{rows.length === 1 ? '' : 's'}
        </p>
      )}
    </div>
  )
}

export default ContractsList
