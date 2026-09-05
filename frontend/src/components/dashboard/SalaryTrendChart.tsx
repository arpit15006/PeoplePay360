import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

import { money, moneyCompact, type SalaryTrendPoint } from '@/types/dashboard'

/**
 * PRD B9 — "Charts plot Salary Cost by Department and Monthly Net Salary
 * Trends using historical data."
 *
 * A trend needs the periods either side of the selected one, so this is the
 * one section the period filter deliberately does not narrow; department and
 * employee-type filters still apply.
 */

const trendConfig = {
  totalNet: { label: 'Net Paid', color: 'var(--chart-2)' },
  totalGross: { label: 'Gross', color: 'var(--chart-3)' }
} satisfies ChartConfig

/** Axis labels are tight, so "September 2026" becomes "Sep 26". */
const shortPeriod = (period: string) => {
  const [month, year] = period.split(' ')
  if (!month || !year) return period
  return `${month.slice(0, 3)} ${year.slice(2)}`
}

const axisMax = (max: number) => {
  if (max <= 0) return 100
  const step = Math.pow(10, Math.floor(Math.log10(max)) - 1) * 5
  return Math.ceil(max / step) * step
}

export function SalaryTrendChart({
  points,
  className
}: {
  points: SalaryTrendPoint[]
  className?: string
}) {
  const data = points.map(p => ({ ...p, label: shortPeriod(p.period) }))
  const max = axisMax(Math.max(0, ...data.map(d => d.totalGross)))

  // Array.prototype.at needs es2022; the project targets earlier.
  const latest = data.length > 0 ? data[data.length - 1] : undefined
  const previous = data.length > 1 ? data[data.length - 2] : undefined
  // Only meaningful with something to compare against.
  const change =
    latest && previous && previous.totalNet > 0
      ? ((latest.totalNet - previous.totalNet) / previous.totalNet) * 100
      : null

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className='font-semibold'>Monthly Net Salary Trend</CardTitle>
        <CardDescription>
          Net and gross payroll across every period on record.
          {change !== null && (
            <>
              {' '}
              <span className={change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {change >= 0 ? '+' : ''}
                {change.toFixed(1)}%
              </span>{' '}
              vs previous period.
            </>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <p className='text-muted-foreground py-16 text-center text-sm'>
            No payroll history yet. Compute a payrun to start the trend.
          </p>
        ) : data.length === 1 ? (
          // A single point is not a trend; show the value rather than a dot.
          <div className='py-12 text-center'>
            <p className='text-2xl font-semibold tabular-nums'>{money(data[0].totalNet)}</p>
            <p className='text-muted-foreground mt-1 text-sm'>
              {data[0].period} · {data[0].payslipsCount} payslip
              {data[0].payslipsCount === 1 ? '' : 's'}
            </p>
            <p className='text-muted-foreground mt-3 text-xs'>
              A second period is needed before a trend can be drawn.
            </p>
          </div>
        ) : (
          <ChartContainer config={trendConfig} className='max-h-64 min-h-40 w-full'>
            <LineChart accessibilityLayer data={data} margin={{ left: 4, right: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray='4' stroke='var(--border)' />
              <XAxis
                dataKey='label'
                tickLine={false}
                tickMargin={10}
                tick={{ fill: 'var(--muted-foreground)' }}
                axisLine={false}
              />
              <YAxis
                domain={[0, max]}
                ticks={[0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f))}
                tickFormatter={moneyCompact}
                tickLine={false}
                tickMargin={8}
                width={58}
                tick={{ fill: 'var(--muted-foreground)' }}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className='flex w-full justify-between gap-4'>
                        <span className='text-muted-foreground'>
                          {trendConfig[name as keyof typeof trendConfig]?.label ?? name}
                        </span>
                        <span className='font-medium tabular-nums'>{money(Number(value))}</span>
                      </div>
                    )}
                  />
                }
              />
              <Line
                dataKey='totalGross'
                stroke='var(--color-totalGross)'
                strokeWidth={2}
                dot={false}
                strokeDasharray='4 4'
              />
              <Line
                dataKey='totalNet'
                stroke='var(--color-totalNet)'
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export default SalaryTrendChart
