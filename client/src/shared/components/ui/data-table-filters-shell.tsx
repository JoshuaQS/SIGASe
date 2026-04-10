import type { ReactNode } from 'react'
import { Button } from '@/shared/components/ui/button'

export type DataTableFilterChip = {
  id: string
  label: string
  onClear: () => void
}

type DataTableFiltersShellProps = {
  open: boolean
  children: ReactNode
  chips?: DataTableFilterChip[]
  onApply: () => void
  onReset: () => void
  onClear: () => void
  applyLabel?: string
  className?: string
}

export function DataTableFiltersShell({
  open,
  children,
  chips = [],
  onApply,
  onReset,
  onClear,
  applyLabel = 'Aplicar',
  className,
}: DataTableFiltersShellProps) {
  if (!open && chips.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {open ? (
        <div className={`rounded-xl border border-border bg-card p-4 shadow-sm ${className ?? ''}`.trim()}>
          <div className="space-y-4">
            {children}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onReset}>
                  Restablecer
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onClear}>
                  Limpiar filtros
                </Button>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={onApply}>
                {applyLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {chip.label}
              <button
                type="button"
                className="text-muted-foreground transition-colors hover:text-foreground"
                onClick={chip.onClear}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
