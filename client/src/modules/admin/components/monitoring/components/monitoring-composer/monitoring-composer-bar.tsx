import { useEffect } from "react";
import { ArrowUpDown, Check, ListFilter, Sparkles, Trash2, Users, X } from "lucide-react";
import { subDays } from "date-fns";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentLookupField } from "./student-lookup-field";
import { AccessStatusField } from "./access-status-field";
import { CareerMultiComboboxField } from "./career-multi-combobox-field";
import { DateRangeField } from "./date-range-field";
import { TopNField } from "./top-n-field";
import { TOP_N_OPTIONS } from "./composer.config";
import { DEFAULT_COMPOSER_DRAFT_STATE, type ComposerDraftState } from "./composer.types";
import { getFormControlSize } from "@/components/ui/forms/form-control-styles";
import { cn } from "@/lib/utils";
interface MonitoringComposerBarProps {
  value: ComposerDraftState;
  onChange: (next: ComposerDraftState) => void;
  minDate: Date;
  topNOptions?: readonly number[];
}

const activeChipClass =
  "inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium";
const quickFilterChipClass = `${activeChipClass} cursor-pointer text-foreground transition-colors hover:bg-secondary/70`;

const FIELD_SIZE: "md" = "md";
const FIELD_WIDTH = "w-[240px]";
const cfg = getFormControlSize(FIELD_SIZE);

export function MonitoringComposerBar({ value, onChange, minDate, topNOptions = TOP_N_OPTIONS }: MonitoringComposerBarProps) {
  const updateState = (patch: Partial<ComposerDraftState>) => {
    onChange({ ...value, ...patch, didFilter: false });
  };
  const safeTopOptions = topNOptions.length > 0 ? topNOptions : TOP_N_OPTIONS;

  useEffect(() => {
    if (!value.topEnabled) return;
    const maxAllowed = safeTopOptions[safeTopOptions.length - 1];
    const minAllowed = safeTopOptions[0];
    const current = value.topN ?? minAllowed;
    if (current > maxAllowed || !safeTopOptions.includes(current)) {
      onChange({ ...value, topN: maxAllowed, didFilter: false });
    }
  }, [onChange, safeTopOptions, value]);

  const resetAll = () => {
    onChange({ ...DEFAULT_COMPOSER_DRAFT_STATE, student: { query: "" } });
  };

  const removeMode = () => {
    onChange({
      ...value,
      studentMode: undefined,
      mode: undefined,
      careers: [],
      status: undefined,
      dateRange: undefined,
      student: { query: "" },
      topEnabled: false,
      topN: undefined,
      didFilter: false,
    });
  };
  const removeStatus = () => {
    updateState({ status: undefined });
  };

  const applyQuickFilter = (preset: "success-students" | "failed-careers" | "all-careers" | "last-30") => {
    const base: ComposerDraftState = {
      ...DEFAULT_COMPOSER_DRAFT_STATE,
      student: { query: "" },
      didFilter: false,
    };

    if (preset === "success-students") {
      onChange({
        ...base,
        type: "students",
        studentMode: "all",
        mode: "all-students",
        status: "SUCCESS",
      });
      return;
    }

    if (preset === "failed-careers") {
      onChange({
        ...base,
        type: "careers",
        mode: "all-careers",
        status: "FAILED",
      });
      return;
    }

    if (preset === "all-careers") {
      onChange({
        ...base,
        type: "careers",
        mode: "all-careers",
        status: "ALL",
      });
      return;
    }

    onChange({
      ...base,
      type: "students",
      studentMode: "all",
      mode: "all-students",
      status: "ALL",
      dateRange: {
        from: subDays(new Date(), 29),
        to: new Date(),
      },
    });
  };

  const hasType = Boolean(value.type);
  const hasMode = value.type === "students" ? Boolean(value.studentMode) : value.type === "careers";

  const typeOptions = [
    { id: "students", label: "Estudiante(s)" },
    { id: "careers", label: "Carrera(s)" },
  ] as const;

  const modeOptions = [
    { id: "individual", label: "Individual" },
    { id: "all", label: "Todos" },
  ] as const;

  const hasStatus = Boolean(value.status);
  const hasSort = Boolean(value.sortDirection);
  const hasRanking = Boolean(value.topEnabled);
  const selectedCareersCount = value.careers?.length ?? 0;
  const showRankingControls =
    (value.type === "students" && value.studentMode === "all") ||
    (value.type === "careers" && selectedCareersCount >= 2);
  const statusLabel =
    value.status === "SUCCESS"
      ? "Exitoso"
      : value.status === "FAILED"
        ? "Fallido"
        : "Ambos";
  const sortLabel = value.sortDirection === "asc" ? "Menor a mayor" : "Mayor a menor";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        {!hasType ? (
          <div className={cn(FIELD_WIDTH, "space-y-1")}>
          <span className={cn("inline-flex items-center gap-1 text-muted-foreground", cfg.fieldLabel)}>
            <ListFilter className={cfg.icon} />
            Tipo de filtrado:
          </span>
            <Select
              value={value.type ?? ""}
              onValueChange={(next) => {
                if (next === "students") {
                  updateState({
                    type: "students",
                    mode: undefined,
                    studentMode: undefined,
                    careers: [],
                    status: undefined,
                    topEnabled: false,
                    topN: undefined,
                  });
                  return;
                }
                if (next === "careers") {
                  updateState({
                    type: "careers",
                    mode: "all-careers",
                    studentMode: undefined,
                    student: { query: "" },
                    careers: [],
                    status: undefined,
                    topEnabled: false,
                    topN: undefined,
                  });
                }
              }}
            >
              <SelectTrigger className="w-full" size={FIELD_SIZE}>
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : value.type === "students" && !hasMode ? (
          <div className={cn(FIELD_WIDTH, "space-y-1")}>
            <span className={cn("inline-flex items-center gap-1 text-muted-foreground", cfg.fieldLabel)}>
              <Users className={cfg.icon} />
              Modo:
            </span>
            <Select
              value={value.studentMode ?? ""}
              onValueChange={(next) => {
                if (next === "individual") {
                  updateState({ studentMode: "individual", mode: "single-student" });
                  return;
                }
                if (next === "all") {
                  updateState({ studentMode: "all", mode: "all-students", student: { query: "" } });
                }
              }}
            >
              <SelectTrigger className="w-full" size={FIELD_SIZE}>
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent>
                {modeOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <>
            {value.type === "students" && value.studentMode === "individual" ? (
              <div className={cn(FIELD_WIDTH, "space-y-1")}>
                <p className={cn("text-muted-foreground", cfg.fieldLabel)}>Buscar</p>
                <StudentLookupField
                  query={value.student?.query ?? ""}
                  selectedId={value.student?.selectedId}
                  onChange={(student) => updateState({ student })}
                />
              </div>
            ) : null}

            {value.type === "careers" ? (
              <CareerMultiComboboxField
                values={value.careers ?? []}
                onChange={(careers) => {
                  const nextShowRanking =
                    value.type === "careers" && careers.length >= 2;
                  updateState({
                    careers,
                    ...(!nextShowRanking && { topEnabled: false, topN: undefined }),
                  });
                }}
              />
            ) : null}

            <div className={cn(FIELD_WIDTH, "space-y-1")}>
              <p className={cn("text-muted-foreground", cfg.fieldLabel)}>Accesos</p>
              <AccessStatusField value={value.status} onChange={(status) => updateState({ status })} />
            </div>

            <div className={cn(FIELD_WIDTH, "space-y-1")}>
              <p className={cn("text-muted-foreground", cfg.fieldLabel)}>Rango de busqueda</p>
              <DateRangeField value={value.dateRange} minDate={minDate} onChange={(dateRange) => updateState({ dateRange })} />
            </div>

            {showRankingControls ? (
              <>
                <div className={cn(FIELD_WIDTH, "space-y-1")}>
                  <p className={cn("text-muted-foreground", cfg.fieldLabel)}>Orden</p>
                  <Button
                    type="button"
                    variant="outline"
                    size={FIELD_SIZE}
                    className="w-full justify-between rounded-lg"
                    onClick={() =>
                      updateState({
                        sortDirection: value.sortDirection === "desc" ? "asc" : "desc",
                      })
                    }
                  >
                    {value.sortDirection === "desc" ? "Mayor a menor" : "Menor a mayor"}
                    <ArrowUpDown className={cfg.icon} />
                  </Button>
                </div>
                <div className="flex items-end gap-2">
                  <div className={cn(FIELD_WIDTH, "space-y-1")}>
                    <p className={cn("text-muted-foreground", cfg.fieldLabel)}>Ranking</p>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={value.topEnabled ?? false}
                      onClick={() => {
                        const nextEnabled = !(value.topEnabled ?? false);
                        updateState({
                          topEnabled: nextEnabled,
                          topN: nextEnabled ? (value.topN ?? safeTopOptions[0]) : undefined,
                        });
                      }}
                      className="relative inline-grid h-10 w-full grid-cols-[1fr_1fr] items-center rounded-md border border-input bg-background px-0.5 text-xs transition-colors hover:bg-accent/40"
                    >
                      <span
                        className={`relative z-10 flex items-center justify-center transition-colors ${
                          value.topEnabled ? "text-muted-foreground" : "text-primary-foreground"
                        }`}
                      >
                        <X className="h-5 w-5" />
                      </span>
                      <span
                        className={`relative z-10 flex items-center justify-center transition-colors ${
                          value.topEnabled ? "text-primary-foreground" : "text-muted-foreground"
                        }`}
                      >
                        <Check className="h-5 w-5" />
                      </span>
                      <span
                        aria-hidden="true"
                        className={`absolute top-1/2 h-[calc(100%-4px)] w-[calc(50%-0.25rem)] -translate-y-1/2 rounded-sm border border-primary/70 bg-primary shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          value.topEnabled ? "left-[calc(50%+0.125rem)]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  {value.topEnabled ? (
                    <div className={cn(FIELD_WIDTH, "space-y-1")}>
                      <TopNField
                        label="Top"
                        value={value.topN}
                        options={safeTopOptions}
                        onChange={(topN) => updateState({ topN })}
                      />
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </>
        )}

      </div>
      {hasType ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Filtros activos:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              onClick={resetAll}
              className="h-6 w-6 rounded-full text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              aria-label="Reestablecer filtros"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>

            {hasType ? (
              <span className={activeChipClass}>
                {value.type === "careers" ? "Carrera(s)" : "Estudiante(s)"}
                <button type="button" onClick={resetAll} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ) : null}

            {value.type === "students" && hasMode ? (
              <>
                <span className="text-xs text-muted-foreground">&gt;</span>
                <span className={activeChipClass}>
                  {value.studentMode === "all" ? "Todos" : "Individual"}
                  <button type="button" onClick={removeMode} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </>
            ) : null}

            {hasStatus ? (
              <>
                <span className="text-xs text-muted-foreground">&gt;</span>
                <span className={activeChipClass}>
                  Accesos: {statusLabel}
                  <button type="button" onClick={removeStatus} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </>
            ) : null}

            {value.type === "careers" && selectedCareersCount > 0 ? (
              <>
                <span className="text-xs text-muted-foreground">&gt;</span>
                <span className={activeChipClass}>Carreras: {selectedCareersCount}</span>
              </>
            ) : null}

            {showRankingControls && hasSort ? (
              <>
                <span className="text-xs text-muted-foreground">&gt;</span>
                <span className={activeChipClass}>Orden: {sortLabel}</span>
              </>
            ) : null}

            {showRankingControls && hasRanking ? (
              <>
                <span className="text-xs text-muted-foreground">&gt;</span>
                <span className={activeChipClass}>Ranking: Sí</span>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {!hasType ? (
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Filtrado rápido:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => applyQuickFilter("success-students")}>
              <span className={quickFilterChipClass}>Accesos Exitosos estudiantes</span>
            </button>
            <button type="button" onClick={() => applyQuickFilter("failed-careers")}>
              <span className={quickFilterChipClass}>Accesos Fallidos carreras</span>
            </button>
            <button type="button" onClick={() => applyQuickFilter("all-careers")}>
              <span className={quickFilterChipClass}>Ambos accesos carreras</span>
            </button>
            <button type="button" onClick={() => applyQuickFilter("last-30")}>
              <span className={quickFilterChipClass}>Ambos accesos estudiantes</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
