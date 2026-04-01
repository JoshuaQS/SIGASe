import { useState, useCallback } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@//lib/utils';

export interface FilterGroup {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  /** When true only one option can be active at a time (radio behaviour). */
  exclusive?: boolean;
}

interface FiltersPanelProps {
  groups: FilterGroup[];
  /** Map of groupKey → selected option values. */
  values: Record<string, string[]>;
  onToggle: (groupKey: string, optionValue: string) => void;
  onClearAll: () => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  defaultOpen?: boolean;
  topBarExtra?: React.ReactNode;
  className?: string;
  /** When true, removes bottom border-radius and bottom border so it merges with a DataTable below. */
  fused?: boolean;
}

export function FiltersPanel({
  groups,
  values,
  onToggle,
  onClearAll,
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  showSearch = true,
  defaultOpen = false,
  topBarExtra,
  className,
  fused = false,
}: FiltersPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  const activeChips = groups.flatMap((g) =>
    (values[g.key] ?? []).map((v) => ({
      groupKey: g.key,
      value: v,
      label: g.options.find((o) => o.value === v)?.label ?? v,
    })),
  );

  const hasActive = activeChips.length > 0;

  return (
    <div
      className={cn(
        'overflow-hidden border border-border bg-card shadow-sm',
        fused ? 'rounded-t-xl rounded-b-none border-b-0' : 'rounded-xl',
        className,
      )}
    >
      {/* Top bar */}
      <div className="flex flex-col gap-3 border-b border-border bg-secondary/50 px-4 py-3.5 sm:flex-row sm:items-center">
        {showSearch && onSearchChange && (
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder={searchPlaceholder}
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="flex items-center gap-2 h-8 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
          {hasActive && (
            <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeChips.length}
            </span>
          )}
        </button>

        {topBarExtra}
      </div>

      {/* Filter groups */}
      {open && (
        <div
          className={cn(
            'grid grid-cols-1 gap-0 divide-y divide-border sm:divide-y-0 sm:divide-x',
            groups.length === 2 && 'sm:grid-cols-2',
            groups.length >= 3 && 'sm:grid-cols-3',
          )}
        >
          {groups.map((group) => {
            const selected = values[group.key] ?? [];

            return (
              <div key={group.key} className="p-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-1.5">
                  {group.options.map((opt) => {
                    const checked = selected.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="group flex cursor-pointer items-center gap-2"
                      >
                        <input
                          type={group.exclusive ? 'radio' : 'checkbox'}
                          name={group.exclusive ? group.key : undefined}
                          checked={checked}
                          onChange={() => onToggle(group.key, opt.value)}
                          className="rounded border-border"
                        />
                        <span
                          className={cn(
                            'text-sm transition-colors',
                            checked
                              ? 'font-medium text-foreground'
                              : 'text-muted-foreground group-hover:text-foreground',
                          )}
                        >
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active filter chips */}
      {hasActive && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-secondary/40 px-4 py-3">
          <span className="text-xs text-muted-foreground">Activos:</span>
          {activeChips.map((chip) => (
            <span
              key={`${chip.groupKey}-${chip.value}`}
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => onToggle(chip.groupKey, chip.value)}
                className="transition-colors hover:text-primary/60"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-muted-foreground underline transition-colors hover:text-foreground"
          >
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  );
}
