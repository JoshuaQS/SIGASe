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
  ServerCrash,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet'
import StatusCard from '@/shared/components/data-display/status-card'
import { SectionHeader } from '@/shared/components/ui/section-header'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { useTableFilterState } from '@/shared/hooks/use-table-filter-state'
import { AccessLogsTable } from '@/features/access-logs/components/access-logs-table'
import {
  DEFAULT_ACCESS_LOGS_FILTERS,
  type AccessLogsFilters,
} from '@/features/access-logs/components/filters/access-logs-filter-fields'
import {
  exportAccessLogsReport,
  getAccessLogs,
  getAccessLogMetrics,
  getAccessLogSummary,
  type AccessLogExportFormat,
  type AccessLogMetricsDto,
  type AccessLogSummaryDto,
  type AccessLogQueryParams,
} from '@/features/access-logs/api/access-logs-api'
import type {
  AccessLogActorType,
  AccessLogScope,
  AccessLogResult,
  UnifiedAccessLogRecord,
} from '@/shared/types/api'

const PAGE_SIZE = 8
const CHART_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316', '#14b8a6']
const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
} as const

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

function formatResultBadge(result: AccessLogResult) {
  if (result === 'SUCCESS') {
    return {
      className: 'text-emerald-700 border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
      label: 'Exitoso',
      icon: CheckCircle2,
    }
  }
  return {
    className: 'text-red-700 border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
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
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [logs, setLogs] = useState<UnifiedAccessLogRecord[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [isHeaderExportOpen, setIsHeaderExportOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<UnifiedAccessLogRecord | null>(null)
  const [metrics, setMetrics] = useState<AccessLogMetricsDto | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [summary, setSummary] = useState<AccessLogSummaryDto | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  /** Serie horaria de hoy desde API sin filtros de tabla (mismo endpoint, universo completo). */
  const [volumeTodayBuckets, setVolumeTodayBuckets] = useState<AccessLogMetricsDto['hourlyVolumeToday'] | undefined>(undefined)
  const [volumeTodayLoading, setVolumeTodayLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const {
    filtersOpen,
    setFiltersOpen,
    draftFilters,
    setDraftFilters,
    appliedFilters,
    setAppliedFilters,
    applyFilters,
    resetDraftFilters,
    clearFilters,
  } = useTableFilterState<AccessLogsFilters>(DEFAULT_ACCESS_LOGS_FILTERS)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 350)
    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  useEffect(() => {
    setDraftFilters((current) => ({ ...current, search: debouncedSearch }))
    setAppliedFilters((current) => ({ ...current, search: debouncedSearch }))
    setPage(0)
  }, [debouncedSearch, setAppliedFilters, setDraftFilters])

  const queryParams = useMemo<AccessLogQueryParams>(() => ({
    actorType: appliedFilters.actorType,
    scope: appliedFilters.scope,
    result: appliedFilters.result || undefined,
    dateFrom: normalizeDateTimeFilter(appliedFilters.dateFrom),
    dateTo: normalizeDateTimeFilter(appliedFilters.dateTo),
    studentId: appliedFilters.studentId.trim() || undefined,
    adminId: appliedFilters.adminId.trim() || undefined,
    careerId: appliedFilters.careerId.trim() || undefined,
    search: debouncedSearch.trim() || undefined,
    page,
    size: pageSize,
    sort: appliedFilters.sort,
  }), [appliedFilters, debouncedSearch, page, pageSize])

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

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true)
    try {
      // Global metrics: ignore table filters/search.
      const response = await getAccessLogMetrics({}, 7)
      setMetrics(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron cargar las métricas de access logs.'
      showToast({
        severity: 'warning',
        title: 'Métricas no disponibles',
        description: message,
      })
      setMetrics(null)
    } finally {
      setMetricsLoading(false)
    }
  }, [showToast])

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      // Global summary: ignore table filters/search.
      const response = await getAccessLogSummary({}, 7)
      setSummary(response)
    } catch {
      setSummary(null)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const loadVolumeToday = useCallback(async () => {
    setVolumeTodayLoading(true)
    try {
      const response = await getAccessLogMetrics({}, 7)
      setVolumeTodayBuckets(response.hourlyVolumeToday ?? [])
    } catch {
      setVolumeTodayBuckets(undefined)
    } finally {
      setVolumeTodayLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAccessLogs(queryParams)
  }, [loadAccessLogs, queryParams])

  useEffect(() => {
    void loadMetrics()
  }, [loadMetrics])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    void loadVolumeToday()
  }, [loadVolumeToday])

  useEffect(() => {
    setPage(0)
  }, [appliedFilters])

  const successesTotal = summary?.successful ?? 0
  const failuresTotal = summary?.failed ?? 0
  const actorsTotal = summary?.uniqueActors ?? 0
  const visibleFrom = totalElements === 0 ? 0 : page * pageSize + 1
  const visibleTo = totalElements === 0 ? 0 : Math.min((page + 1) * pageSize, totalElements)

  const volumeData = useMemo(() => {
    const buckets = volumeTodayBuckets ?? metrics?.hourlyVolumeToday ?? []
    return buckets.map((p) => ({
      hour: p.t,
      total: Number(p.total) || 0,
      exitosos: Number(p.successful) || 0,
      fallidos: Number(p.failed) || 0,
    }))
  }, [volumeTodayBuckets, metrics])

  const hasVolumeValues = useMemo(
    () => volumeData.some((bucket) => bucket.total > 0 || bucket.exitosos > 0 || bucket.fallidos > 0),
    [volumeData],
  )

  const pieData = useMemo(() => {
    const rows = metrics?.careerDistribution ?? []
    const total = rows.reduce((acc, r) => acc + (r.total ?? 0), 0)
    return rows
      .slice(0, 6)
      .map((r, index) => ({
        name: r.careerCode || r.careerName || 'N/D',
        value: r.total,
        color: CHART_COLORS[index % CHART_COLORS.length],
        pct: total > 0 ? Math.round((r.total / total) * 100) : 0,
      }))
  }, [metrics])

  const handleRefresh = () => {
    void loadVolumeToday()
    void loadMetrics()
    void loadSummary()
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
        setIsHeaderExportOpen(false)
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
        subtitle="Revisa los intentos de acceso para dar seguimiento a la actividad en SIGASe y eLibro."
        actions={
          <>
            <Button variant="outline" size="md" onClick={handleRefresh} disabled={loading} className="gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Popover open={isHeaderExportOpen} onOpenChange={setIsHeaderExportOpen}>
              <PopoverTrigger asChild>
                <Button disabled={exporting} variant="outline" size="md" className="gap-2">
                  <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-pulse' : ''}`} />
                  Exportar
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[180px] p-2">
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setIsHeaderExportOpen(false)
                      handleExport('csv')
                    }}
                  >
                    <FileText className="size-4" />
                    Descargar CSV
                  </Button>
                  <div className="my-1 h-px bg-border" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setIsHeaderExportOpen(false)
                      handleExport('xlsx')
                    }}
                  >
                    <FileText className="size-4" />
                    Descargar XLSX
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Total (7 días)"
          value={summaryLoading ? '…' : (summary?.total ?? 0).toLocaleString()}
          subtitle="Resumen global (no depende de filtros)"
          icon={Activity}
          variant="info"
          delay={0}
        />
        <StatusCard
          title="Exitosos (7 días)"
          value={summaryLoading ? '…' : successesTotal}
          subtitle="Resumen global (no depende de filtros)"
          icon={CheckCircle2}
          variant="success"
          delay={0.05}
        />
        <StatusCard
          title="Fallos (7 días)"
          value={summaryLoading ? '…' : failuresTotal}
          subtitle="Resumen global (no depende de filtros)"
          icon={ServerCrash}
          variant="destructive"
          delay={0.1}
        />
        <StatusCard
          title="Actores (7 días)"
          value={summaryLoading ? '…' : actorsTotal}
          subtitle="Resumen global (no depende de filtros)"
          icon={Clock3}
          variant="primary"
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Volumen de Accesos — Hoy</CardTitle>
            <CardDescription className="text-xs">
              Solicitudes reales agregadas por hora (día UTC en servidor). No depende de los filtros de la tabla.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {volumeTodayLoading ? (
              <div className="h-[180px] grid place-items-center text-sm text-muted-foreground">
                Cargando volumen del día...
              </div>
            ) : volumeData.length > 0 && hasVolumeValues ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={volumeData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fill="url(#gTotal)" dot={false} name="Total" />
                  <Area type="monotone" dataKey="exitosos" stroke="#10b981" strokeWidth={1.5} fill="none" strokeDasharray="4 2" dot={false} name="Exitosos" />
                  <Area type="monotone" dataKey="fallidos" stroke="#ef4444" strokeWidth={1.5} fill="none" dot={false} name="Fallidos" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] grid place-items-center text-sm text-muted-foreground">
                Sin datos para graficar.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-semibold text-foreground">Distribución por Carrera</p>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-[180px] grid place-items-center text-sm text-muted-foreground">
                Cargando métricas...
              </div>
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] grid place-items-center text-sm text-muted-foreground">
                Sin datos para graficar.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AccessLogsTable
        totalElements={totalElements}
        logs={logs}
        loading={loading}
        errorMessage={errorMessage}
        page={page}
        totalPages={totalPages}
        visibleFrom={visibleFrom}
        visibleTo={visibleTo}
        draftFilters={draftFilters}
        appliedFilters={appliedFilters}
        searchInput={searchInput}
        onSearchInputChange={(value) => setSearchInput(value)}
        pageSize={pageSize}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize)
          setPage(0)
        }}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        onDraftFiltersChange={setDraftFilters}
        onApplyFilters={() => {
          applyFilters()
          setPage(0)
        }}
        onResetFilters={resetDraftFilters}
        onClearFilters={() => {
          clearFilters()
          setSearchInput('')
          setPage(0)
        }}
        onRetry={handleRefresh}
        onOpenDetail={setSelectedLog}
        onPreviousPage={() => setPage((current) => Math.max(0, current - 1))}
        onNextPage={() => setPage((current) => Math.min(Math.max(totalPages - 1, 0), current + 1))}
        actorLabels={actorLabels}
        scopeLabels={scopeLabels}
        formatDateTime={formatDateTime}
        formatActor={formatActor}
        formatResultBadge={formatResultBadge}
      />

      <Sheet open={Boolean(selectedLog)} onOpenChange={(o) => { if (!o) setSelectedLog(null) }}>
        <SheetContent side="right" className="w-[min(100vw,420px)] sm:max-w-[420px] overflow-y-auto p-0">
          {selectedLog ? (
            <AccessLogDetailDrawerContent log={selectedLog} />
          ) : null}
        </SheetContent>
      </Sheet>
    </motion.div>
  )
}

function AccessLogDetailDrawerContent({ log }: { log: UnifiedAccessLogRecord }) {
  const ok = log.result === 'SUCCESS'
  const latencyLabel = log.latencyMs != null ? `${log.latencyMs}ms` : '—'

  const sections = [
    {
      title: 'Actor',
      items: [
        { l: 'Nombre', v: formatActor(log) },
        { l: 'Correo', v: log.actorEmail || '—' },
        { l: 'Tipo', v: actorLabels[log.actorType] },
      ],
    },
    {
      title: 'Evento',
      items: [
        { l: 'Fecha', v: formatDateTime(log.occurredAt) },
        { l: 'Scope', v: scopeLabels[log.scope] },
        { l: 'Resultado', v: log.result },
        { l: 'Razón', v: log.reason || '—' },
        { l: 'Latencia', v: latencyLabel },
        { l: 'Next URL', v: log.nextUrl || '—' },
        { l: 'Redirect URL', v: log.redirectUrl || '—' },
      ],
    },
    {
      title: 'Conexión',
      items: [
        { l: 'IP', v: log.ipAddressMasked || '—' },
        { l: 'User-Agent', v: log.userAgentSanitized || '—' },
        { l: 'Canal', v: log.channelName || '—' },
        { l: 'Session', v: log.sessionId || '—' },
        { l: 'Request', v: log.requestId || '—' },
        { l: 'Correlation', v: log.correlationId || '—' },
      ],
    },
    {
      title: 'Proveedor',
      items: [
        { l: 'Status', v: log.providerStatusCode != null ? String(log.providerStatusCode) : '—' },
        { l: 'Error Code', v: log.providerErrorCode || '—' },
        { l: 'Error Msg', v: log.providerErrorMessage || '—' },
      ],
    },
  ]

  return (
    <>
      <SheetHeader className="border-b border-border px-6 py-5 pb-4 text-left">
        <SheetTitle className="text-lg">Detalle del access log</SheetTitle>
        <SheetDescription>
          Contexto técnico saneado y campos opcionales del evento seleccionado.
        </SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-6 py-4 pb-8">
        <div
          className={
            ok
              ? 'flex items-center gap-3 rounded-lg border border-success-border bg-success-soft p-3'
              : 'flex items-center gap-3 rounded-lg border border-destructive/25 bg-destructive/10 p-3'
          }
        >
          <div
            className={
              ok ? 'h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--success))]' : 'h-2 w-2 shrink-0 rounded-full bg-destructive'
            }
          />
          <span className="text-sm font-medium text-foreground">{log.result}</span>
          <span className="ml-auto text-xs text-muted-foreground">{latencyLabel}</span>
        </div>

        {sections.map((sec) => (
          <div key={sec.title}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {sec.title}
            </p>
            <div className="space-y-3">
              {sec.items.map((item) => (
                <div key={item.l} className="flex justify-between gap-4">
                  <span className="shrink-0 text-xs text-muted-foreground">{item.l}</span>
                  <span className="truncate text-right text-sm text-foreground" title={item.v}>
                    {item.v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Metadata</p>
          <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
            {renderMetadata(log.metadata)}
          </pre>
        </div>
      </div>
    </>
  )
}

export default AccessLogs
