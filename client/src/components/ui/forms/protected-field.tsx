import { useState } from 'react'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { getFormControlSize } from '@/components/ui/forms/form-control-styles'
import type { FormControlSize } from '@/components/ui/forms/form-control-contract'

type ProtectedFieldMode = 'display' | 'edit'

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
  label,
  size = 'md',
}: ProtectedFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const cfg = getFormControlSize(size)

  if (mode === 'display') {
    return (
      <div
        className={cn(
          'relative flex items-center gap-3',
          cfg.control,
          cfg.text,
          cfg.px,
          'border-2 border-dashed border-amber-400 rounded-md bg-amber-50 dark:bg-amber-500/10',
          className,
        )}
      >
        <span
          className={cn(
            'absolute -top-2 left-2 px-1 py-0 leading-none',
            'bg-amber-50 dark:bg-amber-500/10 border border-amber-400 rounded-sm',
            'text-amber-600 dark:text-amber-400 font-medium text-[8px]'
          )}
        >
          Protegido
        </span>

        <div className="flex items-center gap-4 flex-1">
          <div className="flex gap-1.5 items-center">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-gray-300"
              />
              
            ))}
          </div>
        </div>
        <ShieldCheck className={cn(cfg.icon, 'text-amber-500/95 flex-shrink-0 ml-[15px]')} />
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
