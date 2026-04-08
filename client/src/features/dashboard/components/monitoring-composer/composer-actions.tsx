import { Download, Eraser, Play } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { getFormControlSize } from "@/shared/components/ui/forms/form-control-styles";

const FIELD_SIZE = "md" as const;
const cfg = getFormControlSize(FIELD_SIZE);

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
        className={cn("inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-primary-foreground", cfg.fieldLabel)}
      >
        <Play className={cfg.icon} />
        Aplicar filtros
      </button>
      <button
        type="button"
        onClick={onClear}
        className={cn("inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2", cfg.fieldLabel)}
      >
        <Eraser className={cfg.icon} />
        Limpiar filtros
      </button>
      <button
        type="button"
        onClick={onDownload}
        className={cn("inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2", cfg.fieldLabel)}
      >
        <Download className={cfg.icon} />
        Descargar
      </button>
    </div>
  );
}
