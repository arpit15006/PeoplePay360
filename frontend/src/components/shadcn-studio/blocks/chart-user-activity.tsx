'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { cn } from '@/lib/utils'
import { IconDotsVertical } from '@tabler/icons-react'

const listItems = ['Share', 'Refresh']

const ratioData = [
  { day: 'Feb 01', activeUsers: 500, churned: 0 },
  { day: 'Feb 02', activeUsers: 650, churned: 0 },
  { day: 'Feb 03', activeUsers: 350, churned: 0 },
  { day: 'Feb 04', activeUsers: 550, churned: 50 },
  { day: 'Feb 05', activeUsers: 1000, churned: 0 },
  { day: 'Feb 06', activeUsers: 1500, churned: 0 },
  { day: 'Feb 07', activeUsers: 1560, churned: 30 },
  { day: 'Feb 08', activeUsers: 1269, churned: 35 },
  { day: 'Feb 09', activeUsers: 600, churned: 20 },
  { day: 'Feb 10', activeUsers: 700, churned: 25 },
  { day: 'Feb 11', activeUsers: 680, churned: 21 },
  { day: 'Feb 12', activeUsers: 820, churned: 33 },
  { day: 'Feb 13', activeUsers: 750, churned: 24 },
  { day: 'Feb 14', activeUsers: 1530, churned: 0 },
  { day: 'Feb 15', activeUsers: 690, churned: 0 },
  { day: 'Feb 16', activeUsers: 890, churned: 120 },
  { day: 'Feb 17', activeUsers: 1110, churned: 78 },
  { day: 'Feb 18', activeUsers: 990, churned: 85 },
  { day: 'Feb 19', activeUsers: 1000, churned: 73 },
  { day: 'Feb 20', activeUsers: 679, churned: 35 },
  { day: 'Feb 21', activeUsers: 1101, churned: 28 },
  { day: 'Feb 22', activeUsers: 1005, churned: 0 },
  { day: 'Feb 23', activeUsers: 1100, churned: 60 },
  { day: 'Feb 24', activeUsers: 1150, churned: 19 },
  { day: 'Feb 25', activeUsers: 1000, churned: 180 },
  { day: 'Feb 26', activeUsers: 890, churned: 89 },
  { day: 'Feb 27', activeUsers: 970, churned: 36 },
  { day: 'Feb 28', activeUsers: 810, churned: 42 }
]

const ratioConfig = {
  activeUsers: {
    label: 'Active Users',
    color: 'var(--chart-2)'
  },
  churned: {
    label: 'Churned',
    color: 'var(--chart-1)'
  }
} satisfies ChartConfig

const sourceData = [
  { day: 'Feb 01', organic: 450, referral: 0, paid: 0 },
  { day: 'Feb 02', organic: 751, referral: 0, paid: 0 },
  { day: 'Feb 03', organic: 250, referral: 0, paid: 0 },
  { day: 'Feb 04', organic: 369, referral: 50, paid: 16 },
  { day: 'Feb 05', organic: 969, referral: 0, paid: 0 },
  { day: 'Feb 06', organic: 1100, referral: 0, paid: 0 },
  { day: 'Feb 07', organic: 1560, referral: 30, paid: 0 },
  { day: 'Feb 08', organic: 1269, referral: 35, paid: 0 },
  { day: 'Feb 09', organic: 590, referral: 20, paid: 80 },
  { day: 'Feb 10', organic: 870, referral: 25, paid: 0 },
  { day: 'Feb 11', organic: 280, referral: 21, paid: 0 },
  { day: 'Feb 12', organic: 620, referral: 33, paid: 50 },
  { day: 'Feb 13', organic: 750, referral: 24, paid: 0 },
  { day: 'Feb 14', organic: 1530, referral: 0, paid: 0 },
  { day: 'Feb 15', organic: 610, referral: 0, paid: 0 },
  { day: 'Feb 16', organic: 790, referral: 120, paid: 75 },
  { day: 'Feb 17', organic: 1010, referral: 78, paid: 35 },
  { day: 'Feb 18', organic: 990, referral: 85, paid: 90 },
  { day: 'Feb 19', organic: 890, referral: 73, paid: 0 },
  { day: 'Feb 20', organic: 679, referral: 35, paid: 60 },
  { day: 'Feb 21', organic: 1001, referral: 28, paid: 59 },
  { day: 'Feb 22', organic: 1205, referral: 0, paid: 0 },
  { day: 'Feb 23', organic: 1000, referral: 60, paid: 0 },
  { day: 'Feb 24', organic: 1260, referral: 19, paid: 69 },
  { day: 'Feb 25', organic: 799, referral: 180, paid: 0 },
  { day: 'Feb 26', organic: 890, referral: 89, paid: 0 },
  { day: 'Feb 27', organic: 970, referral: 36, paid: 0 },
  { day: 'Feb 28', organic: 810, referral: 42, paid: 169 }
]

const sourceConfig = {
  organic: {
    label: 'Organic',
    color: 'var(--chart-2)'
  },
  referral: {
    label: 'Referral',
    color: 'var(--chart-5)'
  },
  paid: {
    label: 'Paid',
    color: 'var(--chart-3)'
  }
} satisfies ChartConfig

const UserActivityCard = ({ className }: { className?: string }) => {
  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader className='flex justify-between border-b'>
        <div className='flex flex-col gap-1'>
          <span className='text-lg font-semibold'>User Activity</span>
          <span className='text-muted-foreground text-sm'>Track your active users and churn over the month</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon' className='text-muted-foreground size-6 rounded-full'>
              <IconDotsVertical />
              <span className='sr-only'>Menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuGroup>
              {listItems.map((item, index) => (
                <DropdownMenuItem key={index}>{item}</DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <Tabs defaultValue='ratio' className='gap-6'>
          <div className='flex justify-between gap-4 max-sm:flex-col sm:items-center'>
            <TabsList className='bg-muted group-data-horizontal/tabs:h-9.5 max-sm:w-full'>
              <TabsTrigger value='ratio' className='px-5'>
                Ratio
              </TabsTrigger>
              <TabsTrigger value='projects' className='px-5'>
                Source
              </TabsTrigger>
            </TabsList>

            <div className='flex items-center gap-1.5'>
              <span className='relative flex size-2.5'>
                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-green-600 opacity-75 dark:bg-green-400'></span>
                <span className='relative inline-flex size-2.5 rounded-full bg-green-600 dark:bg-green-400'></span>
              </span>
              <span className='text-muted-foreground text-sm'>Recently Updated</span>
            </div>
          </div>

          <TabsContent value='ratio' className='flex flex-col gap-6'>
            <div className='flex items-center gap-8'>
              <div className='flex flex-col'>
                <div className='flex items-center gap-2'>
                  <span className='bg-chart-2 size-3 rounded-xs' />
                  <span className='text-xl font-medium'>24,783</span>
                </div>
                <span className='text-muted-foreground text-sm'>Active users</span>
              </div>
              <div className='flex flex-col'>
                <div className='flex items-center gap-2'>
                  <span className='bg-chart-1 size-3 rounded-xs' />
                  <span className='text-xl font-medium'>1,397</span>
                </div>
                <span className='text-muted-foreground text-sm'>Churned</span>
              </div>
            </div>

            <ChartContainer config={ratioConfig} className='max-h-75 min-h-40 w-full'>
              <BarChart accessibilityLayer data={ratioData} margin={{ left: -15 }}>
                <CartesianGrid vertical={false} strokeDasharray='4' stroke='var(--border)' />
                <XAxis
                  dataKey='day'
                  tickLine={false}
                  tickMargin={10}
                  minTickGap={20}
                  tick={{ fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 1600]}
                  ticks={[0, 400, 800, 1200, 1600]}
                  tickFormatter={value => value}
                  tickLine={false}
                  tickMargin={8}
                  tick={{ fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey='activeUsers' stackId='a' fill='var(--color-activeUsers)' />
                <Bar dataKey='churned' stackId='a' fill='var(--color-churned)' />
              </BarChart>
            </ChartContainer>
          </TabsContent>

          <TabsContent value='projects' className='flex flex-col gap-6'>
            <div className='flex items-center gap-8'>
              <div className='flex flex-col'>
                <div className='flex items-center gap-2'>
                  <span className='bg-chart-2 size-3 rounded-xs' />
                  <span className='text-xl font-medium'>18,542</span>
                </div>
                <span className='text-muted-foreground text-sm'>Organic</span>
              </div>
              <div className='flex flex-col'>
                <div className='flex items-center gap-2'>
                  <span className='bg-chart-5 size-3 rounded-xs' />
                  <span className='text-xl font-medium'>4,218</span>
                </div>
                <span className='text-muted-foreground text-sm'>Referral</span>
              </div>
              <div className='flex flex-col'>
                <div className='flex items-center gap-2'>
                  <span className='bg-chart-3 size-3 rounded-xs' />
                  <span className='text-xl font-medium'>2,023</span>
                </div>
                <span className='text-muted-foreground text-sm'>Paid</span>
              </div>
            </div>

            <ChartContainer config={sourceConfig} className='max-h-75 min-h-40 w-full'>
              <BarChart accessibilityLayer data={sourceData} margin={{ left: -15 }}>
                <CartesianGrid vertical={false} strokeDasharray='4' stroke='var(--border)' />
                <XAxis
                  dataKey='day'
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)' }}
                />
                <YAxis
                  domain={[0, 1600]}
                  ticks={[0, 400, 800, 1200, 1600]}
                  tickFormatter={value => value}
                  tickLine={false}
                  tickMargin={8}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)' }}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey='organic' stackId='a' fill='var(--color-organic)' />
                <Bar dataKey='referral' stackId='a' fill='var(--color-referral)' />
                <Bar dataKey='paid' stackId='a' fill='var(--color-paid)' />
              </BarChart>
            </ChartContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default UserActivityCard
