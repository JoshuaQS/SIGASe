import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, type InputProps } from '@/shared/components/ui/input';
import { FORM_CONTROL_DEFAULT_SIZE } from '@/shared/components/ui/forms/form-control-contract';
import { getFormControlSize, getInputAdornmentInsetClass } from '@/shared/components/ui/forms/form-control-styles';
import { cn } from '@/shared/lib/utils';

type PasswordInputProps = Omit<InputProps, 'type' | 'endAdornment'>;

const toggleSizeClass = {
  xs: 'h-5 w-5',
  sm: 'h-6 w-6',
  md: 'h-7 w-7',
  lg: 'h-8 w-8',
  xl: 'h-9 w-9',
} as const;

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, size = FORM_CONTROL_DEFAULT_SIZE, disabled, readOnly, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const resolvedSize = size ?? FORM_CONTROL_DEFAULT_SIZE;

    return (
      <div className="relative w-full">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          size={resolvedSize}
          disabled={disabled}
          readOnly={readOnly}
          endAdornment={<span className="block h-0 w-0" aria-hidden="true" />}
          className={className}
          {...props}
        />

        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors',
            'hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
            getInputAdornmentInsetClass(resolvedSize, 'end'),
            toggleSizeClass[resolvedSize],
          )}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          disabled={disabled || readOnly}
        >
          {visible ? (
            <EyeOff className={getFormControlSize(resolvedSize).icon} />
          ) : (
            <Eye className={getFormControlSize(resolvedSize).icon} />
          )}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';
