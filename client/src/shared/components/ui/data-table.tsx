import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, LayoutList, Search } from "lucide-react";

type View = "table" | "cards";

type SearchConfig = {
  placeholder?: string;
  onChange?: (value: string) => void;
  value?: string;
};

type PaginationItem = number | string;

type PaginationConfig = {
  summary?: string;
  items?: PaginationItem[];
  active?: PaginationItem;
  onItemClick?: (item: PaginationItem) => void;

  pageIndex?: number;
  pageCount?: number;
  canPreviousPage?: boolean;
  canNextPage?: boolean;
  onPreviousPage?: () => void;
  onNextPage?: () => void;

  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeFreeInput?: boolean;

  pageJump?: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (value?: string) => void;
    label?: string;
  };
};

export type DataTableProps = {
  title: string;
  meta?: string;

  search?: SearchConfig;
  toolbarRight?: ReactNode;

  initialView?: View;
  viewToggle?: boolean;
  tableLabel?: string;
  cardsLabel?: string;

  renderTable: () => ReactNode;
  renderCards?: () => ReactNode;

  toolbarBelow?: ReactNode;
  pagination?: PaginationConfig;
};

export function DataTable({
  title,
  meta,
  search,
  toolbarRight,
  initialView = "table",
  viewToggle = true,
  tableLabel = "Table",
  cardsLabel = "Cards",
  renderTable,
  renderCards,
  toolbarBelow,
  pagination,
}: DataTableProps) {
  const canShowCards = typeof renderCards === "function";
  const canToggleView = viewToggle && canShowCards;

  const [view, setView] = useState<View>(canToggleView ? initialView : "table");
  const [pageJumpDraft, setPageJumpDraft] = useState<string>(pagination?.pageJump?.value ?? "");

  const isCards = canToggleView ? view === "cards" : false;
  const isTable = !isCards;

  const searchValue = search?.value ?? "";
  const onSearchChange = useMemo(() => {
    if (!search?.onChange) return undefined;
    return (e: ChangeEvent<HTMLInputElement>) => search.onChange?.(e.target.value);
  }, [search]);
  const isSearchControlled = Boolean(search?.onChange);

  useEffect(() => {
    setPageJumpDraft(pagination?.pageJump?.value ?? "");
  }, [pagination?.pageJump?.value]);

  const commitPageJump = () => {
    if (!pagination?.pageJump) return;
    const nextValue = pageJumpDraft.trim();
    pagination.pageJump.onChange(nextValue);
    pagination.pageJump.onSubmit(nextValue);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {search ? (
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                {...(isSearchControlled ? { value: searchValue, onChange: onSearchChange } : {})}
                placeholder={search.placeholder ?? "Search…"}
                className="h-8 w-44 rounded-md border border-border bg-background pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ) : null}

          {canToggleView ? (
            <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
              <button
                type="button"
                onClick={() => setView("table")}
                title="Table view"
                className={`inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-all ${
                  isTable ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tableLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => setView("cards")}
                title="Cards view"
                className={`inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-all ${
                  isCards ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{cardsLabel}</span>
              </button>
            </div>
          ) : null}

          {toolbarRight}
        </div>
      </div>

      {toolbarBelow ? <div className="border-b border-border bg-secondary/30 px-5 py-3">{toolbarBelow}</div> : null}

      {isTable ? renderTable() : renderCards?.()}

      {pagination ? (
        <div className="flex flex-col justify-between gap-3 border-t border-border px-5 py-3.5 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">{pagination.summary ?? ""}</p>
          <div className="flex flex-wrap items-center gap-2">
            {typeof pagination.pageSize === "number" && pagination.onPageSizeChange ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Filas:</span>
                <input
                  value={String(pagination.pageSize)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const n = Number(raw);
                    if (!raw) return;
                    if (!Number.isFinite(n)) return;
                    const next = Math.max(1, Math.floor(n));
                    pagination.onPageSizeChange?.(next);
                  }}
                  className="h-7 w-16 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  inputMode="numeric"
                  aria-label="Filas por página"
                />
              </div>
            ) : null}

            {typeof pagination.pageIndex === "number" &&
            typeof pagination.pageCount === "number" &&
            pagination.onPreviousPage &&
            pagination.onNextPage ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={pagination.onPreviousPage}
                  disabled={pagination.canPreviousPage === false}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 text-xs text-muted-foreground">
                  Página {pagination.pageIndex + 1} de {pagination.pageCount}
                </span>
                <button
                  type="button"
                  onClick={pagination.onNextPage}
                  disabled={pagination.canNextPage === false}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {pagination.items?.map((p, i) => {
                  const isActive = pagination.active !== undefined ? p === pagination.active : i === 0;
                  return (
                    <button
                      key={`${p}-${i}`}
                      type="button"
                      onClick={() => pagination.onItemClick?.(p)}
                      className={`h-7 min-w-7 rounded-md px-1.5 text-xs transition-colors ${
                        isActive
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            )}

            {pagination.pageJump ? (
              <div className="ml-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{pagination.pageJump.label ?? "Ir a:"}</span>
                <input
                  value={pageJumpDraft}
                  onChange={(e) => setPageJumpDraft(e.target.value)}
                  onFocus={(e) => {
                    // Select all so typing replaces without manual delete.
                    const el = e.currentTarget;
                    window.requestAnimationFrame(() => el.select());
                  }}
                  onBlur={commitPageJump}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitPageJump();
                    }
                  }}
                  className="h-7 w-16 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={commitPageJump}
                  className="h-7 rounded-md border border-border px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Ir
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
