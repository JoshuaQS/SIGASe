import { Download, Plus } from "lucide-react";

export function StudentsToolbarActions() {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
      >
        <Download className="h-3.5 w-3.5" />
        Exportar
      </button>

      <button
        type="button"
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Plus className="h-3.5 w-3.5" />
        Nuevo estudiante
      </button>
    </div>
  );
}
