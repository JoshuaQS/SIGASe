import { useState } from "react";
import { Download, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { button as Button } from "@/components/ui/button";
import { MonitoringComposerBar } from "./monitoring-composer-bar";
import { DEFAULT_COMPOSER_DRAFT_STATE, type ComposerDraftState } from "./composer.types";

interface MonitoringFiltersCardProps {
  minDate?: Date;
  value?: ComposerDraftState;
  onChange?: (value: ComposerDraftState) => void;
  onExport?: () => void;
}

export function MonitoringFiltersCard({ minDate, value, onChange, onExport }: MonitoringFiltersCardProps) {
  const [localValue, setLocalValue] = useState<ComposerDraftState>(DEFAULT_COMPOSER_DRAFT_STATE);
  const [isFiltering, setIsFiltering] = useState(false);

  const composerValue = value ?? localValue;
  const setComposerValue = (next: ComposerDraftState) => {
    if (!value) setLocalValue(next);
    onChange?.(next);
  };
  const hasType = Boolean(composerValue.type);
  const hasMode =
    composerValue.type === "students"
      ? Boolean(composerValue.studentMode)
      : composerValue.type === "careers";
  const canFilter =
    composerValue.type === "students"
      ? composerValue.studentMode === "individual"
        ? hasType && hasMode && Boolean(composerValue.student?.selectedId) && Boolean(composerValue.status)
        : hasType && hasMode && Boolean(composerValue.status)
      : composerValue.type === "careers"
        ? hasType && hasMode && Boolean(composerValue.status)
        : false;
  const handleFilter = () => {
    if (!canFilter || isFiltering) return;
    setIsFiltering(true);
    setComposerValue({ ...composerValue, didFilter: false });
    window.setTimeout(() => {
      setComposerValue({ ...composerValue, didFilter: true });
      setIsFiltering(false);
    }, 600);
  };

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <aside className="shrink-0 rounded-xl border border-border/70 bg-secondary/20 p-4 lg:w-[260px] lg:self-stretch">
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
        <div className="mt-2 flex justify-end">
          <div className="flex items-center gap-2">
            <Button
              disabled={isFiltering}
              variant="outline"
              size="md"
              className="h-9 w-[120px] justify-center gap-2 rounded-lg"
              onClick={onExport}
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          <Button
            disabled={!canFilter || isFiltering}
            size="md"
            className="h-9 w-[120px] justify-center gap-2 rounded-lg"
            onClick={handleFilter}
          >
            <Filter className="h-4 w-4" />
            Filtrar
          </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
