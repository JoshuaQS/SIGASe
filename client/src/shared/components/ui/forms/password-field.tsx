import * as React from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import { useCapsLock } from '@/shared/hooks/use-caps-lock';
import { FormField } from '@/shared/components/ui/forms/form-field';
import { PasswordInput } from '@/shared/components/ui/forms/password-input';
import { mergeAriaDescribedBy } from '@/shared/components/ui/forms/form-field-a11y';
import { cn } from '@/shared/lib/utils';

interface PasswordFieldProps extends React.ComponentPropsWithoutRef<typeof PasswordInput> {
  label?: string;
  error?: string;
  description?: string;
  showCapsLockWarning?: boolean;
  icon?: typeof Lock;
  requirementHint?: string;
}

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  (
    {
      label = 'Contraseña',
      error,
      description,
      showCapsLockWarning = true,
      icon: Icon,
      requirementHint,
      id,
      className,
      onKeyDown,
      onKeyUp,
      ...props
    },
    ref,
  ) => {
    const { isCapsLockOn, handleKeyDown, handleKeyUp } = useCapsLock();

    return (
      <FormField
        label={label || undefined}
        controlId={id}
        error={error}
        description={description}
        icon={Icon}
        className={cn('w-full', className)}
      >
        {({ controlProps }) => {
          const capsLockId = `${controlProps.id}-caps-lock`;
          const requirementsId = `${controlProps.id}-requirements`;
          const describedBy = mergeAriaDescribedBy(
            controlProps['aria-describedby'],
            showCapsLockWarning && isCapsLockOn ? capsLockId : undefined,
            !error && requirementHint ? requirementsId : undefined,
          );

          return (
            <div className="space-y-1.5">
              <PasswordInput
                {...props}
                {...controlProps}
                ref={ref}
                invalid={Boolean(error)}
                aria-describedby={describedBy}
                onKeyDown={(event) => {
                  handleKeyDown(event);
                  onKeyDown?.(event);
                }}
                onKeyUp={(event) => {
                  handleKeyUp(event);
                  onKeyUp?.(event);
                }}
              />

              {showCapsLockWarning && isCapsLockOn ? (
                <p
                  id={capsLockId}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-warning animate-in fade-in slide-in-from-top-1"
                  role="status"
                >
                  <AlertCircle className="h-3 w-3" />
                  Bloq Mayús activado
                </p>
              ) : null}

              {!error && requirementHint ? (
                <p id={requirementsId} className="text-[11px] leading-tight text-muted-foreground">
                  {requirementHint}
                </p>
              ) : null}
            </div>
          );
        }}
      </FormField>
    );
  },
);

PasswordField.displayName = 'PasswordField';
