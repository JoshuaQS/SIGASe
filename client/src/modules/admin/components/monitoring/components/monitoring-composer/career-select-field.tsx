import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CAREER_OPTIONS } from "./composer.config";
import { getFormControlSize } from "@/components/ui/forms/form-control-styles";

const FIELD_SIZE: "md" = "md";
const cfg = getFormControlSize(FIELD_SIZE);

interface CareerSelectFieldProps {
  selected?: string;
  onChange: (selected?: string) => void;
}

export function CareerSelectField({ selected, onChange }: CareerSelectFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <span className={cfg.fieldLabel}>Carrera</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className={cn("flex w-full items-center gap-2 rounded-lg border border-input bg-background px-3", cfg.control)}>
            <span className="flex-1 truncate text-left">
              {selected ?? "Seleccionar carrera"}
            </span>
            <ChevronDown className={cn("text-muted-foreground", cfg.icon)} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-1" align="start">
          {CAREER_OPTIONS.map((career) => (
            <button
              key={career}
              type="button"
              onClick={() => {
                onChange(career);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
                selected === career ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              <span className="flex-1">{career}</span>
              {selected === career && <Check className={cfg.icon} />}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
