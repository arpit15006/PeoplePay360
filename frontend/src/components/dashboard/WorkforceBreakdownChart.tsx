import { useState } from 'react'

import { Cell, Label as ChartLabel, Pie, PieChart } from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

import type { AttendanceHealth, TimeOffOverviewRow } from '@/types/dashboard'

/**
 * PRD Screen 17 — Attendance Health and Time Off Overview.
 *
 * Adapted from the shadcn-studio chart-budget-breakdown block. Both PRD sections
 * are parts-of-a-whole over the same workforce, so the block's two-tab donut
 * carries them in one card instead of two near-identical ones.
 */

const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

const chartConfig = { value: { label: 'Count' } } satisfies ChartConfig

interface Segment {
  name: string
  value: number
  /** Rendered in the row instead of the raw count when the unit is not "records". */
  display?: string
}

export function WorkforceBreakdownChart({
  attendance,
  timeOff,
  className
}: {
  attendance: AttendanceHealth
  timeOff: TimeOffOverviewRow[]
  className?: string
}) {
  const tabs = [
    {
      id: 'attendance',
      label: 'Attendance',
      colLabel: 'Status',
      totalLabel: 'attendance logs',
      // Zero-count statuses would render as invisible slices with a legend row.
      segments: (
        [
          { name: 'Present', value: attendance.present },
          { name: 'Late', value: attendance.late },
          { name: 'Half Day', value: attendance.halfDay },
          { name: 'Absent', value: attendance.absent }
        ] as Segment[]
      ).filter(s => s.value > 0)
    },
    {
      id: 'timeoff',
      label: 'Time Off',
      colLabel: 'Leave Type',
      totalLabel: 'approved requests',
      segments: timeOff
        .filter(t => t.approvedRequestsCount > 0)
        .map<Segment>(t => ({
          name: t.typeName,
          value: t.approvedRequestsCount,
          display: `${t.totalDuration} ${t.unit.toLowerCase()}`
        }))
    }
  ]

  const [activeTabId, setActiveTabId] = useState(tabs[0].id)
  const active = tabs.find(t => t.id === activeTabId) ?? tabs[0]
  const total = active.segments.reduce((s, d) => s + d.value, 0)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className='font-semibold'>Workforce Health</CardTitle>
        <CardDescription>Attendance mix and approved leave for the selected period.</CardDescription>
      </CardHeader>

      <CardContent className='space-y-6'>
        {/* Radio group styled as tabs — from the block */}
        <RadioGroup
          value={activeTabId}
          onValueChange={setActiveTabId}
          className='bg-muted text-muted-foreground inline-flex h-9 w-full items-center justify-center rounded-lg p-1'
        >
          {tabs.map(tab => (
            <div key={tab.id} className='relative h-full grow'>
              <RadioGroupItem value={tab.id} id={`wb-${tab.id}`} className='peer sr-only absolute' />
              <Label
                htmlFor={`wb-${tab.id}`}
                className='ring-offset-background peer-focus-visible:ring-ring peer-data-checked:bg-background peer-data-checked:text-foreground inline-flex h-full w-full cursor-pointer items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:outline-none peer-disabled:pointer-events-none peer-disabled:opacity-50 peer-data-checked:shadow'
              >
                {tab.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {total === 0 ? (
          <p className='text-muted-foreground py-16 text-center text-sm'>
            No {active.label.toLowerCase()} records for this period.
          </p>
        ) : (
          <>
            <ChartContainer config={chartConfig} className='mx-auto h-56 w-full max-w-xs'>
              <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={active.segments}
                  dataKey='value'
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
                              {total.toLocaleString('en-IN')}
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className='fill-muted-foreground text-xs'>
                              {active.totalLabel}
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
                <span className='text-muted-foreground text-sm font-semibold uppercase'>Count / Share</span>
              </div>

              <div className='divide-y'>
                {active.segments.map((item, i) => {
                  const share = ((item.value / total) * 100).toFixed(1)

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
                        {item.display ?? item.value}
                        <Badge variant='secondary' className='text-muted-foreground rounded-md font-semibold'>
                          {share}%
                        </Badge>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default WorkforceBreakdownChart
