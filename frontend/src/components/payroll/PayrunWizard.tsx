import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger
} from '@/components/ui/stepper'
import { IconArrowLeft, IconArrowRight, IconSearch } from '@tabler/icons-react'

import { useCreatePayrun } from '@/hooks/usePayruns'
import { useSalaryStructures } from '@/hooks/useSalary'
import { useEmployees } from '@/hooks/useEmployees'
import { monthOptions, periodBounds } from '@/types/payrun'

const STEPS = [
  { id: 'scope', title: 'Payrun Configuration' },
  { id: 'employees', title: 'Select Employees' }
]

/**
 * PRD Screen 12 — the two step payrun wizard.
 *
 * Nothing is written on Continue: the payrun record is only created when
 * "Create Payrun" is pressed on step 2, and it contains only the employees
 * explicitly selected there.
 */
export function PayrunWizard() {
  const navigate = useNavigate()
  const { data: structures = [] } = useSalaryStructures()
  const { data: employees = [] } = useEmployees()
  const createPayrun = useCreatePayrun()

  const now = new Date()
  const [step, setStep] = useState<'scope' | 'employees'>('scope')
  const [structureId, setStructureId] = useState('')
  const [month, setMonth] = useState(String(now.getMonth()))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const period = `${monthOptions[Number(month)]} ${year}`

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return employees.filter(
      e =>
        !term ||
        e.name.toLowerCase().includes(term) ||
        e.employeeCode.toLowerCase().includes(term) ||
        e.department.toLowerCase().includes(term)
    )
  }, [employees, search])

  const toggle = (id: string) =>
    setSelected(current =>
      current.includes(id) ? current.filter(x => x !== id) : [...current, id]
    )

  const goToEmployees = () => {
    setError(null)
    if (!structureId) return setError('Select a salary structure.')
    // Explicitly does not create anything — just advances the wizard.
    setStep('employees')
  }

  const create = async () => {
    setError(null)
    if (selected.length === 0) return setError('Select at least one employee.')

    try {
      const payrun = await createPayrun.mutateAsync({
        salaryStructureId: structureId,
        period,
        ...periodBounds(Number(month), Number(year)),
        employeeIds: selected
      })
      toast.success(`Payrun created for ${period}`, {
        description: `${selected.length} employee${selected.length === 1 ? '' : 's'} included.`
      })
      navigate(`/payroll/payruns/${payrun.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the payrun.')
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => navigate('/payroll/payruns')}
          aria-label='Back to payruns'
        >
          <IconArrowLeft />
        </Button>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Create Payrun</h1>
          <p className='text-muted-foreground text-sm'>
            Define the scope, then choose exactly who is included.
          </p>
        </div>
      </div>

      <Card>
        <CardContent>
          <Stepper steps={STEPS} value={step} className='flex w-full items-center'>
            <StepperNav>
              {STEPS.map((s, index) => (
                <StepperItem key={s.id} stepId={s.id} className='relative flex-1'>
                  <StepperTrigger className='flex flex-col gap-2.5' disabled>
                    <StepperIndicator>{index + 1}</StepperIndicator>
                    <StepperTitle>{s.title}</StepperTitle>
                  </StepperTrigger>
                  {STEPS.length > index + 1 && (
                    <StepperSeparator className='absolute inset-x-0 top-2 right-[calc(-50%+18px)] left-[calc(50%+18px)]' />
                  )}
                </StepperItem>
              ))}
            </StepperNav>
          </Stepper>
        </CardContent>
      </Card>

      {error && (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
          {error}
        </div>
      )}

      {step === 'scope' ? (
        <Card>
          <CardContent className='space-y-5'>
            <div className='space-y-1.5'>
              <Label>Salary Structure</Label>
              <Select value={structureId} onValueChange={setStructureId}>
                <SelectTrigger className='w-full max-w-md'>
                  <SelectValue placeholder='Select salary structure' />
                </SelectTrigger>
                <SelectContent>
                  {structures.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label>Period</Label>
              <div className='flex max-w-md gap-3'>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className='flex-1'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((m, i) => (
                      <SelectItem key={m} value={String(i)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className='w-32'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className='text-muted-foreground text-xs'>Payrun period: {period}</p>
            </div>

            <div className='flex justify-end'>
              <Button onClick={goToEmployees}>
                Continue
                <IconArrowRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className='space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <InputGroup className='w-72'>
                <InputGroupAddon align='inline-start'>
                  <IconSearch className='size-4' />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder='Search...'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label='Search employees'
                />
              </InputGroup>

              <Badge className='border-none bg-primary/10 text-primary'>
                Selected: {selected.length}
              </Badge>
            </div>

            <div className='divide-y rounded-md border'>
              {filtered.length === 0 ? (
                <p className='text-muted-foreground p-6 text-center text-sm'>No employees match.</p>
              ) : (
                filtered.map(employee => (
                  <label
                    key={employee.id}
                    className='hover:bg-muted/40 flex cursor-pointer items-center gap-3 px-4 py-3'
                  >
                    <Checkbox
                      checked={selected.includes(employee.id)}
                      onCheckedChange={() => toggle(employee.id)}
                      aria-label={`Include ${employee.name}`}
                    />
                    <span className='flex-1'>
                      <span className='block text-sm font-medium'>{employee.name}</span>
                      <span className='text-muted-foreground block text-xs'>
                        {employee.employeeCode} · {employee.department} · {employee.jobPosition}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>

            <div className='flex justify-between'>
              <Button variant='outline' onClick={() => setStep('scope')}>
                <IconArrowLeft />
                Back
              </Button>
              <Button onClick={create} disabled={createPayrun.isPending}>
                {createPayrun.isPending ? 'Creating…' : 'Create Payrun'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PayrunWizard
