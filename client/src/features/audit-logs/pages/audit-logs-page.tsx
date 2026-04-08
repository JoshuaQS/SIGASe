import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Clock3,
  Download,
  Eye,
  Filter,
  Info,
  RefreshCw,
  Search,
  Shield,
  UserCircle2,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { ExportFormatDialog } from '@/shared/components/ui/export-format-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { SectionHeader } from '@/shared/components/ui/section-header'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import StatusCard from '@/shared/components/data-display/status-card'
import { ROLE_ADMIN_TI } from '@/features/auth/types/auth-user'
import { useAuthUser } from '@/features/auth/hooks/use-auth-user'
import {
  exportAuditLogsReport,
  getAuditLogs,
  type AuditActorType,
  type AuditLogDto,
  type AuditLogExportFormat,
  type AuditLogParams,
  type AuditOutcome,
  type AuditSeverity,
} from '@/features/audit-logs/api/audit-logs-api'

const PAGE_SIZE = 10
const CHART_COLORS = ['#0ea5e9', '#f59e0b', '#ef4444', '#6366f1', '#10b981', '#f97316']
const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
}

const severityStyles: Record<AuditSeverity, { badge: string; label: string; icon: React.ElementType; bar: string }> = {
  INFO: {
    badge: 'text-blue-600 border-blue-200 bg-blue-50',
    label: 'INFO',
    icon: Info,
    bar: 'bg-blue-500',
  },
  NOTICE: {
    badge: 'text-sky-700 border-sky-200 bg-sky-50',
    label: 'NOTICE',
    icon: Eye,
    bar: 'bg-sky-500',
  },
  WARNING: {
    badge: 'text-amber-700 border-amber-200 bg-amber-50',
    label: 'WARNING',
    icon: AlertTriangle,
    bar: 'bg-amber-500',
  },
  SECURITY: {
    badge: 'text-orange-700 border-orange-200 bg-orange-50',
    label: 'SECURITY',
    icon: Shield,
    bar: 'bg-orange-500',
  },
  CRITICAL: {
    badge: 'text-red-600 border-red-200 bg-red-50',
    label: 'CRITICAL',
    icon: AlertCircle,
    bar: 'bg-red-500',
  },
}

const actorTypeLabels: Record<AuditActorType, string> = {
  ADMIN: 'Admin',
  SYSTEM: 'Sistema',
  INTEGRATION: 'Integración',
}

const outcomeLabels: Record<AuditOutcome, string> = {
  SUCCESS: 'Exitoso',
  FAILURE: 'Fallo',
  DENIED: 'Denegado',
  ERROR: 'Error',
}

type FilterState = {
  dateFrom: string
  dateTo: string
  actorEmail: string
  action: string
  entityType: string
  requestId: string
  correlationId: string
  actorType: 'ALL' | AuditActorType
  outcome: 'ALL' | AuditOutcome
  severity: 'ALL' | AuditSeverity
}

const DEFAULT_FILTERS: FilterState = {
  dateFrom: '',
  dateTo: '',
  actorEmail: '',
  action: '',
  entityType: '',
  requestId: '',
  correlationId: '',
  actorType: 'ALL',
  outcome: 'ALL',
  severity: 'ALL',
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin fecha'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'
  return parsed.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

function normalizeDateTimeFilter(value: string) {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}

function formatActor(log: AuditLogDto) {
  return log.actorAdminEmail || log.actorReference || 'Sistema'
}

function formatEntity(log: AuditLogDto) {
  const label = log.targetLabel || log.entitySnapshotName
  if (label) return label
  if (!log.entityType && !log.entityId) return 'Sin entidad'
  if (!log.entityId) return log.entityType ?? 'Sin entidad'
  return `${log.entityType ?? 'Entidad'} · ${log.entityId}`
}

function formatModule(log: AuditLogDto) {
  return log.sourceModule ?? 'SYSTEM'
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

const AuditLogs = () => {
  const { showToast } = useAppToast()
  const authUser = useAuthUser()
  const canExport = authUser?.role === ROLE_ADMIN_TI
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [page, setPage] = useState(0)
  const [logs, setLogs] = useState<AuditLogDto[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLogDto | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const queryParams = useMemo<AuditLogParams>(() => ({
    page,
    size: PAGE_SIZE,
    sortBy: 'occurredAt',
    sortDir: 'desc',
    dateFrom: normalizeDateTimeFilter(filters.dateFrom),
    dateTo: normalizeDateTimeFilter(filters.dateTo),
    actorEmail: filters.actorEmail.trim() || undefined,
    action: filters.action.trim() || undefined,
    entityType: filters.entityType.trim() || undefined,
    requestId: filters.requestId.trim() || undefined,
    correlationId: filters.correlationId.trim() || undefined,
    actorType: filters.actorType === 'ALL' ? undefined : filters.actorType,
    outcome: filters.outcome === 'ALL' ? undefined : filters.outcome,
    severity: filters.severity === 'ALL' ? undefined : filters.severity,
  }), [filters, page])

  const loadAuditLogs = useCallback(async (params: AuditLogParams) => {
    setLoading(true)
    try {
      const response = await getAuditLogs(params)
      setLogs(response.content)
      setTotalElements(response.totalElements)
      setTotalPages(response.totalPages)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron cargar los audit logs.'
      showToast({
        severity: 'error',
        title: 'Error cargando auditoría',
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void loadAuditLogs(queryParams)
  }, [loadAuditLogs, queryParams])

  const actionDistribution = useMemo(() => {
    const counts = new Map<string, number>()
    for (const log of logs) {
      const label = log.action || 'SIN_ACCION'
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([action, total]) => ({ action, total }))
  }, [logs])

  const severityBreakdown = useMemo(() => {
    return logs.reduce<Record<AuditSeverity, number>>((acc, log) => {
      if (log.severity) {
        acc[log.severity] += 1
      }
      return acc
    }, {
      INFO: 0,
      NOTICE: 0,
      WARNING: 0,
      SECURITY: 0,
      CRITICAL: 0,
    })
  }, [logs])

  const currentPageFailures = logs.filter((log) => log.outcome === 'FAILURE' || log.outcome === 'ERROR').length
  const currentPageCriticals = severityBreakdown.CRITICAL + severityBreakdown.SECURITY
  const currentActors = new Set(logs.map((log) => formatActor(log))).size
  const visibleFrom = totalElements === 0 ? 0 : page * PAGE_SIZE + 1
  const visibleTo = totalElements === 0 ? 0 : Math.min((page + 1) * PAGE_SIZE, totalElements)

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(0)
  }

  const handleRefresh = () => {
    void loadAuditLogs(queryParams)
      .then(() => {
        showToast({
          severity: 'success',
          title: 'Auditoría actualizada',
          description: 'La consulta se sincronizó con `/api/v1/audit-logs`.',
        })
      })
  }

  const handleExport = async (format: AuditLogExportFormat) => {
    if (!canExport) {
      showToast({
        severity: 'info',
        title: 'Exportación restringida',
        description: 'La exportación de auditoría está reservada para ADMIN_TI.',
      })
      return
    }

    setExporting(true)
    try {
      const result = await exportAuditLogsReport(queryParams, format)
      downloadBlob(result.blob, result.filename)
      setExportDialogOpen(false)
      showToast({
        severity: 'success',
        title: 'Exportación completada',
        description: `Se descargó el reporte de auditoría en ${format.toUpperCase()}.`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo exportar la auditoría.'
      showToast({
        severity: 'error',
        title: 'Error exportando auditoría',
        description: message,
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <SectionHeader
        icon={Shield}
        title="Logs de Auditoría"
        subtitle="Registros reales del endpoint `/api/v1/audit-logs`, alineados al modelo nuevo de auditoría"
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={handleRefresh}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="md"
              className="gap-2"
              disabled={exporting}
              onClick={() => setExportDialogOpen(true)}
            >
              <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-pulse' : ''}`} />
              Exportar
            </Button>
          </>
        }
      />

      <ExportFormatDialog
        open={exportDialogOpen}
        title="Exportar audit logs"
        description="Selecciona el formato de descarga para la consulta actual de auditoría."
        loading={exporting}
        onClose={() => !exporting && setExportDialogOpen(false)}
        onSelect={(format) => {
          void handleExport(format as AuditLogExportFormat)
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
          title="Actores visibles"
          value={currentActors}
          subtitle="En la página actual"
          icon={UserCircle2}
          iconBg="bg-sky-500/10"
          iconFg="text-sky-600"
          delay={0.05}
        />
        <StatusCard
          title="Eventos críticos"
          value={currentPageCriticals}
          subtitle="Security + Critical"
          icon={AlertCircle}
          iconBg="bg-red-500/10"
          iconFg="text-red-500"
          delay={0.1}
        />
        <StatusCard
          title="Fallos visibles"
          value={currentPageFailures}
          subtitle="FAILURE + ERROR"
          icon={Clock3}
          iconBg="bg-amber-500/10"
          iconFg="text-amber-600"
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Acciones en resultados cargados</CardTitle>
            <p className="text-xs text-muted-foreground">Distribución de acciones en la página actual</p>
          </CardHeader>
          <CardContent>
            {actionDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={actionDistribution} margin={{ top: 0, right: 8, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                  <XAxis dataKey="action" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={42}>
                    {actionDistribution.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} fillOpacity={0.9} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">
                Sin datos para graficar con los filtros actuales.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Línea de tiempo reciente
            </CardTitle>
            <p className="text-xs text-muted-foreground">Últimos eventos devueltos por el endpoint paginado</p>
          </CardHeader>
          <CardContent className="p-0">
            {logs.slice(0, 5).map((log, index) => {
              const severity = log.severity ?? 'INFO'
              const style = severityStyles[severity]
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="flex items-start gap-3 px-5 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col items-center gap-1 mt-1 flex-shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${style.bar}`} />
                    {index < Math.min(logs.length, 5) - 1 ? <div className="w-px h-6 bg-border" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[11px] font-mono text-muted-foreground">{formatDateTime(log.occurredAt)}</span>
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-muted-foreground">· {formatActor(log)} · {formatModule(log)}</span>
                    </div>
                    <p className="text-xs text-foreground leading-tight truncate">{log.description || formatEntity(log)}</p>
                  </div>
                  <Badge variant="outlined" className={`text-[10px] flex-shrink-0 h-5 px-1.5 ${style.badge}`}>
                    {style.label}
                  </Badge>
                </motion.div>
              )
            })}
            {logs.length === 0 ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                No hay eventos para la consulta actual.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-3 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <Input
                  type="datetime-local"
                  value={filters.dateFrom}
                  onChange={(event) => updateFilter('dateFrom', event.target.value)}
                  className="h-9 text-sm"
                />
                <Input
                  type="datetime-local"
                  value={filters.dateTo}
                  onChange={(event) => updateFilter('dateTo', event.target.value)}
                  className="h-9 text-sm"
                />
                <Input
                  placeholder="Correo del actor"
                  value={filters.actorEmail}
                  onChange={(event) => updateFilter('actorEmail', event.target.value)}
                  className="h-9 text-sm"
                />
                <Input
                  placeholder="Acción exacta"
                  value={filters.action}
                  onChange={(event) => updateFilter('action', event.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <Input
                  placeholder="Entidad exacta"
                  value={filters.entityType}
                  onChange={(event) => updateFilter('entityType', event.target.value)}
                  className="h-9 text-sm"
                />
                <Input
                  placeholder="requestId exacto"
                  value={filters.requestId}
                  onChange={(event) => updateFilter('requestId', event.target.value)}
                  className="h-9 text-sm"
                />
                <Input
                  placeholder="correlationId exacto"
                  value={filters.correlationId}
                  onChange={(event) => updateFilter('correlationId', event.target.value)}
                  className="h-9 text-sm"
                />
                <Select value={filters.actorType} onValueChange={(value) => updateFilter('actorType', value as FilterState['actorType'])}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Tipo de actor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los actores</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="SYSTEM">Sistema</SelectItem>
                    <SelectItem value="INTEGRATION">Integración</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3">
                <Select value={filters.outcome} onValueChange={(value) => updateFilter('outcome', value as FilterState['outcome'])}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Resultado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los resultados</SelectItem>
                    <SelectItem value="SUCCESS">Exitoso</SelectItem>
                    <SelectItem value="FAILURE">Fallo</SelectItem>
                    <SelectItem value="DENIED">Denegado</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.severity} onValueChange={(value) => updateFilter('severity', value as FilterState['severity'])}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Severidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas las severidades</SelectItem>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="NOTICE">Notice</SelectItem>
                    <SelectItem value="WARNING">Warning</SelectItem>
                    <SelectItem value="SECURITY">Security</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Search className="w-3.5 h-3.5" />
                  Filtros alineados al backend real y reutilizados por la exportación.
                </p>
                <Badge variant="secondary" className="text-xs">
                  {totalElements.toLocaleString()} eventos
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
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
                          <Button variant="ghost" size="icon-sm" onClick={() => setSelectedLog(log)}>
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Mostrando {visibleFrom}–{visibleTo} de {totalElements}
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={loading || page === 0}
                onClick={() => setPage((current) => current - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={loading || totalPages === 0 || page >= totalPages - 1}
                onClick={() => setPage((current) => current + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent size="3">
          <DialogHeader>
            <DialogTitle>Detalle de audit log</DialogTitle>
            <DialogDescription>
              Vista extendida de los campos seguros expuestos por el backend.
            </DialogDescription>
          </DialogHeader>
          {selectedLog ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acción</p>
                  <p className="text-sm text-foreground">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descripción</p>
                  <p className="text-sm text-foreground">{selectedLog.description || 'Sin descripción adicional'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Módulo</p>
                  <p className="text-sm text-foreground">{formatModule(selectedLog)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entidad / objetivo</p>
                  <p className="text-sm text-foreground">{formatEntity(selectedLog)}</p>
                </div>
              </div>
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actor</p>
                  <p className="text-sm text-foreground">{formatActor(selectedLog)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">HTTP</p>
                  <p className="text-sm text-foreground">{selectedLog.httpMethod ?? 'N/D'} {selectedLog.endpoint ?? 'Sin endpoint'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Request / Correlation</p>
                  <p className="font-mono text-xs text-foreground">{selectedLog.requestId ?? 'Sin requestId'}</p>
                  <p className="font-mono text-xs text-foreground">{selectedLog.correlationId ?? 'Sin correlationId'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Metadata segura</p>
                  <pre className="max-h-40 overflow-auto rounded-lg bg-background p-3 text-xs text-muted-foreground">
                    {selectedLog.metadataJson || 'Sin metadata serializada'}
                  </pre>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

export default AuditLogs
