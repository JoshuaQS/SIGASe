import * as React from 'react'
import { cn } from '@/shared/lib/utils'

export type SegmentedControlSize = 'sm' | 'md' | 'lg'

export type SegmentedControlOption<T extends string> = {
  value: T
  label: React.ReactNode
  disabled?: boolean
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[]
  value: T | null
  onChange: (value: T) => void
  className?: string
  size?: SegmentedControlSize
  fullWidth?: boolean
  ariaLabel?: string
  disabled?: boolean
}

const sizeStyles: Record<SegmentedControlSize, { root: string; item: string }> = {
  sm: {
    root: 'p-0.5',
    item: 'h-7 px-2.5 text-xs',
  },
  md: {
    root: 'p-0.5',
    item: 'h-8 px-3 text-sm',
  },
  lg: {
    root: 'p-1',
    item: 'h-10 px-4 text-sm',
  },
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
  fullWidth = false,
  ariaLabel,
  disabled = false,
}: SegmentedControlProps<T>) {
  const styles = sizeStyles[size]

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-stretch gap-0.5 rounded-lg border border-border bg-secondary/50',
        styles.root,
        fullWidth && 'w-full',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value
        const isDisabled = disabled || option.disabled

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled || undefined}
            disabled={isDisabled}
            onClick={() => {
              if (isDisabled) return
              onChange(option.value)
            }}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded text-xs font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:pointer-events-none disabled:opacity-50',
              styles.item,
              fullWidth && 'flex-1',
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
