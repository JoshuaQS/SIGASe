import { AlertCircle, Eye, RefreshCw } from 'lucide-react'
import type { ElementType } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { DataTable } from '@/shared/components/ui/data-table'
import { AccessLogsFiltersPopover } from '@/features/access-logs/components/filters/access-logs-filters-popover'
import type { UnifiedAccessLogRecord, AccessLogActorType, AccessLogResult, AccessLogScope } from '@/shared/types/api'
import type { AccessLogsFilters } from '@/features/access-logs/components/filters/access-logs-filter-fields'

export type AccessResultBadge = {
  className: string
  label: string
  icon: ElementType
}

type AccessLogsTableProps = {
  totalElements: number
  logs: UnifiedAccessLogRecord[]
  loading: boolean
  errorMessage: string | null
  page: number
  totalPages: number
  visibleFrom: number
  visibleTo: number
  pageSize: number
  onPageSizeChange: (pageSize: number) => void
  draftFilters: AccessLogsFilters
  appliedFilters: AccessLogsFilters
  searchInput: string
  onSearchInputChange: (value: string) => void
  filtersOpen: boolean
  onFiltersOpenChange: (open: boolean) => void
  onDraftFiltersChange: (next: AccessLogsFilters) => void
  onApplyFilters: () => void
  onResetFilters: () => void
  onClearFilters: () => void
  onRetry: () => void
  onOpenDetail: (log: UnifiedAccessLogRecord) => void
  onPreviousPage: () => void
  onNextPage: () => void
  actorLabels: Record<Exclude<AccessLogActorType, 'ALL'>, string>
  scopeLabels: Record<Exclude<AccessLogScope, 'ALL'>, string>
  formatDateTime: (value?: string | null) => string
  formatActor: (log: UnifiedAccessLogRecord) => string
  formatResultBadge: (result: AccessLogResult) => AccessResultBadge
}

export function AccessLogsTable({
  totalElements,
  logs,
  loading,
  errorMessage,
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
  onRetry,
  onOpenDetail,
  onPreviousPage,
  onNextPage,
  actorLabels,
  scopeLabels,
  formatDateTime,
  formatActor,
  formatResultBadge,
}: AccessLogsTableProps) {
  return (
    <DataTable
      title="Access logs"
      meta={`${totalElements.toLocaleString()} registros · mostrando ${logs.length} en esta página`}
      search={{
        value: searchInput,
        onChange: onSearchInputChange,
        placeholder: 'Buscar por actor, correo, requestId o correlationId',
      }}
      viewToggle={true}
      tableLabel="Table"
      cardsLabel="Cards"
      toolbarRight={
        <AccessLogsFiltersPopover
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
        loading ? (
          <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Cargando access logs...
          </div>
        ) : errorMessage ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">No se pudo cargar la consulta</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onRetry}>Reintentar</Button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <Eye className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Sin access logs para los filtros actuales</p>
              <p className="text-sm text-muted-foreground">Ajusta filtros o cambia el rango de fechas para ampliar la consulta.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/40">
                  {['Fecha/hora', 'Actor', 'Tipo', 'Scope', 'Resultado', 'Razón', 'RequestId', 'Detalle'].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const badge = formatResultBadge(log.result)
                  const ResultIcon = badge.icon
                  return (
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(log.occurredAt)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{formatActor(log)}</div>
                        <div className="text-xs text-muted-foreground">{log.actorEmail || 'Sin correo'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="secondary">{actorLabels[log.actorType]}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{scopeLabels[log.scope]}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outlined" className={`gap-1 ${badge.className}`}>
                          <ResultIcon className="h-3 w-3" />
                          {badge.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[260px] text-muted-foreground">{log.reason || 'Sin razón registrada'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.requestId || '—'}</td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" className="h-8 gap-2" onClick={() => onOpenDetail(log)}>
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}
      renderCards={() => (
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
              Cargando access logs...
            </div>
          ) : errorMessage ? (
            <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
              {errorMessage}
            </div>
          ) : logs.length === 0 ? (
            <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
              No hay access logs para los filtros actuales.
            </div>
          ) : (
            logs.map((log) => {
              const badge = formatResultBadge(log.result)
              const ResultIcon = badge.icon
              return (
                <div key={log.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{formatDateTime(log.occurredAt)}</span>
                    <Badge variant="outlined" className={`gap-1 ${badge.className}`}>
                      <ResultIcon className="h-3 w-3" />
                      {badge.label}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{formatActor(log)}</p>
                  <p className="text-xs text-muted-foreground">{log.actorEmail || 'Sin correo'}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary">{actorLabels[log.actorType]}</Badge>
                    <Badge variant="secondary">{scopeLabels[log.scope]}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{log.reason || 'Sin razón registrada'}</p>
                  <div className="mt-3">
                    <Button variant="outline" size="sm" className="h-8 gap-2" onClick={() => onOpenDetail(log)}>
                      <Eye className="h-3.5 w-3.5" />
                      Ver
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
        canPreviousPage: page > 0,
        canNextPage: page < totalPages - 1,
        onPreviousPage,
        onNextPage,
      }}
    />
  )
}
