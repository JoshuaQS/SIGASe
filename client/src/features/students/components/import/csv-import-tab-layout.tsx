import { useRef, type ComponentType, type ReactNode } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";
import { FileImportForm } from "./file-import-form";
import type { CsvImportParsed } from "./csv-import";

const templateColumns = [
  { name: "matricula", type: "text", required: true, example: "20230001" },
  { name: "nombre", type: "text", required: true, example: "Carlos" },
  { name: "apellido_paterno", type: "text", required: true, example: "Ramírez" },
  { name: "apellido_materno", type: "text", required: false, example: "Vega" },
  { name: "sexo", type: "enum (M/F)", required: true, example: "M" },
  { name: "cuatrimestre", type: "number", required: true, example: "3" },
  { name: "carrera", type: "enum", required: true, example: "IDS" },
] as const;

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
  importing?: boolean;
  onImport?: (data: CsvImportParsed) => void | Promise<void>;
  onDownloadTemplate?: () => void;
};

export function CsvImportTabLayout({
  invertedOrder = false,
  fullWidth = false,
  className,
  importing = false,
  onImport,
  onDownloadTemplate,
}: CsvImportTabLayoutProps) {
  const openPickerRef = useRef<(() => void) | null>(null);

  const uploadCell = (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-1.5">
      <SectionLabel>Cargar archivo</SectionLabel>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <FileImportForm
          fullWidth={fullWidth}
          importing={importing}
          hideActions={true}
          onOpenPickerReady={(fn) => {
            openPickerRef.current = fn;
          }}
          onImport={onImport}
          onDownloadTemplate={onDownloadTemplate}
        />
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
                  variant="outlined"
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
        <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-card px-3 py-2">
          <button
            type="button"
            onClick={() => openPickerRef.current?.()}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Upload className="h-3.5 w-3.5 shrink-0" />
            Iniciar importación
          </button>
          <button
            type="button"
            onClick={() => onDownloadTemplate?.()}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-primary/35 bg-card px-3 text-xs font-medium text-primary transition-colors hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            Descargar plantilla
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "grid h-full min-h-0 w-full flex-1 grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch md:gap-4 lg:gap-5",
        className
      )}
    >
      {invertedOrder ? (
        <>
          {uploadCell}
          {templateCell}
        </>
      ) : (
        <>
          {templateCell}
          {uploadCell}
        </>
      )}
    </div>
  );
}
