import { useMemo, useState } from 'react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BarChart3,
  Clock3,
  GraduationCap,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react'
import { endOfDay, max, startOfDay, subDays, subMonths } from 'date-fns'

import type {
  DashboardAccessResultFilter,
  DashboardAccessTrendWidgetData,
  DashboardAnalysisResponse,
  DashboardCareerComparisonTableWidgetData,
  DashboardCareerKpiWidgetData,
  DashboardCareerRankingKpiWidgetData,
  DashboardCareerRankingTableWidgetData,
  DashboardCareerResultBreakdownWidgetData,
  DashboardCareerStudentTableWidgetData,
  DashboardFilterSummary,
  DashboardStudentAccessSummaryWidgetData,
  DashboardStudentActivityTableWidgetData,
  DashboardStudentRankingKpiWidgetData,
  DashboardStudentRankingTableWidgetData,
  DashboardStudentResultBreakdownWidgetData,
  DashboardSummaryWidgetData,
  DashboardTableWidgetControlRequest,
  DashboardTopCareersWidgetData,
  DashboardTopStudentsWidgetData,
  DashboardWidgetResponse,
  DashboardWidgetType,
} from '@/features/dashboard/api/dashboard-api'
import StatCard from '@/shared/components/data-display/status-card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { DataTable } from '@/shared/components/ui/data-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { cn } from '@/shared/lib/utils'
import { CardsButtonGroup } from '@/features/dashboard/components/cards-button-group'

type LocalTableControlKey = 'studentActivityTable' | 'careerStudentTable'
type TrendGranularityId = 'today' | '7d' | '1m' | '3m' | '6m' | '12m'

type DashboardAnalysisRendererProps = {
  analysis: DashboardAnalysisResponse | null
  loading?: boolean
  showAppliedContext?: boolean
  onTableControlChange?: (
    key: LocalTableControlKey,
    patch: Partial<DashboardTableWidgetControlRequest>,
  ) => void
}

// Renderer backend-driven del panel:
// - respeta layoutType + widgets como source of truth
// - puede especializar la presentación por layout
// - no debe inventar widgets ni sustituir la semántica resuelta por backend

type AccessChartPoint = { label: string; total: number; permitidos: number; denegados: number }
type TopCarreraPoint = { codigo: string; carrera: string; accesos: number; successful: number; failed: number }
type TopUsuarioPoint = {
  studentId: string
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

const TOP_CAREERS_PALETTE = ['#15ac8c', '#0891b2', '#f59e0b', '#22c55e', '#a855f7', '#ef4444'] as const
const TREND_TOTAL_COLOR = '#15ac8c'
const TREND_SUCCESS_COLOR = '#0891b2'
const TREND_FAILED_COLOR = '#38bdf8'
const TOP_STUDENTS_PAGE_SIZE = 5
const TOP_CAREERS_PAGE_SIZES = [7, 6] as const
const DEFAULT_TREND_GRANULARITY: TrendGranularityId = '3m'
const TREND_GRANULARITY_OPTIONS: Array<{ id: TrendGranularityId; label: string }> = [
  { id: 'today', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '1m', label: '1 mes' },
  { id: '3m', label: '3 meses' },
  { id: '6m', label: '6 meses' },
  { id: '12m', label: '1 año' },
]

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString('es-MX')
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value ?? 0).toFixed(1)}%`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Sin dato'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
} as const

function renderSummary(summary: DashboardFilterSummary) {
  const items = [
    `Scope: ${summary.scope}`,
    `Mode: ${summary.mode}`,
    `Resultado: ${summary.accessResult}`,
    summary.rankingMode === 'TOP' && summary.topN ? `Top ${summary.topN}` : null,
    summary.dateFrom && summary.dateTo
      ? `Rango: ${formatDateTime(summary.dateFrom)} - ${formatDateTime(summary.dateTo)}`
      : 'Rango: default backend',
  ].filter(Boolean)

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base">Contexto aplicado</CardTitle>
        <CardDescription>
          Este bloque solo aparece cuando ya existe un filtro real aplicado distinto del estado base.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-4">
        {items.map((item) => (
          <Badge key={item} variant="secondary">
            {item}
          </Badge>
        ))}
      </CardContent>
    </Card>
  )
}

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

  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).replace('.', '')
}

function parseTrendDate(dayIso: string) {
  const safeIso = dayIso.includes('T') ? dayIso : `${dayIso}T12:00:00Z`
  return new Date(safeIso)
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function monthStartUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function nextMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
}

function monthKeyUtc(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function buildDailyAccessChartData(
  points: DashboardAccessTrendWidgetData['points'],
  dateFrom?: string,
  dateTo?: string,
): AccessChartPoint[] {
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

function buildGroupedByFixedBucketsData(
  points: DashboardAccessTrendWidgetData['points'],
  windowStart: Date,
  windowEnd: Date,
  bucketCount: number,
  labelBuilder: (index: number, start: Date, end: Date) => string,
): AccessChartPoint[] {
  const safeBucketCount = Math.max(1, bucketCount)
  const totalDays = Math.max(1, Math.floor((windowEnd.getTime() - windowStart.getTime()) / 86_400_000) + 1)
  const daysPerBucket = Math.max(1, Math.ceil(totalDays / safeBucketCount))
  const buckets: AccessChartPoint[] = Array.from({ length: safeBucketCount }, (_, index) => {
    const start = addUtcDays(windowStart, index * daysPerBucket)
    const rawEnd = addUtcDays(start, daysPerBucket - 1)
    const end = rawEnd > windowEnd ? windowEnd : rawEnd
    return {
      label: labelBuilder(index, start, end),
      permitidos: 0,
      denegados: 0,
      total: 0,
    }
  })

  for (const point of points) {
    const date = parseTrendDate(point.day)
    if (Number.isNaN(date.getTime()) || date < windowStart || date > windowEnd) continue
    const dayOffset = Math.floor((date.getTime() - windowStart.getTime()) / 86_400_000)
    const bucketIndex = Math.min(buckets.length - 1, Math.max(0, Math.floor(dayOffset / daysPerBucket)))
    const bucket = buckets[bucketIndex]
    bucket.permitidos += point.successful
    bucket.denegados += point.failed
    bucket.total = bucket.permitidos + bucket.denegados
  }

  return buckets
}

function buildTodayBy4HoursData(points: DashboardAccessTrendWidgetData['points'], windowStart: Date, windowEnd: Date): AccessChartPoint[] {
  const buckets: AccessChartPoint[] = Array.from({ length: 6 }, (_, index) => ({
    label: `${String(index * 4).padStart(2, '0')}:00`,
    permitidos: 0,
    denegados: 0,
    total: 0,
  }))

  for (const point of points) {
    const date = parseTrendDate(point.day)
    if (Number.isNaN(date.getTime()) || date < windowStart || date > windowEnd) continue
    const bucketIndex = Math.min(5, Math.max(0, Math.floor(date.getUTCHours() / 4)))
    const bucket = buckets[bucketIndex]
    bucket.permitidos += point.successful
    bucket.denegados += point.failed
    bucket.total = bucket.permitidos + bucket.denegados
  }

  return buckets
}

function buildGroupedByMonthData(
  points: DashboardAccessTrendWidgetData['points'],
  windowStart: Date,
  windowEnd: Date,
): AccessChartPoint[] {
  const monthBuckets = new Map<string, AccessChartPoint>()

  for (let cursor = monthStartUtc(windowStart); cursor <= windowEnd; cursor = nextMonthUtc(cursor)) {
    const key = monthKeyUtc(cursor)
    monthBuckets.set(key, {
      label: cursor.toLocaleDateString('es-MX', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace('.', ''),
      permitidos: 0,
      denegados: 0,
      total: 0,
    })
  }

  for (const point of points) {
    const date = parseTrendDate(point.day)
    if (Number.isNaN(date.getTime()) || date < windowStart || date > windowEnd) continue
    const key = monthKeyUtc(date)
    const bucket = monthBuckets.get(key)
    if (!bucket) continue
    bucket.permitidos += point.successful
    bucket.denegados += point.failed
    bucket.total = bucket.permitidos + bucket.denegados
  }

  return Array.from(monthBuckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value)
}

function buildHistoricalAccessChartData(
  points: DashboardAccessTrendWidgetData['points'],
  windowStart: Date,
  windowEnd: Date,
  granularity: TrendGranularityId,
): AccessChartPoint[] {
  if (granularity === 'today') {
    return buildTodayBy4HoursData(points, windowStart, windowEnd)
  }

  if (granularity === '1m') {
    return buildGroupedByFixedBucketsData(
      points,
      windowStart,
      windowEnd,
      4,
      (index) => `Semana ${index + 1}`,
    )
  }
  if (granularity === '3m') {
    return buildGroupedByFixedBucketsData(
      points,
      windowStart,
      windowEnd,
      6,
      (index) => `Quincena ${index + 1}`,
    )
  }
  if (granularity === '6m' || granularity === '12m') {
    return buildGroupedByMonthData(points, windowStart, windowEnd)
  }
  return buildDailyAccessChartData(points, windowStart.toISOString(), windowEnd.toISOString())
}

function getTrendWindowBounds(
  dataMax: Date,
  offsetBack: number,
  granularity: TrendGranularityId,
): { windowStart: Date; windowEnd: Date } {
  const anchorEnd = endOfDay(dataMax)

  if (granularity === 'today') {
    const windowEnd = endOfDay(subDays(anchorEnd, offsetBack))
    const windowStart = startOfDay(windowEnd)
    return { windowStart, windowEnd }
  }

  if (granularity === '7d') {
    const dayCount = 7
    const windowEnd = endOfDay(subDays(anchorEnd, offsetBack * dayCount))
    const windowStart = startOfDay(subDays(windowEnd, dayCount - 1))
    return { windowStart, windowEnd }
  }

  if (granularity === '1m') {
    const dayCount = 30
    const windowEnd = endOfDay(subDays(anchorEnd, offsetBack * dayCount))
    const windowStart = startOfDay(subDays(windowEnd, dayCount - 1))
    return { windowStart, windowEnd }
  }

  const months =
    granularity === '3m'
        ? 3
        : granularity === '6m'
          ? 6
          : 12

  const windowEnd = subMonths(anchorEnd, offsetBack * months)
  const windowStart = startOfDay(subMonths(windowEnd, months))
  return { windowStart, windowEnd }
}

function buildTrendWindowHistoricalChart(
  points: DashboardAccessTrendWidgetData['points'],
  offsetBack: number,
  granularity: TrendGranularityId,
) {
  const dates = points.map((point) => parseTrendDate(point.day)).filter((date) => !Number.isNaN(date.getTime()))
  if (dates.length === 0) {
    return {
      chartData: [] as AccessChartPoint[],
      periodLabel: '',
      canGoOlder: false,
      canGoNewer: false,
    }
  }

  const dataMax = max(dates)
  const { windowStart, windowEnd } = getTrendWindowBounds(dataMax, offsetBack, granularity)

  const filtered = points.filter((point) => {
    const date = parseTrendDate(point.day)
    if (Number.isNaN(date.getTime())) return false
    return date >= windowStart && date <= windowEnd
  })

  const chartData = buildHistoricalAccessChartData(filtered, windowStart, windowEnd, granularity)

  const hasOlderData = points.some((point) => {
    const date = parseTrendDate(point.day)
    return !Number.isNaN(date.getTime()) && date < windowStart
  })

  const formatter = (date: Date) =>
    date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '')

  return {
    chartData,
    periodLabel:
      granularity === 'today'
        ? `Hoy · ${formatter(windowStart)}`
        : `${formatter(windowStart)} – ${formatter(windowEnd)}`,
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
    if (consumed < items.length) totalPages += 1
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

function renderOverviewKpiGroup(widget: DashboardWidgetResponse) {
  const data = widget.data as DashboardSummaryWidgetData
  const totalAccesses = data.successfulAccessesInRange + data.failedAccessesInRange
  const successfulPct = totalAccesses > 0 ? (data.successfulAccessesInRange / totalAccesses) * 100 : 0
  const failedPct = totalAccesses > 0 ? (data.failedAccessesInRange / totalAccesses) * 100 : 0
  const activeStudentPct = data.totalStudents > 0 ? (data.activeStudents / data.totalStudents) * 100 : 0

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Alumnos totales"
        value={formatNumber(data.totalStudents)}
        icon={Users}
        variant="primary"
        trend={activeStudentPct}
        trendLabel="activos"
      />
      <StatCard
        title="Accesos totales"
        value={formatNumber(totalAccesses)}
        icon={TrendingUp}
        variant="info"
        trend={successfulPct}
        trendLabel="exitosos"
      />
      <StatCard
        title="Accesos exitosos"
        value={formatNumber(data.successfulAccessesInRange)}
        icon={ShieldCheck}
        variant="success"
        trend={successfulPct}
        trendLabel="del total"
      />
      <StatCard
        title="Accesos fallidos"
        value={formatNumber(data.failedAccessesInRange)}
        icon={ShieldAlert}
        variant="destructive"
        trend={failedPct}
        trendLabel="del total"
      />
    </div>
  )
}

function OverviewTrendCard({ widget }: { widget: DashboardWidgetResponse }) {
  const data = widget.data as DashboardAccessTrendWidgetData
  const [historicalTrendWindowOffset, setHistoricalTrendWindowOffset] = useState(0)
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularityId>(DEFAULT_TREND_GRANULARITY)

  const historicalChartNav = useMemo(
    () => buildTrendWindowHistoricalChart(data.points, historicalTrendWindowOffset, trendGranularity),
    [data.points, historicalTrendWindowOffset, trendGranularity],
  )

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base font-semibold">Accesos por Tiempo</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Volumen de actividad en el periodo seleccionado
          </p>
          {historicalChartNav.periodLabel ? (
            <p className="mt-2 text-xs font-medium text-foreground">{historicalChartNav.periodLabel}</p>
          ) : null}
        </div>
        <div className="flex w-full min-w-0 flex-col items-stretch gap-3 sm:max-w-xl sm:items-end">
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
            <div className="w-full min-w-0 sm:w-[200px] sm:max-w-[220px]">
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Tamaño de ventana
              </span>
              <Select
                value={trendGranularity}
                onValueChange={(value) => {
                  setTrendGranularity(value as TrendGranularityId)
                  setHistoricalTrendWindowOffset(0)
                }}
              >
                <SelectTrigger size="sm" className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TREND_GRANULARITY_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
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
                onClick={() => setHistoricalTrendWindowOffset((current) => current + 1)}
                className="h-8 flex-1 rounded-none rounded-l-md border-0 shadow-none sm:flex-initial sm:px-3"
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!historicalChartNav.canGoNewer}
                onClick={() => setHistoricalTrendWindowOffset((current) => Math.max(0, current - 1))}
                className="h-8 flex-1 rounded-none rounded-r-md border-0 shadow-none sm:flex-initial sm:px-3"
              >
                Más reciente
              </Button>
            </div>
          </div>
        <div className="flex flex-wrap gap-2 text-xs sm:justify-end">
            <Badge variant="outlined" className="gap-1 border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: TREND_TOTAL_COLOR }} />
              Ambos
            </Badge>
            <Badge variant="outlined" className="gap-1 border-cyan-600/20 bg-cyan-600/5 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/30 dark:text-cyan-300">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: TREND_SUCCESS_COLOR }} />
              Exitosos
            </Badge>
            <Badge variant="outlined" className="gap-1 border-sky-400/30 bg-sky-400/10 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: TREND_FAILED_COLOR }} />
              Fallidos
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        <ResponsiveContainer width="100%" height={320} minWidth={1} minHeight={320}>
          <ComposedChart data={historicalChartNav.chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="trendTotalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TREND_TOTAL_COLOR} stopOpacity={0.28} />
                <stop offset="100%" stopColor={TREND_TOTAL_COLOR} stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="trendSuccessGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TREND_SUCCESS_COLOR} stopOpacity={0.24} />
                <stop offset="100%" stopColor={TREND_SUCCESS_COLOR} stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="trendFailedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TREND_FAILED_COLOR} stopOpacity={0.2} />
                <stop offset="100%" stopColor={TREND_FAILED_COLOR} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(128,128,128,0.14)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, 'auto']} />
            <Tooltip content={<HistoricalTrendTooltip />} />
            <Area type="monotone" dataKey="total" name="Ambos" stroke={TREND_TOTAL_COLOR} fill="url(#trendTotalGradient)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            <Area type="monotone" dataKey="permitidos" name="Exitosos" stroke={TREND_SUCCESS_COLOR} fill="url(#trendSuccessGradient)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Area type="monotone" dataKey="denegados" name="Fallidos" stroke={TREND_FAILED_COLOR} fill="url(#trendFailedGradient)" strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function OverviewTopSection({
  topCareersWidget,
  topStudentsWidget,
}: {
  topCareersWidget: DashboardWidgetResponse
  topStudentsWidget: DashboardWidgetResponse
}) {
  const topCareers = topCareersWidget.data as DashboardTopCareersWidgetData
  const topStudents = topStudentsWidget.data as DashboardTopStudentsWidgetData
  const [topCareersStatus, setTopCareersStatus] = useState<DashboardAccessResultFilter>('SUCCESS')
  const [topStudentsStatus, setTopStudentsStatus] = useState<DashboardAccessResultFilter>('SUCCESS')
  const [topCareersPage, setTopCareersPage] = useState(1)
  const [topStudentsPage, setTopStudentsPage] = useState(1)

  const careerData = useMemo<TopCarreraPoint[]>(
    () =>
      topCareers.careers.map((item) => ({
        codigo: item.careerCode,
        carrera: item.careerName,
        accesos: item.totalAccesses,
        successful: item.successfulAccesses,
        failed: item.failedAccesses,
      })),
    [topCareers],
  )

  const studentData = useMemo<TopUsuarioPoint[]>(() => {
    return topStudents.students.map((student) => ({
      studentId: student.studentId,
      codigo: student.careerCode,
      nombre: student.name,
      accesos: student.totalAccesses,
      carrera: student.careerName,
      successful: student.successfulAccesses,
      failed: student.failedAccesses,
      pct: 0,
      pctSuccessful: 0,
      pctFailed: 0,
    }))
  }, [topStudents])

  const topCareersMetricKey = topCareersStatus === 'ALL' ? 'accesos' : topCareersStatus === 'SUCCESS' ? 'successful' : 'failed'
  const topStudentsMetricKey = topStudentsStatus === 'ALL' ? 'accesos' : topStudentsStatus === 'SUCCESS' ? 'successful' : 'failed'

  const topCareersRanked = useMemo(
    () =>
      [...careerData]
        .sort((a, b) => (b[topCareersMetricKey] ?? 0) - (a[topCareersMetricKey] ?? 0) || a.carrera.localeCompare(b.carrera, 'es-MX'))
        .map((item, idx) => ({
          ...item,
          value: item[topCareersMetricKey] ?? 0,
          fill: TOP_CAREERS_PALETTE[idx % TOP_CAREERS_PALETTE.length],
        })),
    [careerData, topCareersMetricKey],
  )

  const topStudentsRanked = useMemo(() => {
    const sorted = [...studentData].sort(
      (a, b) => (b[topStudentsMetricKey] ?? 0) - (a[topStudentsMetricKey] ?? 0) || a.nombre.localeCompare(b.nombre, 'es-MX'),
    )
    const maxValue = Math.max(1, ...sorted.map((student) => student[topStudentsMetricKey] ?? 0))

    return sorted.map((student) => {
      const selectedValue = student[topStudentsMetricKey] ?? 0
      const computedPct = Math.max(3, Math.round((selectedValue / maxValue) * 100))
      return {
        ...student,
        pct: computedPct,
        pctSuccessful: computedPct,
        pctFailed: computedPct,
      }
    })
  }, [studentData, topStudentsMetricKey])

  const topCareersPagination = useMemo(
    () => getPagedSlice(topCareersRanked, topCareersPage, TOP_CAREERS_PAGE_SIZES),
    [topCareersRanked, topCareersPage],
  )

  const topStudentsPagination = useMemo(
    () => getPagedSlice(topStudentsRanked, topStudentsPage, [TOP_STUDENTS_PAGE_SIZE]),
    [topStudentsRanked, topStudentsPage],
  )
  const topCareerPageItems = topCareersPagination.items

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_0.75fr]">
      <Card className="flex min-h-[520px] flex-col">
        <CardHeader className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-warning" />
              Top Carreras
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Carreras con más accesos históricos</p>
          </div>
          <CardsButtonGroup
            value={topCareersStatus}
            onValueChange={(value) => {
              setTopCareersStatus(value)
              setTopCareersPage(1)
            }}
          />
        </CardHeader>
        <CardContent className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCareerPageItems} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(128,128,128,0.14)" />
                <XAxis dataKey="codigo" tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, 'auto']} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.35)' }}
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [formatNumber(value), topCareersStatus === 'ALL' ? 'Accesos' : topCareersStatus === 'SUCCESS' ? 'Exitosos' : 'Fallidos']}
                  labelFormatter={(label) => {
                    const item = topCareerPageItems.find((career) => career.codigo === label)
                    return item ? `${item.codigo} · ${item.carrera}` : label
                  }}
                />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} isAnimationActive={false}>
                  {topCareerPageItems.map((entry) => (
                    <Cell key={`${entry.codigo}-fill`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-auto flex items-center justify-end gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              className="border-border/40 hover:border-border/60"
              disabled={topCareersPagination.safePage <= 1}
              onClick={() => setTopCareersPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {topCareersPagination.safePage} de {topCareersPagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-border/40 hover:border-border/60"
              disabled={topCareersPagination.safePage >= topCareersPagination.totalPages}
              onClick={() => setTopCareersPage((current) => Math.min(topCareersPagination.totalPages, current + 1))}
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
          <CardsButtonGroup
            value={topStudentsStatus}
            onValueChange={(value) => {
              setTopStudentsStatus(value)
              setTopStudentsPage(1)
            }}
          />
        </CardHeader>
        <CardContent className="flex min-w-0 flex-1 flex-col">
          <div className="mt-1 flex-1 space-y-2.5">
              {topStudentsPagination.items.map((student, index) => {
                const rank = (topStudentsPagination.safePage - 1) * TOP_STUDENTS_PAGE_SIZE + index + 1
                const isPodium = rank <= 3
                const progressValue = student.pct

              const badgeValue =
                topStudentsStatus === 'ALL'
                  ? `${student.accesos} accesos`
                  : topStudentsStatus === 'SUCCESS'
                    ? `${student.successful} accesos`
                    : `${student.failed} accesos`

              return (
                <div key={student.studentId} className="rounded-2xl border border-border/60 bg-card/50 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                      {isPodium ? (
                        <span
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-full',
                            rank === 1
                              ? 'bg-warning/20 text-warning'
                              : rank === 2
                                ? 'bg-secondary text-muted-foreground'
                                : 'bg-destructive/10 text-destructive',
                          )}
                        >
                          <Trophy className="h-5 w-5" />
                        </span>
                      ) : (
                        <span className="text-sm font-extrabold tabular-nums text-muted-foreground">#{rank}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-foreground">{student.nombre}</span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outlined"
                            className="h-5 gap-1 border-emerald-500/20 bg-emerald-500/5 px-2 py-0 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                          >
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                            {badgeValue}
                          </Badge>
                          <Badge
                            variant="outlined"
                            className="h-5 rounded-full border-border/70 bg-secondary/30 px-2.5 py-0 text-[9px] font-semibold uppercase tracking-wide text-foreground dark:border-border/80 dark:bg-secondary/50 dark:text-foreground"
                          >
                            {student.codigo}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1.5">
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 transition-all"
                            style={{ width: `${Math.max(3, Math.min(100, progressValue))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                          <span className="truncate">{student.carrera}</span>
                          <span className="shrink-0 tabular-nums">
                            {topStudentsStatus === 'ALL'
                              ? `Totales: ${student.accesos}`
                              : topStudentsStatus === 'SUCCESS'
                                ? `Exitosos: ${student.successful}`
                                : `Fallidos: ${student.failed}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-auto flex items-center justify-end gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              className="border-border/40 hover:border-border/60"
              disabled={topStudentsPagination.safePage <= 1}
              onClick={() => setTopStudentsPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {topStudentsPagination.safePage} de {topStudentsPagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-border/40 hover:border-border/60"
              disabled={topStudentsPagination.safePage >= topStudentsPagination.totalPages}
              onClick={() => setTopStudentsPage((current) => Math.min(topStudentsPagination.totalPages, current + 1))}
            >
              Siguiente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function OverviewDashboardRenderer({ analysis }: { analysis: DashboardAnalysisResponse }) {
  const widgetsByType = new Map<DashboardWidgetType, DashboardWidgetResponse>(
    analysis.widgets.map((widget) => [widget.type, widget]),
  )

  const kpiWidget = widgetsByType.get('KPI_GROUP')
  const trendWidget = widgetsByType.get('AREA_TREND')
  const topStudentsWidget = widgetsByType.get('TOP_STUDENTS_TABLE')
  const topCareersWidget = widgetsByType.get('TOP_CAREERS_TABLE')

  return (
    <div className="space-y-6">
      {kpiWidget ? renderOverviewKpiGroup(kpiWidget) : null}
      {trendWidget ? (
        <OverviewTrendCard
          key={`${trendWidget.widgetId}-${(trendWidget.data as DashboardAccessTrendWidgetData).dateFrom}-${(trendWidget.data as DashboardAccessTrendWidgetData).dateTo}-${(trendWidget.data as DashboardAccessTrendWidgetData).points.length}`}
          widget={trendWidget}
        />
      ) : null}
      {topStudentsWidget && topCareersWidget ? (
        <OverviewTopSection
          key={`${topStudentsWidget.widgetId}-${topCareersWidget.widgetId}-${(topStudentsWidget.data as DashboardTopStudentsWidgetData).dateFrom}-${(topCareersWidget.data as DashboardTopCareersWidgetData).dateFrom}`}
          topStudentsWidget={topStudentsWidget}
          topCareersWidget={topCareersWidget}
        />
      ) : null}
    </div>
  )
}

function renderGenericKpiGroup(widget: DashboardWidgetResponse) {
  const data = widget.data

  if ('careerName' in data && 'uniqueStudentsImpacted' in data) {
    const career = data as DashboardCareerKpiWidgetData
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Accesos totales" value={formatNumber(career.totalAccesses)} icon={BarChart3} variant="primary" />
        <StatCard title="Accesos exitosos" value={formatNumber(career.successfulAccesses)} icon={ShieldCheck} variant="success" />
        <StatCard title="Accesos fallidos" value={formatNumber(career.failedAccesses)} icon={ShieldAlert} variant="destructive" />
        <StatCard title="Alumnos impactados" value={formatNumber(career.uniqueStudentsImpacted)} icon={Users} variant="info" />
      </div>
    )
  }

  if ('uniqueCareersImpacted' in data) {
    const careerRanking = data as DashboardCareerRankingKpiWidgetData
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Accesos totales" value={formatNumber(careerRanking.totalAccesses)} icon={BarChart3} variant="primary" />
        <StatCard title="Accesos exitosos" value={formatNumber(careerRanking.successfulAccesses)} icon={ShieldCheck} variant="success" />
        <StatCard title="Accesos fallidos" value={formatNumber(careerRanking.failedAccesses)} icon={ShieldAlert} variant="destructive" />
        <StatCard title="Carreras impactadas" value={formatNumber(careerRanking.uniqueCareersImpacted)} icon={GraduationCap} variant="info" />
      </div>
    )
  }

  const studentRanking = data as DashboardStudentRankingKpiWidgetData
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Accesos totales" value={formatNumber(studentRanking.totalAccesses)} icon={BarChart3} variant="primary" />
      <StatCard title="Accesos exitosos" value={formatNumber(studentRanking.successfulAccesses)} icon={ShieldCheck} variant="success" />
      <StatCard title="Accesos fallidos" value={formatNumber(studentRanking.failedAccesses)} icon={ShieldAlert} variant="destructive" />
      <StatCard title="Alumnos impactados" value={formatNumber(studentRanking.uniqueStudentsImpacted)} icon={Users} variant="info" />
    </div>
  )
}

function renderGenericTrend(widget: DashboardWidgetResponse) {
  const data = widget.data as DashboardAccessTrendWidgetData
  const chartData = data.points.map((point) => ({
    label: new Date(point.day).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).replace('.', ''),
    successful: point.successful,
    failed: point.failed,
  }))

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base">{widget.title}</CardTitle>
        <CardDescription>
          Tendencia histórica del universo filtrado entre {data.dateFrom} y {data.dateTo}.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.18)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="successful" name="Exitosos" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
            <Bar dataKey="failed" name="Fallidos" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function renderStudentAccessSummary(widget: DashboardWidgetResponse) {
  const data = widget.data as DashboardStudentAccessSummaryWidgetData
  const items = [
    ['Alumno', data.studentName],
    ['Matrícula', data.enrollmentId],
    ['Carrera', `${data.careerCode} · ${data.careerName}`],
    ['Accesos totales', formatNumber(data.totalAccesses)],
    ['Accesos exitosos', formatNumber(data.successfulAccesses)],
    ['Accesos fallidos', formatNumber(data.failedAccesses)],
    ['Tasa de éxito', formatPercent(data.successRate)],
    ['Último acceso', formatDateTime(data.lastAccessAt)],
  ]

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base">{widget.title}</CardTitle>
        <CardDescription>Resumen analítico del alumno seleccionado.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-medium">{value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function renderBreakdown(widget: DashboardWidgetResponse) {
  const data =
    widget.type === 'STUDENT_RESULT_BREAKDOWN'
      ? widget.data as DashboardStudentResultBreakdownWidgetData
      : widget.data as DashboardCareerResultBreakdownWidgetData

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base">{widget.title}</CardTitle>
        <CardDescription>Distribución agregada de resultados sobre el universo base filtrado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {data.items.map((item, index) => {
          const percentage = data.totalAccesses > 0 ? (item.total / data.totalAccesses) * 100 : 0
          return (
            <div key={`${item.result}-${index}`} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span>{item.result}</span>
                <span className="font-medium">{formatNumber(item.total)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(4, percentage)}%`,
                    backgroundColor: TOP_CAREERS_PALETTE[index % TOP_CAREERS_PALETTE.length],
                  }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function renderStudentActivityTable(widget: DashboardWidgetResponse, onTableControlChange?: DashboardAnalysisRendererProps['onTableControlChange']) {
  const data = widget.data as DashboardStudentActivityTableWidgetData
  const pageCount = Math.max(1, Math.ceil(data.totalElements / Math.max(data.size, 1)))

  return (
    <DataTable
      title={widget.title}
      meta={`Página ${data.page + 1} de ${pageCount} · sortBy=${data.sortBy} · ${data.sortDirection}`}
      viewToggle={false}
      renderTable={() => (
        <div className="overflow-x-auto px-5 py-4">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="pb-3">Fecha</th>
                <th className="pb-3">Resultado</th>
                <th className="pb-3">Canal</th>
                <th className="pb-3 text-right">Latencia</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.accessLogId} className="border-t">
                  <td className="py-3">{formatDateTime(item.occurredAt)}</td>
                  <td className="py-3">{item.result}</td>
                  <td className="py-3">{item.channelName ?? 'Sin canal'}</td>
                  <td className="py-3 text-right">{item.latencyMs ? `${item.latencyMs} ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      pagination={{
        summary: `${formatNumber(data.totalElements)} registros`,
        pageIndex: data.page,
        pageCount,
        canPreviousPage: data.page > 0,
        canNextPage: data.page + 1 < pageCount,
        onPreviousPage: () => onTableControlChange?.('studentActivityTable', { page: Math.max(0, data.page - 1) }),
        onNextPage: () => onTableControlChange?.('studentActivityTable', { page: data.page + 1 }),
      }}
    />
  )
}

function renderCareerStudentTable(widget: DashboardWidgetResponse, onTableControlChange?: DashboardAnalysisRendererProps['onTableControlChange']) {
  const data = widget.data as DashboardCareerStudentTableWidgetData
  const pageCount = Math.max(1, Math.ceil(data.totalElements / Math.max(data.size, 1)))

  return (
    <DataTable
      title={widget.title}
      meta={`Solo alumnos con actividad en el rango · página ${data.page + 1} de ${pageCount}`}
      viewToggle={false}
      renderTable={() => (
        <div className="overflow-x-auto px-5 py-4">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="pb-3">Alumno</th>
                <th className="pb-3">Matrícula</th>
                <th className="pb-3 text-right">Totales</th>
                <th className="pb-3 text-right">Éxito</th>
                <th className="pb-3">Último acceso</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.studentId} className="border-t">
                  <td className="py-3">{item.studentName}</td>
                  <td className="py-3">{item.enrollmentId}</td>
                  <td className="py-3 text-right">{formatNumber(item.totalAccesses)}</td>
                  <td className="py-3 text-right">{formatPercent(item.successRate)}</td>
                  <td className="py-3">{formatDateTime(item.lastAccessAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      pagination={{
        summary: `${formatNumber(data.totalElements)} alumnos con actividad`,
        pageIndex: data.page,
        pageCount,
        canPreviousPage: data.page > 0,
        canNextPage: data.page + 1 < pageCount,
        onPreviousPage: () => onTableControlChange?.('careerStudentTable', { page: Math.max(0, data.page - 1) }),
        onNextPage: () => onTableControlChange?.('careerStudentTable', { page: data.page + 1 }),
      }}
    />
  )
}

function renderStudentRankingTable(widget: DashboardWidgetResponse) {
  const data = widget.data as DashboardStudentRankingTableWidgetData
  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base">{widget.title}</CardTitle>
        <CardDescription>Ranking top-{data.topN}. El truncamiento solo afecta este widget.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="pb-3">#</th>
                <th className="pb-3">Alumno</th>
                <th className="pb-3">Matrícula</th>
                <th className="pb-3 text-right">Totales</th>
                <th className="pb-3 text-right">Éxito</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.studentId} className="border-t">
                  <td className="py-3">{item.position}</td>
                  <td className="py-3">{item.studentName}</td>
                  <td className="py-3">{item.enrollmentId}</td>
                  <td className="py-3 text-right">{formatNumber(item.totalAccesses)}</td>
                  <td className="py-3 text-right">{formatPercent(item.successRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function renderCareerRankingTable(widget: DashboardWidgetResponse) {
  const data = widget.data as DashboardCareerRankingTableWidgetData
  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base">{widget.title}</CardTitle>
        <CardDescription>rankingMetric={data.rankingMetric} · Top {data.topN}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="pb-3">#</th>
                <th className="pb-3">Clave</th>
                <th className="pb-3">Carrera</th>
                <th className="pb-3 text-right">Ranking</th>
                <th className="pb-3 text-right">Éxito</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.careerId} className="border-t">
                  <td className="py-3">{item.position}</td>
                  <td className="py-3">{item.careerCode}</td>
                  <td className="py-3">{item.careerName}</td>
                  <td className="py-3 text-right">{formatNumber(item.rankingValue)}</td>
                  <td className="py-3 text-right">{formatPercent(item.successRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function renderCareerComparisonTable(widget: DashboardWidgetResponse) {
  const data = widget.data as DashboardCareerComparisonTableWidgetData
  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base">{widget.title}</CardTitle>
        <CardDescription>Comparativo agregado del universo base. Orden fijo actual: {data.sortBy} {data.sortDirection}.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="pb-3">Clave</th>
                <th className="pb-3">Carrera</th>
                <th className="pb-3 text-right">Totales</th>
                <th className="pb-3 text-right">Éxito</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.careerId} className="border-t">
                  <td className="py-3">{item.careerCode}</td>
                  <td className="py-3">{item.careerName}</td>
                  <td className="py-3 text-right">{formatNumber(item.totalAccesses)}</td>
                  <td className="py-3 text-right">{formatPercent(item.successRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function renderWidget(widget: DashboardWidgetResponse, onTableControlChange?: DashboardAnalysisRendererProps['onTableControlChange']) {
  switch (widget.type) {
    case 'KPI_GROUP':
      return renderGenericKpiGroup(widget)
    case 'AREA_TREND':
      return renderGenericTrend(widget)
    case 'STUDENT_ACCESS_SUMMARY':
      return renderStudentAccessSummary(widget)
    case 'STUDENT_ACTIVITY_TABLE':
      return renderStudentActivityTable(widget, onTableControlChange)
    case 'CAREER_STUDENT_TABLE':
      return renderCareerStudentTable(widget, onTableControlChange)
    case 'STUDENT_RESULT_BREAKDOWN':
    case 'CAREER_RESULT_BREAKDOWN':
      return renderBreakdown(widget)
    case 'STUDENT_RANKING_TABLE':
      return renderStudentRankingTable(widget)
    case 'CAREER_RANKING_TABLE':
    case 'CAREER_RANKING_SUCCESS_TABLE':
    case 'CAREER_RANKING_FAILED_TABLE':
      return renderCareerRankingTable(widget)
    case 'CAREER_COMPARISON_TABLE':
      return renderCareerComparisonTable(widget)
    default:
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{widget.title}</CardTitle>
            <CardDescription>Widget todavía no renderizado en frontend.</CardDescription>
          </CardHeader>
        </Card>
      )
  }
}

function GenericDashboardRenderer({
  analysis,
  showAppliedContext,
  onTableControlChange,
}: {
  analysis: DashboardAnalysisResponse
  showAppliedContext: boolean
  onTableControlChange?: DashboardAnalysisRendererProps['onTableControlChange']
}) {
  const sortedWidgets = [...analysis.widgets].sort((left, right) => left.order - right.order)

  return (
    <div className="space-y-6">
      {showAppliedContext ? renderSummary(analysis.summary) : null}
      <div className="space-y-6">
        {sortedWidgets.map((widget) => (
          <div key={widget.widgetId}>{renderWidget(widget, onTableControlChange)}</div>
        ))}
      </div>
    </div>
  )
}

export function DashboardAnalysisRenderer({
  analysis,
  loading = false,
  showAppliedContext = false,
  onTableControlChange,
}: DashboardAnalysisRendererProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Cargando análisis adaptativo…
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 py-10 text-center">
          <Clock3 className="size-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Todavía no hay un análisis renderizado.</p>
            <p className="text-xs text-muted-foreground">
              Usa el compositor para consultar `layoutType + widgets` desde el backend nuevo.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (analysis.layoutType === 'OVERVIEW') {
    return (
      <div className="space-y-6">
        {showAppliedContext ? renderSummary(analysis.summary) : null}
        <OverviewDashboardRenderer analysis={analysis} />
      </div>
    )
  }

  return (
    <GenericDashboardRenderer
      analysis={analysis}
      showAppliedContext={showAppliedContext}
      onTableControlChange={onTableControlChange}
    />
  )
}
