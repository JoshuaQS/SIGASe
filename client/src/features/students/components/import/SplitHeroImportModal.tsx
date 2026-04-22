import { Download, GraduationCap, Upload, X } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/shared/components/ui/button";
import { MiniTemplate } from "./MiniTemplate";
import { FileImportForm } from "./file-import-form";
import type { CsvImportParsed } from "./csv-import";
import { Stepper, type Step } from "@/shared/components/ui/stepper";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";

const IMPORT_STEPPER_STEPS: Step[] = [
  { id: "upload", label: "Carga de archivo" },
  { id: "analysis", label: "Análisis" },
  { id: "import", label: "Importación" },
];

interface SplitHeroImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  heroTitle?: string;
  importing?: boolean;
  onImport?: (data: CsvImportParsed) => void | Promise<void>;
  onDownloadTemplate?: () => void;
  className?: string;
}

export const SplitHeroImportModal = ({
  open,
  onOpenChange,
  title = "Importar estudiantes (XLSX/CSV)",
  subtitle = "Carga masiva desde un archivo CSV/XLSX siguiendo la plantilla.",
  heroTitle = "Importar estudiantes",
  importing = false,
  onImport,
  onDownloadTemplate,
  className = "",
}: SplitHeroImportModalProps) => {
  const openPickerRef = useRef<null | (() => void)>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="4"
        animation="fade"
        showCloseButton={false}
        className="max-w-[1240px] max-h-[92vh] p-0 overflow-hidden"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Importa estudiantes desde un archivo CSV o XLSX siguiendo la plantilla oficial.
        </DialogDescription>

        <div className={`relative w-full ${className}`}>
          <div className="relative grid grid-cols-1 overflow-hidden rounded-xl bg-card lg:grid-cols-[320px_1fr]">
            <aside className="flex flex-col gap-4 bg-gradient-to-br from-primary to-primary/70 p-4 text-primary-foreground sm:p-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary-foreground/15">
                    <GraduationCap className="size-5" />
                  </div>
                  <h3 className="text-lg font-bold leading-tight">{heroTitle}</h3>
                </div>
                <p className="mt-2 text-xs opacity-80">{subtitle}</p>
              </div>

              <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-3 backdrop-blur-sm">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider opacity-80">
                  Plantilla oficial
                </p>
                <MiniTemplate variant="dark" className="!bg-transparent !p-0 [&>p]:hidden" />
              </div>
            </aside>

            <div className="flex min-w-0 flex-col">
              <div className="border-b border-border px-4 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                  </div>
                  <DialogClose
                    type="button"
                    className="mt-0.5 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                    aria-label="Cerrar"
                  >
                    <X className="size-4" />
                  </DialogClose>
                </div>

                <div className="w-full pt-4">
                  <div className="sm:hidden">
                    <Stepper
                      steps={IMPORT_STEPPER_STEPS}
                      currentStep={0}
                      orientation="horizontal"
                      size="sm"
                      className="w-full"
                    />
                  </div>
                  <div className="hidden sm:block">
                    <Stepper
                      steps={IMPORT_STEPPER_STEPS}
                      currentStep={0}
                      orientation="horizontal"
                      size="md"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Cargar archivo
                </p>
                <div className="min-h-[240px] flex-1 sm:min-h-[320px]">
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
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={onDownloadTemplate}
                >
                  <Download className="size-3.5" />
                  Descargar plantilla
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={importing}
                  onClick={() => openPickerRef.current?.()}
                >
                  <Upload className="size-3.5" />
                  Iniciar importación
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SplitHeroImportModal;
