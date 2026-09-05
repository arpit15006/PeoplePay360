import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
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
import { IconArrowLeft, IconBan } from '@tabler/icons-react'

import DatePicker from '@/components/common/DatePicker'
import ContractStatusBadge from '@/components/contracts/ContractStatusBadge'
import { useContract, useSalaryStructures, useSaveContract } from '@/hooks/useContracts'
import { useDepartments } from '@/hooks/useEmployee'
import { useEmployees } from '@/hooks/useEmployees'
import { useAuth } from '@/context/AuthContext'
import {
  CONTRACT_STATUS_LABELS,
  formatWage,
  isoToLocalDate,
  localDateToIso,
  type ContractInput,
  type ContractStatus
} from '@/types/contract'
import type { Role } from '@/types/user'

const CAN_MANAGE: Role[] = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

const Labelled = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className='space-y-1.5'>
    <p className='text-muted-foreground text-xs font-medium'>{label}</p>
    {children}
  </div>
)

/** PRD Screen 4 — Contract Form. */
export function ContractForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const isNew = id === 'new'
  const { data: contract, isLoading, isError, error } = useContract(id)
  const { data: employees = [] } = useEmployees()
  const { data: departments = [] } = useDepartments()
  const { data: structures = [] } = useSalaryStructures()
  const saveContract = useSaveContract(id)

  const [form, setForm] = useState<Partial<ContractInput>>({ status: 'DRAFT' })
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [showTerminate, setShowTerminate] = useState(searchParams.get('action') === 'terminate')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (contract) {
      setForm({
        employeeId: contract.employeeId,
        wage: contract.wage,
        departmentId: contract.departmentId,
        position: contract.position,
        salaryStructureId: contract.salaryStructureId,
        status: contract.status
      })
      setStartDate(isoToLocalDate(contract.startDate))
      setEndDate(isoToLocalDate(contract.endDate))
    }
  }, [contract])

  const canManage = !!user && CAN_MANAGE.includes(user.role)
  const readOnly = !canManage

  if (isLoading && !isNew) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-20 w-full' />
        <Skeleton className='h-80 w-full' />
      </div>
    )
  }

  if (isError && !isNew) {
    return (
      <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
        Could not load this contract{error instanceof Error ? `: ${error.message}` : '.'}
      </div>
    )
  }

  const submit = async (overrides: Partial<ContractInput> = {}) => {
    setValidationError(null)

    const payload = { ...form, ...overrides }

    if (!payload.employeeId) return setValidationError('Select an employee.')
    if (!payload.departmentId) return setValidationError('Select a department.')
    if (!payload.salaryStructureId) return setValidationError('Select a salary structure.')
    if (!payload.position) return setValidationError('Enter a position.')
    if (!payload.wage || payload.wage <= 0) return setValidationError('Enter a wage greater than zero.')
    if (!startDate) return setValidationError('Select a start date.')
    if (endDate && endDate < startDate) {
      return setValidationError('End date cannot be before the start date.')
    }

    await saveContract.mutateAsync({
      ...(payload as ContractInput),
      startDate: localDateToIso(startDate)!,
      endDate: localDateToIso(endDate)
    })
    navigate('/contracts')
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' onClick={() => navigate('/contracts')} aria-label='Back'>
            <IconArrowLeft />
          </Button>
          <div>
            <div className='flex items-center gap-3'>
              <h1 className='text-foreground text-2xl font-semibold tracking-tight'>
                {isNew ? 'New Contract' : contract?.employee?.name}
              </h1>
              {contract && <ContractStatusBadge status={contract.status} />}
            </div>
            <p className='text-muted-foreground text-sm'>
              {isNew
                ? 'Define the employment terms for a period.'
                : `${contract?.position} · ${formatWage(contract?.wage ?? 0)}`}
            </p>
          </div>
        </div>

        {canManage && (
          <div className='flex gap-2'>
            {!isNew && contract?.status !== 'TERMINATED' && (
              <Button variant='outline' onClick={() => setShowTerminate(true)}>
                <IconBan />
                Terminate
              </Button>
            )}
            <Button onClick={() => submit()} disabled={saveContract.isPending}>
              {saveContract.isPending ? 'Saving…' : isNew ? 'Create Contract' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {(validationError || saveContract.isError) && (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
          {validationError ??
            (saveContract.error instanceof Error
              ? saveContract.error.message
              : 'Could not save the contract.')}
        </div>
      )}

      <Card>
        <CardContent className='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
          <Labelled label='Employee'>
            <Select
              value={form.employeeId}
              disabled={readOnly || !isNew}
              onValueChange={value => setForm({ ...form, employeeId: value })}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select employee' />
              </SelectTrigger>
              <SelectContent>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} ({e.employeeCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Labelled>

          <Labelled label='Start Date'>
            <DatePicker
              id='startDate'
              value={startDate}
              onChange={setStartDate}
              placeholder='Select start date'
              disabled={readOnly}
            />
          </Labelled>

          <Labelled label='End Date'>
            <DatePicker
              id='endDate'
              value={endDate}
              onChange={setEndDate}
              placeholder='Open-ended'
              clearable
              disabled={readOnly}
              // A contract cannot end before it starts.
              disabledDate={date => (startDate ? date < startDate : false)}
            />
          </Labelled>

          <Labelled label='Department'>
            <Select
              value={form.departmentId}
              disabled={readOnly}
              onValueChange={value => setForm({ ...form, departmentId: value })}
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
          </Labelled>

          <Labelled label='Position'>
            <Input
              value={form.position ?? ''}
              readOnly={readOnly}
              onChange={e => setForm({ ...form, position: e.target.value })}
              placeholder='e.g. Lead Software Architect'
            />
          </Labelled>

          <Labelled label='Wage (monthly)'>
            <Input
              type='number'
              min={0}
              value={form.wage ?? ''}
              readOnly={readOnly}
              onChange={e => setForm({ ...form, wage: Number(e.target.value) })}
              placeholder='75000'
            />
          </Labelled>

          <Labelled label='Salary Structure'>
            <Select
              value={form.salaryStructureId}
              disabled={readOnly}
              onValueChange={value => setForm({ ...form, salaryStructureId: value })}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select structure' />
              </SelectTrigger>
              <SelectContent>
                {/* Retired structures are hidden, except one this contract is
                    already on — dropping it would silently blank the field on
                    an older contract that is otherwise being edited. */}
                {structures
                  .filter(s => s.status === 'Active' || s.id === form.salaryStructureId)
                  .map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.status !== 'Active' && (
                        <span className='text-muted-foreground'> · {s.status}</span>
                      )}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Labelled>

          <Labelled label='Status'>
            <Select
              value={form.status}
              disabled={readOnly}
              onValueChange={value => setForm({ ...form, status: value as ContractStatus })}
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Labelled>
        </CardContent>
      </Card>

      {/* Terminate confirmation — dialog-01 variant */}
      <AlertDialog open={showTerminate} onOpenChange={setShowTerminate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate this contract?</AlertDialogTitle>
            <AlertDialogDescription>
              The contract is kept as a historical record, but its status becomes Terminated and
              payroll will stop using it for future periods. Payslips already generated are not
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => submit({ status: 'TERMINATED' })}>
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ContractForm
