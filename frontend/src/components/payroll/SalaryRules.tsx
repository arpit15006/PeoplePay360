import { useMemo, useState } from 'react'

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
import { IconPlus, IconPencil } from '@tabler/icons-react'

import { useSalaryRules, useSalaryStructures, useSaveRule } from '@/hooks/useSalary'
import { useAuth } from '@/context/AuthContext'
import {
  CATEGORY_CLASSES,
  RULE_CALC_LABELS,
  RULE_CATEGORY_LABELS,
  type RuleCalcType,
  type RuleCategory,
  type SalaryRule
} from '@/types/payroll'
import type { Role } from '@/types/user'

/** PRD: Payroll User is read-only here; Payroll Manager and Admin get full CRUD. */
const CAN_EDIT: Role[] = ['HR_PAYROLL_MANAGER', 'ADMIN']

const emptyRule = {
  name: '',
  code: '',
  category: 'ALLOWANCE' as RuleCategory,
  sequence: 10,
  calculationType: 'FIXED' as RuleCalcType,
  value: '',
  condition: 'True',
  status: 'Active'
}

/** PRD Screen 11 — Salary Rules. */
export function SalaryRules() {
  const { user } = useAuth()
  const { data: rules = [], isLoading, isError, error } = useSalaryRules()
  const { data: structures = [] } = useSalaryStructures()
  const saveRule = useSaveRule()

  const [editing, setEditing] = useState<SalaryRule | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Partial<SalaryRule>>(emptyRule)
  const [formError, setFormError] = useState<string | null>(null)

  const canEdit = !!user && CAN_EDIT.includes(user.role)
  const open = creating || !!editing

  // Sequence order is the execution order the payroll engine uses.
  const ordered = useMemo(() => [...rules].sort((a, b) => a.sequence - b.sequence), [rules])

  const startCreate = () => {
    setForm({ ...emptyRule, structureId: structures[0]?.id })
    setEditing(null)
    setCreating(true)
    setFormError(null)
  }

  const startEdit = (rule: SalaryRule) => {
    setForm(rule)
    setCreating(false)
    setEditing(rule)
    setFormError(null)
  }

  const close = () => {
    setCreating(false)
    setEditing(null)
    setFormError(null)
  }

  const submit = async () => {
    setFormError(null)
    if (!form.name?.trim()) return setFormError('Enter a rule name.')
    if (!form.code?.trim()) return setFormError('Enter a code, e.g. HRA.')
    if (!form.structureId) return setFormError('Select a salary structure.')
    if (!form.value?.toString().trim()) return setFormError('Enter a value or formula.')
    if (form.sequence === undefined || Number.isNaN(Number(form.sequence))) {
      return setFormError('Enter a sequence number.')
    }

    await saveRule.mutateAsync({
      id: editing?.id,
      body: {
        ...form,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        sequence: Number(form.sequence)
      }
    })
    close()
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Salary Rules</h1>
          <p className='text-muted-foreground text-sm'>
            Rules execute in ascending sequence, so a rule may reference any code computed before
            it.
          </p>
        </div>

        {canEdit && (
          <Button onClick={startCreate}>
            <IconPlus />
            New Rule
          </Button>
        )}
      </div>

      {saveRule.isError && (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
          {saveRule.error instanceof Error ? saveRule.error.message : 'Could not save the rule.'}
        </div>
      )}

      {!canEdit && (
        <div className='text-muted-foreground rounded-lg border p-3 text-sm'>
          Your role has read-only access to salary rules.
        </div>
      )}

      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      ) : isError ? (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
          Could not load salary rules{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      ) : (
        <Card className='p-0'>
          <CardContent className='overflow-x-auto p-0'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead className='w-24 text-right'>Sequence</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Calculation Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className='w-10' />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordered.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell className='text-right font-semibold tabular-nums'>
                      {rule.sequence}
                    </TableCell>
                    <TableCell className='font-medium'>{rule.name}</TableCell>
                    <TableCell>
                      <code className='bg-muted rounded px-1.5 py-0.5 text-xs'>{rule.code}</code>
                    </TableCell>
                    <TableCell>
                      <Badge className={CATEGORY_CLASSES[rule.category]}>
                        {RULE_CATEGORY_LABELS[rule.category]}
                      </Badge>
                    </TableCell>
                    <TableCell>{RULE_CALC_LABELS[rule.calculationType]}</TableCell>
                    <TableCell>
                      <code className='text-xs'>{rule.value}</code>
                    </TableCell>
                    <TableCell className='text-muted-foreground text-xs'>
                      {rule.condition ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className='border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400'>
                        {rule.status}
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          aria-label={`Edit ${rule.name}`}
                          onClick={() => startEdit(rule)}
                        >
                          <IconPencil />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={o => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit salary rule' : 'New salary rule'}</DialogTitle>
            <DialogDescription>
              Value accepts a number, a percentage expression such as 0.40 * BASIC, or a formula
              such as GROSS - DEDUCTIONS.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm'>
              {formError}
            </div>
          )}

          <div className='grid grid-cols-2 gap-4'>
            <div className='col-span-2 space-y-1.5'>
              <Label htmlFor='ruleName'>Rule Name</Label>
              <Input
                id='ruleName'
                value={form.name ?? ''}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder='House Rent Allowance (HRA)'
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='ruleCode'>Code</Label>
              <Input
                id='ruleCode'
                value={form.code ?? ''}
                onChange={e => setForm({ ...form, code: e.target.value })}
                placeholder='HRA'
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='ruleSeq'>Sequence</Label>
              <Input
                id='ruleSeq'
                type='number'
                value={form.sequence ?? 10}
                onChange={e => setForm({ ...form, sequence: Number(e.target.value) })}
              />
            </div>

            <div className='space-y-1.5'>
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={v => setForm({ ...form, category: v as RuleCategory })}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RULE_CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label>Calculation Type</Label>
              <Select
                value={form.calculationType}
                onValueChange={v => setForm({ ...form, calculationType: v as RuleCalcType })}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RULE_CALC_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='col-span-2 space-y-1.5'>
              <Label>Salary Structure</Label>
              <Select
                value={form.structureId}
                onValueChange={v => setForm({ ...form, structureId: v })}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select structure' />
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

            <div className='col-span-2 space-y-1.5'>
              <Label htmlFor='ruleValue'>Value</Label>
              <Input
                id='ruleValue'
                value={form.value ?? ''}
                onChange={e => setForm({ ...form, value: e.target.value })}
                placeholder='0.40 * BASIC'
              />
            </div>

            <div className='col-span-2 space-y-1.5'>
              <Label htmlFor='ruleCondition'>Condition</Label>
              <Input
                id='ruleCondition'
                value={form.condition ?? ''}
                onChange={e => setForm({ ...form, condition: e.target.value })}
                placeholder='True, or contract.wage >= 70000'
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={close}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saveRule.isPending}>
              {saveRule.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SalaryRules
