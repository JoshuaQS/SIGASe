'use client'

import { useMemo, useState } from 'react'
import { type DateRange } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

export interface CalendarRangeProps {
  value?: DateRange
  onChange?: (next?: DateRange) => void
  minDate?: Date
  maxDate?: Date
  numberOfMonths?: number
  className?: string
}

const CalendarRange = ({
  value,
  onChange,
  minDate,
  maxDate,
  numberOfMonths = 2,
  className,
}: CalendarRangeProps) => {
  const [internalRange, setInternalRange] = useState<DateRange | undefined>(value)
  const isControlled = value !== undefined
  const selected = isControlled ? value : internalRange

  const defaultMonth = useMemo(
    () => selected?.from ?? maxDate ?? new Date(),
    [selected?.from, maxDate],
  )

  return (
    <Calendar
      mode='range'
      defaultMonth={defaultMonth}
      selected={selected}
      onSelect={(next) => {
        if (!isControlled) setInternalRange(next)
        onChange?.(next)
      }}
      numberOfMonths={numberOfMonths}
      disabled={minDate || maxDate ? { before: minDate, after: maxDate } : undefined}
      className={cn('rounded-lg border', className)}
    />
  )
}

export default CalendarRange
