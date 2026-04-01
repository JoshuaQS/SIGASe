import { useState } from "react";
import { Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MonitoringComposerBar } from "./monitoring-composer-bar";
import { DEFAULT_COMPOSER_DRAFT_STATE, type ComposerDraftState } from "./composer.types";

interface MonitoringFiltersCardProps {
  minDate?: Date;
  value?: ComposerDraftState;
  onChange?: (value: ComposerDraftState) => void;
}

export function MonitoringFiltersCard({ minDate, value, onChange }: MonitoringFiltersCardProps) {
  const [localValue, setLocalValue] = useState<ComposerDraftState>(DEFAULT_COMPOSER_DRAFT_STATE);

  const composerValue = value ?? localValue;
  const setComposerValue = (next: ComposerDraftState) => {
    if (!value) setLocalValue(next);
    onChange?.(next);
  };

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <aside className="shrink-0 rounded-xl border border-border/70 bg-secondary/20 p-4 lg:w-[260px]">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Filter className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-base font-semibold">Panel de filtros</h3>
            <p className="text-sm text-muted-foreground">Monitoreo y reportes</p>
          </aside>

          <div className="min-w-0 flex-1 rounded-xl border border-border/70 bg-background p-3">
            <MonitoringComposerBar
              value={composerValue}
              onChange={setComposerValue}
              minDate={minDate ?? new Date("2024-01-01")}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
