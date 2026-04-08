import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  isAfter,
  isBefore,
  parse,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import type { DateRangeValue } from "./date-range.types";

export const clampNumber = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const normalizeDateRange = (range?: DateRangeValue): DateRangeValue | undefined => {
  if (!range?.from && !range?.to) return undefined;
  if (!range?.from && range?.to) return { from: startOfDay(range.to), to: startOfDay(range.to) };
  if (range?.from && !range?.to) return { from: startOfDay(range.from), to: startOfDay(range.from) };

  const from = startOfDay(range.from as Date);
  const to = startOfDay(range.to as Date);
  return isAfter(from, to) ? { from: to, to: from } : { from, to };
};

export const clampDate = (date: Date, minDate: Date, maxDate: Date) => {
  if (isBefore(date, minDate)) return startOfDay(minDate);
  if (isAfter(date, maxDate)) return startOfDay(maxDate);
  return startOfDay(date);
};

export const clampRangeToBounds = (
  range: DateRangeValue | undefined,
  minDate: Date,
  maxDate: Date
): DateRangeValue | undefined => {
  if (!range?.from && !range?.to) return undefined;

  const from = range.from ? clampDate(range.from, minDate, maxDate) : undefined;
  const to = range.to ? clampDate(range.to, minDate, maxDate) : undefined;

  if (from && to && isAfter(from, to)) {
    return { from: to, to: from };
  }

  return { from, to };
};

export const formatDateInputValue = (date?: Date) => {
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
};

export const parseDateInputValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = parse(trimmed, "yyyy-MM-dd", new Date());
  if (Number.isNaN(parsed.getTime())) return undefined;
  return startOfDay(parsed);
};

export const getRecentTimelineWindow = (maxDate: Date) => {
  const visibleEnd = startOfDay(maxDate);
  const visibleStart = startOfMonth(subMonths(visibleEnd, 5));
  return { visibleStart, visibleEnd };
};

export const rangeIntersection = (
  range: DateRangeValue | undefined,
  start: Date,
  end: Date
): DateRangeValue | undefined => {
  const normalized = normalizeDateRange(range);
  if (!normalized?.from || !normalized?.to) return undefined;

  const from = normalized.from;
  const to = normalized.to;

  if (isBefore(to, start) || isAfter(from, end)) return undefined;

  return {
    from: isBefore(from, start) ? start : from,
    to: isAfter(to, end) ? end : to,
  };
};

export const dateToPercent = (date: Date, start: Date, end: Date) => {
  const total = Math.max(1, differenceInCalendarDays(end, start));
  const current = clampNumber(differenceInCalendarDays(date, start), 0, total);
  return (current / total) * 100;
};

export const percentToDate = (percent: number, start: Date, end: Date) => {
  const total = Math.max(1, differenceInCalendarDays(end, start));
  const day = Math.round((clampNumber(percent, 0, 100) / 100) * total);
  return startOfDay(addDays(start, day));
};

export const getMonthLabels = (maxDate: Date) => {
  return Array.from({ length: 6 }, (_, index) => {
    const monthDate = startOfMonth(subMonths(maxDate, 5 - index));
    return {
      key: `${monthDate.getFullYear()}-${monthDate.getMonth() + 1}`,
      date: monthDate,
    };
  });
};

export const withDayEnd = (value?: DateRangeValue) => {
  if (!value?.from || !value?.to) return value;
  return {
    from: startOfDay(value.from),
    to: endOfDay(value.to),
  };
};
