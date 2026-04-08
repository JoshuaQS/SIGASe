import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";
import type { SortDirection } from "./composer.types";
import { getFormControlSize } from "@/shared/components/ui/forms/form-control-styles";

const FIELD_SIZE = "md" as const;
const cfg = getFormControlSize(FIELD_SIZE);

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
      {label ? <span className={cfg.fieldLabel}>{label}</span> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className={cn("flex w-full items-center gap-2 rounded-lg border border-input bg-background px-3", cfg.control)}>
            <span className="flex-1 text-left">{DIRECTION_OPTIONS.find((option) => option.value === value)?.label}</span>
            <ChevronDown className={cn("text-muted-foreground", cfg.icon)} />
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
                "flex w-full items-center rounded-md px-2 py-1.5 text-left",
                value === option.value ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              <span className="flex-1">{option.label}</span>
              {value === option.value && <Check className={cfg.icon} />}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
