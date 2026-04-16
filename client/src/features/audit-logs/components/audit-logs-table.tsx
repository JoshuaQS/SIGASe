import { Eye } from 'lucide-react'
import type { ElementType } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { DataTable } from '@/shared/components/ui/data-table'
import { AuditLogsFiltersPopover } from '@/features/audit-logs/components/filters/audit-logs-filters-popover'
import type { AuditActorType, AuditLogDto, AuditOutcome, AuditSeverity } from '@/features/audit-logs/api/audit-logs-api'
import type { AuditLogsFilters } from '@/features/audit-logs/components/filters/audit-logs-filter-fields'

export type SeverityStyle = {
  badge: string
  label: string
  icon: ElementType
}

type AuditLogsTableProps = {
  totalElements: number
  logs: AuditLogDto[]
  loading: boolean
  page: number
  totalPages: number
  visibleFrom: number
  visibleTo: number
  pageSize: number
  onPageSizeChange: (pageSize: number) => void
  draftFilters: AuditLogsFilters
  appliedFilters: AuditLogsFilters
  searchInput: string
  onSearchInputChange: (value: string) => void
  filtersOpen: boolean
  onFiltersOpenChange: (open: boolean) => void
  onDraftFiltersChange: (next: AuditLogsFilters) => void
  onApplyFilters: () => void
  onResetFilters: () => void
  onClearFilters: () => void
  onOpenDetail: (log: AuditLogDto) => void
  onPreviousPage: () => void
  onNextPage: () => void
  severityStyles: Record<AuditSeverity, SeverityStyle>
  actorTypeLabels: Record<AuditActorType, string>
  outcomeLabels: Record<AuditOutcome, string>
  formatDateTime: (value?: string | null) => string
  formatActor: (log: AuditLogDto) => string
  formatModule: (log: AuditLogDto) => string
  formatEntity: (log: AuditLogDto) => string
}

export function AuditLogsTable({
  totalElements,
  logs,
  loading,
  page,
  totalPages,
  visibleFrom,
  visibleTo,
  pageSize,
  onPageSizeChange,
  draftFilters,
  appliedFilters,
  searchInput,
  onSearchInputChange,
  filtersOpen,
  onFiltersOpenChange,
  onDraftFiltersChange,
  onApplyFilters,
  onResetFilters,
  onClearFilters,
  onOpenDetail,
  onPreviousPage,
  onNextPage,
  severityStyles,
  actorTypeLabels,
  outcomeLabels,
  formatDateTime,
  formatActor,
  formatModule,
  formatEntity,
}: AuditLogsTableProps) {
  return (
    <DataTable
      title="Audit logs"
      meta={`${totalElements.toLocaleString()} eventos · mostrando ${logs.length} en esta página`}
      search={{
        value: searchInput,
        onChange: onSearchInputChange,
        placeholder: 'Búsqueda libre en auditoría',
      }}
      viewToggle={true}
      tableLabel="Table"
      cardsLabel="Cards"
      toolbarRight={
        <AuditLogsFiltersPopover
          draftFilters={draftFilters}
          appliedFilters={appliedFilters}
          open={filtersOpen}
          onOpenChange={onFiltersOpenChange}
          onDraftChange={onDraftFiltersChange}
          onApply={onApplyFilters}
          onReset={onResetFilters}
          onClear={onClearFilters}
        />
      }
      renderTable={() => (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/40">
                {['Fecha', 'Actor / módulo', 'Acción / descripción', 'Entidad', 'Resultado', 'Request / Correlation', 'Endpoint', 'Severidad', ''].map((header) => (
                  <th key={header} className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-sm text-muted-foreground">
                    Cargando audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-sm text-muted-foreground">
                    No hay resultados para los filtros actuales.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const severity = log.severity ?? 'INFO'
                  const style = severityStyles[severity]
                  const actorTypeLabel = log.actorType ? actorTypeLabels[log.actorType] : 'N/D'
                  const outcomeLabel = log.outcome ? outcomeLabels[log.outcome] : 'N/D'

                  return (
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors align-top">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.occurredAt)}
                      </td>
                      <td className="px-4 py-3 min-w-[220px]">
                        <div className="font-medium text-foreground text-sm">{formatActor(log)}</div>
                        <div className="text-xs text-muted-foreground">{actorTypeLabel} · {formatModule(log)}</div>
                      </td>
                      <td className="px-4 py-3 min-w-[240px]">
                        <div className="font-medium text-foreground">{log.action}</div>
                        <div className="text-xs text-muted-foreground">{log.description || 'Sin descripción adicional'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground min-w-[180px]">{formatEntity(log)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outlined" className="text-[10px]">
                          {outcomeLabel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 min-w-[200px]">
                        <div className="font-mono text-xs text-muted-foreground">{log.requestId ?? 'Sin requestId'}</div>
                        <div className="font-mono text-xs text-muted-foreground">{log.correlationId ?? 'Sin correlationId'}</div>
                      </td>
                      <td className="px-4 py-3 min-w-[220px]">
                        <div className="font-mono text-xs text-muted-foreground">{log.httpMethod ?? 'N/D'} {log.endpoint ?? 'Sin endpoint'}</div>
                        <div className="text-xs text-muted-foreground">statusCode: {log.statusCode ?? 'N/D'} · IP: {log.ipAddressMasked ?? 'Oculta'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outlined" className={`text-[10px] gap-1 ${style.badge}`}>
                          <style.icon className="w-3 h-3" />
                          {style.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon-sm" onClick={() => onOpenDetail(log)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      renderCards={() => (
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
              Cargando audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
              No hay resultados para los filtros actuales.
            </div>
          ) : (
            logs.map((log) => {
              const severity = log.severity ?? 'INFO'
              const style = severityStyles[severity]
              const actorTypeLabel = log.actorType ? actorTypeLabels[log.actorType] : 'N/D'
              const outcomeLabel = log.outcome ? outcomeLabels[log.outcome] : 'N/D'
              return (
                <div key={log.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{formatDateTime(log.occurredAt)}</span>
                    <Badge variant="outlined" className={`text-[10px] gap-1 ${style.badge}`}>
                      <style.icon className="w-3 h-3" />
                      {style.label}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{log.action}</p>
                  <p className="text-xs text-muted-foreground">{formatActor(log)} · {actorTypeLabel}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{log.description || formatEntity(log)}</p>
                  <div className="mt-2">
                    <Badge variant="outlined" className="text-[10px]">{outcomeLabel}</Badge>
                  </div>
                  <div className="mt-3">
                    <Button variant="ghost" size="icon-sm" onClick={() => onOpenDetail(log)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
      pagination={{
        summary: `Mostrando ${visibleFrom}–${visibleTo} de ${totalElements}`,
        pageSize,
        onPageSizeChange,
        pageIndex: page,
        pageCount: Math.max(totalPages, 1),
        canPreviousPage: !loading && page > 0,
        canNextPage: !loading && page < totalPages - 1,
        onPreviousPage,
        onNextPage,
      }}
    />
  )
}
