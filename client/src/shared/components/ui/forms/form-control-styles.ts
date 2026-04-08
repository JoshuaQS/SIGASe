import { cn } from '@/shared/lib/utils';
import {
  FORM_CONTROL_DEFAULT_SIZE,
  FORM_CONTROL_DEFAULT_VARIANT,
  type FormControlSize,
  type FormControlVariant,
  type FormControlVisualState,
} from '@/shared/components/ui/forms/form-control-contract';

export const formControlSizeMap: Record<
  FormControlSize,
  {
    control: string;
    text: string;
    px: string;
    icon: string;
    addonGap: string;
    inputStartPadding: string;
    inputEndPadding: string;
    adornmentInsetStart: string;
    adornmentInsetEnd: string;
    textareaMinHeight: string;
    fieldLabel: string;
    fieldMessage: string;
  }
> = {
  xs: {
    control: 'h-7 rounded-sm',
    text: 'text-[10px]',
    px: 'px-2',
    icon: 'h-3.5 w-3.5',
    addonGap: 'gap-1',
    inputStartPadding: 'pl-7',
    inputEndPadding: 'pr-7',
    adornmentInsetStart: 'left-2',
    adornmentInsetEnd: 'right-2',
    textareaMinHeight: 'min-h-20 py-1.5',
    fieldLabel: 'text-xs',
    fieldMessage: 'text-[11px]',
  },
  sm: {
    control: 'h-8 rounded-sm',
    text: 'text-xs',
    px: 'px-3',
    icon: 'h-3.5 w-3.5',
    addonGap: 'gap-1.5',
    inputStartPadding: 'pl-9',
    inputEndPadding: 'pr-9',
    adornmentInsetStart: 'left-3',
    adornmentInsetEnd: 'right-3',
    textareaMinHeight: 'min-h-24 py-2',
    fieldLabel: 'text-xs',
    fieldMessage: 'text-[11px]',
  },
  md: {
    control: 'h-9 rounded-sm',
    text: 'text-sm',
    px: 'px-4',
    icon: 'h-4 w-4',
    addonGap: 'gap-2',
    inputStartPadding: 'pl-10',
    inputEndPadding: 'pr-10',
    adornmentInsetStart: 'left-4',
    adornmentInsetEnd: 'right-4',
    textareaMinHeight: 'min-h-28 py-2.5',
    fieldLabel: 'text-sm',
    fieldMessage: 'text-xs',
  },
  lg: {
    control: 'h-11 rounded-sm',
    text: 'text-base',
    px: 'px-6',
    icon: 'h-4 w-4',
    addonGap: 'gap-2.5',
    inputStartPadding: 'pl-12',
    inputEndPadding: 'pr-12',
    adornmentInsetStart: 'left-6',
    adornmentInsetEnd: 'right-6',
    textareaMinHeight: 'min-h-32 py-3',
    fieldLabel: 'text-sm',
    fieldMessage: 'text-xs',
  },
  xl: {
    control: 'h-11 rounded-lg',
    text: 'text-base',
    px: 'px-4',
    icon: 'h-5 w-5',
    addonGap: 'gap-2',
    inputStartPadding: 'pl-11',
    inputEndPadding: 'pr-11',
    adornmentInsetStart: 'left-4',
    adornmentInsetEnd: 'right-4',
    textareaMinHeight: 'min-h-36 py-3.5',
    fieldLabel: 'text-base',
    fieldMessage: 'text-sm',
  },
};

export function getFormControlSize(size: FormControlSize = FORM_CONTROL_DEFAULT_SIZE) {
  return formControlSizeMap[size];
}

export function getFormControlVariantClass(
  variant: FormControlVariant = FORM_CONTROL_DEFAULT_VARIANT,
): string {
  switch (variant) {
    case 'filled':
      return 'border-border bg-secondary/50 text-foreground';
    case 'ghost':
      return 'border-transparent bg-transparent text-foreground';
    case 'protected':
      return 'border-border border-dashed bg-muted/20 text-foreground';
    case 'default':
    default:
      return 'border-border bg-background text-foreground';
  }
}

export function getFormControlStateClass(state: FormControlVisualState): string {
  if (state.disabled) {
    return 'cursor-not-allowed border-border bg-muted text-muted-foreground opacity-60 pointer-events-none';
  }

  if (state.readOnly) {
    return 'cursor-default border-border bg-muted/40 text-foreground';
  }

  if (state.invalid) {
    return 'border-destructive focus-visible:border-destructive focus-visible:ring-2 focus-visible:ring-destructive/25';
  }

  if (state.success) {
    return 'border-success focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/20';
  }

  if (state.loading) {
    return 'cursor-progress';
  }

  return 'focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-ring';
}

export function getFormControlBaseClass({
  size = FORM_CONTROL_DEFAULT_SIZE,
  variant = FORM_CONTROL_DEFAULT_VARIANT,
  invalid,
  success,
  loading,
  disabled,
  readOnly,
}: {
  size?: FormControlSize;
  variant?: FormControlVariant;
  invalid?: boolean;
  success?: boolean;
  loading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const cfg = getFormControlSize(size);

  return cn(
    'w-full border outline-none transition-all placeholder:text-muted-foreground',
    cfg.control,
    cfg.text,
    cfg.px,
    getFormControlVariantClass(variant),
    getFormControlStateClass({ invalid, success, loading, disabled, readOnly }),
  );
}

export function getInputAdornmentPaddingClass({
  size = FORM_CONTROL_DEFAULT_SIZE,
  startAdornment,
  endAdornment,
}: {
  size?: FormControlSize;
  startAdornment?: boolean;
  endAdornment?: boolean;
}) {
  const cfg = getFormControlSize(size);

  return cn(startAdornment && cfg.inputStartPadding, endAdornment && cfg.inputEndPadding);
}

export function getInputAdornmentInsetClass(
  size: FormControlSize = FORM_CONTROL_DEFAULT_SIZE,
  side: 'start' | 'end' = 'start',
) {
  const cfg = getFormControlSize(size);
  return side === 'start' ? cfg.adornmentInsetStart : cfg.adornmentInsetEnd;
}

export function getFieldLayoutClass(layout: 'vertical' | 'horizontal' | 'inline' | 'compact' = 'vertical') {
  switch (layout) {
    case 'horizontal':
      return 'grid gap-3 sm:grid-cols-[minmax(10rem,14rem)_1fr] sm:items-start';
    case 'inline':
      return 'flex flex-wrap items-start gap-2';
    case 'compact':
      return 'space-y-1';
    case 'vertical':
    default:
      return 'space-y-1.5';
  }
}

export function getInputGroupClass({
  size = FORM_CONTROL_DEFAULT_SIZE,
  variant = FORM_CONTROL_DEFAULT_VARIANT,
  invalid,
  success,
  loading,
  disabled,
  readOnly,
}: {
  size?: FormControlSize;
  variant?: FormControlVariant;
  invalid?: boolean;
  success?: boolean;
  loading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const cfg = getFormControlSize(size);

  return cn(
    'flex w-full items-center border transition-all focus-within:ring-2',
    cfg.control,
    cfg.text,
    cfg.px,
    getFormControlVariantClass(variant),
    getFormControlStateClass({ invalid, success, loading, disabled, readOnly }),
  );
}
