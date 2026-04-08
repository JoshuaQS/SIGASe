import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Label } from '@/shared/components/ui/label';
import { FieldMessage } from '@/shared/components/ui/forms/field-message';
import type { FormControlSize } from '@/shared/components/ui/forms/form-control-contract';
import { FORM_CONTROL_DEFAULT_SIZE } from '@/shared/components/ui/forms/form-control-contract';
import { getFieldLayoutClass, getFormControlSize } from '@/shared/components/ui/forms/form-control-styles';
import { buildFormFieldA11y, mergeAriaDescribedBy } from '@/shared/components/ui/forms/form-field-a11y';
import { cn } from '@/shared/lib/utils';

type FormFieldLayout = 'vertical' | 'horizontal' | 'inline' | 'compact';

type FormFieldRenderControlProps = {
  id: string;
  disabled?: boolean;
  readOnly?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

export type FormFieldChildren =
  | React.ReactNode
  | ((props: { controlProps: FormFieldRenderControlProps }) => React.ReactNode);

export interface FormFieldProps {
  label?: string;
  description?: React.ReactNode;
  error?: React.ReactNode;
  warning?: React.ReactNode;
  success?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  size?: FormControlSize;
  layout?: FormFieldLayout;
  controlId?: string;
  describedBy?: string;
  icon?: LucideIcon | React.ReactNode;
  className?: string;
  children: FormFieldChildren;
}

function getActiveMessage({
  error,
  warning,
  success,
  description,
}: Pick<FormFieldProps, 'error' | 'warning' | 'success' | 'description'>) {
  if (error) return { value: error, variant: 'error' as const, role: 'alert' as const };
  if (warning) return { value: warning, variant: 'warning' as const, role: undefined };
  if (success) return { value: success, variant: 'success' as const, role: undefined };
  if (description) return { value: description, variant: 'hint' as const, role: undefined };
  return null;
}

function injectControlProps(
  node: React.ReactNode,
  controlProps: FormFieldRenderControlProps,
): React.ReactNode {
  if (!React.isValidElement(node)) return node;

  const element = node as React.ReactElement<Record<string, unknown>>;
  const existingProps = element.props;
  const mergedDescribedBy = mergeAriaDescribedBy(
    existingProps['aria-describedby'] as string | undefined,
    controlProps['aria-describedby'],
  );

  return React.cloneElement(element, {
    id: (existingProps.id as string | undefined) ?? controlProps.id,
    disabled:
      typeof existingProps.disabled === 'boolean'
        ? (existingProps.disabled as boolean)
        : controlProps.disabled,
    readOnly:
      typeof existingProps.readOnly === 'boolean'
        ? (existingProps.readOnly as boolean)
        : controlProps.readOnly,
    'aria-invalid':
      typeof existingProps['aria-invalid'] !== 'undefined'
        ? existingProps['aria-invalid']
        : controlProps['aria-invalid'],
    'aria-describedby': mergedDescribedBy,
  });
}

export function FormField({
  label,
  description,
  error,
  warning,
  success,
  required,
  optional,
  disabled,
  readOnly,
  size = FORM_CONTROL_DEFAULT_SIZE,
  layout = 'vertical',
  controlId,
  describedBy,
  icon,
  className,
  children,
}: FormFieldProps) {
  const reactId = React.useId();
  const baseId = `form-field-${reactId.replace(/:/g, '')}`;
  const activeMessage = getActiveMessage({ error, warning, success, description });
  const messageId = activeMessage ? `${baseId}-message` : undefined;

  const a11y = buildFormFieldA11y({
    generatedBaseId: baseId,
    controlId,
    describedBy,
    hasError: Boolean(error),
    messageId,
  });

  const controlProps: FormFieldRenderControlProps = {
    id: a11y.controlId,
    disabled,
    readOnly,
    'aria-invalid': a11y.ariaInvalid,
    'aria-describedby': a11y.describedBy,
  };

  const renderedChild =
    typeof children === 'function'
      ? children({ controlProps })
      : injectControlProps(children, controlProps);

  const hasMetadata = Boolean(label || activeMessage || required || optional || icon);
  const iconNode = icon
    ? React.isValidElement(icon)
      ? icon
      : React.createElement(icon as LucideIcon, {
          className: cn('text-muted-foreground', getFormControlSize(size).icon),
          'aria-hidden': true,
        })
    : null;

  if (!hasMetadata && layout !== 'horizontal' && layout !== 'inline') {
    return <div className={cn(getFieldLayoutClass(layout), className)}>{renderedChild}</div>;
  }

  const labelClass = cn(
    'inline-flex items-center gap-2 font-semibold text-foreground',
    getFormControlSize(size).fieldLabel,
    (disabled || readOnly) && 'text-muted-foreground',
  );

  const messageClass = cn(
    'leading-tight',
    getFormControlSize(size).fieldMessage,
    layout === 'compact' && 'text-[11px]',
  );

  const messageNode = activeMessage ? (
    <FieldMessage id={messageId} variant={activeMessage.variant} className={messageClass} role={activeMessage.role}>
      {activeMessage.value}
    </FieldMessage>
  ) : null;

  if (layout === 'horizontal') {
    return (
      <div className={cn(getFieldLayoutClass(layout), className)}>
        {label ? (
          <Label htmlFor={a11y.controlId} className={labelClass}>
            {iconNode}
            <span>
              {label}
              {required ? <span className="ml-1 text-destructive">*</span> : null}
              {!required && optional ? (
                <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional)</span>
              ) : null}
            </span>
          </Label>
        ) : (
          <div />
        )}

        <div className="space-y-1.5">
          {renderedChild}
          {messageNode}
        </div>
      </div>
    );
  }

  if (layout === 'inline') {
    return (
      <div className={cn(getFieldLayoutClass(layout), className)}>
        {label ? (
          <Label htmlFor={a11y.controlId} className={labelClass}>
            {iconNode}
            <span>
              {label}
              {required ? <span className="ml-1 text-destructive">*</span> : null}
            </span>
          </Label>
        ) : null}

        <div className="min-w-[12rem] flex-1">{renderedChild}</div>
        {messageNode ? <div className="w-full">{messageNode}</div> : null}
      </div>
    );
  }

  return (
    <div className={cn(getFieldLayoutClass(layout), className)}>
      {label ? (
        <Label htmlFor={a11y.controlId} className={labelClass}>
          {iconNode}
          <span>
            {label}
            {required ? <span className="ml-1 text-destructive">*</span> : null}
            {!required && optional ? (
              <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional)</span>
            ) : null}
          </span>
        </Label>
      ) : null}

      {renderedChild}
      {messageNode}
    </div>
  );
}
