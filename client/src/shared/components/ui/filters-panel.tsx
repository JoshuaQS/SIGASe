import { useEffect, useMemo, useRef } from "react";
import { Search, X } from "lucide-react";

type Option = { label: string; value: string };

type CheckboxGroupFilter = {
  kind: "checkbox-group";
  id: string;
  label: string;
  values: string[];
  options: Option[];
  onToggle: (value: string) => void;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
};

type TextFilter = {
  kind: "text";
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

export type FilterField = CheckboxGroupFilter | TextFilter;

export type FilterChip = {
  id: string;
  label: string;
  onClear: () => void;
};

export function FilterPanel({
  open,
  onOpenChange,
  fields,
  chips,
  onClearAll,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: FilterField[];
  chips: FilterChip[];
  onClearAll: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  const fieldChunks = useMemo(() => {
    const columns = 3;
    const chunks: FilterField[][] = Array.from({ length: columns }, () => []);
    fields.forEach((f, idx) => chunks[idx % columns].push(f));
    return chunks;
  }, [fields]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (panelRef.current && !panelRef.current.contains(t)) onOpenChange(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-10 z-50 w-[min(720px,calc(100vw-2rem))] rounded-xl border border-border bg-card shadow-lg overflow-hidden"
      role="dialog"
      aria-label="Filtros"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-border bg-secondary/50">
        <div>
          <p className="text-sm font-semibold text-foreground">Filtrar</p>
          <p className="text-xs text-muted-foreground">{chips.length ? `${chips.length} activos` : "Sin filtros activos"}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Cerrar filtros"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {fieldChunks.map((chunk, idx) => (
          <div key={idx} className="p-4 space-y-4">
            {chunk.map((f) => (
              <div key={f.id}>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{f.label}</p>
                {f.kind === "checkbox-group" ? (
                  <div className="space-y-2">
                    {f.search ? (
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                        <input
                          value={f.search.value}
                          onChange={(e) => f.search?.onChange(e.target.value)}
                          placeholder={f.search.placeholder ?? "Buscar…"}
                          className="h-8 w-full pl-8 pr-3 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                        />
                      </div>
                    ) : null}

                    <div className="max-h-44 overflow-auto space-y-1.5 pr-1">
                      {f.options.map((opt) => {
                        const checked = f.values.includes(opt.value);
                        return (
                          <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => f.onToggle(opt.value)}
                              className="rounded border-border"
                            />
                            <span
                              className={`text-sm transition-colors ${
                                checked ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground"
                              }`}
                            >
                              {opt.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <input
                    value={f.value}
                    onChange={(e) => f.onChange(e.target.value)}
                    placeholder={f.placeholder}
                    className="h-8 w-full px-3 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {chips.length ? (
        <div className="px-4 py-3 border-t border-border bg-secondary/40 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Activos:</span>
          {chips.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
            >
              {c.label}
              <button type="button" onClick={c.onClear} className="hover:text-primary/60 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Limpiar todo
          </button>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-border bg-secondary/40 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Sin filtros activos</span>
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
}

