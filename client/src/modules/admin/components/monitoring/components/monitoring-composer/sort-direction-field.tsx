import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { SortDirection } from "./composer.types";

interface SortDirectionFieldProps {
  value: SortDirection;
  label?: string;
  onChange: (direction: SortDirection) => void;
}

const DIRECTION_OPTIONS: Array<{ value: SortDirection; label: string }> = [
  { value: "desc", label: "Mayor a menor" },
  { value: "asc", label: "Menor a mayor" },
];

export function SortDirectionField({ value, label, onChange }: SortDirectionFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      {label ? <span className="text-xs font-medium text-muted-foreground">{label}</span> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
            <span className="flex-1 text-left">{DIRECTION_OPTIONS.find((option) => option.value === value)?.label}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[190px] p-1" align="start">
          {DIRECTION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm",
                value === option.value ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              <span className="flex-1">{option.label}</span>
              {value === option.value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
