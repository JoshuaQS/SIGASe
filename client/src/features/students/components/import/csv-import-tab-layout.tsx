import { useRef, type ReactNode } from "react";
import { Download, Upload } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { FileImportForm } from "./file-import-form";
import type { CsvImportParsed } from "./csv-import";

const templateColumns = [
  { name: "matrícula", required: true },
  { name: "nombre", required: true },
  { name: "apellido_paterno", required: true },
  { name: "apellido_materno", required: false },
  { name: "correo", required: true },
  { name: "carrera", required: false },
] as const;

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">
      {children}
    </p>
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Campo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Estado</th>
              </tr>
            </thead>
            <tbody>
              {templateColumns.map((col) => (
                <tr key={col.name} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{col.name}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        col.required
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "border-border bg-muted/40 text-muted-foreground"
                      )}
                    >
                      {col.required ? "required" : "opcional"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn("flex h-full min-h-0 w-full flex-1 flex-col gap-4", className)}>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch lg:gap-6">
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

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card/70 pt-4">
        <button
          type="button"
          onClick={() => onDownloadTemplate?.()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
        >
          <Download className="h-4 w-4 shrink-0" />
          Descargar plantilla
        </button>
        <button
          type="button"
          disabled={importing}
          onClick={() => openPickerRef.current?.()}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          <Upload className="h-4 w-4 shrink-0" />
          Iniciar importación
        </button>
      </div>
    </div>
  );
}
