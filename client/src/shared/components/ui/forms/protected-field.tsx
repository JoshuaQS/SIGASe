import { useState } from 'react'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'
import { getFormControlSize } from '@/shared/components/ui/forms/form-control-styles'
import type { FormControlSize } from '@/shared/components/ui/forms/form-control-contract'

type ProtectedFieldMode = 'display' | 'edit'
type ProtectedFieldState = 'protected' | 'pending'

interface ProtectedFieldProps {
  mode: ProtectedFieldMode
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  className?: string
  label?: string
  size?: FormControlSize
  state?: ProtectedFieldState
}

/**
 * ProtectedField Component
 *
 * Displays a field that can toggle between two modes:
 * - display: Shows a protected view with a shield icon and masked dots
 * - edit: Shows a normal input field that can be edited
 */
export function ProtectedField({
  mode,
  value,
  onChange,
  placeholder,
  disabled = false,
  readOnly = false,
  className,
  size = 'md',
  state = 'protected',
}: ProtectedFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const cfg = getFormControlSize(size)

  if (mode === 'display') {
    const isPending = state === 'pending'
    return (
      <div
        className={cn(
          'relative flex items-center',
          cfg.control,
          cfg.text,
          cfg.px,
          'rounded-md border-2',
          isPending
            ? 'border-amber-400 bg-amber-50 dark:border-amber-400/70 dark:bg-amber-400/10'
            : 'border-green-400 bg-green-50 dark:bg-green-400/10',
          className,
        )}
      >
        <span
          className={cn(
            'absolute -top-2 left-2 px-1.5 py-0 leading-none',
            'rounded-sm border !text-[10px] font-bold uppercase tracking-wider',
            isPending
              ? 'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-500/60 dark:bg-slate-950 dark:text-amber-300'
              : 'border-green-400 bg-green-100 text-green-600 dark:bg-slate-950 dark:text-green-400',
            cfg.fieldLabel
          )}
        >
          {isPending ? 'Pendiente' : 'Protegido'}
        </span>

        <div className={cn('flex items-center', cfg.addonGap)}>
          <div className={cn('flex items-center flex-1', cfg.addonGap)}>
            {isPending ? (
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Pendiente</span>
            ) : (
              <div className={cn('flex items-center', cfg.addonGap)}>
                {Array.from({ length: 16 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'rounded-full bg-gray-900 dark:bg-gray-300',
                      size === 'xs' ? 'w-1 h-1' : size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
                    )}
                  />

                ))}
              </div>
            )}
          </div>
          <ShieldCheck
            className={cn(
              cfg.icon,
              'flex-shrink-0',
              isPending ? 'text-amber-500/95 dark:text-amber-300' : 'text-green-400/95',
              cfg.adornmentInsetEnd
            )}
          />
        </div>
      </div>
    )
  }

  // Edit mode: Show normal input field
  return (
    <div className="relative">
      <Input
        type={showPassword ? 'text' : 'password'}
        size={size}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={cn('pr-10', className)}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        disabled={disabled || readOnly}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
      >
        {showPassword ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}
