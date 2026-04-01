import type { ComponentType, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, History, Info, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileImportForm } from "./FileImportForm";

const templateColumns = [
  { name: "matricula", type: "text", required: true, example: "20230001" },
  { name: "nombre", type: "text", required: true, example: "Carlos" },
  { name: "apellido_paterno", type: "text", required: true, example: "Ramírez" },
  { name: "apellido_materno", type: "text", required: false, example: "Vega" },
  { name: "sexo", type: "enum (M/F)", required: false, example: "M" },
  { name: "cuatrimestre", type: "number", required: false, example: "3" },
  { name: "carrera", type: "enum", required: true, example: "IDS" },
  { name: "estado", type: "enum", required: false, example: "ACTIVO" },
] as const;

const importHistory = [
  {
    file: "estudiantes_IDS_ago2024.csv",
    date: "12 ago 2024",
    records: 142,
    ok: 140,
    errors: 2,
    status: "partial" as const,
  },
  {
    file: "estudiantes_ISC_ago2024.csv",
    date: "12 ago 2024",
    records: 98,
    ok: 98,
    errors: 0,
    status: "success" as const,
  },
  {
    file: "alta_masiva_sep2024.csv",
    date: "3 sep 2024",
    records: 0,
    ok: 0,
    errors: 1,
    status: "error" as const,
  },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">
      {children}
    </p>
  );
}

function CardHeader({
  icon: Icon,
  title,
  subtitle,
  compact,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-start border-b border-border bg-secondary/40",
        compact ? "gap-2 px-3 py-2" : "gap-3 px-4 py-3"
      )}
    >
      <div className={cn("rounded-lg bg-muted shrink-0", compact ? "p-1.5" : "p-2")}>
        <Icon className={cn("text-muted-foreground", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      </div>
      <div className="min-w-0 pt-px">
        <h3 className={cn("font-semibold text-foreground leading-tight", compact ? "text-xs" : "text-sm")}>
          {title}
        </h3>
        <p className={cn("text-muted-foreground leading-snug", compact ? "mt-0.5 text-[10px]" : "mt-0.5 text-xs")}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function historyStatusIcon(status: (typeof importHistory)[number]["status"]) {
  const base = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full";
  switch (status) {
    case "success":
      return (
        <div className={cn(base, "bg-success/12")}>
          <CheckCircle2 className="h-3.5 w-3.5 text-success" strokeWidth={2.25} />
        </div>
      );
    case "partial":
      return (
        <div className={cn(base, "bg-warning/12")}>
          <AlertTriangle className="h-3.5 w-3.5 text-warning" strokeWidth={2.25} />
        </div>
      );
    case "error":
      return (
        <div className={cn(base, "bg-destructive/12")}>
          <XCircle className="h-3.5 w-3.5 text-destructive" strokeWidth={2.25} />
        </div>
      );
  }
}

type CsvImportTabLayoutProps = {
  /**
   * Orden en la cuadrícula 2×2 (lg+):
   * - false: plantilla | carga arriba; notas | historial abajo
   * - true (modal): carga | plantilla; historial | notas
   */
  invertedOrder?: boolean;
  /** Dropzone a ancho de columna (recomendado en modal) */
  fullWidth?: boolean;
  className?: string;
};

export function CsvImportTabLayout({
  invertedOrder = false,
  fullWidth = false,
  className,
}: CsvImportTabLayoutProps) {
  const uploadCell = (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-1.5">
      <SectionLabel>Cargar archivo</SectionLabel>
      <div className="flex min-h-0 flex-1 flex-col">
        <FileImportForm fullWidth={fullWidth} />
      </div>
    </div>
  );

  const templateCell = (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-1.5">
      <SectionLabel>Plantilla CSV</SectionLabel>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <CardHeader
          compact
          icon={FileSpreadsheet}
          title="Estructura del CSV"
          subtitle="Columnas requeridas para la importación"
        />
        <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto overscroll-contain">
          {templateColumns.map((col) => (
            <div
              key={col.name}
              className="flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] font-semibold text-foreground">{col.name}</p>
                <p className="text-[10px] leading-tight text-muted-foreground">{col.type}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{col.example}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide",
                    col.required
                      ? "border-destructive/20 bg-destructive/10 text-destructive"
                      : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {col.required ? "requerido" : "opcional"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const historyCell = (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-1.5">
      <SectionLabel>Importaciones recientes</SectionLabel>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <CardHeader
          compact
          icon={History}
          title="Historial de cargas"
          subtitle="Últimos archivos procesados en el módulo de estudiantes"
        />
        <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto overscroll-contain">
          {importHistory.map((row) => (
            <div
              key={row.file}
              className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-muted/40"
            >
              {historyStatusIcon(row.status)}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground" title={row.file}>
                  {row.file}
                </p>
                <p className="text-[10px] leading-tight text-muted-foreground">
                  {row.date} · {row.records} registros
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                <span className="rounded-md bg-success/12 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-success">
                  {row.ok} OK
                </span>
                {row.errors > 0 ? (
                  <span className="rounded-md bg-destructive/12 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-destructive">
                    {row.errors} err
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const formatNotesCell = (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-1.5">
      <SectionLabel>Formato del archivo</SectionLabel>
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-info/25 bg-info/10 p-3 shadow-sm">
        <div className="flex items-start gap-2.5">
          <div className="shrink-0 rounded-lg bg-info/15 p-1.5">
            <Info className="h-3.5 w-3.5 text-info" />
          </div>
          <ul className="list-none space-y-1 text-[11px] leading-snug text-foreground">
            <li>
              <span className="font-semibold">Encoding:</span>{" "}
              <span className="text-muted-foreground">UTF-8 con BOM</span>
            </li>
            <li>
              <span className="font-semibold">Separador:</span>{" "}
              <span className="text-muted-foreground">coma (,)</span>
            </li>
            <li>
              <span className="font-semibold">Primera fila:</span>{" "}
              <span className="text-muted-foreground">encabezados</span>
            </li>
            <li>
              <span className="font-semibold">Matrícula duplicada:</span>{" "}
              <span className="text-muted-foreground">se omite</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "grid h-full min-h-0 w-full flex-1 grid-cols-1 gap-4 md:grid-rows-[auto_minmax(0,1fr)] md:items-stretch md:gap-4 lg:gap-5",
        /* Columna estrecha: plantilla CSV + info; ancha: carga + historial */
        invertedOrder
          ? "md:grid-cols-[minmax(0,1fr)_minmax(0,17.5rem)]"
          : "md:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)]",
        className
      )}
    >
      {invertedOrder ? (
        <>
          {uploadCell}
          {templateCell}
          {historyCell}
          {formatNotesCell}
        </>
      ) : (
        <>
          {templateCell}
          {uploadCell}
          {formatNotesCell}
          {historyCell}
        </>
      )}
    </div>
  );
}
