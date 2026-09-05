import { Badge } from '@/components/ui/badge'
import { CONTRACT_STATUS_LABELS, type ContractStatus } from '@/types/contract'

const STATUS_CLASSES: Record<ContractStatus, string> = {
  ACTIVE: 'border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400',
  DRAFT: 'border-none bg-slate-600/10 text-slate-600 dark:bg-slate-400/10 dark:text-slate-400',
  EXPIRED: 'border-none bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400',
  TERMINATED: 'border-none bg-red-600/10 text-red-600 dark:bg-red-400/10 dark:text-red-400'
}

const DOT_CLASSES: Record<ContractStatus, string> = {
  ACTIVE: 'bg-green-600 dark:bg-green-400',
  DRAFT: 'bg-slate-600 dark:bg-slate-400',
  EXPIRED: 'bg-amber-600 dark:bg-amber-400',
  TERMINATED: 'bg-red-600 dark:bg-red-400'
}

const ContractStatusBadge = ({ status }: { status: ContractStatus }) => (
  <Badge className={STATUS_CLASSES[status]}>
    <span className={`size-1.5 rounded-full ${DOT_CLASSES[status]}`} aria-hidden='true' />
    {CONTRACT_STATUS_LABELS[status]}
  </Badge>
)

export default ContractStatusBadge
