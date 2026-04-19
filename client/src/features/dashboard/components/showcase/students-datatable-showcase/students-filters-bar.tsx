import { Filter } from "lucide-react";

export function StudentsFiltersBar() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        Filtros
      </span>

      <button className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground">
        Estado: Todos
      </button>

      <button className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground">
        Carrera: Todas
      </button>
    </div>
  );
}
