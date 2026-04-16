import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";

import type { FilterFieldConfig, FilterState } from "./filter-types";
import { countActiveFilters } from "./filter-utils";
import { TableFilterPanel } from "./table-filter-panel";

type DataTableFiltersPopoverProps<TState extends FilterState> = {
  title?: string;
  fields: FilterFieldConfig[];
  value: TState;
  onChange: (next: TState) => void;
  onApply?: () => void;
  onClear?: () => void;
  onReset?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  activeCountValue?: TState;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
};

export const DataTableFiltersPopover = <TState extends FilterState>({
  title = "Filtros",
  fields,
  value,
  onChange,
  onApply,
  onClear,
  onReset,
  open,
  onOpenChange,
  activeCountValue,
  align = "end",
  side = "bottom",
  className,
}: DataTableFiltersPopoverProps<TState>) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const resolvedOpen = open ?? internalOpen;
  const handleOpenChange = onOpenChange ?? setInternalOpen;
  const activeFiltersCount = countActiveFilters(activeCountValue ?? value);

  const handleApply = () => {
    onApply?.();
    handleOpenChange(false);
  };

  const handleClear = () => {
    onClear?.();
  };

  return (
    <Popover open={resolvedOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <SlidersHorizontal size={16} />
          Filtros

          {activeFiltersCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {activeFiltersCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        side={side}
        sideOffset={8}
        className="w-auto border-none bg-transparent p-0 shadow-none"
      >
        <TableFilterPanel
          title={title}
          fields={fields}
          value={value}
          onChange={onChange}
          onApply={handleApply}
          onClear={handleClear}
          onReset={onReset}
          onCancel={() => handleOpenChange(false)}
          className={className}
        />
      </PopoverContent>
    </Popover>
  );
};
