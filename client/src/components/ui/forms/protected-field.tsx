import { Check, PencilLine, ShieldCheck, X, AlertCircle } from 'lucide-react';
import { cn } from '@//lib/utils';
import { FormField } from '@/components/ui/forms/form-field';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type ProtectedFieldMode = 'view' | 'select' | 'editing';

interface ProtectedFieldProps {
  label: string;
  /** El valor real almacenado (se mostrará enmascarado si existe) */
  value: string;
  /** El valor que se está escribiendo actualmente en el input */
  draftValue: string;
  description?: string;
  mode: ProtectedFieldMode;
  className?: string;
  disabled?: boolean;
  error?: string;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  /** Callback para actualizar el draftValue */
  onChange?: (next: string) => void;
  /** Identificador único para el input y ARIA */
  id?: string;
  reserveMessageSpace?: boolean;
}

const MASKED_VALUE = '••••••••••••';

function getProtectedDisplayValue(value: string | undefined | null) {
  const safeValue = value ?? '';
  return safeValue.trim().length > 0 ? MASKED_VALUE : 'Sin configurar';
}

/**
 * ProtectedField: Componente para manejar campos sensibles (Secrets, Passwords, Keys).
 * Soporta modos de visualización, selección para cambios y edición directa.
 */
export function ProtectedField({
  label,
  value,
  draftValue,
  description,
  mode,
  className,
  disabled = false,
  error,
  onStartEdit,
  onCancelEdit,
  onChange,
  id,
  reserveMessageSpace = true,
}: ProtectedFieldProps) {
  const displayValue = getProtectedDisplayValue(value);
  const fieldId = id ?? `protected-field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const isEditing = mode === 'editing';

  return (
    <FormField
      label={label}
      className={className}
      error={error}
      htmlFor={fieldId}
      reserveMessageSpace={reserveMessageSpace}
    >
      <div className="space-y-1.5">
        {isEditing ? (
          <div className="group flex flex-col gap-1.5">
            <div className="relative">
              <input
                id={fieldId}
                type="text"
                autoComplete="off"
                value={draftValue}
                disabled={disabled}
                onChange={(event) => onChange?.(event.target.value)}
                placeholder="Escribe el nuevo valor"
                className={cn(
                  "h-9 w-full rounded-md border border-border bg-background px-3 pr-28 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all",
                  "focus:border-transparent focus:ring-2 focus:ring-ring focus-visible:ring-offset-1",
                  disabled && "cursor-not-allowed opacity-60",
                  error && "border-destructive focus:ring-destructive/30"
                )}
                aria-invalid={!!error}
              />
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={disabled}
                className="absolute right-1.5 top-1.5 inline-flex h-6 items-center gap-1 rounded-md border border-border bg-card px-2 text-[10px] font-semibold text-muted-foreground transition-all hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                <X className="h-3 w-3" />
                CANCELAR
              </button>
            </div>
            {!error && (
              <p className="text-[10px] font-medium text-muted-foreground/80">
                Al guardar, se reemplazará el valor anterior.
              </p>
            )}
          </div>
        ) : (
          <div className="group relative">
            <button
              type="button"
              id={fieldId}
              onClick={mode === 'select' && !disabled ? onStartEdit : undefined}
              disabled={disabled}
              className={cn(
                'relative flex h-9 w-full items-center rounded-md border border-dashed bg-muted/20 pl-9 pr-10 text-left text-sm outline-none transition-all',
                mode === 'select' && !disabled
                  ? 'cursor-pointer border-primary/30 hover:border-primary/60 hover:bg-primary/5'
                  : 'cursor-default border-warning/30 bg-warning/5',
                disabled && 'cursor-not-allowed opacity-50'
              )}
              aria-label={`${label}: ${displayValue}. ${mode === 'select' ? 'Haz clic para editar' : 'Protegido'}`}
            >
              <Check className="absolute left-3 h-4 w-4 text-success" strokeWidth={3} />

              <span className="block truncate font-mono text-xs tracking-widest text-muted-foreground/80">
                {displayValue}
              </span>

              <span className="absolute right-2 top-1.5">
                {mode !== 'select' && description ? (
                  <TooltipProvider delayDuration={120}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                          "border-warning/20 bg-warning/10 text-warning"
                        )}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="border border-border bg-popover text-popover-foreground">
                        {description}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <span className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                    mode === 'select'
                      ? "border-primary/20 bg-primary/10 text-primary group-hover:bg-primary/20"
                      : "border-warning/20 bg-warning/10 text-warning"
                  )}>
                    {mode === 'select' ? <PencilLine className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  </span>
                )}
              </span>
            </button>

            {mode === 'select' && !disabled ? (
              <p className="mt-1 text-[10px] text-muted-foreground transition-opacity group-hover:opacity-100">
                Haz clic para reemplazar.
              </p>
            ) : description && !error ? (
              <p className="mt-1 text-[10px] text-muted-foreground">{description}</p>
            ) : null}
          </div>
        )}
      </div>
    </FormField>
  );
}
