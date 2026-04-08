import type { DateRangeValue } from "./composer.types";
import { DateRangeSelector } from "../date-range/date-range-selector";

interface DateRangeFieldProps {
  label?: string;
  value?: DateRangeValue;
  minDate: Date;
  maxDate?: Date;
  onChange: (value?: DateRangeValue) => void;
}

export function DateRangeField({ label, value, minDate, maxDate, onChange }: DateRangeFieldProps) {
  return (
    <DateRangeSelector label={label} value={value} onChange={onChange} minDate={minDate} maxDate={maxDate} />
  );
}
