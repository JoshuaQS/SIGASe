import { useState } from "react";
import { Download, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MonitoringComposerBar } from "./monitoring-composer-bar";
import { DEFAULT_COMPOSER_DRAFT_STATE, type ComposerDraftState } from "./composer.types";
import { cn } from "@/lib/utils";
import { getFormControlSize } from "@/components/ui/forms/form-control-styles";

const FIELD_SIZE: "md" = "md";
const cfg = getFormControlSize(FIELD_SIZE);

interface MonitoringFiltersCardProps {
  minDate?: Date;
  value?: ComposerDraftState;
  onChange?: (value: ComposerDraftState) => void;
  onApply?: (value: ComposerDraftState) => void;
  onExport?: (format: "csv" | "xlsx") => void;
  onFilteringChange?: (isFiltering: boolean) => void;
  exportLabel?: string;
  disableExport?: boolean;
  showInlineExport?: boolean;
  topNOptions?: readonly number[];
}

export function MonitoringFiltersCard({
  minDate,
  value,
  onChange,
  onApply,
  onExport,
  onFilteringChange,
  exportLabel = "Exportar",
  disableExport = false,
  showInlineExport = false,
  topNOptions,
}: MonitoringFiltersCardProps) {
  const [localValue, setLocalValue] = useState<ComposerDraftState>(DEFAULT_COMPOSER_DRAFT_STATE);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

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
    onFilteringChange?.(true);
    setComposerValue({ ...composerValue, didFilter: false });
    window.setTimeout(() => {
      const next = { ...composerValue, didFilter: true };
      setComposerValue(next);
      onApply?.(next);
      setIsFiltering(false);
      onFilteringChange?.(false);
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
              topNOptions={topNOptions}
            />
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <div className="flex items-center gap-2">
            {showInlineExport ? (
              <Popover open={isExportMenuOpen} onOpenChange={setIsExportMenuOpen}>
                <PopoverTrigger asChild>
                  <Button
                    disabled={isFiltering || disableExport}
                    variant="outline"
                    size={FIELD_SIZE}
                    className={cn("h-9 w-[140px] justify-center gap-2 rounded-lg", cfg.control)}
                  >
                    <Download className={cfg.icon} />
                    {exportLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[180px] p-2">
                  <div className="space-y-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        onExport?.("csv");
                      }}
                    >
                      Descargar CSV
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        onExport?.("xlsx");
                      }}
                    >
                      Descargar XLSX
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}
          <Button
            disabled={!canFilter || isFiltering}
            size={FIELD_SIZE}
            className={cn("h-9 w-[120px] justify-center gap-2 rounded-lg", cfg.control)}
            onClick={handleFilter}
          >
            <Filter className={cfg.icon} />
            Filtrar
          </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
