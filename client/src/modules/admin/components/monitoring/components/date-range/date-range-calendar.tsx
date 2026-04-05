import { useMemo } from "react";
import CalendarRange from "@/components/ui/calendarrange";
import type { DateRange } from "react-day-picker";
import type { DateRangeValue } from "./date-range.types";
import styles from "./date-range-calendar.module.css";

interface DateRangeCalendarProps {
  value?: DateRangeValue;
  onChange: (next?: DateRangeValue) => void;
  minDate: Date;
  maxDate: Date;
}

export function DateRangeCalendar({ value, onChange, minDate, maxDate }: DateRangeCalendarProps) {
  const selected = useMemo<DateRange | undefined>(() => {
    if (!value?.from && !value?.to) return undefined;
    return {
      from: value?.from,
      to: value?.to,
    };
  }, [value]);

  return (
    <CalendarRange
      value={selected}
      onChange={(range) => {
        if (!range?.from && !range?.to) {
          onChange(undefined);
          return;
        }
        onChange({ from: range?.from, to: range?.to ?? range?.from });
      }}
      numberOfMonths={2}
      minDate={minDate}
      maxDate={maxDate}
      className={`rounded-none border-0 p-0 ${styles.calendarRoot}`}
      classNames={{
        month: "space-y-4 rdp-month",
        caption: "flex justify-center pt-1 relative items-center rdp-caption",
        nav: "space-x-1 flex items-center rdp-nav",
        nav_button_previous: "absolute left-1 rdp-nav_button_previous",
        nav_button_next: "absolute right-1 rdp-nav_button_next",
      }}
    />
  );
}
