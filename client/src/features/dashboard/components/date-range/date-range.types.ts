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
}
