import { Badge } from '@/components/ui/badge'
import { EMPLOYEE_STATUS_LABELS, type EmployeeStatus } from '@/types/employee'

/**
 * Status pill for PRD Screen 2, built on the badge-18 variant pattern
 * (borderless tinted badge with a leading dot).
 */
const STATUS_CLASSES: Record<EmployeeStatus, string> = {
  ACTIVE:
    'border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400',
  ON_LEAVE:
    'border-none bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400',
  TERMINATED:
    'border-none bg-red-600/10 text-red-600 dark:bg-red-400/10 dark:text-red-400',
}

const DOT_CLASSES: Record<EmployeeStatus, string> = {
  ACTIVE: 'bg-green-600 dark:bg-green-400',
  ON_LEAVE: 'bg-amber-600 dark:bg-amber-400',
  TERMINATED: 'bg-red-600 dark:bg-red-400',
}

const EmployeeStatusBadge = ({ status }: { status: EmployeeStatus }) => {
  return (
    <Badge className={STATUS_CLASSES[status]}>
      <span className={`size-1.5 rounded-full ${DOT_CLASSES[status]}`} aria-hidden='true' />
      {EMPLOYEE_STATUS_LABELS[status]}
    </Badge>
  )
}

export default EmployeeStatusBadge
