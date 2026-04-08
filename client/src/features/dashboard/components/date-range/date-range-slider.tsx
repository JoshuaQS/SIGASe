import { useCallback, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/shared/lib/utils";
import type { DateRangeValue } from "./date-range.types";
import { clampRangeToBounds, dateToPercent, getMonthLabels, getRecentTimelineWindow, percentToDate, rangeIntersection } from "./date-range.utils";

type DragMode = "left" | "right" | null;

interface DateRangeSliderProps {
  value?: DateRangeValue;
  onChange: (value?: DateRangeValue) => void;
  minDate: Date;
  maxDate: Date;
}

export function DateRangeSlider({ value, onChange, minDate, maxDate }: DateRangeSliderProps) {
  const [dragging, setDragging] = useState<DragMode>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const timeline = useMemo(() => getRecentTimelineWindow(maxDate), [maxDate]);
  const monthMarks = useMemo(() => getMonthLabels(maxDate), [maxDate]);

  const bounded = useMemo(() => clampRangeToBounds(value, minDate, maxDate), [value, minDate, maxDate]);
  const visibleRange = useMemo(
    () => rangeIntersection(bounded, timeline.visibleStart, timeline.visibleEnd),
    [bounded, timeline.visibleStart, timeline.visibleEnd]
  );

  const left = visibleRange?.from
    ? dateToPercent(visibleRange.from, timeline.visibleStart, timeline.visibleEnd)
    : 0;
  const right = visibleRange?.to
    ? dateToPercent(visibleRange.to, timeline.visibleStart, timeline.visibleEnd)
    : 0;

  const canDrag = Boolean(bounded?.from && bounded?.to);

  const handlePointerDown = useCallback(
    (mode: Exclude<DragMode, null>) => (event: React.PointerEvent) => {
      if (!canDrag) return;
      event.preventDefault();
      setDragging(mode);
      const move = (moveEvent: PointerEvent) => {
        if (!trackRef.current || !bounded?.from || !bounded?.to) return;
        const rect = trackRef.current.getBoundingClientRect();
        const percent = ((moveEvent.clientX - rect.left) / rect.width) * 100;
        const cursorDate = percentToDate(percent, timeline.visibleStart, timeline.visibleEnd);

        if (mode === "left") {
          onChange({
            from: cursorDate > bounded.to ? bounded.to : cursorDate,
            to: bounded.to,
          });
        }

        if (mode === "right") {
          onChange({
            from: bounded.from,
            to: cursorDate < bounded.from ? bounded.from : cursorDate,
          });
        }
      };

      const up = () => {
        setDragging(null);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [bounded, canDrag, onChange, timeline.visibleEnd, timeline.visibleStart]
  );

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cronología (últimos 6 meses visibles)</div>

      <div ref={trackRef} className="relative h-8 rounded-md border border-border bg-secondary/40 px-2">
        <div className="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />

        {visibleRange && (
          <>
            <div
              className={cn("absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary/35", dragging && "bg-primary/50")}
              style={{ left: `calc(${left}% + 8px)`, width: `${Math.max(0, right - left)}%` }}
            />

            <button
              type="button"
              aria-label="Ajustar fecha inicial"
              onPointerDown={handlePointerDown("left")}
              className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-primary/60 bg-background"
              style={{ left: `calc(${left}% + 2px)` }}
            />
            <button
              type="button"
              aria-label="Ajustar fecha final"
              onPointerDown={handlePointerDown("right")}
              className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-primary/60 bg-background"
              style={{ left: `calc(${right}% + 2px)` }}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-6 gap-1 rounded-md border border-border bg-secondary/20 px-2 py-1">
        {monthMarks.map((mark) => (
          <span key={mark.key} className="text-center text-[11px] font-medium capitalize text-muted-foreground">
            {format(mark.date, "MMM", { locale: es })}
          </span>
        ))}
      </div>

      {bounded?.from && bounded?.to && !visibleRange && (
        <p className="text-xs text-muted-foreground">
          Selección fuera de la ventana visible: {format(bounded.from, "d MMM yyyy", { locale: es })} - {format(bounded.to, "d MMM yyyy", { locale: es })}
        </p>
      )}
    </div>
  );
}
