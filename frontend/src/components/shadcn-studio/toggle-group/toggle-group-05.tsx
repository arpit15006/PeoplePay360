import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { IconLayoutGrid, IconList } from '@tabler/icons-react'

export type EmployeesView = 'kanban' | 'list'

type Props = {
  value: EmployeesView
  onValueChange: (value: EmployeesView) => void
}

/**
 * PRD Screen 2 view switcher — horizontal, two-way Kanban | List.
 * (Flipped from the stock vertical three-item columns/layout/list variant.)
 */
const ToggleGroupViewSwitcher = ({ value, onValueChange }: Props) => {
  return (
    <ToggleGroup
      type='single'
      variant='outline'
      orientation='horizontal'
      spacing={0}
      value={value}
      // Radix clears the value when the active item is re-clicked; ignore that
      // so one of the two views is always selected.
      onValueChange={next => next && onValueChange(next as EmployeesView)}
    >
      <ToggleGroupItem value='kanban' aria-label='Kanban view'>
        <IconLayoutGrid />
        Kanban
      </ToggleGroupItem>
      <ToggleGroupItem value='list' aria-label='List view'>
        <IconList />
        List
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

export default ToggleGroupViewSwitcher
