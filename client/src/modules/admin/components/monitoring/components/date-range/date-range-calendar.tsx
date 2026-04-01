import { useMemo, useState } from "react";
import { startOfMonth } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import type { DateRangeValue } from "./date-range.types";

interface DateRangeCalendarProps {
  value?: DateRangeValue;
  onChange: (next?: DateRangeValue) => void;
  minDate: Date;
  maxDate: Date;
}

export function DateRangeCalendar({ value, onChange, minDate, maxDate }: DateRangeCalendarProps) {
  const [month, setMonth] = useState<Date>(startOfMonth(maxDate));

  const selected = useMemo<DateRange | undefined>(() => {
    if (!value?.from && !value?.to) return undefined;
    return {
      from: value?.from,
      to: value?.to,
    };
  }, [value]);

  return (
    <Calendar
      mode="range"
      month={month}
      onMonthChange={setMonth}
      selected={selected}
      onSelect={(range) => {
        if (!range?.from && !range?.to) {
          onChange(undefined);
          return;
        }
        onChange({ from: range?.from, to: range?.to ?? range?.from });
      }}
      numberOfMonths={2}
      disabled={{ before: minDate, after: maxDate }}
      pagedNavigation
      className="p-0"
      classNames={{
        months: "flex flex-col md:flex-row gap-4 justify-center",
        month: "space-y-2",
      }}
    />
  );
}
