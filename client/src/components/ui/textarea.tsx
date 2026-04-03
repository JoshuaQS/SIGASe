import * as React from 'react';
import { Loader2 } from 'lucide-react';
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
} from '@/components/ui/forms/form-control-styles';
import { cn } from '@/lib/utils';

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  size?: FormControlSize;
  variant?: FormControlVariant;
  invalid?: boolean;
  success?: boolean;
  loading?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      size = FORM_CONTROL_DEFAULT_SIZE,
      variant = FORM_CONTROL_DEFAULT_VARIANT,
      invalid,
      success,
      loading,
      disabled,
      readOnly,
      rows = 4,
      resize = 'vertical',
      ...props
    },
    ref,
  ) => {
    const cfg = getFormControlSize(size);
    const canShowLoading = loading && !disabled;

    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          rows={rows}
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
            cfg.textareaMinHeight,
            resize === 'none' && 'resize-none',
            resize === 'vertical' && 'resize-y',
            resize === 'horizontal' && 'resize-x',
            resize === 'both' && 'resize',
            canShowLoading && 'pr-10',
            className,
          )}
          {...props}
        />

        {canShowLoading ? (
          <span
            className={cn(
              'pointer-events-none absolute top-3 text-muted-foreground',
              getInputAdornmentInsetClass(size, 'end'),
            )}
            aria-hidden="true"
          >
            <Loader2 className={cn('animate-spin', getFormControlSize(size).icon)} />
          </span>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
