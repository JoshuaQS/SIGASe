import { Filter, X } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import type { FilterState, TableFilterPanelProps } from './filter-types'
import {
  cn,
  countActiveFilters,
  getActiveFilterChips,
  hasActiveFilters,
  removeMultiFilterValue,
  removeSingleFilterValue,
} from './filter-utils'
import { filterPopoverSoftBadgeClass } from './filter-popover-classes'
import { FilterFieldRenderer } from './filter-field-renderer'

export const TableFilterPanel = <TState extends FilterState>({
  title,
  fields,
  value,
  defaultValue,
  onChange,
  onApply,
  onClear,
  onReset,
  onCancel,
  className,
}: TableFilterPanelProps<TState>) => {
  const activeChips = getActiveFilterChips(fields, value, defaultValue)
  const isApplyDisabled = !hasActiveFilters(fields, value, defaultValue)
  const activeFiltersCount = countActiveFilters(fields, value, defaultValue)
  const activeLabel =
    activeFiltersCount === 0
      ? 'Sin filtros'
      : activeFiltersCount === 1
        ? '1 activo'
        : `${activeFiltersCount} activos`

  return (
    <div
      className={cn(
        'w-full max-w-sm rounded-xl border border-border bg-popover p-4 shadow-[var(--shadow-lg)]',
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="truncate text-sm font-semibold text-foreground">
            {title ?? 'Filtros'}
          </p>
        </div>
        <span className={cn('shrink-0', filterPopoverSoftBadgeClass)}>{activeLabel}</span>
      </div>

      <div className="space-y-3">
        {fields.map((field) => (
          <FilterFieldRenderer
            key={field.id}
            field={field}
            value={value}
            onChange={onChange}
          />
        ))}
      </div>

      {activeChips.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Filtros aplicados</p>
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => {
                  if (chip.removableValue) {
                    onChange(
                      removeMultiFilterValue(
                        value,
                        chip.fieldId,
                        chip.removableValue,
                      ) as TState,
                    )
                    return
                  }

                  const fieldConfig = fields.find((f) => f.id === chip.fieldId)
                  const fallbackValue = fieldConfig
                    ? (defaultValue?.[chip.fieldId]
                      ?? fieldConfig.defaultValue
                      ?? (fieldConfig.type === 'multi-select' ? [] : ''))
                    : ''
                  onChange(removeSingleFilterValue(value, chip.fieldId, fallbackValue) as TState)
                }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary',
                  'transition hover:bg-primary/15',
                )}
              >
                <span className="max-w-[220px] truncate">
                  {chip.label}: {chip.value}
                </span>
                <X className="h-2.5 w-2.5 shrink-0" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 shrink">
          {onReset ? (
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={onReset}
            >
              Restablecer
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {onClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs font-normal text-foreground hover:bg-muted"
              onClick={onClear}
            >
              Limpiar
            </Button>
          ) : null}
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 border-border bg-card px-2.5 text-xs font-normal hover:bg-muted"
              onClick={onCancel}
            >
              Cancelar
            </Button>
          ) : null}

          <Button
            type="button"
            variant="primary"
            size="sm"
            className="h-7 px-3 text-xs font-medium hover:bg-primary/90"
            onClick={() => onApply?.()}
            disabled={isApplyDisabled}
          >
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  )
}
