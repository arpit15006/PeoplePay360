import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { cn } from '@/lib/utils'
import {
  departmentDeductions,
  money,
  moneyCompact,
  type DepartmentSalaryCost
} from '@/types/dashboard'

/**
 * PRD Screen 17 — Salary Cost by Department.
 *
 * Adapted from the shadcn-studio chart-user-activity block. The block's stacked
 * bar suits this well: net + deductions stack to exactly the gross, so one bar
 * carries the whole story rather than double-counting net against gross.
 */

const costConfig = {
  totalNet: { label: 'Net Paid', color: 'var(--chart-2)' },
  deductions: { label: 'Deductions', color: 'var(--chart-1)' }
} satisfies ChartConfig

const headcountConfig = {
  employeeCount: { label: 'Employees', color: 'var(--chart-3)' },
  payslipsCount: { label: 'Payslips', color: 'var(--chart-4)' }
} satisfies ChartConfig

/** Round a max up to a clean axis bound. The block hardcoded [0, 1600]. */
const axisMax = (max: number) => {
  if (max <= 0) return 100
  const step = Math.pow(10, Math.floor(Math.log10(max)) - 1) * 5
  return Math.ceil(max / step) * step
}

const ticksFor = (max: number) => [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f))

export function SalaryCostChart({
  rows,
  className
}: {
  rows: DepartmentSalaryCost[]
  className?: string
}) {
  // Departments with nobody in them add empty bars and squeeze the rest.
  const data = rows
    .filter(r => r.employeeCount > 0 || r.totalGross > 0)
    .map(r => ({
      department: r.departmentName,
      totalNet: r.totalNet,
      deductions: departmentDeductions(r),
      employeeCount: r.employeeCount,
      payslipsCount: r.payslipsCount
    }))

  const costMax = axisMax(Math.max(0, ...data.map(d => d.totalNet + d.deductions)))
  const headMax = axisMax(Math.max(0, ...data.map(d => d.employeeCount + d.payslipsCount)))

  const totalNet = data.reduce((s, d) => s + d.totalNet, 0)
  const totalDeductions = data.reduce((s, d) => s + d.deductions, 0)

  // Departments exist year-round, so a period with no payroll still yields rows —
  // they just plot as zero-height bars against an empty grid, which reads as a
  // broken chart rather than an empty one. Judge emptiness by the cost itself.
  const hasCost = totalNet + totalDeductions > 0

  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader className='flex justify-between border-b'>
        <div className='flex flex-col gap-1'>
          <span className='text-lg font-semibold'>Salary Cost by Department</span>
          <span className='text-muted-foreground text-sm'>
            Net pay and deductions per department for the selected period
          </span>
        </div>
      </CardHeader>

      <CardContent className='flex flex-col gap-4'>
        {data.length === 0 ? (
          <p className='text-muted-foreground py-12 text-center text-sm'>
            No payslips for this period yet. Compute a payrun to populate this chart.
          </p>
        ) : (
          <Tabs defaultValue='cost' className='gap-6'>
            <div className='flex justify-between gap-4 max-sm:flex-col sm:items-center'>
              <TabsList className='bg-muted max-sm:w-full'>
                <TabsTrigger value='cost' className='px-5'>
                  Cost
                </TabsTrigger>
                <TabsTrigger value='headcount' className='px-5'>
                  Headcount
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value='cost' className='flex flex-col gap-6'>
              {!hasCost ? (
                <p className='text-muted-foreground py-16 text-center text-sm'>
                  No payroll for this period. Compute a payrun to populate this chart.
                </p>
              ) : (
                <>
              <div className='flex items-center gap-8'>
                <div className='flex flex-col'>
                  <div className='flex items-center gap-2'>
                    <span className='bg-chart-2 size-3 rounded-xs' />
                    <span className='text-xl font-medium tabular-nums'>{money(totalNet)}</span>
                  </div>
                  <span className='text-muted-foreground text-sm'>Net paid</span>
                </div>
                <div className='flex flex-col'>
                  <div className='flex items-center gap-2'>
                    <span className='bg-chart-1 size-3 rounded-xs' />
                    <span className='text-xl font-medium tabular-nums'>{money(totalDeductions)}</span>
                  </div>
                  <span className='text-muted-foreground text-sm'>Deductions</span>
                </div>
              </div>

              <ChartContainer config={costConfig} className='max-h-75 min-h-40 w-full'>
                <BarChart accessibilityLayer data={data} margin={{ left: 4 }}>
                  <CartesianGrid vertical={false} strokeDasharray='4' stroke='var(--border)' />
                  <XAxis
                    dataKey='department'
                    tickLine={false}
                    tickMargin={10}
                    tick={{ fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, costMax]}
                    ticks={ticksFor(costMax)}
                    tickFormatter={moneyCompact}
                    tickLine={false}
                    tickMargin={8}
                    width={58}
                    tick={{ fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent formatter={(value, name) => (
                      <div className='flex w-full justify-between gap-4'>
                        <span className='text-muted-foreground'>
                          {costConfig[name as keyof typeof costConfig]?.label ?? name}
                        </span>
                        <span className='font-medium tabular-nums'>{money(Number(value))}</span>
                      </div>
                    )} />}
                  />
                  <Bar dataKey='totalNet' stackId='a' fill='var(--color-totalNet)' />
                  <Bar dataKey='deductions' stackId='a' fill='var(--color-deductions)' />
                </BarChart>
              </ChartContainer>
                </>
              )}
            </TabsContent>

            <TabsContent value='headcount' className='flex flex-col gap-6'>
              <div className='flex items-center gap-8'>
                <div className='flex flex-col'>
                  <div className='flex items-center gap-2'>
                    <span className='bg-chart-3 size-3 rounded-xs' />
                    <span className='text-xl font-medium tabular-nums'>
                      {data.reduce((s, d) => s + d.employeeCount, 0)}
                    </span>
                  </div>
                  <span className='text-muted-foreground text-sm'>Employees</span>
                </div>
                <div className='flex flex-col'>
                  <div className='flex items-center gap-2'>
                    <span className='bg-chart-4 size-3 rounded-xs' />
                    <span className='text-xl font-medium tabular-nums'>
                      {data.reduce((s, d) => s + d.payslipsCount, 0)}
                    </span>
                  </div>
                  <span className='text-muted-foreground text-sm'>Payslips</span>
                </div>
              </div>

              <ChartContainer config={headcountConfig} className='max-h-75 min-h-40 w-full'>
                <BarChart accessibilityLayer data={data} margin={{ left: -15 }}>
                  <CartesianGrid vertical={false} strokeDasharray='4' stroke='var(--border)' />
                  <XAxis
                    dataKey='department'
                    tickLine={false}
                    tickMargin={10}
                    tick={{ fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, headMax]}
                    ticks={ticksFor(headMax)}
                    allowDecimals={false}
                    tickLine={false}
                    tickMargin={8}
                    tick={{ fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey='employeeCount' stackId='a' fill='var(--color-employeeCount)' />
                  <Bar dataKey='payslipsCount' stackId='a' fill='var(--color-payslipsCount)' />
                </BarChart>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

export default SalaryCostChart
