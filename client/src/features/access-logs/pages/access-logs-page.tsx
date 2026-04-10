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
  Filter,
  RefreshCw,
  Search,
  ServerCrash,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { DataTable } from '@/shared/components/ui/data-table'
import { DataTableFiltersShell } from '@/shared/components/ui/data-table-filters-shell'
import { ExportFormatDialog } from '@/shared/components/ui/export-format-dialog'
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
import { useTableFilterState } from '@/shared/hooks/use-table-filter-state'
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
  studentId: string
  adminId: string
  careerId: string
  search: string
  sort: AccessLogQueryParams['sort']
}

const DEFAULT_FILTERS: FilterState = {
  actorType: 'ALL',
  scope: 'ALL',
  result: '',
  dateFrom: '',
  dateTo: '',
  studentId: '',
  adminId: '',
  careerId: '',
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

const resultDescriptions: Record<AccessLogResult, string> = {
  SUCCESS: 'Acceso completado correctamente.',
  FAILED_INVALID_CREDENTIALS: 'Las credenciales capturadas no fueron válidas.',
  FAILED_STUDENT_NOT_FOUND: 'No se encontró al estudiante solicitado.',
  FAILED_STUDENT_INACTIVE: 'El estudiante existe, pero está inactivo.',
  FAILED_ADMIN_INACTIVE: 'La cuenta administrativa está inactiva.',
  FAILED_ACCOUNT_LOCKED: 'La cuenta está bloqueada temporalmente.',
  FAILED_INVALID_GOOGLE_TOKEN: 'El token recibido desde Google es inválido.',
  FAILED_GOOGLE_PROVIDER_UNAVAILABLE: 'El proveedor de Google no respondió.',
  FAILED_GOOGLE_PROVIDER_ERROR: 'Google respondió con error en la autenticación.',
  FAILED_GOOGLE_SUBJECT_MISMATCH: 'El sujeto autenticado no coincide con la cuenta esperada.',
  FAILED_INSTITUTIONAL_DOMAIN: 'El correo no pertenece al dominio institucional permitido.',
  FAILED_ELIBRO_CONFIG: 'La configuración activa de eLibro no permite completar el acceso.',
  FAILED_NEXT_URL_VALIDATION: 'La URL de redirección fue rechazada por validación.',
  FAILED_ELIBRO_API: 'eLibro respondió con error de proveedor.',
  FAILED_ELIBRO_TIMEOUT: 'La llamada al proveedor de eLibro agotó el tiempo de espera.',
  FAILED_INTERNAL_ERROR: 'Ocurrió un error interno durante el acceso.',
}

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
  const [page, setPage] = useState(0)
  const [logs, setLogs] = useState<UnifiedAccessLogRecord[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<UnifiedAccessLogRecord | null>(null)
  const {
    filtersOpen,
    setFiltersOpen,
    draftFilters,
    appliedFilters,
    updateDraftFilter,
    applyFilters,
    resetDraftFilters,
    clearFilters,
    commitAppliedFilters,
  } = useTableFilterState(DEFAULT_FILTERS)

  const queryParams = useMemo<AccessLogQueryParams>(() => ({
    actorType: appliedFilters.actorType,
    scope: appliedFilters.scope,
    result: appliedFilters.result || undefined,
    dateFrom: normalizeDateTimeFilter(appliedFilters.dateFrom),
    dateTo: normalizeDateTimeFilter(appliedFilters.dateTo),
    studentId: appliedFilters.studentId.trim() || undefined,
    adminId: appliedFilters.adminId.trim() || undefined,
    careerId: appliedFilters.careerId.trim() || undefined,
    search: appliedFilters.search.trim() || undefined,
    page,
    size: PAGE_SIZE,
    sort: appliedFilters.sort,
  }), [appliedFilters, page])

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

  useEffect(() => {
    setPage(0)
  }, [appliedFilters])

  const successesOnPage = logs.filter((log) => log.result === 'SUCCESS').length
  const failuresOnPage = logs.length - successesOnPage
  const actorsOnPage = new Set(logs.map((log) => `${log.actorType}:${log.actorId ?? log.actorEmail ?? log.id}`)).size
  const visibleFrom = totalElements === 0 ? 0 : page * PAGE_SIZE + 1
  const visibleTo = totalElements === 0 ? 0 : Math.min((page + 1) * PAGE_SIZE, totalElements)

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

  const activeFilterChips = useMemo(() => ([
    ...(appliedFilters.search.trim()
      ? [{
          id: 'search',
          label: `Búsqueda: ${appliedFilters.search.trim()}`,
          onClear: () => commitAppliedFilters((current) => ({ ...current, search: '' })),
        }]
      : []),
    ...(appliedFilters.actorType !== 'ALL'
      ? [{
          id: 'actorType',
          label: `Actor: ${actorLabels[appliedFilters.actorType]}`,
          onClear: () => commitAppliedFilters((current) => ({ ...current, actorType: 'ALL' })),
        }]
      : []),
    ...(appliedFilters.scope !== 'ALL'
      ? [{
          id: 'scope',
          label: `Scope: ${scopeLabels[appliedFilters.scope]}`,
          onClear: () => commitAppliedFilters((current) => ({ ...current, scope: 'ALL' })),
        }]
      : []),
    ...(appliedFilters.result
      ? [{
          id: 'result',
          label: `Resultado: ${appliedFilters.result}`,
          onClear: () => commitAppliedFilters((current) => ({ ...current, result: '' })),
        }]
      : []),
    ...(appliedFilters.studentId.trim()
      ? [{
          id: 'studentId',
          label: `Student ID: ${appliedFilters.studentId.trim()}`,
          onClear: () => commitAppliedFilters((current) => ({ ...current, studentId: '' })),
        }]
      : []),
    ...(appliedFilters.adminId.trim()
      ? [{
          id: 'adminId',
          label: `Admin ID: ${appliedFilters.adminId.trim()}`,
          onClear: () => commitAppliedFilters((current) => ({ ...current, adminId: '' })),
        }]
      : []),
    ...(appliedFilters.careerId.trim()
      ? [{
          id: 'careerId',
          label: `Career ID: ${appliedFilters.careerId.trim()}`,
          onClear: () => commitAppliedFilters((current) => ({ ...current, careerId: '' })),
        }]
      : []),
    ...(appliedFilters.dateFrom
      ? [{
          id: 'dateFrom',
          label: 'Fecha inicial',
          onClear: () => commitAppliedFilters((current) => ({ ...current, dateFrom: '' })),
        }]
      : []),
    ...(appliedFilters.dateTo
      ? [{
          id: 'dateTo',
          label: 'Fecha final',
          onClear: () => commitAppliedFilters((current) => ({ ...current, dateTo: '' })),
        }]
      : []),
  ]), [appliedFilters, commitAppliedFilters])

  const handleExport = (format: AccessLogExportFormat) => {
    setExporting(true)
    void exportAccessLogsReport(queryParams, format)
      .then(({ blob, filename }) => {
        downloadBlob(blob, filename)
        setExportDialogOpen(false)
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
            <Button variant="outline" size="md" className="gap-2" disabled={exporting} onClick={() => setExportDialogOpen(true)}>
              <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-pulse' : ''}`} />
              Exportar
            </Button>
          </>
        }
      />

      <ExportFormatDialog
        open={exportDialogOpen}
        title="Exportar access logs"
        description="Selecciona el formato de descarga para la consulta actual de access logs."
        loading={exporting}
        onClose={() => !exporting && setExportDialogOpen(false)}
        onSelect={(format) => {
          handleExport(format as AccessLogExportFormat)
        }}
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
        <CardHeader className="pb-3">
          <p className="text-sm font-semibold text-foreground">Leyenda de resultados</p>
          <p className="text-xs text-muted-foreground">Referencia rápida de todos los outcomes posibles que puede devolver el log unificado.</p>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {RESULT_OPTIONS.map((result) => {
            const badge = formatResultBadge(result)
            const Icon = badge.icon
            return (
              <div key={result} className="rounded-xl border border-border/70 bg-secondary/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outlined" className={badge.className}>
                    <Icon className="mr-1 h-3 w-3" />
                    {result === 'SUCCESS' ? 'SUCCESS' : result}
                  </Badge>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {resultDescriptions[result]}
                </p>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <DataTable
        title="Access logs"
        meta={`${totalElements.toLocaleString()} registros · mostrando ${logs.length} en esta página`}
        viewToggle={false}
        toolbarRight={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setFiltersOpen((current) => !current)}
          >
            <Filter className="h-3 w-3" />
            Filtrar
          </Button>
        }
        toolbarBelow={(
          <DataTableFiltersShell
            open={filtersOpen}
            chips={activeFilterChips}
            onApply={() => {
              applyFilters()
              setPage(0)
            }}
            onReset={resetDraftFilters}
            onClear={() => {
              clearFilters()
              setPage(0)
            }}
          >
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
              <Input
                value={draftFilters.search}
                onChange={(event) => updateDraftFilter('search', event.target.value)}
                placeholder="Buscar por actor, correo, requestId o correlationId"
                startAdornment={<Search className="h-4 w-4" />}
              />

              <Select value={draftFilters.actorType} onValueChange={(value) => updateDraftFilter('actorType', value as AccessLogActorType)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Tipo de actor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los actores</SelectItem>
                  <SelectItem value="STUDENT">Estudiante</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>

              <Select value={draftFilters.scope} onValueChange={(value) => updateDraftFilter('scope', value as AccessLogScope)}>
                <SelectTrigger className="h-9 w-full">
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
                value={draftFilters.result || '__ALL__'}
                onValueChange={(value) => updateDraftFilter('result', value === '__ALL__' ? '' : isAccessLogResult(value) ? value : '')}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Todos los resultados</SelectItem>
                  {RESULT_OPTIONS.map((result) => (
                    <SelectItem key={result} value={result}>{result}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={draftFilters.sort ?? 'occurredAt,desc'} onValueChange={(value) => updateDraftFilter('sort', value as FilterState['sort'])}>
                <SelectTrigger className="h-9 w-full">
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
                value={draftFilters.dateFrom}
                onChange={(event) => updateDraftFilter('dateFrom', event.target.value)}
              />
              <Input
                type="datetime-local"
                value={draftFilters.dateTo}
                onChange={(event) => updateDraftFilter('dateTo', event.target.value)}
              />
              <Input
                value={draftFilters.studentId}
                onChange={(event) => updateDraftFilter('studentId', event.target.value)}
                placeholder="Student ID"
              />
              <Input
                value={draftFilters.adminId}
                onChange={(event) => updateDraftFilter('adminId', event.target.value)}
                placeholder="Admin ID"
              />
              <Input
                value={draftFilters.careerId}
                onChange={(event) => updateDraftFilter('careerId', event.target.value)}
                placeholder="Career ID"
                className="xl:col-span-2"
              />
            </div>
          </DataTableFiltersShell>
        )}
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

            </>
          )
        )}
        pagination={{
          summary: `Mostrando ${visibleFrom}–${visibleTo} de ${totalElements}`,
          pageIndex: page,
          pageCount: Math.max(totalPages, 1),
          canPreviousPage: page > 0,
          canNextPage: page < totalPages - 1,
          onPreviousPage: () => setPage((current) => Math.max(0, current - 1)),
          onNextPage: () => setPage((current) => Math.min(Math.max(totalPages - 1, 0), current + 1)),
        }}
      />

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
