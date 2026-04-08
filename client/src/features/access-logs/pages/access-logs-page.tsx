import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  RefreshCw,
  Search,
  ServerCrash,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import StatusCard from '@/shared/components/data-display/status-card'
import { SectionHeader } from '@/shared/components/ui/section-header'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import {
  exportAccessLogsReport,
  getAccessLogs,
  type AccessLogExportFormat,
  type AccessLogQueryParams,
} from '@/features/access-logs/api/access-logs-api'
import type {
  AccessLogActorType,
  AccessLogScope,
  AccessLogResult,
  UnifiedAccessLogRecord,
} from '@/shared/types/api'

const PAGE_SIZE = 20

type FilterState = {
  actorType: AccessLogActorType
  scope: AccessLogScope
  result: AccessLogResult | ''
  dateFrom: string
  dateTo: string
  search: string
  sort: AccessLogQueryParams['sort']
}

const DEFAULT_FILTERS: FilterState = {
  actorType: 'ALL',
  scope: 'ALL',
  result: '',
  dateFrom: '',
  dateTo: '',
  search: '',
  sort: 'occurredAt,desc',
}

const RESULT_OPTIONS = [
  'SUCCESS',
  'FAILED_INVALID_CREDENTIALS',
  'FAILED_STUDENT_NOT_FOUND',
  'FAILED_STUDENT_INACTIVE',
  'FAILED_ADMIN_INACTIVE',
  'FAILED_ACCOUNT_LOCKED',
  'FAILED_INVALID_GOOGLE_TOKEN',
  'FAILED_GOOGLE_PROVIDER_UNAVAILABLE',
  'FAILED_GOOGLE_PROVIDER_ERROR',
  'FAILED_GOOGLE_SUBJECT_MISMATCH',
  'FAILED_INSTITUTIONAL_DOMAIN',
  'FAILED_ELIBRO_CONFIG',
  'FAILED_NEXT_URL_VALIDATION',
  'FAILED_ELIBRO_API',
  'FAILED_ELIBRO_TIMEOUT',
  'FAILED_INTERNAL_ERROR',
] as const satisfies readonly AccessLogResult[]

const scopeLabels: Record<Exclude<AccessLogScope, 'ALL'>, string> = {
  SIGASE_LOCAL: 'SIGASe Local',
  SIGASE_GOOGLE: 'SIGASe Google',
  ELIBRO: 'eLibro',
  ADMIN_LOGIN: 'Login admin',
}

const actorLabels: Record<Exclude<AccessLogActorType, 'ALL'>, string> = {
  STUDENT: 'Estudiante',
  ADMIN: 'Administrador',
}

function normalizeDateTimeFilter(value: string) {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin fecha'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'
  return parsed.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatActor(log: UnifiedAccessLogRecord) {
  return log.actorName || log.actorEmail || log.actorId || 'Sin actor'
}

function isAccessLogResult(value: string): value is AccessLogResult {
  return (RESULT_OPTIONS as readonly string[]).includes(value)
}

function formatResultBadge(result: AccessLogResult) {
  if (result === 'SUCCESS') {
    return {
      className: 'text-emerald-600 border-emerald-200 bg-emerald-50',
      label: 'Exitoso',
      icon: CheckCircle2,
    }
  }
  return {
    className: 'text-red-600 border-red-200 bg-red-50',
    label: result,
    icon: AlertCircle,
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function renderMetadata(metadata: unknown) {
  if (!metadata) return 'Sin metadata adicional'
  if (typeof metadata === 'string') return metadata
  try {
    return JSON.stringify(metadata, null, 2)
  } catch {
    return String(metadata)
  }
}

const AccessLogs = () => {
  const { showToast } = useAppToast()
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [page, setPage] = useState(0)
  const [logs, setLogs] = useState<UnifiedAccessLogRecord[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [selectedLog, setSelectedLog] = useState<UnifiedAccessLogRecord | null>(null)

  const queryParams = useMemo<AccessLogQueryParams>(() => ({
    actorType: filters.actorType,
    scope: filters.scope,
    result: filters.result || undefined,
    dateFrom: normalizeDateTimeFilter(filters.dateFrom),
    dateTo: normalizeDateTimeFilter(filters.dateTo),
    search: filters.search.trim() || undefined,
    page,
    size: PAGE_SIZE,
    sort: filters.sort,
  }), [filters, page])

  const loadAccessLogs = useCallback(async (params: AccessLogQueryParams) => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const tableResponse = await getAccessLogs(params)

      setLogs(tableResponse.content)
      setTotalElements(tableResponse.totalElements)
      setTotalPages(tableResponse.totalPages)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron cargar los access logs.'
      setErrorMessage(message)
      showToast({
        severity: 'error',
        title: 'Error cargando access logs',
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void loadAccessLogs(queryParams)
  }, [loadAccessLogs, queryParams])

  const successesOnPage = logs.filter((log) => log.result === 'SUCCESS').length
  const failuresOnPage = logs.length - successesOnPage
  const actorsOnPage = new Set(logs.map((log) => `${log.actorType}:${log.actorId ?? log.actorEmail ?? log.id}`)).size
  const visibleFrom = totalElements === 0 ? 0 : page * PAGE_SIZE + 1
  const visibleTo = totalElements === 0 ? 0 : Math.min((page + 1) * PAGE_SIZE, totalElements)

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(0)
  }

  const handleRefresh = () => {
    void loadAccessLogs(queryParams)
      .then(() => {
        showToast({
          severity: 'success',
          title: 'Access logs actualizados',
          description: 'La vista se sincronizó con `/api/v1/access-logs`.',
        })
      })
  }

  const handleExport = (format: AccessLogExportFormat) => {
    setExporting(true)
    void exportAccessLogsReport(queryParams, format)
      .then(({ blob, filename }) => {
        downloadBlob(blob, filename)
        showToast({
          severity: 'success',
          title: 'Exportación completada',
          description: `Se descargó el reporte unificado en ${format.toUpperCase()}.`,
        })
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'No se pudo exportar el reporte.'
        showToast({
          severity: 'error',
          title: 'Error exportando access logs',
          description: message,
        })
      })
      .finally(() => setExporting(false))
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <SectionHeader
        icon={FileText}
        title="Access Logs"
        subtitle="Consulta unificada de accesos a SIGASe y eLibro desde `/api/v1/access-logs`."
        actions={
          <>
            <Button variant="outline" size="md" onClick={handleRefresh} disabled={loading} className="gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button variant="outline" size="md" className="gap-2" disabled={exporting} onClick={() => handleExport('csv')}>
              <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-pulse' : ''}`} />
              Exportar CSV
            </Button>
            <Button variant="outline" size="md" className="gap-2" disabled={exporting} onClick={() => handleExport('xlsx')}>
              <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-pulse' : ''}`} />
              Exportar XLSX
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Total filtrado"
          value={totalElements.toLocaleString()}
          subtitle="Coincide con la consulta actual"
          icon={Activity}
          iconBg="bg-indigo-500/10"
          iconFg="text-indigo-600"
          delay={0}
        />
        <StatusCard
          title="Exitosos visibles"
          value={successesOnPage}
          subtitle="En la página actual"
          icon={CheckCircle2}
          iconBg="bg-emerald-500/10"
          iconFg="text-emerald-600"
          delay={0.05}
        />
        <StatusCard
          title="Fallos visibles"
          value={failuresOnPage}
          subtitle="Resultados no exitosos"
          icon={ServerCrash}
          iconBg="bg-red-500/10"
          iconFg="text-red-600"
          delay={0.1}
        />
        <StatusCard
          title="Actores visibles"
          value={actorsOnPage}
          subtitle="En la página actual"
          icon={Clock3}
          iconBg="bg-sky-500/10"
          iconFg="text-sky-600"
          delay={0.15}
        />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                placeholder="Buscar por actor, correo, requestId o correlationId"
                className="pl-10"
              />
            </div>

            <Select value={filters.actorType} onValueChange={(value) => updateFilter('actorType', value as AccessLogActorType)}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Tipo de actor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los actores</SelectItem>
                <SelectItem value="STUDENT">Estudiante</SelectItem>
                <SelectItem value="ADMIN">Administrador</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.scope} onValueChange={(value) => updateFilter('scope', value as AccessLogScope)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los scopes</SelectItem>
                <SelectItem value="SIGASE_LOCAL">SIGASe local</SelectItem>
                <SelectItem value="SIGASE_GOOGLE">SIGASe Google</SelectItem>
                <SelectItem value="ELIBRO">eLibro</SelectItem>
                <SelectItem value="ADMIN_LOGIN">Login admin</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.result || '__ALL__'}
              onValueChange={(value) => updateFilter('result', value === '__ALL__' ? '' : isAccessLogResult(value) ? value : '')}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todos los resultados</SelectItem>
                {RESULT_OPTIONS.map((result) => (
                  <SelectItem key={result} value={result}>{result}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.sort ?? 'occurredAt,desc'} onValueChange={(value) => updateFilter('sort', value as FilterState['sort'])}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Orden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="occurredAt,desc">Fecha: más reciente</SelectItem>
                <SelectItem value="occurredAt,asc">Fecha: más antigua</SelectItem>
                <SelectItem value="result,asc">Resultado A-Z</SelectItem>
                <SelectItem value="scope,asc">Scope A-Z</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="datetime-local"
              value={filters.dateFrom}
              onChange={(event) => updateFilter('dateFrom', event.target.value)}
              className="w-[210px]"
            />
            <Input
              type="datetime-local"
              value={filters.dateTo}
              onChange={(event) => updateFilter('dateTo', event.target.value)}
              className="w-[210px]"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
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
              <Button variant="outline" size="sm" onClick={handleRefresh}>Reintentar</Button>
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
            <>
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
                            <Button variant="outline" size="sm" className="h-8 gap-2" onClick={() => setSelectedLog(log)}>
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

              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  Mostrando {visibleFrom}–{visibleTo} de {totalElements}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>
                    Anterior
                  </Button>
                  <Badge variant="secondary">Página {page + 1} de {Math.max(totalPages, 1)}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={page >= totalPages - 1 || totalPages === 0}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => { if (!open) setSelectedLog(null) }}>
        <DialogContent size="3">
          <DialogHeader>
            <DialogTitle>Detalle del access log</DialogTitle>
            <DialogDescription>
              Contexto técnico saneado y campos opcionales del evento seleccionado.
            </DialogDescription>
          </DialogHeader>

          {selectedLog ? (
            <div className="grid gap-4 py-2">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailItem label="Fecha/hora" value={formatDateTime(selectedLog.occurredAt)} />
                <DetailItem label="Actor" value={formatActor(selectedLog)} />
                <DetailItem label="Correo" value={selectedLog.actorEmail || 'Sin correo'} />
                <DetailItem label="Tipo" value={actorLabels[selectedLog.actorType]} />
                <DetailItem label="Scope" value={scopeLabels[selectedLog.scope]} />
                <DetailItem label="Resultado" value={selectedLog.result} />
                <DetailItem label="Razón" value={selectedLog.reason || 'Sin razón registrada'} />
                <DetailItem label="SessionId" value={selectedLog.sessionId || 'Sin sessionId'} />
                <DetailItem label="RequestId" value={selectedLog.requestId || 'Sin requestId'} />
                <DetailItem label="CorrelationId" value={selectedLog.correlationId || 'Sin correlationId'} />
                <DetailItem label="IP saneada" value={selectedLog.ipAddressMasked || 'Sin IP'} />
                <DetailItem label="User-Agent saneado" value={selectedLog.userAgentSanitized || 'Sin user-agent'} />
                <DetailItem label="Latency (ms)" value={selectedLog.latencyMs != null ? String(selectedLog.latencyMs) : 'Sin latencia'} />
                <DetailItem label="Channel" value={selectedLog.channelName || 'Sin canal'} />
                <DetailItem label="Next URL" value={selectedLog.nextUrl || 'Sin nextUrl'} />
                <DetailItem label="Redirect URL" value={selectedLog.redirectUrl || 'Sin redirectUrl'} />
                <DetailItem label="Provider status" value={selectedLog.providerStatusCode != null ? String(selectedLog.providerStatusCode) : 'Sin status'} />
                <DetailItem label="Provider error code" value={selectedLog.providerErrorCode || 'Sin código'} />
                <DetailItem label="Provider error message" value={selectedLog.providerErrorMessage || 'Sin mensaje'} />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Metadata</p>
                <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
                  {renderMetadata(selectedLog.metadata)}
                </pre>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground break-words">{value}</p>
    </div>
  )
}

export default AccessLogs
