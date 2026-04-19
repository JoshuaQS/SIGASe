import { Check, Download, Upload, X } from "lucide-react";
import { useRef, type ReactNode } from "react";

import type { CsvImportParsed } from "@/features/students/components/import/csv-import";
import { FileImportForm } from "@/features/students/components/import/file-import-form";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

const steps = ["Plantilla", "Cargar archivo", "Validar", "Importar"] as const;

const templateColumns = [
  { name: "matrícula", required: true },
  { name: "nombre", required: true },
  { name: "apellido_paterno", required: true },
  { name: "apellido_materno", required: false },
  { name: "correo", required: true },
  { name: "carrera", required: false },
] as const;

function StepperDivider() {
  return <div className="h-px w-full bg-border" aria-hidden="true" />;
}

function StepperChip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold leading-none",
        className
      )}
    >
      {children}
    </div>
  );
}

export type CsvImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  importing?: boolean;
  onImport?: (data: CsvImportParsed) => void | Promise<void>;
  onDownloadTemplate?: () => void;
};

export function CsvImportModal({
  open,
  onOpenChange,
  title = "Importar estudiantes (CSV)",
  importing = false,
  onImport,
  onDownloadTemplate,
}: CsvImportModalProps) {
  // Stepper is visual-only for now: the import flow is handled by CsvImport.
  const activeStepIndex = 1;
  const doneStepIndex = 0;
  const openPickerRef = useRef<null | (() => void)>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="4"
        animation="fade"
        showCloseButton={false}
        className="relative flex w-[min(96vw,1120px)] max-h-[90dvh] flex-col gap-0 overflow-hidden p-0"
      >
        <div className="absolute inset-0 -z-10 rounded-3xl bg-foreground/5 backdrop-blur-sm" aria-hidden="true" />

        <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-3 space-y-0 border-b border-border bg-card px-6 py-4 text-left">
          <DialogTitle
            id="csv-import-modal-title"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {title}
          </DialogTitle>
          <DialogClose
            type="button"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-5"
            aria-label="Cerrar"
          >
            <X />
          </DialogClose>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Importa estudiantes desde un archivo CSV: carga el archivo, revisa la plantilla y el historial de cargas.
        </DialogDescription>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-5">
            <ol className="flex items-center gap-2">
              {steps.map((step, index) => {
                const isDone = index === doneStepIndex;
                const isActive = index === activeStepIndex;
                return (
                  <li key={step} className="flex flex-1 items-center gap-2">
                    <StepperChip
                      className={cn(
                        isDone && "bg-success text-success-foreground",
                        isActive &&
                          "bg-primary text-primary-foreground ring-4 ring-primary/15",
                        !isDone && !isActive && "border border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </StepperChip>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step}
                    </span>
                    {index < steps.length - 1 ? <StepperDivider /> : null}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-5">
              <div className="md:col-span-3">
                <FileImportForm
                  fullWidth
                  importing={importing}
                  hideActions
                  onOpenPickerReady={(openPicker) => {
                    openPickerRef.current = openPicker;
                  }}
                  onImport={onImport}
                  onDownloadTemplate={onDownloadTemplate}
                />
              </div>

              <div className="min-h-0 overflow-hidden rounded-2xl border border-border bg-card md:col-span-2">
                <div className="px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Plantilla CSV
                  </div>
                </div>
                <div className="min-h-0 overflow-auto">
                  <div className="divide-y divide-border">
                    {templateColumns.map((col) => (
                      <div key={col.name} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="font-mono text-sm text-foreground">{col.name}</div>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide leading-none",
                            col.required
                              ? "border-primary/20 bg-primary/10 text-primary"
                              : "border-border bg-muted/40 text-muted-foreground"
                          )}
                        >
                          {col.required ? "REQ" : "OPC"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-6 py-4">
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Cancelar
            </Button>
          </DialogClose>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={Download}
              onClick={() => onDownloadTemplate?.()}
            >
              Descargar plantilla
            </Button>
            <Button
              size="sm"
              leftIcon={Upload}
              disabled={importing}
              onClick={() => openPickerRef.current?.()}
            >
              Iniciar importación
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
