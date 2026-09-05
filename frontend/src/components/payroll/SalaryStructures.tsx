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
import { IconArrowRight } from '@tabler/icons-react'

import { useSalaryStructures } from '@/hooks/useSalary'
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
export function SalaryStructures() {
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

        <Button variant='outline' onClick={() => navigate('/payroll/rules')}>
          Manage Salary Rules
          <IconArrowRight />
        </Button>
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
