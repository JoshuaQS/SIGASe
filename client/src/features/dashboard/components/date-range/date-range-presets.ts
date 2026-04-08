import { startOfDay, startOfMonth, startOfYear, subDays, subMonths } from "date-fns";
import type { DateRangeValue } from "./date-range.types";

export interface DateRangePreset {
  key: string;
  label: string;
  getRange: (maxDate: Date) => DateRangeValue;
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    key: "last-7",
    label: "Últimos 7 días",
    getRange: (maxDate) => ({ from: subDays(startOfDay(maxDate), 6), to: startOfDay(maxDate) }),
  },
  {
    key: "last-30",
    label: "Últimos 30 días",
    getRange: (maxDate) => ({ from: subDays(startOfDay(maxDate), 29), to: startOfDay(maxDate) }),
  },
  {
    key: "last-90",
    label: "Últimos 90 días",
    getRange: (maxDate) => ({ from: subDays(startOfDay(maxDate), 89), to: startOfDay(maxDate) }),
  },
  {
    key: "this-month",
    label: "Este mes",
    getRange: (maxDate) => ({ from: startOfMonth(maxDate), to: startOfDay(maxDate) }),
  },
  {
    key: "this-year",
    label: "Este año",
    getRange: (maxDate) => ({ from: startOfYear(maxDate), to: startOfDay(maxDate) }),
  },
  {
    key: "last-month",
    label: "Mes pasado",
    getRange: (maxDate) => {
      const currentMonth = startOfMonth(maxDate);
      const prevMonth = startOfMonth(subMonths(maxDate, 1));
      return { from: prevMonth, to: subDays(currentMonth, 1) };
    },
  },
];
