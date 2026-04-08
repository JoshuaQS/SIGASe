'use client'

import { useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { cn } from '@/shared/lib/utils'
import type { DateRangeValue } from './date-range.types'
import { clampDate, formatDateInputValue, parseDateInputValue } from './date-range.utils'

interface DateRangeCalendarProps {
  value?: DateRangeValue
  onChange: (next?: DateRangeValue) => void
  minDate: Date
  maxDate: Date
}

const WEEKDAY_LABELS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

function clampMonth(date: Date, minMonth: Date, maxMonth: Date) {
  const month = startOfMonth(date)
  if (isBefore(month, minMonth)) return minMonth
  if (isAfter(month, maxMonth)) return maxMonth
  return month
}

function clampDraftRange(next?: DateRangeValue, minDate?: Date, maxDate?: Date) {
  if (!next?.from && !next?.to) return undefined

  const from = next?.from ? clampDate(next.from, minDate ?? next.from, maxDate ?? next.from) : undefined
  const to = next?.to ? clampDate(next.to, minDate ?? next.to, maxDate ?? next.to) : undefined

  if (from && to && isAfter(from, to)) {
    return { from: to, to: from }
  }

  return { from, to }
}

function buildMonthDates(month: Date) {
  const firstDayOfGrid = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
  return Array.from({ length: 42 }, (_, index) => addDays(firstDayOfGrid, index))
}

function isDateDisabled(date: Date, minDate: Date, maxDate: Date) {
  const normalized = startOfDay(date)
  return isBefore(normalized, startOfDay(minDate)) || isAfter(normalized, startOfDay(maxDate))
}

function isInSelectedRange(date: Date, range?: DateRangeValue) {
  if (!range?.from && !range?.to) return false

  const normalizedDate = startOfDay(date)
  const from = range.from ? startOfDay(range.from) : undefined
  const to = range.to ? startOfDay(range.to) : undefined

  if (from && to) {
    return !isBefore(normalizedDate, from) && !isAfter(normalizedDate, to)
  }

  return Boolean(from && isSameDay(normalizedDate, from))
}

function isRangeStart(date: Date, range?: DateRangeValue) {
  if (!range?.from) return false
  return isSameDay(startOfDay(date), startOfDay(range.from))
}

function isRangeEnd(date: Date, range?: DateRangeValue) {
  if (!range?.to) return false
  return isSameDay(startOfDay(date), startOfDay(range.to))
}

function MonthGrid({
  month,
  title,
  isCurrentMonth,
  value,
  minDate,
  maxDate,
  onDaySelect,
}: {
  month: Date
  title: string
  isCurrentMonth: boolean
  value?: DateRangeValue
  minDate: Date
  maxDate: Date
  onDaySelect: (date: Date) => void
}) {
  const days = useMemo(() => buildMonthDates(month), [month])

  return (
    <section className="rounded-2xl border border-border bg-card p-2.5 shadow-sm">
      <div className="mb-2.5 flex items-end justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Mes visible</p>
          <h4 className="text-base font-semibold text-foreground">{title}</h4>
        </div>
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {isCurrentMonth ? 'Mes actual' : 'Mes anterior'}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="flex h-8 items-center justify-center rounded-md text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="mt-0.5 space-y-0.5">
        {Array.from({ length: 6 }, (_, weekIndex) => (
          <div key={`${title}-${weekIndex}`} className="grid grid-cols-7 gap-0.5">
            {days.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => {
              const normalizedDay = startOfDay(day)
              const disabled = isDateDisabled(normalizedDay, minDate, maxDate)
              const outsideMonth = !isSameMonth(normalizedDay, month)
              const selected = isInSelectedRange(normalizedDay, value)
              const start = isRangeStart(normalizedDay, value)
              const end = isRangeEnd(normalizedDay, value)
              const today = isSameDay(normalizedDay, startOfDay(new Date()))

              if (outsideMonth) {
                return (
                  <div
                    key={normalizedDay.toISOString()}
                    aria-hidden="true"
                    className="aspect-square w-full rounded-md opacity-0"
                  />
                )
              }

              return (
                <button
                  key={normalizedDay.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => onDaySelect(normalizedDay)}
                  aria-label={format(normalizedDay, "d 'de' MMMM yyyy", { locale: es })}
                  aria-pressed={selected}
                  className={cn(
                    'flex aspect-square w-full items-center justify-center rounded-md text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    disabled && 'cursor-not-allowed text-muted-foreground/30 opacity-40',
                    selected && 'text-foreground',
                    selected && !start && !end && 'rounded-none bg-primary/12',
                    start && end && 'bg-primary text-primary-foreground shadow-sm',
                    start && !end && 'rounded-l-md bg-primary text-primary-foreground shadow-sm',
                    end && !start && 'rounded-r-md bg-primary text-primary-foreground shadow-sm',
                    today && !selected && 'ring-1 ring-primary/30',
                    !disabled && !selected && 'hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {format(normalizedDay, 'd')}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}

export function DateRangeCalendar({ value, onChange, minDate, maxDate }: DateRangeCalendarProps) {
  const firstAllowedMonth = useMemo(() => startOfMonth(minDate), [minDate])
  const lastAllowedMonth = useMemo(() => startOfMonth(maxDate), [maxDate])

  const [displayMonth, setDisplayMonth] = useState(() => {
    const anchor = value?.from ?? value?.to ?? maxDate
    return clampMonth(anchor, firstAllowedMonth, lastAllowedMonth)
  })

  const anchorMonth = useMemo(() => {
    const anchor = value?.from ?? value?.to ?? maxDate
    return clampMonth(anchor, firstAllowedMonth, lastAllowedMonth)
  }, [firstAllowedMonth, lastAllowedMonth, maxDate, value?.from, value?.to])

  const visibleMonth = useMemo(() => {
    const clampedDisplayMonth = clampMonth(displayMonth, firstAllowedMonth, lastAllowedMonth)
    return clampedDisplayMonth.getTime() === anchorMonth.getTime() ? clampedDisplayMonth : anchorMonth
  }, [anchorMonth, displayMonth, firstAllowedMonth, lastAllowedMonth])

  const selectedRange = useMemo<DateRangeValue | undefined>(() => {
    if (!value?.from && !value?.to) return undefined
    return clampDraftRange(value, minDate, maxDate)
  }, [maxDate, minDate, value])

  const previousMonth = startOfMonth(addMonths(visibleMonth, -1))
  const canGoPrevious = isAfter(visibleMonth, firstAllowedMonth)
  const canGoNext = isBefore(visibleMonth, lastAllowedMonth)

  const updateRange = (patch: Partial<DateRangeValue>) => {
    const next = clampDraftRange({ ...value, ...patch }, minDate, maxDate)
    onChange(next)
  }

  const handleDaySelect = (date: Date) => {
    const bounded = clampDate(date, minDate, maxDate)
    const current = clampDraftRange(value, minDate, maxDate)

    if (!current?.from || current.to) {
      onChange({ from: bounded, to: undefined })
      return
    }

    if (isSameDay(bounded, current.from)) {
      onChange({ from: bounded, to: bounded })
      return
    }

    if (isBefore(bounded, current.from)) {
      onChange({ from: bounded, to: current.from })
      return
    }

    onChange({ from: current.from, to: bounded })
  }

  const handleInputChange = (field: 'from' | 'to', rawValue: string) => {
    const parsed = parseDateInputValue(rawValue)
    if (!parsed) {
      const next = { ...value, [field]: undefined }
      onChange(clampDraftRange(next, minDate, maxDate))
      return
    }

    const bounded = clampDate(parsed, minDate, maxDate)
    updateRange({ [field]: bounded })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            Navegación y captura
          </div>
          <p className="text-xs text-muted-foreground">
            Selecciona fechas pasadas. El mes actual se mantiene a la derecha y el siguiente mes futuro se bloquea.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="h-9 w-9 rounded-lg"
            onClick={() => setDisplayMonth((current) => clampMonth(addMonths(current, -1), firstAllowedMonth, lastAllowedMonth))}
            disabled={!canGoPrevious}
            aria-label="Ir al mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="h-9 w-9 rounded-lg"
            onClick={() => setDisplayMonth((current) => clampMonth(addMonths(current, 1), firstAllowedMonth, lastAllowedMonth))}
            disabled={!canGoNext}
            aria-label="Ir al mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground" htmlFor="range-from">
            Desde
          </Label>
          <Input
            id="range-from"
            type="date"
            size="md"
            min={formatDateInputValue(minDate)}
            max={formatDateInputValue(maxDate)}
            value={formatDateInputValue(value?.from)}
            onChange={(event) => handleInputChange('from', event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground" htmlFor="range-to">
            Hasta
          </Label>
          <Input
            id="range-to"
            type="date"
            size="md"
            min={formatDateInputValue(minDate)}
            max={formatDateInputValue(maxDate)}
            value={formatDateInputValue(value?.to)}
            onChange={(event) => handleInputChange('to', event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Meses visibles</p>
          <h4 className="text-base font-semibold text-foreground">Vista comparativa de rango</h4>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <MonthGrid
            key={previousMonth.toISOString()}
            month={previousMonth}
            title={format(previousMonth, 'MMMM yyyy', { locale: es })}
            isCurrentMonth={false}
            value={selectedRange}
            minDate={minDate}
            maxDate={maxDate}
            onDaySelect={handleDaySelect}
          />
          <MonthGrid
            key={visibleMonth.toISOString()}
            month={visibleMonth}
            title={format(visibleMonth, 'MMMM yyyy', { locale: es })}
            isCurrentMonth
            value={selectedRange}
            minDate={minDate}
            maxDate={maxDate}
            onDaySelect={handleDaySelect}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>Escribe una fecha exacta o usa el calendario para marcar el rango visualmente.</p>
        <p className="tabular-nums">
          {value?.from || value?.to
            ? `${formatDateInputValue(value?.from) || '...'} - ${formatDateInputValue(value?.to) || '...'}`
            : 'Sin rango seleccionado'}
        </p>
      </div>
    </div>
  )
}
