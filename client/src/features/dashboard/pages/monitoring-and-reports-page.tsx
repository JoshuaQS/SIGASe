import { useCallback, useEffect, useMemo, useState } from 'react'
import * as motion from 'motion/react-client'
import { BarChart2, Download, Flame, RefreshCw, TrendingUp, Users, ShieldCheck, ShieldX, Trophy, FileText, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  ComposedChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Badge } from '@/shared/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import StatCard from '@/shared/components/data-display/status-card'
import { SectionHeader } from '@/shared/components/ui/section-header'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { cn } from '@/shared/lib/utils'
import {
  exportDashboardMonitoring,
  getDashboardAccessTrends,
  getDashboardSummary,
  getDashboardTopCareers,
  getDashboardTopStudents,
  type DashboardAccessStatus,
  type DashboardExportFormat,
  type DashboardQueryParams,
} from '@/features/dashboard/api/dashboard-api'
import { endOfDay, max, startOfDay, subDays, subMonths } from 'date-fns'
import Shell from '@/features/dashboard/components/shell'

type TrendGranularityId = '7d' | '15d' | '1m' | '3m' | '6m' | '12m'

const TREND_GRANULARITY_OPTIONS: Array<{ id: TrendGranularityId; label: string }> = [
  { id: '7d', label: '7 días' },
  { id: '15d', label: '15 días' },
  { id: '1m', label: '1 mes' },
  { id: '3m', label: '3 meses' },
  { id: '6m', label: '6 meses' },
  { id: '12m', label: '12 meses' },
]

const DEFAULT_TREND_GRANULARITY: TrendGranularityId = '3m'
const ACCESS_CHART_COLORS = {
  success: 'hsl(var(--success))',
  destructive: 'hsl(var(--destructive))',
  info: 'hsl(var(--info))',
}

type AccessChartPoint = { label: string; total: number; permitidos: number; denegados: number }
type TopCarreraPoint = { codigo: string; carrera: string; accesos: number; successful: number; failed: number }
type TopUsuarioPoint = {
  codigo: string
  nombre: string
  accesos: number
  carrera: string
  pct: number
  successful: number
  failed: number
  pctSuccessful: number
  pctFailed: number
}
type DashboardTrendPoint = { day: string; successful: number; failed: number }

const EMPTY_KPI = {
  alumnosTotales: 0,
  accesosPeriodo: 0,
  accesosPermitidos: 0,
  accesosDenegados: 0,
}

const TOP_STUDENTS_PAGE_SIZE = 5
const TOP_CAREERS_PAGE_SIZES = [7, 6] as const

function formatTrendLabel(dayIso: string, dateFrom?: string, dateTo?: string) {
  const date = new Date(dayIso)
  if (Number.isNaN(date.getTime())) return dayIso

  if (dateFrom && dateTo) {
    const from = new Date(dateFrom)
    const to = new Date(dateTo)
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      const rangeDays = Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000))
      if (rangeDays <= 13) {
        const short = date.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')
        return short.charAt(0).toUpperCase() + short.slice(1, 3)
      }
    }
  }

  return date
    .toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
    .replace('.', '')
}

function parseTrendDate(dayIso: string) {
  const safeIso = dayIso.includes('T') ? dayIso : `${dayIso}T12:00:00Z`
  return new Date(safeIso)
}

function startOfUtcWeek(date: Date) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const currentDay = utcDate.getUTCDay()
  const diff = currentDay === 0 ? -6 : 1 - currentDay
  utcDate.setUTCDate(utcDate.getUTCDate() + diff)
  return utcDate
}

function endOfUtcWeek(date: Date) {
  const end = new Date(date)
  end.setUTCDate(end.getUTCDate() + 6)
  return end
}

function formatWeeklyTrendLabel(start: Date, end: Date) {
  const startLabel = start.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'UTC' }).replace('.', '')
  const endLabel = end.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'UTC' }).replace('.', '')
  return `${startLabel} - ${endLabel}`
}

function buildAccessChartData(
  points: DashboardTrendPoint[],
  dateFrom?: string,
  dateTo?: string,
): AccessChartPoint[] {
  const isHistorical = !dateFrom || !dateTo

  if (!isHistorical) {
    return points.map((point) => {
      const permitidos = point.successful
      const denegados = point.failed
      return {
        label: formatTrendLabel(point.day, dateFrom, dateTo),
        permitidos,
        denegados,
        total: permitidos + denegados,
      }
    })
  }

  const weeklyBuckets = new Map<string, AccessChartPoint>()

  for (const point of points) {
    const date = parseTrendDate(point.day)
    if (Number.isNaN(date.getTime())) {
      continue
    }

    const weekStart = startOfUtcWeek(date)
    const weekEnd = endOfUtcWeek(weekStart)
    const bucketKey = weekStart.toISOString()
    const current = weeklyBuckets.get(bucketKey)

    if (current) {
      current.permitidos += point.successful
      current.denegados += point.failed
      current.total = current.permitidos + current.denegados
      continue
    }

    weeklyBuckets.set(bucketKey, {
      label: formatWeeklyTrendLabel(weekStart, weekEnd),
      permitidos: point.successful,
      denegados: point.failed,
      total: point.successful + point.failed,
    })
  }

  return Array.from(weeklyBuckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => ({
      ...value,
      total: value.permitidos + value.denegados,
    }))
}

type TrendWindowHistoricalResult = {
  chartData: AccessChartPoint[]
  periodLabel: string
  canGoOlder: boolean
  canGoNewer: boolean
}

function getTrendWindowBounds(
  dataMax: Date,
  offsetBack: number,
  granularity: TrendGranularityId,
): { windowStart: Date; windowEnd: Date } {
  const anchorEnd = endOfDay(dataMax)

  if (granularity === '7d' || granularity === '15d') {
    const dayCount = granularity === '7d' ? 7 : 15
    const windowEnd = endOfDay(subDays(anchorEnd, offsetBack * dayCount))
    const windowStart = startOfDay(subDays(windowEnd, dayCount - 1))
    return { windowStart, windowEnd }
  }

  const months =
    granularity === '1m'
      ? 1
      : granularity === '3m'
        ? 3
        : granularity === '6m'
          ? 6
          : 12

  const windowEnd = subMonths(anchorEnd, offsetBack * months)
  const windowStart = startOfDay(subMonths(windowEnd, months))
  return { windowStart, windowEnd }
}

/**
 * Ventanas del tamaño elegido ancladas al último dato; cada incremento de offset retrocede un bloque completo.
 */
function buildTrendWindowHistoricalChart(
  points: DashboardTrendPoint[],
  offsetBack: number,
  granularity: TrendGranularityId,
): TrendWindowHistoricalResult {
  const dates = points.map((p) => parseTrendDate(p.day)).filter((d) => !Number.isNaN(d.getTime()))
  if (dates.length === 0) {
    return { chartData: [], periodLabel: '', canGoOlder: false, canGoNewer: false }
  }

  const dataMax = max(dates)
  const { windowStart, windowEnd } = getTrendWindowBounds(dataMax, offsetBack, granularity)

  const filtered = points.filter((p) => {
    const d = parseTrendDate(p.day)
    if (Number.isNaN(d.getTime())) return false
    return d >= windowStart && d <= windowEnd
  })

  const dateFromIso = windowStart.toISOString()
  const dateToIso = windowEnd.toISOString()
  const chartData = buildAccessChartData(filtered, dateFromIso, dateToIso)

  const hasOlderData = points.some((p) => {
    const d = parseTrendDate(p.day)
    return !Number.isNaN(d.getTime()) && d < windowStart
  })

  const fmt = (d: Date) =>
    d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '')

  const periodLabel = `${fmt(windowStart)} – ${fmt(windowEnd)}`

  return {
    chartData,
    periodLabel,
    canGoOlder: hasOlderData,
    canGoNewer: offsetBack > 0,
  }
}

function getPagedSlice<T>(items: T[], page: number, pageSizes: readonly number[]) {
  const safeSizes = pageSizes.length > 0 ? pageSizes : [items.length || 1]
  let totalPages = 1
  let consumed = 0

  while (consumed < items.length) {
    consumed += safeSizes[Math.min(totalPages - 1, safeSizes.length - 1)]
    if (consumed < items.length) {
      totalPages += 1
    }
  }

  const safePage = Math.min(Math.max(page, 1), totalPages)
  let start = 0

  for (let currentPage = 1; currentPage < safePage; currentPage += 1) {
    start += safeSizes[Math.min(currentPage - 1, safeSizes.length - 1)]
  }

  const pageSize = safeSizes[Math.min(safePage - 1, safeSizes.length - 1)]

  return {
    totalPages,
    safePage,
    items: items.slice(start, start + pageSize),
  }
}

function HistoricalTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="min-w-[180px] rounded-xl border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-3">
            <span>{entry.name}</span>
            <span className="font-semibold text-foreground">{Number(entry.value ?? 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CareerCodeTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number
  y?: number
  payload?: { value?: string }
}) {
  const value = payload?.value ?? ''
  const chipWidth = Math.max(42, String(value).length * 7 + 16)

  return (
    <g transform={`translate(${x},${y})`}>
      <g transform={`translate(${-chipWidth / 2}, 12)`}>
        <rect width={chipWidth} height={20} rx={10} fill="hsl(var(--secondary))" stroke="hsl(var(--border))" />
        <text
          x={chipWidth / 2}
          y={13}
          textAnchor="middle"
          className="fill-foreground text-[10px] font-semibold"
        >
          {value}
        </text>
      </g>
    </g>
  )
}

function TopCareerTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: TopCarreraPoint }>
}) {
  const item = payload?.[0]?.payload
  if (!active || !item) return null

  return (
    <div className="min-w-[220px] rounded-xl border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
      <p className="text-sm font-semibold text-foreground">{item.carrera}</p>
      <p className="text-[11px] text-muted-foreground">Clave: {item.codigo}</p>
      <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <span>Accesos totales</span>
          <span className="font-semibold text-foreground">{item.accesos.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Exitosos</span>
          <span className="font-semibold text-emerald-600">{item.successful.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Fallidos</span>
          <span className="font-semibold text-rose-600">{item.failed.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const DEFAULT_EXPORT_PARAMS: DashboardQueryParams = {
  analysisType: 'students_all',
  status: 'ALL',
  sortDir: 'desc',
}

const MonitoringAndReports = () => {
  const { showToast } = useAppToast()
  const [loading, setLoading] = useState(true)
  const [isHeaderExportOpen, setIsHeaderExportOpen] = useState(false)
  const [trendBundle, setTrendBundle] = useState<{
    points: DashboardTrendPoint[]
    dateFrom?: string
    dateTo?: string
  }>({ points: [] })
  const [historicalTrendWindowOffset, setHistoricalTrendWindowOffset] = useState(0)
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularityId>(DEFAULT_TREND_GRANULARITY)
  const [kpis, setKpis] = useState(EMPTY_KPI)
  const [historicalTopCarrerasData, setHistoricalTopCarrerasData] = useState<TopCarreraPoint[]>([])
  const [historicalTopUsuarios, setHistoricalTopUsuarios] = useState<TopUsuarioPoint[]>([])
  const [topCareersPage, setTopCareersPage] = useState(1)
  const [topStudentsPage, setTopStudentsPage] = useState(1)
  const [topOverviewStatus, setTopOverviewStatus] = useState<DashboardAccessStatus>('SUCCESS')

  const monthlyTotalsKpi = useMemo(() => ({ accesosPeriodo: kpis.accesosPeriodo }), [kpis.accesosPeriodo])

  const { chartData, historicalChartNav } = useMemo(() => {
    if (trendBundle.dateFrom && trendBundle.dateTo) {
      return {
        chartData: buildAccessChartData(trendBundle.points, trendBundle.dateFrom, trendBundle.dateTo),
        historicalChartNav: null as null | {
          periodLabel: string
          canGoOlder: boolean
          canGoNewer: boolean
        },
      }
    }
    const win = buildTrendWindowHistoricalChart(trendBundle.points, historicalTrendWindowOffset, trendGranularity)
    return {
      chartData: win.chartData,
      historicalChartNav: {
        periodLabel: win.periodLabel,
        canGoOlder: win.canGoOlder,
        canGoNewer: win.canGoNewer,
      },
    }
  }, [trendBundle, historicalTrendWindowOffset, trendGranularity])

  const exportQueryParams = DEFAULT_EXPORT_PARAMS

  const applyTopListsFromResponses = useCallback(
    (
      historicalTopCareers: Awaited<ReturnType<typeof getDashboardTopCareers>>,
      historicalTopStudents: Awaited<ReturnType<typeof getDashboardTopStudents>>,
    ) => {
      setHistoricalTopCarrerasData(
        historicalTopCareers.careers.map((item) => ({
          codigo: item.careerCode,
          carrera: item.careerName,
          accesos: item.totalAccesses,
          successful: item.successfulAccesses,
          failed: item.failedAccesses,
        })),
      )

      const maxHistoricalAccesses = historicalTopStudents.students[0]?.totalAccesses ?? 1
      const maxHistoricalSuccessful = historicalTopStudents.students[0]?.successfulAccesses ?? 1
      const maxHistoricalFailed = historicalTopStudents.students[0]?.failedAccesses ?? 1
      setHistoricalTopUsuarios(
        historicalTopStudents.students.map((student) => ({
          codigo: student.careerCode,
          nombre: student.name,
          accesos: student.totalAccesses,
          carrera: student.careerName,
          successful: student.successfulAccesses,
          failed: student.failedAccesses,
          pct: Math.max(3, Math.round((student.totalAccesses / maxHistoricalAccesses) * 100)),
          pctSuccessful: Math.max(3, Math.round((student.successfulAccesses / maxHistoricalSuccessful) * 100)),
          pctFailed: Math.max(3, Math.round((student.failedAccesses / maxHistoricalFailed) * 100)),
        })),
      )
    },
    [],
  )

  const fetchDefaultDashboard = useCallback(async () => {
    const overviewParams: DashboardQueryParams = {
      analysisType: 'students_all',
      status: 'ALL',
      sortDir: 'desc',
    }

    const [summary, trends, historicalTopCareers, historicalTopStudents] = await Promise.all([
      getDashboardSummary(overviewParams),
      getDashboardAccessTrends(overviewParams),
      getDashboardTopCareers({
        analysisType: 'careers',
        status: 'ALL',
        sortDir: 'desc',
        topEnabled: true,
        topN: 50,
      }),
      getDashboardTopStudents(overviewParams),
    ])

    setKpis({
      alumnosTotales: summary.totalStudents,
      accesosPeriodo: summary.successfulAccessesInRange + summary.failedAccessesInRange,
      accesosPermitidos: summary.successfulAccessesInRange,
      accesosDenegados: summary.failedAccessesInRange,
    })
    setTrendBundle({ points: trends.points })
    setHistoricalTrendWindowOffset(0)
    applyTopListsFromResponses(historicalTopCareers, historicalTopStudents)
  }, [applyTopListsFromResponses])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchDefaultDashboard()
        .catch((error) => {
          const message = error instanceof Error ? error.message : 'No se pudo cargar el monitoreo.'
          showToast({
            severity: 'error',
            title: 'Error cargando monitoreo',
            description: message,
          })
        })
        .finally(() => setLoading(false))
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchDefaultDashboard, showToast])

  const handleRefresh = () => {
    setLoading(true)
    void fetchDefaultDashboard()
      .then(() => {
        showToast({
          severity: 'success',
          title: 'Sincronización completa',
          description: 'Los datos operativos se han actualizado con éxito.',
        })
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'No se pudo actualizar el monitoreo.'
        showToast({
          severity: 'error',
          title: 'Error actualizando monitoreo',
          description: message,
        })
      })
      .finally(() => setLoading(false))
  }

  const topCareersPagination = useMemo(
    () => getPagedSlice(historicalTopCarrerasData, topCareersPage, TOP_CAREERS_PAGE_SIZES),
    [historicalTopCarrerasData, topCareersPage],
  )

  const topStudentsPagination = useMemo(
    () => getPagedSlice(historicalTopUsuarios, topStudentsPage, [TOP_STUDENTS_PAGE_SIZE]),
    [historicalTopUsuarios, topStudentsPage],
  )

  const topOverviewLabel = topOverviewStatus === 'ALL' ? 'Ambos' : topOverviewStatus === 'SUCCESS' ? 'Exitosos' : 'Fallidos'

  const handleExport = (format: DashboardExportFormat) => {
    void exportDashboardMonitoring(exportQueryParams, format)
      .then((result) => {
        downloadBlob(result.blob, result.filename)
        showToast({
          severity: 'success',
          title: 'Exportación completada',
          description: 'El reporte de monitoreo se descargó correctamente.',
        })
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'No se pudo exportar el reporte.'
        showToast({
          severity: 'error',
          title: 'Error exportando reporte',
          description: message,
        })
      })
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <SectionHeader
        icon={BarChart2}
        title="Monitoreo y Reportes"
        subtitle="Analytics en tiempo real del ecosistema eLibro · UTEZ"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="md" onClick={handleRefresh} disabled={loading} className="gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Popover open={isHeaderExportOpen} onOpenChange={setIsHeaderExportOpen}>
                <PopoverTrigger asChild>
                  <Button disabled={loading} variant="outline" size="md" className="gap-2">
                    <Download className="h-4 w-4" />
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
                      <FileSpreadsheet className="size-4" />
                      Descargar XLSX
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
          </div>
        }
      />

      <Shell />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Alumnos Totales" value={kpis.alumnosTotales.toLocaleString()} icon={Users} iconBg="bg-teal-500/10" iconFg="text-teal-600" delay={0} />
            <StatCard title="Accesos Totales" value={monthlyTotalsKpi.accesosPeriodo.toLocaleString()} icon={TrendingUp} iconBg="bg-info/10" iconFg="text-info" delay={0.05} />
            <StatCard title="Accesos Permitidos" value={kpis.accesosPermitidos.toLocaleString()} icon={ShieldCheck} iconBg="bg-green-500/10" iconFg="text-green-600" delay={0.1} />
            <StatCard title="Accesos Denegados" value={kpis.accesosDenegados.toLocaleString()} icon={ShieldX} iconBg="bg-red-500/10" iconFg="text-red-500" delay={0.15} />
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base font-semibold">Accesos historicos totales</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {historicalChartNav
                    ? 'Elige el tamaño de cada ventana y navega hacia atrás en el histórico disponible.'
                    : 'Serie diaria según el rango de fechas del filtro aplicado.'}
                </p>
                {historicalChartNav?.periodLabel ? (
                  <p className="mt-2 text-xs font-medium text-foreground">{historicalChartNav.periodLabel}</p>
                ) : null}
              </div>
              <div className="flex w-full min-w-0 flex-col items-stretch gap-3 sm:max-w-xl sm:items-end">
                {historicalChartNav ? (
                  <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
                    <div className="w-full min-w-0 sm:w-[200px] sm:max-w-[220px]">
                      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Tamaño de ventana
                      </span>
                      <Select
                        value={trendGranularity}
                        onValueChange={(v) => {
                          setTrendGranularity(v as TrendGranularityId)
                          setHistoricalTrendWindowOffset(0)
                        }}
                      >
                        <SelectTrigger size="sm" className="h-8 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TREND_GRANULARITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="inline-flex w-full min-w-0 shrink-0 divide-x divide-border overflow-hidden rounded-md border border-border bg-background shadow-xs sm:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!historicalChartNav.canGoOlder}
                        onClick={() => setHistoricalTrendWindowOffset((o) => o + 1)}
                        aria-label="Periodo anterior"
                        className="h-8 flex-1 gap-1.5 rounded-none rounded-l-md border-0 shadow-none transition-none hover:bg-muted/70 focus-visible:z-10 active:scale-[0.98] sm:flex-initial sm:px-3"
                      >
                        <ChevronLeft className="size-4 shrink-0" aria-hidden />
                        <span className="whitespace-nowrap">Anterior</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!historicalChartNav.canGoNewer}
                        onClick={() => setHistoricalTrendWindowOffset((o) => Math.max(0, o - 1))}
                        aria-label="Periodo más reciente"
                        className="h-8 flex-1 gap-1.5 rounded-none rounded-r-md border-0 shadow-none transition-none hover:bg-muted/70 focus-visible:z-10 active:scale-[0.98] sm:flex-initial sm:px-3"
                      >
                        <span className="whitespace-nowrap">Más reciente</span>
                        <ChevronRight className="size-4 shrink-0" aria-hidden />
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 text-xs sm:justify-end">
                  <Badge variant="outlined" className="gap-1 border-emerald-500/20 bg-emerald-500/5 text-emerald-700">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    Exitosos
                  </Badge>
                  <Badge variant="outlined" className="gap-1 border-rose-500/20 bg-rose-500/5 text-rose-700">
                    <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                    Fallidos
                  </Badge>
                  <Badge variant="outlined" className="gap-1 border-sky-500/20 bg-sky-500/5 text-sky-700">
                    <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
                    Totales
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-w-0">
              <ResponsiveContainer width="100%" height={290} minWidth={1} minHeight={290}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(128,128,128,0.14)" />
                  <XAxis dataKey="label" tick={false} tickLine={false} axisLine={false} height={10} />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    domain={[0, 'auto']}
                  />
                  <Tooltip content={<HistoricalTrendTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="permitidos"
                    name="Exitosos"
                    stroke={ACCESS_CHART_COLORS.success}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="denegados"
                    name="Fallidos"
                    stroke={ACCESS_CHART_COLORS.destructive}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Totales"
                    stroke={ACCESS_CHART_COLORS.info}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="flex min-h-[520px] flex-col">
            <CardHeader className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Trophy className="h-4 w-4 text-warning" />
                  Top Carreras
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Carreras con más accesos históricos</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs sm:justify-end">
                <div className="inline-flex h-6 items-center rounded-full border border-border/70 bg-background p-0.5">
                  {(['ALL', 'SUCCESS', 'FAILED'] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTopOverviewStatus(key)}
                      className={cn(
                        'h-5 rounded-full px-2 text-[10px] font-semibold transition-colors',
                        topOverviewStatus === key
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {key === 'ALL' ? 'Ambos' : key === 'SUCCESS' ? 'Exitosos' : 'Fallidos'}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-1 flex-col">
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart
                    data={topCareersPagination.items}
                    margin={{ top: 16, right: 8, left: -12, bottom: 32 }}
                    barCategoryGap="2%"
                    barGap={0}
                    barSize={64}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                    <XAxis
                      dataKey="codigo"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      height={46}
                      tick={<CareerCodeTick />}
                    />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<TopCareerTooltip />} cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }} />
                    <Bar
                      dataKey={topOverviewStatus === 'ALL' ? 'accesos' : topOverviewStatus === 'SUCCESS' ? 'successful' : 'failed'}
                      name={topOverviewLabel}
                      radius={[12, 12, 12, 12]}
                    >
                      {topCareersPagination.items.map((_, index) => (
                        <Cell key={`cell-career-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-auto flex items-center justify-end gap-2 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={topCareersPagination.safePage <= 1}
                  onClick={() => setTopCareersPage((prev) => Math.max(1, prev - 1))}
                >
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  Página {topCareersPagination.safePage} de {topCareersPagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={topCareersPagination.safePage >= topCareersPagination.totalPages}
                  onClick={() => setTopCareersPage((prev) => Math.min(topCareersPagination.totalPages, prev + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="flex min-h-[520px] flex-col">
            <CardHeader className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Trophy className="h-4 w-4 text-warning" />
                  Top Usuarios
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Estudiantes con mayor actividad histórica</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs sm:justify-end">
                <div className="inline-flex h-6 items-center rounded-full border border-border/70 bg-background p-0.5">
                  {(['ALL', 'SUCCESS', 'FAILED'] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTopOverviewStatus(key)}
                      className={cn(
                        'h-5 rounded-full px-2 text-[10px] font-semibold transition-colors',
                        topOverviewStatus === key
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {key === 'ALL' ? 'Ambos' : key === 'SUCCESS' ? 'Exitosos' : 'Fallidos'}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-1 flex-col">
              <div className="mt-1 flex-1 space-y-2.5">
                {topStudentsPagination.items.map((u, i) => (
                  <div key={i} className="rounded-2xl border border-border/60 bg-card/50 px-3 py-2.5">
                    <div className="flex items-center gap-3">
                        {(() => {
                          const rank = (topStudentsPagination.safePage - 1) * TOP_STUDENTS_PAGE_SIZE + i + 1
                          const isPodium = rank <= 3
                          return (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                              {isPodium ? (
                                <span
                                  className={cn(
                                    "flex h-9 w-9 items-center justify-center rounded-full",
                                    rank === 1
                                      ? "bg-warning/20 text-warning"
                                      : rank === 2
                                        ? "bg-secondary text-muted-foreground"
                                        : "bg-destructive/10 text-destructive",
                                  )}
                                >
                                  <Trophy className="h-5 w-5" />
                                </span>
                              ) : (
                                <span className="text-sm font-extrabold tabular-nums text-muted-foreground">
                                  #{rank}
                                </span>
                              )}
                            </div>
                          )
                        })()}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-semibold text-foreground">{u.nombre}</span>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outlined"
                              className="h-5 gap-1 border-emerald-500/20 bg-emerald-500/5 px-2 py-0 text-[10px] font-semibold text-emerald-700"
                            >
                              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                              {topOverviewStatus === 'ALL'
                                ? `${u.accesos} accesos`
                                : topOverviewStatus === 'SUCCESS'
                                  ? `${u.successful} accesos`
                                  : `${u.failed} accesos`}
                            </Badge>
                            <span className="inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
                              <Flame className="h-3 w-3" />
                              7
                            </span>
                            <Badge
                              variant="outlined"
                              className="h-5 border-border/70 bg-secondary/30 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide"
                            >
                              {u.codigo}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-2 space-y-1.5">
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500"
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.max(
                                  3,
                                  Math.min(
                                    100,
                                    topOverviewStatus === 'ALL'
                                      ? u.pct ?? 0
                                      : topOverviewStatus === 'SUCCESS'
                                        ? u.pctSuccessful ?? 0
                                        : u.pctFailed ?? 0,
                                  ),
                                )}%`,
                              }}
                              transition={{ delay: 0.25 + i * 0.04, duration: 0.55 }}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                            <span className="truncate">{u.carrera}</span>
                            <span className="shrink-0 tabular-nums">
                              {topOverviewStatus === 'ALL'
                                ? `Totales: ${u.accesos}`
                                : topOverviewStatus === 'SUCCESS'
                                  ? `Exitosos: ${u.successful}`
                                  : `Fallidos: ${u.failed}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

                <div className="mt-auto flex items-center justify-end gap-2 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={topStudentsPagination.safePage <= 1}
                    onClick={() => setTopStudentsPage((prev) => Math.max(1, prev - 1))}
                  >
                    Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Página {topStudentsPagination.safePage} de {topStudentsPagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={topStudentsPagination.safePage >= topStudentsPagination.totalPages}
                    onClick={() => setTopStudentsPage((prev) => Math.min(topStudentsPagination.totalPages, prev + 1))}
                  >
                    Siguiente
                  </Button>
                </div>
            </CardContent>
          </Card>
        </div>
    </motion.div>
  )
}

export default MonitoringAndReports
