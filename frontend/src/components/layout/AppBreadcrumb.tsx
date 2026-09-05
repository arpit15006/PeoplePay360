import { Link, useLocation } from 'react-router-dom'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { IconHome } from '@tabler/icons-react'

/** Route segment -> label, following PRD terminology. */
const SEGMENT_LABELS: Record<string, string> = {
  employees: 'Employees',
  contracts: 'Contracts',
  attendance: 'Attendance',
  schedules: 'Working Schedules',
  timeoff: 'Time Off',
  requests: 'Requests',
  allocations: 'Allocations',
  types: 'Time Off Types',
  payroll: 'Payroll',
  payruns: 'Payruns',
  payslips: 'Payslips',
  structures: 'Salary Structures',
  rules: 'Salary Rules',
  dashboard: 'Payroll Dashboard',
  new: 'New'
}

const isRecordId = (segment: string) => /^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(segment)

const labelFor = (segment: string) =>
  isRecordId(segment)
    ? 'Details'
    : SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)

/**
 * Breadcrumb for the app header, using the breadcrumb-08 outline treatment
 * (bordered pill list with a home icon).
 */
export function AppBreadcrumb() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)

  const crumbs = segments.map((segment, index) => ({
    label: labelFor(segment),
    href: `/${segments.slice(0, index + 1).join('/')}`,
    isLast: index === segments.length - 1
  }))

  return (
    <Breadcrumb>
      <BreadcrumbList className='min-h-8 rounded-md border px-3 py-0.5'>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to='/employees'>
              <IconHome className='size-4' />
              <span className='sr-only'>Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {crumbs.map(crumb => (
          <span key={crumb.href} className='contents'>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export default AppBreadcrumb
