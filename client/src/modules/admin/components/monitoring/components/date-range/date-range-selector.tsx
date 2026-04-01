import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DATE_RANGE_PRESETS } from "./date-range-presets";
import { DateRangeCalendar } from "./date-range-calendar";
import { DateRangeSlider } from "./date-range-slider";
import type { DateRangeSelectorProps, DateRangeValue } from "./date-range.types";
import { clampRangeToBounds, normalizeDateRange } from "./date-range.utils";

const formatRange = (value?: DateRangeValue) => {
  const normalized = normalizeDateRange(value);
  if (!normalized?.from || !normalized.to) return "Abrir calendario";
  return `${format(normalized.from, "d MMM yyyy", { locale: es })} - ${format(normalized.to, "d MMM yyyy", { locale: es })}`;
};

export function DateRangeSelector({ label, value, onChange, minDate, maxDate }: DateRangeSelectorProps) {
  const lowerBound = useMemo(() => startOfDay(minDate ?? new Date("2024-01-01")), [minDate]);
  const upperBound = useMemo(() => startOfDay(maxDate ?? new Date()), [maxDate]);

  const committedRange = useMemo(
    () => clampRangeToBounds(normalizeDateRange(value), lowerBound, upperBound),
    [value, lowerBound, upperBound]
  );

  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRangeValue | undefined>(committedRange);
  const [activePreset, setActivePreset] = useState<string | undefined>();

  const applyPreset = (presetKey: string) => {
    const preset = DATE_RANGE_PRESETS.find((item) => item.key === presetKey);
    if (!preset) return;
    const next = clampRangeToBounds(preset.getRange(upperBound), lowerBound, upperBound);
    setDraftRange(next);
    setActivePreset(presetKey);
  };

  return (
    <div className="flex flex-col gap-1">
      {label ? <span className="text-xs font-medium text-muted-foreground">{label}</span> : null}
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDraftRange(committedRange);
            setActivePreset(undefined);
          } else {
            setDraftRange(committedRange);
          }
          setOpen(nextOpen);
        }}
      >
        <PopoverTrigger asChild>
          <button className="flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className={cn("truncate text-left", !committedRange && "text-muted-foreground")}>{formatRange(committedRange)}</span>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-[880px] max-w-[calc(100vw-1.5rem)] p-0" align="start" sideOffset={8}>
          <div className="flex flex-col lg:flex-row">
            <aside className="w-full border-b border-border p-3 lg:w-[220px] lg:border-b-0 lg:border-r">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selección rápida</p>
              <div className="space-y-1">
                {DATE_RANGE_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset.key)}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left text-sm",
                      activePreset === preset.key
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </aside>

            <div className="flex-1">
              <div className="border-b border-border px-5 pb-3 pt-3">
                <DateRangeSlider value={draftRange} onChange={(next) => {
                  setDraftRange(clampRangeToBounds(normalizeDateRange(next), lowerBound, upperBound));
                  setActivePreset(undefined);
                }} minDate={lowerBound} maxDate={upperBound} />
              </div>

              <div className="border-b border-border px-5 py-3">
                <DateRangeCalendar
                  value={draftRange}
                  onChange={(next) => {
                    setDraftRange(clampRangeToBounds(normalizeDateRange(next), lowerBound, upperBound));
                    setActivePreset(undefined);
                  }}
                  minDate={lowerBound}
                  maxDate={upperBound}
                />
              </div>

              <div className="flex items-center justify-between gap-4 bg-secondary/20 px-5 py-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{formatRange(draftRange)}</p>
                  <p className="text-xs text-muted-foreground">Histórico disponible desde {format(lowerBound, "d MMM yyyy", { locale: es })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium"
                    onClick={() => {
                      setDraftRange(undefined);
                      setActivePreset(undefined);
                    }}
                  >
                    Reestablecer
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    onClick={() => {
                      onChange?.(draftRange);
                      setOpen(false);
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
