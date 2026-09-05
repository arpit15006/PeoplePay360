import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { IconCalendar, IconChevronDown, IconX } from '@tabler/icons-react'

interface DatePickerProps {
  id?: string
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  placeholder?: string
  /** Return true for dates that cannot be picked. */
  disabledDate?: (date: Date) => boolean
  /** Show a clear button — used for the nullable contract end date. */
  clearable?: boolean
  disabled?: boolean
}

/**
 * Single-date picker, from the shadcn-studio date-picker-03 variant.
 *
 * Two additions the contract form needs: month + year dropdown navigation,
 * because contracts span years (the seeded data has 2025 and 2026 contracts and
 * arrow-only navigation would take ~20 clicks), and an optional clear button,
 * because a contract end date may be null for open-ended contracts.
 */
export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick a date',
  disabledDate,
  clearable = false,
  disabled = false
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className='flex items-center gap-1'>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            id={id}
            disabled={disabled}
            className='w-full justify-between font-normal'
          >
            <span className='flex items-center'>
              <IconCalendar className='mr-2' />
              {value ? value.toLocaleDateString('en-GB') : placeholder}
            </span>
            <IconChevronDown />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto overflow-hidden p-0' align='start'>
          <Calendar
            mode='single'
            selected={value}
            defaultMonth={value}
            captionLayout='dropdown'
            startMonth={new Date(2015, 0)}
            endMonth={new Date(2035, 11)}
            disabled={disabledDate}
            onSelect={date => {
              onChange(date)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>

      {clearable && value && !disabled && (
        <Button
          type='button'
          variant='ghost'
          size='icon'
          aria-label='Clear date'
          onClick={() => onChange(undefined)}
        >
          <IconX />
        </Button>
      )}
    </div>
  )
}

export default DatePicker
