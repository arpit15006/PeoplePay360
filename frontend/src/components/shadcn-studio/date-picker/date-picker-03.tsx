'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { IconCalendar, IconChevronDown } from '@tabler/icons-react'

const DatePickerWithIconDemo = () => {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(undefined)

  return (
    <div className='flex w-full max-w-xs flex-col gap-2'>
      <Label htmlFor='date' className='px-1'>
        Date picker with icon
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant='outline' id='date' className='w-full justify-between font-normal'>
            <span className='flex items-center'>
              <IconCalendar className='mr-2' />
              {date ? date.toLocaleDateString() : 'Pick a date'}
            </span>
            <IconChevronDown />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto overflow-hidden p-0' align='start'>
          <Calendar
            mode='single'
            selected={date}
            onSelect={date => {
              setDate(date)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default DatePickerWithIconDemo
