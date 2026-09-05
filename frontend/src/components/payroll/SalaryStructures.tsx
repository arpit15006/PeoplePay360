import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { IconArrowRight, IconPlus, IconPencil } from '@tabler/icons-react'

import { useSalaryStructures, useSaveStructureById } from '@/hooks/useSalary'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { toast } from 'sonner'
import type { Role } from '@/types/user'
import {
  CATEGORY_CLASSES,
  RULE_CALC_LABELS,
  RULE_CATEGORY_LABELS,
  type SalaryStructure
} from '@/types/payroll'

/**
 * PRD Screen 10 — Salary Structures.
 *
 * A structure is a container for salary rules. Expanding one shows its rules in
 * execution order, which is the order the payroll engine evaluates them in:
 * later rules reference earlier codes, e.g. HRA is 0.40 * BASIC.
 */
/** Full CRUD on structures belongs to the Payroll Manager and Admin. */
const CAN_MANAGE: Role[] = ['HR_PAYROLL_MANAGER', 'ADMIN']

export function SalaryStructures() {
  const { user } = useAuth()
  const canManage = !!user && CAN_MANAGE.includes(user.role)
  const saveStructure = useSaveStructureById()
  const [editing, setEditing] = useState<SalaryStructure | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState({ name: '', status: 'Active' })

  const openCreate = () => {
    setEditing(null)
    setDraft({ name: '', status: 'Active' })
    setDialogOpen(true)
  }

  const openEdit = (structure: SalaryStructure) => {
    setEditing(structure)
    setDraft({ name: structure.name, status: structure.status })
    setDialogOpen(true)
  }

  const submit = async () => {
    try {
      await saveStructure.mutateAsync({ id: editing?.id, body: draft })
      toast.success(editing ? `${draft.name} updated` : `${draft.name} created`)
      setDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the structure')
    }
  }

  const navigate = useNavigate()
  const { data: structures = [], isLoading, isError, error } = useSalaryStructures()
  const [openIds, setOpenIds] = useState<string[]>([])

  if (isLoading) {
    return (
      <div className='space-y-2'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className='h-16 w-full' />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
        Could not load salary structures{error instanceof Error ? `: ${error.message}` : '.'}
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Salary Structures</h1>
          <p className='text-muted-foreground text-sm'>
            Each structure holds the rules a payrun applies. Expand one to see the execution
            sequence.
          </p>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' onClick={() => navigate('/payroll/rules')}>
            Manage Salary Rules
            <IconArrowRight />
          </Button>
          {canManage && (
            <Button onClick={openCreate}>
              <IconPlus />
              New Structure
            </Button>
          )}
        </div>
      </div>

      <Accordion
        type='multiple'
        value={openIds}
        onValueChange={setOpenIds}
        className='w-full space-y-2 overflow-visible border-0 [&>*>[data-slot="accordion-content"]]:px-0'
      >
        {structures.map((structure: SalaryStructure) => {
          const rules = [...(structure.rules ?? [])].sort((a, b) => a.sequence - b.sequence)

          return (
            <AccordionItem
              key={structure.id}
              value={structure.id}
              className='rounded-lg border bg-transparent'
            >
              <AccordionTrigger className='px-5'>
                <div className='flex flex-1 flex-wrap items-center justify-between gap-4 pr-4'>
                  <span className='font-medium'>{structure.name}</span>
                  <span className='text-muted-foreground flex items-center gap-4 text-sm font-normal'>
                    <span>{rules.length} rules</span>
                    <span>{structure._count?.contracts ?? 0} employees</span>
                    <Badge className='border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400'>
                      {structure.status}
                    </Badge>
                    {canManage && (
                      // Inside the trigger, so the click must not also toggle
                      // the accordion open.
                      <span
                        role='button'
                        tabIndex={0}
                        aria-label={`Edit ${structure.name}`}
                        className='hover:bg-muted rounded-md p-1.5'
                        onClick={e => {
                          e.stopPropagation()
                          openEdit(structure)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            openEdit(structure)
                          }
                        }}
                      >
                        <IconPencil className='size-4' />
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
                        <TableHead>Rule</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Calculation</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className='h-20 text-center'>
                            This structure has no rules yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        rules.map(rule => (
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
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Create / edit a structure — Payroll Manager and Admin only */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Structure' : 'New Salary Structure'}</DialogTitle>
            <DialogDescription>
              A structure is the container a payrun points at; its rules decide what each
              payslip computes.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='structure-name'>Name</Label>
              <Input
                id='structure-name'
                placeholder='e.g. Executive Salary'
                value={draft.name}
                onChange={e => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='structure-status'>Status</Label>
              <Select value={draft.status} onValueChange={v => setDraft({ ...draft, status: v })}>
                <SelectTrigger id='structure-status' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='Active'>Active</SelectItem>
                  <SelectItem value='Inactive'>Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saveStructure.isPending || !draft.name.trim()}>
              {saveStructure.isPending ? 'Saving…' : editing ? 'Save' : 'Create Structure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className='text-muted-foreground text-sm'>
          Rules run in ascending sequence and can reference codes computed before them, so
          <code className='bg-muted mx-1 rounded px-1.5 py-0.5 text-xs'>0.40 * BASIC</code>
          resolves only because BASIC has a lower sequence.
        </CardContent>
      </Card>
    </div>
  )
}

export default SalaryStructures
