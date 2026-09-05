'use client'

import { useState } from 'react'

import { Cell, Label as ChartLabel, Pie, PieChart } from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

// --- Single source of truth ---
// Add/remove tabs and segments here — everything else is driven by this array
const CHART_DATA = [
  {
    tab: { id: 'team', label: 'By Team' },
    colLabel: 'Team',
    segments: [
      { name: 'Engineering', spend: 950 },
      { name: 'Marketing', spend: 680 },
      { name: 'Sales', spend: 520 },
      { name: 'Operations', spend: 310 },
      { name: 'HR & Admin', spend: 195 }
    ]
  },
  {
    tab: { id: 'category', label: 'By Category' },
    colLabel: 'Category',
    segments: [
      { name: 'Salaries', spend: 1580 },
      { name: 'Infrastructure', spend: 520 },
      { name: 'Marketing Ops', spend: 310 },
      { name: 'Software', spend: 245 },
      { name: 'Misc', spend: 292 }
    ]
  }
]

const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

const chartConfig = {
  spend: { label: 'Spend' }
} satisfies ChartConfig

// --- Component ---
const BudgetBreakdownChart = ({ className }: { className?: string }) => {
  const [activeTabId, setActiveTabId] = useState(CHART_DATA[0].tab.id)

  // Derive everything from the active tab entry
  const active = CHART_DATA.find(d => d.tab.id === activeTabId) ?? CHART_DATA[0]
  const totalSpend = active.segments.reduce((s, d) => s + d.spend, 0)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className='font-semibold'>Budget Breakdown</CardTitle>
        <CardDescription>Spend distribution across teams and cost categories.</CardDescription>
      </CardHeader>

      <CardContent className='space-y-6'>
        {/* Radio group styled as tabs */}
        <RadioGroup
          value={activeTabId}
          onValueChange={setActiveTabId}
          className='bg-muted text-muted-foreground inline-flex h-9 w-full items-center justify-center rounded-lg p-1'
        >
          {CHART_DATA.map(({ tab }) => (
            <div key={tab.id} className='relative h-full grow'>
              <RadioGroupItem value={tab.id} id={tab.id} className='peer sr-only absolute' />
              <Label
                htmlFor={tab.id}
                className='ring-offset-background peer-focus-visible:ring-ring peer-data-checked:bg-background peer-data-checked:text-foreground inline-flex h-full w-full cursor-pointer items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:outline-none peer-disabled:pointer-events-none peer-disabled:opacity-50 peer-data-checked:shadow'
              >
                {tab.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {/* Donut chart */}
        <ChartContainer config={chartConfig} className='mx-auto h-56 w-full max-w-xs'>
          <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={active.segments}
              dataKey='spend'
              nameKey='name'
              innerRadius={60}
              outerRadius={88}
              paddingAngle={2}
              strokeWidth={0}
            >
              {active.segments.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
              <ChartLabel
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor='middle' dominantBaseline='middle'>
                        <tspan x={viewBox.cx} y={viewBox.cy} className='fill-foreground text-xl font-semibold'>
                          ${totalSpend.toLocaleString()}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className='fill-muted-foreground text-xs'>
                          total spend
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        <div>
          <div className='mb-2 flex items-center justify-between px-1'>
            <span className='text-muted-foreground text-sm font-semibold uppercase'>{active.colLabel}</span>
            <span className='text-muted-foreground text-sm font-semibold uppercase'>Amount / Share</span>
          </div>

          <div className='divide-y'>
            {active.segments.map((item, i) => {
              const share = ((item.spend / totalSpend) * 100).toFixed(1)

              return (
                <div key={i} className='flex items-center justify-between py-3'>
                  <div className='flex items-center gap-3'>
                    <div
                      className='h-4 w-1 rounded-full'
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className='text-sm font-medium'>{item.name}</span>
                  </div>
                  <span className='flex items-center gap-2 text-sm font-semibold tabular-nums'>
                    ${item.spend.toLocaleString()}{' '}
                    <Badge variant='secondary' className='text-muted-foreground rounded-md font-semibold'>
                      {share}%
                    </Badge>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default BudgetBreakdownChart
