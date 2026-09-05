'use client'

import { IconChevronDown } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

export type DropdownFilterOption = {
  value: string
  label: string
}

type Props = {
  /** Heading above the options, naming what is being filtered. */
  label: string
  options: DropdownFilterOption[]
  value: string
  onValueChange: (value: string) => void
  /** Prepended to the trigger text, e.g. 'Sort by: '. */
  triggerPrefix?: string
  /** Announced on the trigger, since the visible text is the current choice. */
  'aria-label'?: string
  className?: string
}

/**
 * Checkbox dropdown, driven as a single-select filter: the tick marks the
 * active option rather than accumulating a set. Re-picking the active option
 * is ignored (as in ToggleGroupViewSwitcher) so a filter always has a value.
 */
const DropdownMenuCheckboxFilter = ({
  label,
  options,
  value,
  onValueChange,
  triggerPrefix,
  'aria-label': ariaLabel,
  className
}: Props) => {
  const active = options.find(option => option.value === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' className={className} aria-label={ariaLabel ?? label}>
          {triggerPrefix}
          {active?.label ?? label}
          <IconChevronDown className='text-muted-foreground' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='max-h-72 w-56 overflow-y-auto'>
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map(option => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={option.value === value}
            onCheckedChange={checked => checked && onValueChange(option.value)}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DropdownMenuCheckboxFilter
