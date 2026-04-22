import { Calendar, Check, ChevronDown, Search } from 'lucide-react'
import { cn, toggleMultiValue } from './filter-utils'
import {
  filterPopoverInputClass,
  filterPopoverLabelClass,
} from './filter-popover-classes'
import type { FilterFieldConfig, FilterState } from './filter-types'

type FilterFieldRendererProps<TState extends FilterState> = {
  field: FilterFieldConfig
  value: TState
  onChange: (next: TState) => void
}

export const FilterFieldRenderer = <TState extends FilterState>({
  field,
  value,
  onChange,
}: FilterFieldRendererProps<TState>) => {
  if (field.type === 'search') {
    return (
      <div>
        {field.label ? (
          <label htmlFor={`filter-${field.id}`} className={filterPopoverLabelClass}>
            {field.label}
          </label>
        ) : null}

        <div className={field.label ? 'relative mt-1' : 'relative'}>
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id={`filter-${field.id}`}
            type="search"
            autoComplete="off"
            className={cn(filterPopoverInputClass, 'pl-7')}
            value={typeof value[field.id] === 'string' ? value[field.id] : ''}
            onChange={(e) =>
              onChange({
                ...value,
                [field.id]: e.target.value,
              } as TState)
            }
            placeholder={field.placeholder ?? 'Buscar…'}
          />
        </div>
      </div>
    )
  }

  if (field.type === 'text') {
    return (
      <div>
        <label htmlFor={`filter-${field.id}`} className={filterPopoverLabelClass}>
          {field.label}
        </label>
        <input
          id={`filter-${field.id}`}
          type="text"
          autoComplete="off"
          className={cn(filterPopoverInputClass, 'mt-1')}
          value={typeof value[field.id] === 'string' ? value[field.id] : ''}
          onChange={(e) =>
            onChange({
              ...value,
              [field.id]: e.target.value,
            } as TState)
          }
          placeholder={field.placeholder}
        />
      </div>
    )
  }

  if (field.type === 'multi-select') {
    const selectedValues = Array.isArray(value[field.id]) ? value[field.id] : []

    return (
      <div>
        <p className={filterPopoverLabelClass}>{field.label}</p>
        <div className="mt-1 space-y-1 rounded-md border border-border bg-card p-2">
          {field.options.map((option) => {
            const isActive = selectedValues.includes(option.value)

            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 text-xs text-foreground"
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isActive}
                  onChange={() =>
                    onChange(toggleMultiValue(value, field.id, option.value) as TState)
                  }
                />
                <span
                  className={cn(
                    'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card',
                  )}
                  aria-hidden
                >
                  {isActive ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                </span>
                {option.label}
              </label>
            )
          })}
        </div>
      </div>
    )
  }

  if (field.type === 'select') {
    const rawValue = value[field.id]
    const selectedValue = typeof rawValue === 'string' ? rawValue : ''
    const hasEmptyOption = field.options.some((o) => o.value === '')

    return (
      <div>
        <label htmlFor={`filter-${field.id}`} className={filterPopoverLabelClass}>
          {field.label}
        </label>
        <div className="relative mt-1">
          <select
            id={`filter-${field.id}`}
            className={cn(filterPopoverInputClass, 'appearance-none pr-7')}
            value={selectedValue}
            onChange={(e) =>
              onChange({
                ...value,
                [field.id]: e.target.value,
              } as TState)
            }
          >
            {field.placeholder && !hasEmptyOption ? (
              <option value="" disabled>
                {field.placeholder}
              </option>
            ) : null}
            {field.options.map((option) => (
              <option key={option.value === '' ? `${field.id}-empty` : option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        </div>
      </div>
    )
  }

  if (field.type === 'datetime-local') {
    return (
      <div>
        <label htmlFor={`filter-${field.id}`} className={filterPopoverLabelClass}>
          {field.label}
        </label>
        <div className="relative mt-1">
          <Calendar
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id={`filter-${field.id}`}
            type="datetime-local"
            min={field.min}
            max={field.max}
            step={field.step}
            className={cn(filterPopoverInputClass, 'pl-7')}
            value={typeof value[field.id] === 'string' ? value[field.id] : ''}
            onChange={(e) =>
              onChange({
                ...value,
                [field.id]: e.target.value,
              } as TState)
            }
          />
        </div>
      </div>
    )
  }

  return null
}
