export type FormControlSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type FormControlVariant = 'default' | 'filled' | 'ghost' | 'protected';

export const FORM_CONTROL_DEFAULT_SIZE: FormControlSize = 'md';
export const FORM_CONTROL_DEFAULT_VARIANT: FormControlVariant = 'default';

export interface FormControlVisualState {
  invalid?: boolean;
  success?: boolean;
  loading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}
