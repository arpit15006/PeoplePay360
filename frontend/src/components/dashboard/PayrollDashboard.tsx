import { useState } from 'react'
import { Link } from 'react-router-dom'

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
  IconChevronRight,
  IconCalendarStats,
  IconCash,
  IconInfoCircle,
  IconReceipt2,
  IconTrendingDown,
  IconUsers,
  IconWallet
} from '@tabler/icons-react'

import { useAuth } from '@/context/AuthContext'
import { useDashboard } from '@/hooks/useDashboard'
import { useDepartments } from '@/hooks/useEmployee'
import { ALERT_DESTINATIONS, money, type DashboardFilters } from '@/types/dashboard'
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
  <Card size='sm' className='py-3'>
    <CardContent className='flex items-start justify-between gap-2 px-3 sm:px-3.5'>
      <div className='min-w-0 space-y-1'>
        <p className='text-muted-foreground text-xs font-medium'>{label}</p>
        <p
          className='truncate text-lg font-semibold tabular-nums tracking-tight sm:text-xl xl:text-[1.18rem] 2xl:text-2xl'
          title={value}
        >
          {value}
        </p>
        {hint && <p className='text-muted-foreground text-xs'>{hint}</p>}
      </div>
      <div className='bg-primary/10 text-primary shrink-0 rounded-lg p-1.5'>{icon}</div>
    </CardContent>
  </Card>
)

/** PRD Screen 17 — Payroll Dashboard. */
export function PayrollDashboard() {
  const { user } = useAuth()
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
              {data.alerts.map((alert, index) => {
                const target = alert.code ? ALERT_DESTINATIONS[alert.code] : undefined
                // Only a link for someone the destination's route would admit.
                const destination = target && user && target.allow.includes(user.role) ? target : undefined

                const body = (
                  <Alert
                    className={`${alert.type === 'warning' ? 'border-amber-500/40 ' : ''}*:[svg]:row-span-1${
                      destination ? ' hover:bg-muted/50 transition-colors' : ''
                    }`}
                  >
                    {alert.type === 'warning' ? <IconAlertTriangle /> : <IconInfoCircle />}
                    <AlertTitle className='flex items-center justify-between gap-3'>
                      <span>{alert.message}</span>
                      {destination && (
                        <span className='text-muted-foreground flex shrink-0 items-center gap-1 text-sm font-normal'>
                          {destination.label}
                          <IconChevronRight className='size-4' />
                        </span>
                      )}
                    </AlertTitle>
                  </Alert>
                )

                // An alert nobody can act on stays plain text; the rest become
                // real links, so they can be opened in a new tab and read
                // correctly by a screen reader.
                return destination ? (
                  <Link
                    key={`${alert.type}-${index}`}
                    to={destination.to}
                    aria-label={`${alert.message}. ${destination.label}.`}
                    className='focus-visible:ring-ring/50 block rounded-lg outline-none focus-visible:ring-3'
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={`${alert.type}-${index}`}>{body}</div>
                )
              })}
            </div>
          )}

          {/* KPI cards */}
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 2xl:gap-4'>
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

          {/* No items-start here, unlike the row above: these two are meant to
              read as a matched pair, so the shorter one stretches to the
              taller rather than leaving a ragged edge. */}
          <div className='grid gap-6 lg:grid-cols-2'>
            <SalaryTrendChart points={data.salaryTrend} className='h-full' />
            <AttendanceOverview attendance={data.attendanceHealth} className='h-full' />
          </div>
        </>
      )}
    </div>
  )
}

export default PayrollDashboard
