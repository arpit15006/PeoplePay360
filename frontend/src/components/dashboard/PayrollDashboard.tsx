import { useState } from 'react'

import { Alert, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  IconAlertTriangle,
  IconCalendarStats,
  IconCash,
  IconInfoCircle,
  IconReceipt2,
  IconTrendingDown,
  IconUsers,
  IconWallet
} from '@tabler/icons-react'

import { useDashboard } from '@/hooks/useDashboard'
import { useDepartments } from '@/hooks/useEmployee'
import { money, type DashboardFilters } from '@/types/dashboard'
import { monthOptions } from '@/types/payrun'

import SalaryCostChart from './SalaryCostChart'
import SalaryTrendChart from './SalaryTrendChart'
import AttendanceOverview from './AttendanceOverview'
import WorkforceBreakdownChart from './WorkforceBreakdownChart'

const EMPLOYEE_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' }
]

/** The period the seed and payruns use; kept in sync with the payrun wizard. */
const YEARS = ['2026', '2025']

const Kpi = ({
  icon,
  label,
  value,
  hint
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) => (
  <Card>
    <CardContent className='flex items-start justify-between gap-3'>
      <div className='min-w-0 space-y-1'>
        <p className='text-muted-foreground text-xs font-medium'>{label}</p>
        <p className='truncate text-2xl font-semibold tabular-nums'>{value}</p>
        {hint && <p className='text-muted-foreground text-xs'>{hint}</p>}
      </div>
      <div className='bg-primary/10 text-primary rounded-lg p-2'>{icon}</div>
    </CardContent>
  </Card>
)

/** PRD Screen 17 — Payroll Dashboard. */
export function PayrollDashboard() {
  const [month, setMonth] = useState('September')
  const [year, setYear] = useState('2026')
  const [departmentId, setDepartmentId] = useState('all')
  const [employeeType, setEmployeeType] = useState('all')

  const filters: DashboardFilters = {
    period: `${month} ${year}`,
    departmentId: departmentId === 'all' ? undefined : departmentId,
    employeeType: employeeType === 'all' ? undefined : employeeType
  }

  const { data, isLoading, isError, error } = useDashboard(filters)
  const { data: departments = [] } = useDepartments()

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>Payroll Dashboard</h1>
          <p className='text-muted-foreground text-sm'>
            Payroll, attendance and leave at a glance for {filters.period}.
          </p>
        </div>

        {/* Filters — PRD: period, department, employee type */}
        <div className='flex flex-wrap items-center gap-2'>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className='w-36'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className='w-24'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(y => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className='w-48'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Departments</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={employeeType} onValueChange={setEmployeeType}>
            <SelectTrigger className='w-40'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Types</SelectItem>
              {EMPLOYEE_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className='space-y-6'>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className='h-28 w-full' />
            ))}
          </div>
          <div className='grid gap-6 lg:grid-cols-3'>
            <Skeleton className='h-96 w-full lg:col-span-2' />
            <Skeleton className='h-96 w-full' />
          </div>
        </div>
      ) : isError || !data ? (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm'>
          Could not load the dashboard{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      ) : (
        <>
          {/* Actionable alerts — PRD Screen 17 */}
          {data.alerts.length > 0 && (
            <div className='space-y-2'>
              {data.alerts.map((alert, index) => (
                <Alert
                  key={`${alert.type}-${index}`}
                  className={alert.type === 'warning' ? 'border-amber-500/40 *:[svg]:row-span-1' : '*:[svg]:row-span-1'}
                >
                  {alert.type === 'warning' ? <IconAlertTriangle /> : <IconInfoCircle />}
                  <AlertTitle>{alert.message}</AlertTitle>
                </Alert>
              ))}
            </div>
          )}

          {/* KPI cards */}
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
            <Kpi
              icon={<IconWallet className='size-5' />}
              label='Net Salary Paid'
              value={money(data.kpis.totalNetSalaryPaid)}
              hint={data.period}
            />
            <Kpi
              icon={<IconCash className='size-5' />}
              label='Gross Salary'
              value={money(data.kpis.totalGrossSalary)}
            />
            <Kpi
              icon={<IconTrendingDown className='size-5' />}
              label='Total Deductions'
              value={money(data.kpis.totalDeductions)}
            />
            <Kpi
              icon={<IconReceipt2 className='size-5' />}
              label='Payslips Generated'
              value={String(data.kpis.payslipsGenerated)}
            />
            <Kpi
              icon={<IconUsers className='size-5' />}
              label='Average Salary'
              value={money(data.kpis.averageSalary)}
              hint='Net, per payslip'
            />
            <Kpi
              icon={<IconCalendarStats className='size-5' />}
              label='Approved Time Off'
              value={String(data.kpis.approvedTimeOff)}
              hint='Requests'
            />
          </div>

          {/* Charts */}
          <div className='grid items-start gap-6 lg:grid-cols-3'>
            <SalaryCostChart rows={data.salaryCostByDepartment} className='lg:col-span-2' />
            <WorkforceBreakdownChart
              attendance={data.attendanceHealth}
              timeOff={data.timeOffOverview}
              className='h-full'
            />
          </div>

          <div className='grid items-start gap-6 lg:grid-cols-2'>
            <SalaryTrendChart points={data.salaryTrend} />
            <AttendanceOverview attendance={data.attendanceHealth} />
          </div>
        </>
      )}
    </div>
  )
}

export default PayrollDashboard
