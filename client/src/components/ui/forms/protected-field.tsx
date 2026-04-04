import { useState } from 'react'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

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
}: ProtectedFieldProps) {
  const [showPassword, setShowPassword] = useState(false)

  // Display mode: Show protected field with shield and dots
  if (mode === 'display') {
    return (
      <div className={cn('flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-400/30', className)}>
        <div className="flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Protegido</span>
            <div className="flex gap-1.5">
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-gray-900 dark:bg-gray-700"
                />
              ))}
            </div>
          </div>
          {label && <p className="text-[10px] text-amber-600/70 dark:text-amber-400/60 mt-1">{label}</p>}
        </div>
      </div>
    )
  }

  // Edit mode: Show normal input field
  return (
    <div className="relative">
      <Input
        type={showPassword ? 'text' : 'password'}
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
