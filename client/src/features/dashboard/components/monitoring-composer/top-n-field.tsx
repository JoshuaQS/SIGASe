import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";
import { getFormControlSize } from "@/shared/components/ui/forms/form-control-styles";

interface TopNFieldProps {
  value?: number;
  options: readonly number[];
  label?: string;
  onChange: (value: number) => void;
}

const FIELD_SIZE = "md" as const;
const cfg = getFormControlSize(FIELD_SIZE);

export function TopNField({ value, options, label, onChange }: TopNFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      {label ? <span className={cn("text-muted-foreground", cfg.fieldLabel)}>{label}</span> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className={cn("flex w-full items-center gap-2 rounded-lg border border-input bg-background px-3", cfg.control, cfg.text)}>
            <span className="flex-1 text-left">{value ?? options[0]}</span>
            <ChevronDown className={cn(cfg.icon, "text-muted-foreground")} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[150px] p-1" align="start">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm",
                value === option ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              <span className="flex-1">{option}</span>
              {value === option && <Check className="h-4 w-4" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
