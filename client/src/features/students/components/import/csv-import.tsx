import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { CloudUpload, Download, FileSpreadsheet, FileText, X, AlertCircle, Upload } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type DropState = "idle" | "over" | "preview" | "error";

export type CsvImportParsed = {
  file: File;
  fileName: string;
  fileSize: number;
  headers: string[];
  rows: string[][];
};

type CsvImportProps = {
  maxSizeBytes?: number;
  previewRowCount?: number;
  /** Solo para demos del design system */
  showSimulateError?: boolean;
  /** Ancho completo del contenedor (p. ej. modal); si no, max-w-lg */
  fullWidth?: boolean;
  /** Si true, no muestra los botones inferiores (control externo). */
  hideActions?: boolean;
  /** Entrega el handler para abrir el picker desde afuera. */
  onOpenPickerReady?: (openPicker: () => void) => void;
  onParsed?: (data: CsvImportParsed) => void;
  onImport?: (data: CsvImportParsed) => void | Promise<void>;
  importing?: boolean;
  onDownloadTemplate?: () => void;
};

const shellW = (fullWidth: boolean) => cn(fullWidth ? "w-full max-w-none" : "w-full max-w-lg");

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  let field = "";
  let inQ = false;
  while (i < line.length) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQ = false;
        i++;
        continue;
      }
      field += c;
      i++;
    } else {
      if (c === '"') {
        inQ = true;
        i++;
        continue;
      }
      if (c === ",") {
        out.push(field.trim());
        field = "";
        i++;
        continue;
      }
      field += c;
      i++;
    }
  }
  out.push(field.trim());
  return out.map((cell) => cell.replace(/^"|"$/g, ""));
}

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  return lines.map(parseCsvLine);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function CsvImport({
  maxSizeBytes = 10 * 1024 * 1024,
  previewRowCount = 3,
  fullWidth = false,
  hideActions = false,
  onOpenPickerReady,
  onParsed,
  onImport,
  importing = false,
  onDownloadTemplate,
}: CsvImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<DropState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [parsed, setParsed] = useState<CsvImportParsed | null>(null);
  const [isImportingLocal, setIsImportingLocal] = useState(false);

  const isImporting = importing || isImportingLocal;

  const reset = useCallback(() => {
    setState("idle");
    setParsed(null);
    setErrorMessage("");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const openPicker = useCallback(() => {
    if (inputRef.current) inputRef.current.click();
  }, []);

  // Expose openPicker to parent layouts when needed.
  useEffect(() => {
    onOpenPickerReady?.(openPicker);
  }, [onOpenPickerReady, openPicker]);

  const processFile = useCallback(
    (file: File) => {
      const lower = file.name.toLowerCase();
      const isCsv = lower.endsWith(".csv");
      const isXlsx = lower.endsWith(".xlsx");
      if (!isCsv && !isXlsx) {
        setErrorMessage("Selecciona un archivo con extensión .csv o .xlsx.");
        setState("error");
        return;
      }
      if (file.size > maxSizeBytes) {
        setErrorMessage(`El archivo supera el máximo de ${formatBytes(maxSizeBytes)}.`);
        setState("error");
        return;
      }

      if (isXlsx) {
        const data: CsvImportParsed = {
          file,
          fileName: file.name,
          fileSize: file.size,
          headers: [],
          rows: [],
        };
        setParsed(data);
        setState("preview");
        onParsed?.(data);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        if (!text.trim()) {
          setErrorMessage("El archivo está vacío.");
          setState("error");
          return;
        }
        const matrix = parseCsv(text);
        if (matrix.length === 0) {
          setErrorMessage("No se pudieron leer filas del CSV.");
          setState("error");
          return;
        }
        const headers = matrix[0].length ? matrix[0] : [];
        const rows = matrix.length > 1 ? matrix.slice(1) : [];
        const data: CsvImportParsed = {
          file,
          fileName: file.name,
          fileSize: file.size,
          headers,
          rows,
        };
        setParsed(data);
        setState("preview");
        onParsed?.(data);
      };
      reader.onerror = () => {
        setErrorMessage("No se pudo leer el archivo.");
        setState("error");
      };
      reader.readAsText(file, "UTF-8");
    },
    [maxSizeBytes, onParsed]
  );

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setState("idle");
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setState("over");
  };

  const onDragLeave = () => setState("idle");

  const handleImport = useCallback(async () => {
    if (!parsed || !onImport || isImporting) return;

    setIsImportingLocal(true);
    try {
      await onImport(parsed);
    } finally {
      setIsImportingLocal(false);
    }
  }, [isImporting, onImport, parsed]);

  if (state === "preview" && parsed) {
    const isXlsx = parsed.fileName.toLowerCase().endsWith(".xlsx");
    const preview = parsed.rows.slice(0, previewRowCount);
    const displayCols =
      parsed.headers.length > 0
        ? parsed.headers
        : preview[0]?.map((_, i) => `Columna ${i + 1}`) ?? [];
    const rest = Math.max(0, parsed.rows.length - previewRowCount);

    return (
      <div
        className={cn(
          shellW(fullWidth),
          "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
          fullWidth ? "flex h-full min-h-0 flex-col" : ""
        )}
      >
        <div className="flex items-center gap-4 p-5 border-b border-border">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-success/15">
            {isXlsx ? (
              <FileSpreadsheet className="h-5 w-5 text-success" />
            ) : (
              <FileText className="h-5 w-5 text-success" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{parsed.fileName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatBytes(parsed.fileSize)} · {isXlsx ? "XLSX" : `${parsed.rows.length} filas de datos · UTF-8`}
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Quitar archivo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={cn("p-5", fullWidth ? "flex min-h-0 flex-1 flex-col" : "")}>
          {isXlsx ? (
            <div className={cn("rounded-lg border border-border bg-muted/20 p-4", fullWidth ? "flex min-h-0 flex-1 flex-col justify-center" : "")}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Archivo listo para importación
              </p>
              <p className="mt-2 text-sm text-foreground">
                El archivo XLSX se validará y procesará en backend al confirmar la operación.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Usa la plantilla oficial para respetar encabezados y orden de columnas.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Vista previa — primeras {Math.min(previewRowCount, parsed.rows.length)} filas
              </p>
              <div className={cn("overflow-x-auto rounded-lg border border-border text-xs", fullWidth ? "min-h-0 flex-1" : "")}>
                <table className="w-full min-w-72">
                  <thead className="bg-secondary">
                    <tr>
                      {displayCols.map((h, idx) => (
                        <th key={idx} className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">
                          {h || `Columna ${idx + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        {row.map((cell, j) => (
                          <td key={j} className="max-w-56 truncate px-3 py-2 text-foreground" title={cell}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rest > 0 && <p className="text-xs text-muted-foreground mt-2">+ {rest} registros adicionales</p>}
            </>
          )}
        </div>
        <div className="flex items-center justify-between px-5 py-4 bg-secondary/50 border-t border-border gap-3 flex-wrap">
          <button
            type="button"
            onClick={reset}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Cambiar archivo
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="h-8 px-3 text-xs font-medium border border-border rounded-md hover:bg-muted bg-card text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isImporting}
              onClick={() => {
                void handleImport();
              }}
              className="h-8 px-4 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              {isImporting
                ? "Importando..."
                : isXlsx
                  ? "Importar archivo →"
                  : `Importar ${parsed.rows.length} registros →`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div
        className={cn(
          shellW(fullWidth),
          "rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center",
          fullWidth ? "flex h-full min-h-0 flex-col items-center justify-center" : ""
        )}
      >
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-1">No se pudo importar el CSV</p>
        <p className="text-xs text-muted-foreground mb-2">Se aceptan archivos .csv y .xlsx.</p>
        <p className="text-xs text-muted-foreground mb-5">{errorMessage}</p>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="h-8 px-4 text-xs font-medium border border-border rounded-md bg-card text-foreground hover:bg-muted transition-colors"
          >
            Elegir otro archivo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        shellW(fullWidth),
        fullWidth ? "flex h-full min-h-0 flex-col gap-2" : "space-y-3"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={onInputChange}
      />
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={openPicker}
        className={cn(
          "relative cursor-pointer select-none rounded-2xl border-2 border-dashed text-center transition-all",
          fullWidth
            ? "flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10"
            : "p-10",
          state === "over"
            ? "border-primary bg-accent/50"
            : "border-border bg-card/70 hover:border-primary/50 hover:bg-accent/20"
        )}
      >
        <div
          className={cn(
            "mx-auto flex items-center justify-center rounded-2xl transition-all",
            fullWidth ? "mb-2 h-11 w-11" : "mb-4 h-14 w-14",
            state === "over" ? "bg-primary/15" : "bg-muted"
          )}
        >
          <CloudUpload
            className={cn(
              "transition-colors",
              fullWidth ? "h-5 w-5" : "h-7 w-7",
              state === "over" ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>
        <p className={cn("font-semibold text-foreground", fullWidth ? "text-sm" : "mb-1 text-sm")}>
          {state === "over" ? "Suelta el archivo aquí" : "Arrastra tu archivo aquí"}
        </p>
        <p className={cn("text-muted-foreground", fullWidth ? "mt-1 text-sm" : "mb-5 text-xs")}>
          o haz clic para explorar
        </p>
        {!fullWidth ? (
          <div className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors pointer-events-none hover:bg-primary/90">
            <Upload className="h-3.5 w-3.5" /> Seleccionar archivo
          </div>
        ) : null}
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-muted-foreground",
            fullWidth ? "mt-4 text-xs" : "mt-5 gap-4 text-xs"
          )}
        >
          <span className="text-center">
            Formatos aceptados: CSV y XLSX · Máx. {formatBytes(maxSizeBytes)}
          </span>
          {!fullWidth ? (
            <>
              <span className="hidden sm:inline">·</span>
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> .CSV / .XLSX
              </span>
              <span>·</span>
              <span>Plantilla oficial recomendada</span>
            </>
          ) : null}
        </div>
      </div>
      {fullWidth && !hideActions ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openPicker();
            }}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 min-[400px]:flex-none"
          >
            <Upload className="h-3.5 w-3.5 shrink-0" />
            Iniciar importación
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onDownloadTemplate?.()
            }}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary/35 bg-card px-3 text-xs font-medium text-primary transition-colors hover:bg-accent min-[400px]:flex-none"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            Descargar plantilla
          </button>
        </div>
      ) : null}
    </div>
  );
}
