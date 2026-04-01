import { X } from "lucide-react";
import { CsvImportTabLayout } from "@/modules/admin/components/student/csv-importer/CsvImportTabLayout";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type CsvImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
};

/**
 * Modal de importación CSV con `DialogContent` estilo Radix Themes `size="4"` (ancho responsivo sm→xl).
 */
export function CsvImportModal({
  open,
  onOpenChange,
  title = "Importar estudiantes (CSV)",
}: CsvImportModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="4"
        showCloseButton={false}
        className="flex max-h-[min(92vh,920px)] flex-col gap-0 overflow-hidden rounded-2xl border-border bg-background p-0 shadow-2xl"
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
              <CsvImportTabLayout invertedOrder fullWidth />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
