import { Check, PencilLine, Shield, X, AlertCircle } from 'lucide-react';
import { FormField } from '@/components/ui/forms/form-field';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FORM_CONTROL_DEFAULT_SIZE,
  FORM_CONTROL_DEFAULT_VARIANT,
  type FormControlSize,
  type FormControlVariant,
} from '@/components/ui/forms/form-control-contract';
import {
  getFormControlBaseClass,
  getFormControlSize,
  getInputAdornmentInsetClass,
  getInputAdornmentPaddingClass,
} from '@/components/ui/forms/form-control-styles';
import { cn } from '@/lib/utils';

export type ProtectedFieldMode = 'view' | 'select' | 'editing';

interface ProtectedFieldProps {
  label: string;
  value: string;
  draftValue: string;
  description?: string;
  mode: ProtectedFieldMode;
  className?: string;
  disabled?: boolean;
  error?: string;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  onConfirmEdit?: () => void;
  onChange?: (next: string) => void;
  id?: string;
  reserveMessageSpace?: boolean;
  size?: FormControlSize;
  variant?: FormControlVariant;
}

const MASKED_VALUE = '••••••••••••';

function getProtectedDisplayValue(value: string | undefined | null) {
  const safeValue = value ?? '';
  return safeValue.trim().length > 0 ? MASKED_VALUE : 'Sin configurar';
}

const cancelButtonSizeMap: Record<FormControlSize, string> = {
  xs: 'h-5 px-1.5 text-[9px]',
  sm: 'h-5 px-2 text-[9px]',
  md: 'h-6 px-2 text-[10px]',
  lg: 'h-7 px-2.5 text-[10px]',
  xl: 'h-8 px-3 text-xs',
};

const iconButtonSizeMap: Record<FormControlSize, string> = {
  xs: 'h-5 w-5',
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-7 w-7',
  xl: 'h-8 w-8',
};

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
  onConfirmEdit,
  onChange,
  id,
  reserveMessageSpace = true,
  size = FORM_CONTROL_DEFAULT_SIZE,
  variant = FORM_CONTROL_DEFAULT_VARIANT,
}: ProtectedFieldProps) {
  const displayValue = getProtectedDisplayValue(value);
  const isEditing = mode === 'editing';
  const canStartEdit = mode === 'select' && !disabled;
  const effectiveVariant: FormControlVariant = variant === 'default' ? 'protected' : variant;
  const sizeCfg = getFormControlSize(size);

  return (
    <FormField
      label={label}
      controlId={id}
      error={error}
      description={!error && !isEditing ? description : undefined}
      size={size}
      className={className}
    >
      {({ controlProps }) => (
        <div className="space-y-1.5">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                {...controlProps}
                type="text"
                autoComplete="off"
                value={draftValue}
                disabled={disabled}
                onChange={(event) => onChange?.(event.target.value)}
                placeholder="Escribe el nuevo valor"
                className={cn(
                  getFormControlBaseClass({
                    size,
                    variant: effectiveVariant,
                    invalid: Boolean(error),
                    disabled,
                  }),
                  'flex-1 min-w-0',
                )}
              />
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={disabled}
                className={cn(
                  'inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-all hover:bg-accent hover:text-foreground disabled:opacity-50',
                  iconButtonSizeMap[size],
                )}
                aria-label="Cancelar edición"
              >
                <X className={sizeCfg.icon} />
              </button>
              <button
                type="button"
                onClick={onConfirmEdit}
                disabled={disabled || !onConfirmEdit}
                className={cn(
                  'inline-flex items-center justify-center rounded-md border border-success/40 bg-success/10 font-semibold text-success transition-all hover:bg-success/20 disabled:opacity-50',
                  cancelButtonSizeMap[size],
                )}
                aria-label="Confirmar reemplazo"
              >
                <Check className={sizeCfg.icon} />
              </button>
            </div>
          ) : (
            <div className="relative flex-1 min-w-0">
              <button
                type="button"
                id={controlProps.id}
                disabled={disabled}
                onClick={canStartEdit ? onStartEdit : undefined}
                aria-invalid={controlProps['aria-invalid']}
                aria-describedby={controlProps['aria-describedby']}
                aria-label={`${label}: ${displayValue}. ${canStartEdit ? 'Haz clic para editar' : 'Protegido'}`}
                className={cn(
                  getFormControlBaseClass({
                    size,
                    variant: effectiveVariant,
                    invalid: Boolean(error),
                    disabled,
                    readOnly: !canStartEdit,
                  }),
                  getInputAdornmentPaddingClass({
                    size,
                    startAdornment: true,
                    endAdornment: canStartEdit,
                  }),
                  'w-full border-orange-300/90 bg-orange-500/5 text-left',
                  canStartEdit && 'hover:border-orange-400 hover:bg-orange-500/10',
                )}
              >
                <span className="block truncate font-mono tracking-widest text-muted-foreground/80">{displayValue}</span>
              </button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 rounded-full bg-orange-500/15 p-1 text-orange-600',
                      getInputAdornmentInsetClass(size, 'start'),
                    )}
                    aria-hidden="true"
                  >
                    <Shield className={sizeCfg.icon} strokeWidth={2.2} />
                  </span>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>Credenciales cifradas en AES256</TooltipContent>
              </Tooltip>

              {canStartEdit ? (
                <span
                  className={cn(
                    'pointer-events-none absolute top-1/2 -translate-y-1/2 text-orange-600',
                    getInputAdornmentInsetClass(size, 'end'),
                  )}
                  aria-hidden="true"
                >
                  <PencilLine className={sizeCfg.icon} />
                </span>
              ) : null}
            </div>
          )}

          {isEditing && !error ? (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              Al guardar, se reemplazará el valor anterior.
            </p>
          ) : null}

          {reserveMessageSpace && !error && !description ? <div className="min-h-[1.1rem]" aria-hidden="true" /> : null}
        </div>
      )}
    </FormField>
  );
}
