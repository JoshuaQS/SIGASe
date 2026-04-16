import { Check, Search } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/shared/components/ui/input-group'
import type { FilterFieldConfig, FilterState } from './filter-types'
import { cn, toggleMultiValue } from './filter-utils'

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
          <label className="text-xs font-semibold text-muted-foreground">{field.label}</label>
        ) : null}

        <div className="mt-1">
          <InputGroup size="sm" variant="filled">
            <InputGroupAddon size="sm">
              <Search size={14} className="text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              size="sm"
              type="text"
              value={typeof value[field.id] === 'string' ? value[field.id] : ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  [field.id]: e.target.value,
                } as TState)
              }
              placeholder={field.placeholder}
            />
          </InputGroup>
        </div>
      </div>
    )
  }

  if (field.type === 'text') {
    return (
      <div>
        <label className="text-xs font-semibold text-muted-foreground">{field.label}</label>
        <div className="mt-1">
          <InputGroup size="sm" variant="filled">
            <InputGroupInput
              size="sm"
              type="text"
              value={typeof value[field.id] === 'string' ? value[field.id] : ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  [field.id]: e.target.value,
                } as TState)
              }
              placeholder={field.placeholder}
            />
          </InputGroup>
        </div>
      </div>
    )
  }

  if (field.type === 'multi-select') {
    const selectedValues = Array.isArray(value[field.id]) ? value[field.id] : []

    return (
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{field.label}</label>

        <div className="mt-1.5 flex flex-wrap gap-1">
          {field.options.map((option) => {
            const isActive = selectedValues.includes(option.value)

            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  onChange(toggleMultiValue(value, field.id, option.value) as TState)
                }
                className={cn(
                  'rounded border px-2 py-1 text-xs transition-colors',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary text-secondary-foreground hover:bg-accent',
                )}
              >
                {isActive ? <Check size={10} className="mr-0.5 inline" /> : null}
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div>
        <label className="text-xs font-semibold text-muted-foreground">{field.label}</label>
        <select
          value={typeof value[field.id] === 'string' ? value[field.id] : ''}
          onChange={(e) =>
            onChange({
              ...value,
              [field.id]: e.target.value,
            } as TState)
          }
          className="mt-1 h-8 w-full rounded border border-border bg-secondary px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{field.placeholder ?? 'Selecciona una opción'}</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (field.type === 'datetime-local') {
    return (
      <div>
        <label className="text-xs font-semibold text-muted-foreground">{field.label}</label>
        <div className="mt-1">
          <InputGroup size="sm" variant="filled">
            <InputGroupInput
              size="sm"
              type="datetime-local"
              min={field.min}
              max={field.max}
              step={field.step}
              value={typeof value[field.id] === 'string' ? value[field.id] : ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  [field.id]: e.target.value,
                } as TState)
              }
            />
          </InputGroup>
        </div>
      </div>
    )
  }

  return null
}
