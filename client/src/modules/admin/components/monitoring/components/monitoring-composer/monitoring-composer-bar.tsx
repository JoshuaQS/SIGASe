import { Download, Filter, Sparkles, Trash2, X } from "lucide-react";
import { subDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { StudentLookupField } from "./student-lookup-field";
import { AccessStatusField } from "./access-status-field";
import { DateRangeField } from "./date-range-field";
import { DEFAULT_COMPOSER_DRAFT_STATE, type ComposerDraftState } from "./composer.types";

interface MonitoringComposerBarProps {
  value: ComposerDraftState;
  onChange: (next: ComposerDraftState) => void;
  minDate: Date;
}

const activeChipClass =
  "inline-flex h-8 items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 text-xs font-medium";

export function MonitoringComposerBar({ value, onChange, minDate }: MonitoringComposerBarProps) {
  const updateState = (patch: Partial<ComposerDraftState>) => {
    onChange({ ...value, ...patch, didFilter: false });
  };

  const resetAll = () => {
    onChange({ ...DEFAULT_COMPOSER_DRAFT_STATE, student: { query: "" } });
  };

  const removeType = () => {
    resetAll();
  };

  const removeMode = () => {
    onChange({
      ...value,
      studentMode: undefined,
      mode: undefined,
      status: undefined,
      dateRange: undefined,
      student: { query: "" },
      didFilter: false,
    });
  };

  const applyQuickFilter = (preset: "success-students" | "failed-careers" | "all-careers" | "last-30") => {
    const base: ComposerDraftState = {
      ...DEFAULT_COMPOSER_DRAFT_STATE,
      type: "students",
      studentMode: "individual",
      mode: "single-student",
      student: { query: "" },
      didFilter: false,
    };

    if (preset === "success-students") {
      onChange({ ...base, status: "SUCCESS" });
      return;
    }

    if (preset === "failed-careers") {
      onChange({ ...base, status: "FAILED" });
      return;
    }

    if (preset === "all-careers") {
      onChange({ ...base, status: "ALL" });
      return;
    }

    onChange({
      ...base,
      dateRange: {
        from: subDays(new Date(), 29),
        to: new Date(),
      },
    });
  };

  const hasType = value.type === "students";
  const hasMode = value.studentMode === "individual";

  const typeOptions = [
    { id: "students", label: "Estudiante(s)" },
    { id: "careers", label: "Carrera(s)" },
  ];

  const modeOptions = [
    { id: "individual", label: "Individual" },
    { id: "all", label: "Todos" },
  ];

  const canFilter =
    hasType &&
    hasMode &&
    Boolean(value.student?.selectedId) &&
    Boolean(value.status);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        {!hasType ? (
          <div className="w-[240px] space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Tipo de filtrado</p>
            <Combobox
              items={typeOptions}
              value={null}
              onValueChange={(next) => {
                if (next?.id === "students") {
                  updateState({ type: "students", mode: undefined, studentMode: undefined, status: undefined });
                }
              }}
              itemToStringLabel={(item) => item.label}
            >
              <ComboboxTrigger className="w-full">
                <ComboboxValue placeholder="Combobox" />
              </ComboboxTrigger>
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxCollection>
                    {(item) => <ComboboxItem value={item}>{item.label}</ComboboxItem>}
                  </ComboboxCollection>
                  <ComboboxEmpty>Sin opciones.</ComboboxEmpty>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        ) : !hasMode ? (
          <div className="w-[240px] space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Modo</p>
            <Combobox
              items={modeOptions}
              value={modeOptions.find((item) => item.id === (value.studentMode ?? "")) ?? null}
              onValueChange={(next) => {
                if (next?.id === "individual") {
                  updateState({ studentMode: "individual", mode: "single-student" });
                }
              }}
              itemToStringLabel={(item) => item.label}
            >
              <ComboboxTrigger className="w-full">
                <ComboboxValue placeholder="Individual" />
              </ComboboxTrigger>
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxCollection>
                    {(item) => <ComboboxItem value={item}>{item.label}</ComboboxItem>}
                  </ComboboxCollection>
                  <ComboboxEmpty>Sin opciones.</ComboboxEmpty>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        ) : (
          <>
            <div className="w-[240px] space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Buscar</p>
              <StudentLookupField
                query={value.student?.query ?? ""}
                selectedId={value.student?.selectedId}
                onChange={(student) => updateState({ student })}
              />
            </div>

            <div className="w-[180px] space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Accesos</p>
              <AccessStatusField value={value.status} onChange={(status) => updateState({ status })} />
            </div>

            <div className="w-[240px] space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Rango de busqueda</p>
              <DateRangeField value={value.dateRange} minDate={minDate} onChange={(dateRange) => updateState({ dateRange })} />
            </div>

            <div className="ml-auto flex items-end gap-2">
              <button
                type="button"
                disabled={!canFilter}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => onChange({ ...value, didFilter: true })}
              >
                <Filter className="h-4 w-4" />
                Filtrar
              </button>
              <button
                type="button"
                disabled={!value.didFilter}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Descargar
              </button>
            </div>
          </>
        )}
      </div>

      {(hasType || hasMode) ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Filtros activos:</span>

          {hasType ? (
            <span className={activeChipClass}>
              Estudiante(s)
              <button type="button" onClick={removeType} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : null}

          {hasMode ? (
            <>
              <span className="text-xs text-muted-foreground">&gt;</span>
              <span className={activeChipClass}>
                Individual
                <button type="button" onClick={removeMode} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </>
          ) : null}

          <button
            type="button"
            onClick={resetAll}
            className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Reestablecer filtros"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {!hasType ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Filtrado rápido
          </span>

          <button type="button" onClick={() => applyQuickFilter("success-students")}>
            <Badge variant="outline" className="cursor-pointer">Exitosos estudiantes</Badge>
          </button>
          <button type="button" onClick={() => applyQuickFilter("failed-careers")}>
            <Badge variant="outline" className="cursor-pointer">Fallidos carrera</Badge>
          </button>
          <button type="button" onClick={() => applyQuickFilter("all-careers")}>
            <Badge variant="outline" className="cursor-pointer">Ambos carreras</Badge>
          </button>
          <button type="button" onClick={() => applyQuickFilter("last-30")}>
            <Badge variant="outline" className="cursor-pointer">Últimos 30 días</Badge>
          </button>
        </div>
      ) : null}
    </div>
  );
}
