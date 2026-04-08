import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Button } from '@/shared/components/ui/button';
import {
  FORM_CONTROL_DEFAULT_SIZE,
  FORM_CONTROL_DEFAULT_VARIANT,
  type FormControlSize,
  type FormControlVariant,
} from '@/shared/components/ui/forms/form-control-contract';
import { getFormControlSize, getInputGroupClass } from '@/shared/components/ui/forms/form-control-styles';
import { cn } from '@/shared/lib/utils';

interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: FormControlSize;
  variant?: FormControlVariant;
  invalid?: boolean;
  success?: boolean;
  loading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
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
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      data-slot="input-group"
      className={cn(
        getInputGroupClass({ size, variant, invalid, success, loading, disabled, readOnly }),
        className,
      )}
      {...props}
    />
  ),
);
InputGroup.displayName = 'InputGroup';

const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    align?: 'inline-start' | 'inline-end';
    size?: FormControlSize;
  }
>(({ className, align = 'inline-start', size = FORM_CONTROL_DEFAULT_SIZE, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="input-group-addon"
    className={cn(
      'flex items-center text-muted-foreground shrink-0',
      getFormControlSize(size).addonGap,
      align === 'inline-start' ? 'mr-1' : 'ml-auto',
      className,
    )}
    {...props}
  />
));
InputGroupAddon.displayName = 'InputGroupAddon';

interface InputGroupInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: FormControlSize;
}

const InputGroupInput = React.forwardRef<HTMLInputElement, InputGroupInputProps>(
  ({ className, size = FORM_CONTROL_DEFAULT_SIZE, type, ...props }, ref) => {
    const cfg = getFormControlSize(size);

    return (
      <input
        type={type}
        className={cn(
          'h-full w-full bg-transparent outline-none placeholder:text-muted-foreground/65 disabled:cursor-not-allowed disabled:opacity-50',
          cfg.text,
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
InputGroupInput.displayName = 'InputGroupInput';

const InputGroupButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button> & { render?: React.ReactNode }
>(({ className, render, ...props }, ref) => {
  if (render) {
    return (
      <Slot ref={ref} className={cn('shrink-0', className)} {...props}>
        {render}
      </Slot>
    );
  }

  return <Button ref={ref} className={cn('shrink-0', className)} {...props} />;
});
InputGroupButton.displayName = 'InputGroupButton';

export { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton };
