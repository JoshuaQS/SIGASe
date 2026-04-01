import { Download, Eraser, Play } from "lucide-react";

interface ComposerActionsProps {
  onApply: () => void;
  onClear: () => void;
  onDownload: () => void;
}

export function ComposerActions({ onApply, onClear, onDownload }: ComposerActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
      <button
        type="button"
        onClick={onApply}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
      >
        <Play className="h-4 w-4" />
        Aplicar filtros
      </button>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium"
      >
        <Eraser className="h-4 w-4" />
        Limpiar filtros
      </button>
      <button
        type="button"
        onClick={onDownload}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium"
      >
        <Download className="h-4 w-4" />
        Descargar
      </button>
    </div>
  );
}
