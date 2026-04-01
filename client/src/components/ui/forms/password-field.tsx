import * as React from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import { cn } from '@//lib/utils';
import { FormField } from './form-field';
import { PasswordInput } from './password-input';
import { useCapsLock } from '@//hooks/use-caps-lock';

interface PasswordFieldProps extends React.ComponentPropsWithoutRef<typeof PasswordInput> {
  label?: string;
  error?: string;
  hint?: string;
  /** Si es true, muestra el aviso de Caps Lock cuando está activo */
  showCapsLockWarning?: boolean;
  /** Ícono personalizado para el label */
  icon?: typeof Lock;
  /** Mensaje de ayuda extra específico para requisitos de contraseña */
  requirementHint?: string;
}

/**
 * Componente unificado para campos de contraseña en el módulo Auth y resto de la app.
 * Incluye: Label, Tooltip/Password Toggle, Error persistente, Aviso de Caps Lock y ARIA.
 */
export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  (
    {
      label = 'Contraseña',
      error,
      hint,
      showCapsLockWarning = true,
      icon: Icon,
      requirementHint,
      id,
      className,
      ...props
    },
    ref
  ) => {
    const { isCapsLockOn, handleKeyDown, handleKeyUp } = useCapsLock();
    const fieldId = id ?? `password-field-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
      <FormField
        label={label}
        htmlFor={fieldId}
        error={error}
        hint={hint}
        icon={Icon}
        className={cn('w-full', className)}
      >
        <div className="relative space-y-1.5">
          <PasswordInput
            {...props}
            ref={ref}
            id={fieldId}
            state={error ? 'error' : 'default'}
            aria-invalid={!!error}
            aria-describedby={
              cn(
                error && `${fieldId}-error`,
                isCapsLockOn && `${fieldId}-caps-lock`,
                requirementHint && `${fieldId}-requirements`
              ) || undefined
            }
            onKeyDown={(e) => {
              handleKeyDown(e);
              props.onKeyDown?.(e);
            }}
            onKeyUp={(e) => {
              handleKeyUp(e);
              props.onKeyUp?.(e);
            }}
          />

          {/* Aviso de Caps Lock con animación sutil */}
          {showCapsLockWarning && isCapsLockOn && (
            <p
              id={`${fieldId}-caps-lock`}
              className="flex items-center gap-1.5 text-[11px] font-medium text-warning animate-in fade-in slide-in-from-top-1"
              role="status"
            >
              <AlertCircle className="h-3 w-3" />
              Bloq Mayús activado
            </p>
          )}

          {/* Hint adicional de requisitos de fortaleza */}
          {requirementHint && !error && (
            <p id={`${fieldId}-requirements`} className="text-[10px] text-muted-foreground/80 leading-tight">
              {requirementHint}
            </p>
          )}
        </div>
      </FormField>
    );
  }
);

PasswordField.displayName = 'PasswordField';
