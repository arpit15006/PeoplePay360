import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
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

/** Matches the badge styling on the Salary Structures screen. */
const STATUS_CLASSES: Record<string, string> = {
  Active: 'border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400',
  Inactive: 'border-none bg-slate-600/10 text-slate-600 dark:bg-slate-400/10 dark:text-slate-400'
}

type RuleDraft = Pick<
  SalaryRule,
  'name' | 'code' | 'category' | 'sequence' | 'calculationType' | 'value' | 'condition'
>

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

/**
 * Starting points for a new rule. These mirror the standard Indian payroll
 * components the seeded "Regular Salary" structure uses, so a new structure can
 * be filled in without retyping the expressions. Picking one only prefills the
 * form — every field stays editable.
 */
const RULE_TEMPLATES: { key: string; label: string; hint: string; draft: RuleDraft }[] = [
  {
    key: 'BASIC',
    label: 'Basic Salary',
    hint: '60% of the contract wage',
    draft: {
      name: 'Basic Salary',
      code: 'BASIC',
      category: 'BASIC',
      sequence: 10,
      calculationType: 'PERCENTAGE',
      value: '0.60 * contract.wage',
      condition: 'True'
    }
  },
  {
    key: 'HRA',
    label: 'House Rent Allowance (HRA)',
    hint: '40% of Basic',
    draft: {
      name: 'House Rent Allowance (HRA)',
      code: 'HRA',
      category: 'ALLOWANCE',
      sequence: 20,
      calculationType: 'PERCENTAGE',
      value: '0.40 * BASIC',
      condition: 'True'
    }
  },
  {
    key: 'TRANS',
    label: 'Transport Allowance',
    hint: 'Flat monthly amount',
    draft: {
      name: 'Transport Allowance',
      code: 'TRANS',
      category: 'ALLOWANCE',
      sequence: 30,
      calculationType: 'FIXED',
      value: '5000',
      condition: 'True'
    }
  },
  {
    key: 'PERF',
    label: 'Performance Bonus',
    hint: 'Flat amount, only above a wage threshold',
    draft: {
      name: 'Performance Bonus',
      code: 'PERF',
      category: 'ALLOWANCE',
      sequence: 35,
      calculationType: 'FIXED',
      value: '8000',
      condition: 'contract.wage >= 70000'
    }
  },
  {
    key: 'GROSS',
    label: 'Gross Salary',
    hint: 'Total of Basic and allowances',
    draft: {
      name: 'Gross Salary',
      code: 'GROSS',
      category: 'GROSS',
      sequence: 38,
      calculationType: 'FORMULA',
      value: 'GROSS',
      condition: 'True'
    }
  },
  {
    key: 'PF',
    label: 'Provident Fund (PF)',
    hint: '12% of Basic',
    draft: {
      name: 'Provident Fund (PF)',
      code: 'PF',
      category: 'DEDUCTION',
      sequence: 40,
      calculationType: 'PERCENTAGE',
      value: '0.12 * BASIC',
      condition: 'True'
    }
  },
  {
    key: 'TAX',
    label: 'Professional Tax & TDS',
    hint: 'Flat monthly deduction',
    draft: {
      name: 'Professional Tax & TDS',
      code: 'TAX',
      category: 'DEDUCTION',
      sequence: 50,
      calculationType: 'FIXED',
      value: '2300',
      condition: 'True'
    }
  },
  {
    key: 'NET',
    label: 'Net Salary',
    hint: 'Gross less every deduction',
    draft: {
      name: 'Net Salary',
      code: 'NET',
      category: 'NET',
      sequence: 60,
      calculationType: 'FORMULA',
      value: 'GROSS - DEDUCTIONS',
      condition: 'True'
    }
  }
]

const BLANK_TEMPLATE = 'blank'

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
  const [template, setTemplate] = useState(BLANK_TEMPLATE)
  // null until the user expands or collapses something; the first structure
  // opens by default so the screen lands on one structure's sequence.
  const [openIds, setOpenIds] = useState<string[] | null>(null)

  const canEdit = !!user && CAN_EDIT.includes(user.role)
  const open = creating || !!editing

  // Rules belong to a structure, so the screen is grouped the way Salary
  // Structures groups them. Sequence order within a group is the execution
  // order the payroll engine uses.
  const groups = useMemo(
    () =>
      structures.map(structure => ({
        structure,
        rules: rules
          .filter(r => r.structureId === structure.id)
          .sort((a, b) => a.sequence - b.sequence)
      })),
    [structures, rules]
  )

  const expanded = openIds ?? (structures[0] ? [structures[0].id] : [])

  /** Next free slot in the structure's sequence, keeping the 10-step spacing. */
  const nextSequence = (structureId?: string) => {
    const used = rules.filter(r => r.structureId === structureId).map(r => r.sequence)
    return used.length ? Math.ceil((Math.max(...used) + 1) / 10) * 10 : 10
  }

  const startCreate = (preferredStructureId?: string) => {
    const structureId = preferredStructureId ?? expanded[0] ?? structures[0]?.id
    setForm({ ...emptyRule, structureId, sequence: nextSequence(structureId) })
    setTemplate(BLANK_TEMPLATE)
    setEditing(null)
    setCreating(true)
    setFormError(null)
  }

  const startEdit = (rule: SalaryRule) => {
    setForm(rule)
    setTemplate(BLANK_TEMPLATE)
    setCreating(false)
    setEditing(rule)
    setFormError(null)
  }

  const applyTemplate = (key: string) => {
    setTemplate(key)
    setFormError(null)
    const preset = RULE_TEMPLATES.find(t => t.key === key)
    if (!preset) {
      setForm(f => ({ ...emptyRule, structureId: f.structureId, sequence: nextSequence(f.structureId) }))
      return
    }
    setForm(f => ({ ...f, ...preset.draft }))
  }

  const close = () => {
    setCreating(false)
    setEditing(null)
    setFormError(null)
  }

  // The schema is unique on [structureId, code], so catch a clash before the save.
  const duplicateCode = useMemo(() => {
    const code = form.code?.trim().toUpperCase()
    if (!code || !form.structureId) return false
    return rules.some(
      r =>
        r.id !== editing?.id && r.structureId === form.structureId && r.code.toUpperCase() === code
    )
  }, [rules, form.code, form.structureId, editing])

  const submit = async () => {
    setFormError(null)
    if (!form.name?.trim()) return setFormError('Enter a rule name.')
    if (!form.code?.trim()) return setFormError('Enter a code, e.g. HRA.')
    if (!form.structureId) return setFormError('Select a salary structure.')
    if (duplicateCode) return setFormError('That code is already used in this salary structure.')
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
            Rules belong to a salary structure. Expand one to see its rules in execution order —
            each rule may reference any code computed before it.
          </p>
        </div>

        {canEdit && (
          <Button onClick={() => startCreate()}>
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
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className='h-16 w-full' />
          ))}
        </div>
      ) : isError ? (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
          Could not load salary rules{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className='text-muted-foreground p-10 text-center text-sm'>
            No salary structures yet. Create one before adding rules.
          </CardContent>
        </Card>
      ) : (
        <Accordion
          type='multiple'
          value={expanded}
          onValueChange={setOpenIds}
          className='w-full space-y-2 overflow-visible border-0 [&>*>[data-slot="accordion-content"]]:px-0'
        >
          {groups.map(({ structure, rules: structureRules }) => (
            <AccordionItem
              key={structure.id}
              value={structure.id}
              className='rounded-lg border bg-transparent'
            >
              <AccordionTrigger className='items-center px-5'>
                <div className='flex flex-1 flex-wrap items-center justify-between gap-4'>
                  <span className='font-medium'>{structure.name}</span>
                  <span className='text-muted-foreground flex items-center gap-4 text-sm font-normal'>
                    <span>{structureRules.length} rules</span>
                    <span>{structure._count?.contracts ?? 0} employees</span>
                    <Badge className={STATUS_CLASSES[structure.status] ?? STATUS_CLASSES.Inactive}>
                      {structure.status}
                    </Badge>
                    {canEdit && (
                      // Inside the trigger, so the click must not also toggle
                      // the accordion open.
                      <span
                        role='button'
                        tabIndex={0}
                        aria-label={`New rule in ${structure.name}`}
                        className='hover:bg-muted rounded-md p-1.5'
                        onClick={e => {
                          e.stopPropagation()
                          startCreate(structure.id)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            startCreate(structure.id)
                          }
                        }}
                      >
                        <IconPlus className='size-4' />
                      </span>
                    )}
                  </span>
                </div>
              </AccordionTrigger>

              <AccordionContent className='px-5 pb-5'>
                <div className='overflow-x-auto rounded-md border'>
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
                      {structureRules.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={canEdit ? 9 : 8} className='h-20 text-center'>
                            This structure has no rules yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        structureRules.map(rule => (
                          <TableRow key={rule.id}>
                            <TableCell className='text-right font-semibold tabular-nums'>
                              {rule.sequence}
                            </TableCell>
                            <TableCell className='font-medium'>{rule.name}</TableCell>
                            <TableCell>
                              <code className='bg-muted rounded px-1.5 py-0.5 text-xs'>
                                {rule.code}
                              </code>
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
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
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
            {!editing && (
              <div className='col-span-2 space-y-1.5'>
                <Label>Start from</Label>
                <Select value={template} onValueChange={applyTemplate}>
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BLANK_TEMPLATE}>Blank rule</SelectItem>
                    {RULE_TEMPLATES.map(t => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.label} — {t.hint}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className='text-muted-foreground text-xs'>
                  Templates prefill the fields below; edit anything before saving.
                </p>
              </div>
            )}

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
              {duplicateCode && (
                <p className='text-destructive text-xs'>
                  Already used in this salary structure.
                </p>
              )}
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
              {saveRule.isPending ? 'Saving…' : editing ? 'Save' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SalaryRules
