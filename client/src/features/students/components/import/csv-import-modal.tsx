import { X } from "lucide-react";
import { CsvImportTabLayout } from "@/features/students/components/import/csv-import-tab-layout";
import type { CsvImportParsed } from "@/features/students/components/import/csv-import";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

export type CsvImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  importing?: boolean;
  onImport?: (data: CsvImportParsed) => void | Promise<void>;
  onDownloadTemplate?: () => void;
};

/**
 * Modal de importación CSV con `DialogContent` estilo Radix Themes `size="4"` (ancho responsivo sm→xl).
 */
export function CsvImportModal({
  open,
  onOpenChange,
  title = "Importar estudiantes (CSV)",
  importing = false,
  onImport,
  onDownloadTemplate,
}: CsvImportModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
      size="4"
        showCloseButton={false}
        className="flex max-h-[min(94vh,980px)] max-w-6xl flex-col gap-0 overflow-hidden rounded-2xl border-border bg-background p-0 shadow-2xl"
      >
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-3 space-y-0 border-b border-border bg-card px-5 py-3.5 text-left">
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex min-h-[min(52vh,560px)] flex-1 flex-col">
              <CsvImportTabLayout
                invertedOrder
                fullWidth
                importing={importing}
                onImport={onImport}
                onDownloadTemplate={onDownloadTemplate}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
