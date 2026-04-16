import { X } from "lucide-react";
import type { FilterState, TableFilterPanelProps } from "./filter-types";
import {
  cn,
  getActiveFilterChips,
  hasActiveFilters,
  removeMultiFilterValue,
  removeSingleFilterValue,
} from "./filter-utils";
import { FilterFieldRenderer } from "./filter-field-renderer";

export const TableFilterPanel = <TState extends FilterState>({
  title,
  fields,
  value,
  onChange,
  onApply,
  onClear,
  onReset,
  onCancel,
  className,
}: TableFilterPanelProps<TState>) => {
  const activeChips = getActiveFilterChips(fields, value);
  const isApplyDisabled = !hasActiveFilters(value);

  return (
    <div
      className={cn(
        "w-full min-w-[360px] max-w-[420px] rounded-xl border border-border bg-card shadow-xl",
        className,
      )}
    >
      <div className="space-y-3 p-4">
        {title ? (
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>

            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Cerrar filtros"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <FilterFieldRenderer
              key={field.id}
              field={field}
              value={value}
              onChange={onChange}
            />
          ))}
        </div>
      </div>

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1 border-t border-border px-4 py-2">
          <span className="mr-1 text-[10px] text-muted-foreground">Activos:</span>

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
                  );
                  return;
                }

                onChange(removeSingleFilterValue(value, chip.fieldId) as TState);
              }}
              className="inline-flex items-center gap-1 rounded border border-chip-border bg-chip px-1.5 py-0.5 text-[10px] text-chip-foreground"
            >
              {chip.label}: {chip.value}
              <X size={10} />
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-border bg-secondary/30 px-4 py-3">
        <div className="flex items-center gap-2">
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Restablecer
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Limpiar
          </button>
        </div>

        <div className="flex gap-2">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary"
            >
              Cancelar
            </button>
          ) : null}

          <button
            type="button"
            onClick={onApply}
            disabled={isApplyDisabled}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
