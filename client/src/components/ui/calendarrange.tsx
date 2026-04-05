'use client'

import { useMemo } from 'react'
import { type DateRange } from 'react-day-picker'
import { Calendar, type CalendarProps } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

export interface CalendarRangeProps {
  value?: DateRange
  onChange?: (next?: DateRange) => void
  minDate?: Date
  maxDate?: Date
  numberOfMonths?: number
  className?: string
  classNames?: CalendarProps['classNames']
}

const CalendarRange = ({
  value,
  onChange,
  minDate,
  maxDate,
  numberOfMonths = 2,
  className,
  classNames,
}: CalendarRangeProps) => {
  const defaultMonth = useMemo(
    () => value?.from ?? maxDate ?? new Date(),
    [value?.from, maxDate],
  )

  return (
    <Calendar
      mode='range'
      defaultMonth={defaultMonth}
      selected={value}
      onSelect={(next) => {
        onChange?.(next)
      }}
      numberOfMonths={numberOfMonths}
      disabled={minDate || maxDate ? { before: minDate, after: maxDate } : undefined}
      className={cn('rounded-lg border', className)}
      classNames={classNames}
    />
  )
}

export default CalendarRange
