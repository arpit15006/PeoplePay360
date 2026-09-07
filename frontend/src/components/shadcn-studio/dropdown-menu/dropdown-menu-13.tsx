'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { IconChevronDown, IconSearch, IconX } from '@tabler/icons-react'

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
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const active = options.find(option => option.value === value)

  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!search.trim()) return options
    const q = search.trim().toLowerCase()
    return options.filter(
      opt => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    )
  }, [options, search])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' className={className} aria-label={ariaLabel ?? label}>
          {triggerPrefix}
          {active?.label ?? label}
          <IconChevronDown className='text-muted-foreground' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='max-h-72 w-56 overflow-y-auto p-1'>
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <div className='px-1 pb-1.5 pt-0.5'>
          <div className='flex items-center gap-1.5 rounded-md border px-2 py-1 bg-muted/40'>
            <IconSearch className='size-3.5 text-muted-foreground shrink-0' />
            <input
              ref={searchInputRef}
              type='text'
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              placeholder={`Search ${label.toLowerCase()}...`}
              className='w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground'
            />
            {search && (
              <button
                type='button'
                onClick={() => {
                  setSearch('')
                  searchInputRef.current?.focus()
                }}
                className='text-muted-foreground hover:text-foreground shrink-0 cursor-pointer'
              >
                <IconX className='size-3' />
              </button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        {filtered.length > 0 ? (
          filtered.map(option => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={option.value === value}
              onCheckedChange={checked => {
                if (checked) {
                  onValueChange(option.value)
                  setOpen(false)
                }
              }}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))
        ) : (
          <div className='py-3 text-center text-xs text-muted-foreground'>
            No options found
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DropdownMenuCheckboxFilter
