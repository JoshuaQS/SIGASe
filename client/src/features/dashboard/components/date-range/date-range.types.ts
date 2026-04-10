import type { FormControlSize } from "@/shared/components/ui/forms/form-control-contract";

export interface DateRangeValue {
  from?: Date;
  to?: Date;
}

export interface DateRangeSelectorProps {
  label?: string;
  value?: DateRangeValue;
  onChange?: (value?: DateRangeValue) => void;
  minDate?: Date;
  maxDate?: Date;
  size?: FormControlSize;
}
