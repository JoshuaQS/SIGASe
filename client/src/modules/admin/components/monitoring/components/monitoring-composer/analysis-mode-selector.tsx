import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AnalysisMode } from "./composer.types";

interface AnalysisModeSelectorProps {
  value: AnalysisMode;
  onChange: (mode: AnalysisMode) => void;
}

const MODES: Array<{ value: AnalysisMode; label: string; description: string }> = [
  {
    value: "single-student",
    label: "1 estudiante",
    description: "Analiza accesos de un estudiante específico.",
  },
  {
    value: "all-students",
    label: "Todos los estudiantes",
    description: "Analiza una lista global de estudiantes.",
  },
  {
    value: "single-career",
    label: "1 carrera",
    description: "Analiza estudiantes dentro de una carrera seleccionada.",
  },
  {
    value: "all-careers",
    label: "Todas las carreras",
    description: "Analiza carreras por volumen de accesos.",
  },
];

export function AnalysisModeSelector({ value, onChange }: AnalysisModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = MODES.find((mode) => mode.value === value) ?? MODES[0];

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">Modo de análisis</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
            <span className="flex-1 truncate text-left">{selected.label}</span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-1" align="start">
          {MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => {
                onChange(mode.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left",
                value === mode.value ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              <span className="flex-1">
                <span className="block text-sm font-medium">{mode.label}</span>
                <span className="block text-xs">{mode.description}</span>
              </span>
              {value === mode.value && <Check className="mt-0.5 h-4 w-4 shrink-0" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
