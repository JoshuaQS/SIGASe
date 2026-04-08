import * as React from 'react';
import { Loader2 } from 'lucide-react';
import {
  FORM_CONTROL_DEFAULT_SIZE,
  FORM_CONTROL_DEFAULT_VARIANT,
  type FormControlSize,
  type FormControlVariant,
} from '@/shared/components/ui/forms/form-control-contract';
import {
  getFormControlBaseClass,
  getFormControlSize,
  getInputAdornmentInsetClass,
  getInputAdornmentPaddingClass,
} from '@/shared/components/ui/forms/form-control-styles';
import { cn } from '@/shared/lib/utils';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: FormControlSize;
  variant?: FormControlVariant;
  invalid?: boolean;
  success?: boolean;
  loading?: boolean;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      size = FORM_CONTROL_DEFAULT_SIZE,
      variant = FORM_CONTROL_DEFAULT_VARIANT,
      invalid,
      success,
      loading,
      startAdornment,
      endAdornment,
      disabled,
      readOnly,
      ...props
    },
    ref,
  ) => {
    const hasStartAdornment = Boolean(startAdornment);
    const hasEndAdornment = Boolean(endAdornment) || Boolean(loading);
    const cfg = getFormControlSize(size);

    return (
      <div className="relative w-full" data-slot="input-root">
        {hasStartAdornment ? (
          <span
            className={cn(
              'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
              getInputAdornmentInsetClass(size, 'start'),
            )}
            aria-hidden="true"
          >
            <span className="flex items-center justify-center">{startAdornment}</span>
          </span>
        ) : null}

        <input
          ref={ref}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={invalid || undefined}
          className={cn(
            getFormControlBaseClass({
              size,
              variant,
              invalid,
              success,
              loading,
              disabled,
              readOnly,
            }),
            getInputAdornmentPaddingClass({
              size,
              startAdornment: hasStartAdornment,
              endAdornment: hasEndAdornment,
            }),
            className,
          )}
          {...props}
        />

        {loading && !disabled ? (
          <span
            className={cn(
              'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
              getInputAdornmentInsetClass(size, 'end'),
            )}
            aria-hidden="true"
          >
            <Loader2 className={cn('animate-spin', cfg.icon)} />
          </span>
        ) : endAdornment ? (
          <span
            className={cn(
              'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
              getInputAdornmentInsetClass(size, 'end'),
            )}
            aria-hidden="true"
          >
            <span className="flex items-center justify-center">{endAdornment}</span>
          </span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
