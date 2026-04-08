import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart2, CalendarClock, Download, RefreshCw, TrendingUp, Users, ShieldCheck, ShieldX, Trophy, BarChart3, CheckCircle, XCircle, Calendar } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import StatCard from '@/shared/components/data-display/status-card'
import { SectionHeader } from '@/shared/components/ui/section-header'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { MonitoringFiltersCard } from '@/features/dashboard/components/monitoring-composer/monitoring-filters-card'
import { DEFAULT_COMPOSER_DRAFT_STATE, type ComposerDraftState, type MonitoringFilterFamily } from '@/features/dashboard/components/monitoring-composer/composer.types'
import { cn } from '@/shared/lib/utils'
import {
  exportDashboardMonitoring,
  getDashboardAccessTrends,
  getDashboardSummary,
  getDashboardTopCareers,
  getDashboardTopStudents,
  type DashboardAccessStatus,
  type DashboardAnalysisType,
  type DashboardExportFormat,
  type DashboardQueryParams,
} from '@/features/dashboard/api/dashboard-api'
import { resolveFilterFamily, resolveMonitoringQuery } from '@/features/dashboard/components/monitoring-composer/composer.utils'
import { TOP_N_OPTIONS, TOP_N_CAREER_MULTI_OPTIONS } from '@/features/dashboard/components/monitoring-composer/composer.config'
import { getStudentById, type StudentResponseDto } from '@/features/students/api/students-api'
import { listActiveCareers } from '@/features/careers/api/careers-api'
import { StudentCard } from '@/features/students/components/cards/student-card'

const CHART_COLORS = ['#10b981', '#0DA2E7', '#34d399', '#14b8a6', '#f59e0b', '#ef4444']

const ACCESS_CHART_COLORS = {
  success: 'hsl(var(--success))',
  destructive: 'hsl(var(--destructive))',
  info: 'hsl(var(--info))',
}

type AccessChartPoint = { label: string; total: number; permitidos: number; denegados: number }
type TopCarreraPoint = { carrera: string; accesos: number; successful: number; failed: number }
type TopUsuarioPoint = { nombre: string; accesos: number; carrera: string; pct: number; successful: number; failed: number }
type KpiItem = { title: string; value: string; icon: typeof Users; iconBg: string; iconFg: string; delay: number }

const EMPTY_KPI = {
  alumnosTotales: 0,
  accesosPeriodo: 0,
  accesosPermitidos: 0,
  accesosDenegados: 0,
}

const EMPTY_KPI_META = {
  lastAccessAt: null as string | null,
  lastSuccessfulAccessAt: null as string | null,
  lastFailedAccessAt: null as string | null,
}

function getLast7DaysRange() {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 6)
  from.setHours(0, 0, 0, 0)
  to.setHours(23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
}

function formatWeekdayLabel(dayIso: string) {
  const date = new Date(dayIso)
  if (Number.isNaN(date.getTime())) return dayIso
  const short = date.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')
  return short.charAt(0).toUpperCase() + short.slice(1, 3)
}

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'hsl(var(--foreground))',
}

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Sin registros'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin registros'
  return parsed.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const buildDashboardQueryFromComposer = (composer: ComposerDraftState | null): DashboardQueryParams => {
  const fallbackRange = getLast7DaysRange()

  const resolved = composer ? resolveMonitoringQuery(composer) : null

  if (!resolved) {
    // Unresolved draft — return a safe default query
    return {
      analysisType: 'students_all',
      status: 'ALL',
      sortDir: 'desc',
      topEnabled: false,
      dateFrom: fallbackRange.from,
      dateTo: fallbackRange.to,
    }
  }

  const FAMILY_TO_ANALYSIS_TYPE: Record<typeof resolved.family, DashboardAnalysisType> = {
    student_individual: 'students_individual',
    student_all: 'students_all',
    career_single: 'careers',
    career_multi: 'careers',
  }

  return {
    analysisType: FAMILY_TO_ANALYSIS_TYPE[resolved.family],
    status: resolved.accessType as DashboardAccessStatus,
    sortDir: resolved.sortDirection,
    topEnabled: resolved.topN !== undefined,
    topN: resolved.topN,
    studentId: resolved.studentId,
    careerCodes: resolved.careerCodes,
    dateFrom: resolved.dateRange?.from.toISOString(),
    dateTo: resolved.dateRange?.to.toISOString(),
  }
}

const isFilterCompleted = (value: ComposerDraftState) => {
  if (!value.type) return true

  if (value.type === 'students') {
    if (value.studentMode === 'individual') {
      return Boolean(value.student?.selectedId && value.status)
    }
    if (value.studentMode === 'all') {
      return Boolean(value.status)
    }
    return false
  }

  if (value.type === 'careers') {
    return Boolean(value.status)
  }

  return true
}

const hasStartedFilterDraft = (value: ComposerDraftState) => {
  return Boolean(
    value.type ||
    value.studentMode ||
    value.student?.query ||
    value.student?.selectedId ||
    value.careers?.length ||
    value.status ||
    value.dateRange?.from ||
    value.dateRange?.to ||
    value.topEnabled,
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


const MonitoringAndReports = () => {
  const { showToast } = useAppToast()
  const [loading, setLoading] = useState(true)
  const [isApplyingFilters, setIsApplyingFilters] = useState(false)
  const [isHeaderExportOpen, setIsHeaderExportOpen] = useState(false)
  const [chartData, setChartData] = useState<AccessChartPoint[]>([])
  const [kpis, setKpis] = useState(EMPTY_KPI)
  const [kpisMeta, setKpisMeta] = useState(EMPTY_KPI_META)
  const [topCarrerasData, setTopCarrerasData] = useState<TopCarreraPoint[]>([])
  const [topUsuarios, setTopUsuarios] = useState<TopUsuarioPoint[]>([])
  const [historicalTopCarrerasData, setHistoricalTopCarrerasData] = useState<TopCarreraPoint[]>([])
  const [historicalTopUsuarios, setHistoricalTopUsuarios] = useState<TopUsuarioPoint[]>([])
  const [topCareersPage, setTopCareersPage] = useState(1)
  const [topStudentsPage, setTopStudentsPage] = useState(1)

  const [draftFilters, setDraftFilters] = useState<ComposerDraftState>(DEFAULT_COMPOSER_DRAFT_STATE)
  const [appliedFilters, setAppliedFilters] = useState<ComposerDraftState | null>(null)
  const [topVisibleCount, setTopVisibleCount] = useState(5)
  const [selectedStudentData, setSelectedStudentData] = useState<StudentResponseDto | null>(null)
  const [careerNameMap, setCareerNameMap] = useState<Map<string, string>>(new Map())
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Load career code→name map once on mount for label resolution
  useEffect(() => {
    void listActiveCareers()
      .then((careers) => {
        setCareerNameMap(new Map(careers.map((c) => [c.code, c.name])))
      })
      .catch(() => {
        // Non-critical — labels fall back to codes if this fails
      })
  }, [])

  const monthlyTotalsKpi = useMemo(() => ({ accesosPeriodo: kpis.accesosPeriodo }), [kpis.accesosPeriodo])

  const appliedQueryParams = useMemo(
    () => buildDashboardQueryFromComposer(appliedFilters),
    [appliedFilters],
  )

  // ─── Overview flow ────────────────────────────────────────────────────────
  // Runs without an active filter (mount + reset).
  // Fetches global summary + access trends for the last 7 days.
  // Does NOT fetch historical tops — that is fetchHistorical's job.
  const fetchOverview = useCallback(async () => {
    const { from, to } = getLast7DaysRange()
    const overviewParams: DashboardQueryParams = {
      analysisType: 'students_all',
      status: 'ALL',
      sortDir: 'desc',
      dateFrom: from,
      dateTo: to,
    }

    const [summary, trends] = await Promise.all([
      getDashboardSummary(overviewParams),
      getDashboardAccessTrends(overviewParams),
    ])

    setKpis({
      alumnosTotales: summary.totalStudents,
      accesosPeriodo: summary.successfulAccessesInRange + summary.failedAccessesInRange,
      accesosPermitidos: summary.successfulAccessesInRange,
      accesosDenegados: summary.failedAccessesInRange,
    })
    setKpisMeta({
      lastAccessAt: summary.lastAccessAt ?? null,
      lastSuccessfulAccessAt: summary.lastSuccessfulAccessAt ?? null,
      lastFailedAccessAt: summary.lastFailedAccessAt ?? null,
    })
    setChartData(
      trends.points.map((point) => ({
        label: formatWeekdayLabel(point.day),
        permitidos: point.successful,
        denegados: point.failed,
        total: point.successful + point.failed,
      })),
    )
  }, [])

  // ─── Historical flow ──────────────────────────────────────────────────────
  // Runs without an active filter (mount + reset), in parallel with fetchOverview.
  // Fetches hardcoded top-10 careers and top-30 students for the historical widgets.
  // These widgets are only visible when !isFilteredView, so this fetch is
  // never triggered when a family filter is active.
  const fetchHistorical = useCallback(async () => {
    const [historicalTopCareers, historicalTopStudents] = await Promise.all([
      getDashboardTopCareers({
        analysisType: 'careers',
        status: 'ALL',
        sortDir: 'desc',
        topEnabled: true,
        topN: 10,
      }),
      getDashboardTopStudents({
        analysisType: 'students_all',
        status: 'ALL',
        sortDir: 'desc',
        topEnabled: true,
        topN: 30,
      }),
    ])

    setHistoricalTopCarrerasData(
      historicalTopCareers.careers.map((item) => ({
        carrera: item.careerName,
        accesos: item.totalAccesses,
        successful: item.successfulAccesses,
        failed: item.failedAccesses,
      })),
    )

    const maxHistoricalAccesses = historicalTopStudents.students[0]?.totalAccesses ?? 1
    setHistoricalTopUsuarios(
      historicalTopStudents.students.map((student) => ({
        nombre: student.name,
        accesos: student.totalAccesses,
        carrera: student.careerName,
        successful: student.successfulAccesses,
        failed: student.failedAccesses,
        pct: Math.max(3, Math.round((student.totalAccesses / maxHistoricalAccesses) * 100)),
      })),
    )
  }, [])

  // ─── Family-specific flow ─────────────────────────────────────────────────
  // Runs when a filter is applied. Only calls the endpoints the active family
  // needs. Never fetches historical tops — those belong to the overview flow.
  //
  // career_single — Option A: frontend sends topN:10 explicitly to the backend.
  // The backend returns exactly 10 students. No dependency on backend defaults.
  //
  // Trends are only fetched when the chart will actually render:
  //   student_individual → always (no topN concept)
  //   career_single      → always (no topN concept)
  //   student_all        → only when ranking is not active (resolvedTopN undefined)
  //   career_multi       → only when ranking is not active (resolvedTopN undefined)
  const CAREER_SINGLE_RANKING_LIMIT = 10 as const
  const fetchByFamily = useCallback(async (
    family: MonitoringFilterFamily,
    queryParams: DashboardQueryParams,
    resolvedTopN: number | undefined,
  ) => {
    // Mirror of shouldHideTrendChart — chart is hidden only for student_all/career_multi
    // with an active ranking. student_individual and career_single always get a chart.
    const chartHidden =
      (family === 'student_all' || family === 'career_multi') &&
      resolvedTopN !== undefined
    const needsChart = !chartHidden

    const needsTopStudents = family === 'student_all' || family === 'career_single'
    const needsTopCareers = family === 'career_multi'

    // career_single: explicit fixed limit — frontend owns this number, not the backend
    const topStudentsParams: DashboardQueryParams =
      family === 'career_single'
        ? { ...queryParams, topEnabled: true, topN: CAREER_SINGLE_RANKING_LIMIT }
        : queryParams

    // Clear stale data before async calls so the UI doesn't flash previous results
    setChartData([])
    setTopUsuarios([])
    setTopCarrerasData([])
    setKpis(EMPTY_KPI)
    setKpisMeta(EMPTY_KPI_META)
    setFetchError(null)

    const [summary, trends, topStudents, topCareers] = await Promise.all([
      getDashboardSummary(queryParams),
      needsChart ? getDashboardAccessTrends(queryParams) : Promise.resolve(null),
      needsTopStudents ? getDashboardTopStudents(topStudentsParams) : Promise.resolve(null),
      needsTopCareers ? getDashboardTopCareers(queryParams) : Promise.resolve(null),
    ])

    setKpis({
      alumnosTotales: summary.totalStudents,
      accesosPeriodo: summary.successfulAccessesInRange + summary.failedAccessesInRange,
      accesosPermitidos: summary.successfulAccessesInRange,
      accesosDenegados: summary.failedAccessesInRange,
    })
    setKpisMeta({
      lastAccessAt: summary.lastAccessAt ?? null,
      lastSuccessfulAccessAt: summary.lastSuccessfulAccessAt ?? null,
      lastFailedAccessAt: summary.lastFailedAccessAt ?? null,
    })

    setChartData(
      trends
        ? trends.points.map((point) => ({
            label: formatWeekdayLabel(point.day),
            permitidos: point.successful,
            denegados: point.failed,
            total: point.successful + point.failed,
          }))
        : [],
    )

    if (topStudents) {
      const maxAccesses = topStudents.students[0]?.totalAccesses ?? 1
      setTopUsuarios(
        topStudents.students.map((student) => ({
          nombre: student.name,
          accesos: student.totalAccesses,
          carrera: student.careerName,
          successful: student.successfulAccesses,
          failed: student.failedAccesses,
          pct: Math.max(3, Math.round((student.totalAccesses / maxAccesses) * 100)),
        })),
      )
    } else {
      setTopUsuarios([])
    }

    if (topCareers) {
      setTopCarrerasData(
        topCareers.careers.map((item) => ({
          carrera: item.careerName,
          accesos: item.totalAccesses,
          successful: item.successfulAccesses,
          failed: item.failedAccesses,
        })),
      )
    } else {
      setTopCarrerasData([])
    }
  }, [])

  useEffect(() => {
    const resolvedQuery = appliedFilters ? resolveMonitoringQuery(appliedFilters) : null
    const family = resolvedQuery?.family ?? null

    // Without active filter → overview flow (summary+trends) + historical flow (tops) in parallel
    // With active filter    → family-specific flow only (no historical)
    const run = !family
      ? () => Promise.all([fetchOverview(), fetchHistorical()])
      : () => fetchByFamily(family, appliedQueryParams, resolvedQuery?.topN)

    const timeoutId = window.setTimeout(() => {
      void run()
        .catch((error) => {
          const message = error instanceof Error ? error.message : 'No se pudo cargar el monitoreo.'
          if (family) {
            // Filtered view — show inline error in addition to toast
            setFetchError(message)
          }
          showToast({
            severity: 'error',
            title: 'Error cargando monitoreo',
            description: message,
          })
        })
        .finally(() => setLoading(false))
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [appliedFilters, appliedQueryParams, fetchOverview, fetchHistorical, fetchByFamily, showToast])

  const dynamicTopNOptions = useMemo(() => {
    const family = resolveFilterFamily(draftFilters)
    if (family === 'student_all') return [...TOP_N_OPTIONS]
    if (family === 'career_multi') return [...TOP_N_CAREER_MULTI_OPTIONS]
    return []
  }, [draftFilters])

  const handleRefresh = () => {
    const resolvedQuery = appliedFilters ? resolveMonitoringQuery(appliedFilters) : null
    const family = resolvedQuery?.family ?? null

    const run = !family
      ? () => Promise.all([fetchOverview(), fetchHistorical()])
      : () => fetchByFamily(family, appliedQueryParams, resolvedQuery?.topN)

    setLoading(true)
    void run()
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

  const exportLabel = appliedFilters?.didFilter ? 'Exportar filtrados' : 'Exportar'
  const draftComplete = isFilterCompleted(draftFilters)
  const draftStarted = hasStartedFilterDraft(draftFilters)
  const exportBlocked = draftStarted && (!draftComplete || draftFilters.didFilter !== true)
  const isFilteredView = appliedFilters?.didFilter === true
  const appliedStatus = appliedQueryParams.status ?? 'ALL'
  const successRate = kpis.accesosPeriodo > 0 ? (kpis.accesosPermitidos / kpis.accesosPeriodo) * 100 : 0
  const failRate = kpis.accesosPeriodo > 0 ? (kpis.accesosDenegados / kpis.accesosPeriodo) * 100 : 0
  const appliedFamily = appliedFilters ? resolveFilterFamily(appliedFilters) : null
  const isStudentsIndividual = appliedFamily === 'student_individual'
  const isStudentsAll = appliedFamily === 'student_all'
  const isCareerSingle = appliedFamily === 'career_single'
  const isCareerMulti = appliedFamily === 'career_multi'

  // topN from the resolved query — only present for student_all/career_multi with topEnabled
  const resolvedTopN = appliedFilters ? resolveMonitoringQuery(appliedFilters)?.topN : undefined

  const filteredKpis = useMemo<KpiItem[]>(() => {
    if (appliedStatus === 'FAILED') {
      return [
        {
          title: 'Fallos totales',
          value: kpis.accesosDenegados.toLocaleString(),
          icon: ShieldX,
          iconBg: 'bg-red-500/10',
          iconFg: 'text-red-500',
          delay: 0,
        },
        {
          title: 'Tasa de fallo',
          value: `${failRate.toFixed(2)}%`,
          icon: TrendingUp,
          iconBg: 'bg-warning/10',
          iconFg: 'text-warning',
          delay: 0.05,
        },
        {
          title: 'Último fallo',
          value: formatDateTime(kpisMeta.lastFailedAccessAt),
          icon: CalendarClock,
          iconBg: 'bg-destructive/10',
          iconFg: 'text-destructive',
          delay: 0.1,
        },
      ]
    }
    if (appliedStatus === 'SUCCESS') {
      return [
        {
          title: 'Exitosos totales',
          value: kpis.accesosPermitidos.toLocaleString(),
          icon: ShieldCheck,
          iconBg: 'bg-green-500/10',
          iconFg: 'text-green-600',
          delay: 0,
        },
        {
          title: 'Tasa de éxito',
          value: `${successRate.toFixed(2)}%`,
          icon: TrendingUp,
          iconBg: 'bg-info/10',
          iconFg: 'text-info',
          delay: 0.05,
        },
        {
          title: 'Último exitoso',
          value: formatDateTime(kpisMeta.lastSuccessfulAccessAt),
          icon: CalendarClock,
          iconBg: 'bg-primary/10',
          iconFg: 'text-primary',
          delay: 0.1,
        },
      ]
    }
    return [
      {
        title: 'Accesos totales',
        value: kpis.accesosPeriodo.toLocaleString(),
        icon: TrendingUp,
        iconBg: 'bg-info/10',
        iconFg: 'text-info',
        delay: 0,
      },
      {
        title: 'Accesos exitosos',
        value: kpis.accesosPermitidos.toLocaleString(),
        icon: ShieldCheck,
        iconBg: 'bg-green-500/10',
        iconFg: 'text-green-600',
        delay: 0.05,
      },
      {
        title: 'Accesos fallidos',
        value: kpis.accesosDenegados.toLocaleString(),
        icon: ShieldX,
        iconBg: 'bg-red-500/10',
        iconFg: 'text-red-500',
        delay: 0.1,
      },
      {
        title: 'Tasa de éxito',
        value: `${successRate.toFixed(2)}%`,
        icon: Trophy,
        iconBg: 'bg-warning/10',
        iconFg: 'text-warning',
        delay: 0.15,
      },
    ]
  }, [appliedStatus, failRate, kpis.accesosDenegados, kpis.accesosPeriodo, kpis.accesosPermitidos, kpisMeta.lastFailedAccessAt, kpisMeta.lastSuccessfulAccessAt, successRate])

  const shouldShowTopStudents = isStudentsAll || isCareerSingle
  const shouldShowTopCareers = isCareerMulti
  const topMetricKey = appliedStatus === 'FAILED' ? 'failed' : appliedStatus === 'SUCCESS' ? 'successful' : 'total'

  // Chart visibility — explicit per family:
  //   student_individual / career_single → always show (no topN concept for these families)
  //   student_all / career_multi         → hide when ranking is active (resolvedTopN defined)
  //   any other state                    → chart is not in the DOM (isFilteredView is false)
  const shouldHideTrendChart =
    (appliedFamily === 'student_all' || appliedFamily === 'career_multi') &&
    resolvedTopN !== undefined

  const topStudentsRanking = useMemo(() => {
    return topUsuarios.map((item) => ({
      label: item.nombre,
      metric:
        topMetricKey === 'failed'
          ? item.failed
          : topMetricKey === 'successful'
            ? item.successful
            : item.accesos,
      secondary: `${item.carrera} · Exitosos: ${item.successful} · Fallidos: ${item.failed}`,
    }))
  }, [topMetricKey, topUsuarios])

  const topCareersRanking = useMemo(() => {
    return topCarrerasData.map((item) => ({
      label: item.carrera,
      metric:
        topMetricKey === 'failed'
          ? item.failed
          : topMetricKey === 'successful'
            ? item.successful
            : item.accesos,
      secondary: `Exitosos: ${item.successful} · Fallidos: ${item.failed}`,
    }))
  }, [topCarrerasData, topMetricKey])

  useEffect(() => {
    setTopVisibleCount(5)
  }, [appliedStatus, appliedFamily, appliedFilters?.careers?.join(','), appliedFilters?.student?.selectedId])

  useEffect(() => {
    if (appliedFilters?.student?.selectedId && isStudentsIndividual) {
      void getStudentById(appliedFilters.student.selectedId)
        .then((student) => setSelectedStudentData(student))
        .catch(() => setSelectedStudentData(null))
    } else {
      setSelectedStudentData(null)
    }
  }, [appliedFilters?.student?.selectedId, isStudentsIndividual])

  const topStudentsRankingSuccessful = useMemo(() => {
    return topUsuarios.map((item) => ({
      label: item.nombre,
      metric: item.successful,
      secondary: `${item.carrera} · Totales: ${item.accesos} · Fallidos: ${item.failed}`,
    }))
  }, [topUsuarios])

  const topStudentsRankingFailed = useMemo(() => {
    return topUsuarios.map((item) => ({
      label: item.nombre,
      metric: item.failed,
      secondary: `${item.carrera} · Totales: ${item.accesos} · Exitosos: ${item.successful}`,
    }))
  }, [topUsuarios])

  const topCareersRankingSuccessful = useMemo(() => {
    return topCarrerasData.map((item) => ({
      label: item.carrera,
      metric: item.successful,
      secondary: `Totales: ${item.accesos} · Fallidos: ${item.failed}`,
    }))
  }, [topCarrerasData])

  const topCareersRankingFailed = useMemo(() => {
    return topCarrerasData.map((item) => ({
      label: item.carrera,
      metric: item.failed,
      secondary: `Totales: ${item.accesos} · Exitosos: ${item.successful}`,
    }))
  }, [topCarrerasData])

  // rankingLimit reflects exactly what was requested/sent to the backend:
  //   career_multi:   resolvedTopN (5 or 10) or fallback to 10 if no topEnabled
  //   student_all:    resolvedTopN (5-30) or fallback to 30 if no topEnabled
  //   career_single:  always 10 (frontend always sends topN:10 for this family)
  //   others:         0 (no ranking)
  const rankingLimit =
    isCareerMulti
      ? (resolvedTopN ?? 10)
      : isStudentsAll
        ? (resolvedTopN ?? 30)
        : isCareerSingle
          ? 10
          : 0
  const rankingData = shouldShowTopCareers ? topCareersRanking : topStudentsRanking
  const visibleRanking = rankingData.slice(0, Math.min(topVisibleCount, rankingLimit))

  const hasExplicitDateRange = Boolean(appliedFilters?.dateRange?.from && appliedFilters?.dateRange?.to)
  const appliedRangeText = hasExplicitDateRange && appliedFilters?.dateRange?.from && appliedFilters?.dateRange?.to
    ? `${appliedFilters.dateRange.from.toLocaleDateString('es-MX')} - ${appliedFilters.dateRange.to.toLocaleDateString('es-MX')}`
    : 'Histórico'
  const contextScopeLabel = isStudentsIndividual
    ? `Estudiante: ${selectedStudentData?.name ?? appliedFilters?.student?.selectedId ?? 'Sin selección'}`
    : isStudentsAll
      ? `Estudiantes: Todos${resolvedTopN !== undefined ? ` · TOP ${resolvedTopN}` : ''}`
      : isCareerSingle
        ? (() => {
            const code = (appliedFilters?.careers ?? [])[0]
            return `Carrera: ${code ? (careerNameMap.get(code) ?? code) : 'Sin selección'}`
          })()
        : (() => {
            const codes = appliedFilters?.careers ?? []
            const names = codes.length > 0
              ? codes.map((c) => careerNameMap.get(c) ?? c).join(', ')
              : 'Todas'
            return `Carreras: ${names}${resolvedTopN !== undefined ? ` · TOP ${resolvedTopN}` : ''}`
          })()

  const TOP_TABLE_PAGE_SIZE = 5
  const topCareersTotalPages = Math.max(1, Math.ceil(historicalTopCarrerasData.length / TOP_TABLE_PAGE_SIZE))
  const topStudentsTotalPages = Math.max(1, Math.ceil(historicalTopUsuarios.length / TOP_TABLE_PAGE_SIZE))
  const topCareersPageSafe = Math.min(topCareersPage, topCareersTotalPages)
  const topStudentsPageSafe = Math.min(topStudentsPage, topStudentsTotalPages)

  const paginatedTopCareers = useMemo(() => {
    const start = (topCareersPageSafe - 1) * TOP_TABLE_PAGE_SIZE
    return historicalTopCarrerasData.slice(start, start + TOP_TABLE_PAGE_SIZE)
  }, [historicalTopCarrerasData, topCareersPageSafe])

  const paginatedTopStudents = useMemo(() => {
    const start = (topStudentsPageSafe - 1) * TOP_TABLE_PAGE_SIZE
    return historicalTopUsuarios.slice(start, start + TOP_TABLE_PAGE_SIZE)
  }, [historicalTopUsuarios, topStudentsPageSafe])

  useEffect(() => {
    setTopCareersPage(1)
  }, [historicalTopCarrerasData.length])

  useEffect(() => {
    setTopStudentsPage(1)
  }, [historicalTopUsuarios.length])

  const handleExport = (format: DashboardExportFormat) => {
    if (exportBlocked) {
      return
    }
    void exportDashboardMonitoring(appliedQueryParams, format)
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

  const capitalizeWords = (str: string) => str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')

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
            {!isApplyingFilters ? (
              <Popover open={isHeaderExportOpen} onOpenChange={setIsHeaderExportOpen}>
                <PopoverTrigger asChild>
                  <Button
                    disabled={loading || exportBlocked}
                    variant="outline"
                    size="md"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {exportLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[180px] p-2">
                  <div className="space-y-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setIsHeaderExportOpen(false)
                        handleExport('csv')
                      }}
                    >
                      Descargar CSV
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setIsHeaderExportOpen(false)
                        handleExport('xlsx')
                      }}
                    >
                      Descargar XLSX
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
        }
      />

      <MonitoringFiltersCard
        value={draftFilters}
        onChange={(next) => {
          setDraftFilters(next)
          if (!hasStartedFilterDraft(next)) {
            setAppliedFilters(null)
            setLoading(true)
          }
        }}
        onApply={(next) => {
          setAppliedFilters(next)
          setLoading(true)
        }}
        onFilteringChange={setIsApplyingFilters}
        onExport={handleExport}
        exportLabel={exportLabel}
        disableExport={exportBlocked}
        showInlineExport={isFilteredView && !isApplyingFilters}
        topNOptions={dynamicTopNOptions}
      />

      {isFilteredView ? (
        <>
          {isStudentsIndividual && selectedStudentData ? (
            <StudentCard
              student={selectedStudentData}
              appliedStatus={appliedStatus as 'ALL' | 'SUCCESS' | 'FAILED'}
              appliedRangeText={appliedRangeText}
            />
          ) : (
            <Card className="w-full">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {contextScopeLabel}
                      </p>
                      <Badge
                        variant="outlined"
                        className="shrink-0 gap-1 text-xs text-muted-foreground"
                      >
                        <Calendar className="h-3 w-3" />
                        {appliedRangeText}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-3">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Filtro
                        </p>
                        <Badge
                          variant="outlined"
                          className={cn(
                            "gap-1",
                            appliedStatus === "ALL"
                              ? "border-muted-foreground/30 text-muted-foreground bg-muted"
                              : appliedStatus === "SUCCESS"
                                ? "border-emerald-500/30 text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40"
                                : "border-red-500/30 text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/40"
                          )}
                        >
                          {appliedStatus === "ALL" ? (
                            <BarChart3 className="h-3 w-3" />
                          ) : appliedStatus === "SUCCESS" ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {appliedStatus === "ALL" ? "Ambos" : appliedStatus === "SUCCESS" ? "Exitosos" : "Fallidos"}
                        </Badge>
                      </div>

                      <div className="space-y-0.5">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Alcance
                        </p>
                        <Badge variant="outlined" className="gap-1 border-blue-500/30 text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40">
                          <Users className="h-3 w-3" />
                          {isCareerMulti ? "Carreras" : isCareerSingle ? "Carrera" : "Alumnos"}
                        </Badge>
                      </div>

                      <div className="space-y-0.5">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Contexto
                        </p>
                        <div className="text-xs font-medium text-foreground truncate">
                          {isFilteredView ? "Resultados filtrados" : "Vista histórica"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {fetchError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {fetchError}
            </div>
          ) : null}

          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${filteredKpis.length}, minmax(0, 1fr))` }}
          >
            {filteredKpis.map((item) => (
              <StatCard
                key={item.title}
                title={item.title}
                value={item.value}
                icon={item.icon}
                iconBg={item.iconBg}
                iconFg={item.iconFg}
                delay={item.delay}
              />
            ))}
          </div>

          {!shouldHideTrendChart && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  {appliedStatus === 'ALL'
                    ? 'Serie temporal de accesos'
                    : appliedStatus === 'SUCCESS'
                      ? 'Serie temporal de accesos exitosos'
                      : 'Serie temporal de accesos fallidos'}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hasExplicitDateRange ? 'Comportamiento en el rango seleccionado' : 'Comportamiento histórico filtrado'}
                </p>
              </CardHeader>
              <CardContent className="min-w-0">
                <ResponsiveContainer width="100%" height={290} minWidth={1} minHeight={290}>
                  {appliedStatus === 'ALL' ? (
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="total" name="Totales" stroke={ACCESS_CHART_COLORS.info} strokeWidth={2.4} fillOpacity={0.12} fill={ACCESS_CHART_COLORS.info} />
                      <Area type="monotone" dataKey="permitidos" name="Exitosos" stroke={ACCESS_CHART_COLORS.success} strokeWidth={2.2} fillOpacity={0.1} fill={ACCESS_CHART_COLORS.success} />
                      <Area type="monotone" dataKey="denegados" name="Fallidos" stroke={ACCESS_CHART_COLORS.destructive} strokeWidth={2.1} fillOpacity={0.08} fill={ACCESS_CHART_COLORS.destructive} />
                    </AreaChart>
                  ) : isStudentsIndividual ? (
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey={appliedStatus === 'SUCCESS' ? 'permitidos' : 'denegados'}
                        name={appliedStatus === 'SUCCESS' ? 'Exitosos' : 'Fallidos'}
                        stroke={appliedStatus === 'SUCCESS' ? ACCESS_CHART_COLORS.success : ACCESS_CHART_COLORS.destructive}
                        strokeWidth={2.3}
                        fillOpacity={0.12}
                        fill={appliedStatus === 'SUCCESS' ? ACCESS_CHART_COLORS.success : ACCESS_CHART_COLORS.destructive}
                      />
                    </AreaChart>
                  ) : (
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey={appliedStatus === 'SUCCESS' ? 'permitidos' : 'denegados'}
                        name={appliedStatus === 'SUCCESS' ? 'Exitosos' : 'Fallidos'}
                        stroke={appliedStatus === 'SUCCESS' ? ACCESS_CHART_COLORS.success : ACCESS_CHART_COLORS.destructive}
                        strokeWidth={2.4}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {(shouldShowTopStudents || shouldShowTopCareers) ? (
            appliedStatus === 'ALL' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">
                      Top {shouldShowTopCareers ? 'carreras' : 'estudiantes'} exitosos
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ordenado por accesos exitosos
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(shouldShowTopCareers ? topCareersRankingSuccessful : topStudentsRankingSuccessful).slice(0, Math.min(topVisibleCount, rankingLimit)).map((row, index) => (
                        <div key={`${row.label}-successful-${index}`} className="rounded-lg border border-border/70 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">{row.label}</p>
                            <Badge variant="outlined">{row.metric.toLocaleString()}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{row.secondary}</p>
                        </div>
                      ))}
                      {(shouldShowTopCareers ? topCareersRankingSuccessful : topStudentsRankingSuccessful).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin datos para el top actual.</p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">
                      Top {shouldShowTopCareers ? 'carreras' : 'estudiantes'} fallidos
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ordenado por accesos fallidos
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(shouldShowTopCareers ? topCareersRankingFailed : topStudentsRankingFailed).slice(0, Math.min(topVisibleCount, rankingLimit)).map((row, index) => (
                        <div key={`${row.label}-failed-${index}`} className="rounded-lg border border-border/70 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">{row.label}</p>
                            <Badge variant="outlined">{row.metric.toLocaleString()}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{row.secondary}</p>
                        </div>
                      ))}
                      {(shouldShowTopCareers ? topCareersRankingFailed : topStudentsRankingFailed).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin datos para el top actual.</p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    {shouldShowTopCareers ? 'Top carreras' : 'Top estudiantes'}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ordenado por {appliedStatus === 'SUCCESS' ? 'accesos exitosos' : 'accesos fallidos'}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {visibleRanking.map((row, index) => (
                      <div key={`${row.label}-${index}`} className="rounded-lg border border-border/70 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{row.label}</p>
                          <Badge variant="outlined">{row.metric.toLocaleString()}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{row.secondary}</p>
                      </div>
                    ))}
                    {visibleRanking.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin datos para el top actual.</p>
                    ) : null}
                    {Math.min(rankingData.length, rankingLimit) > visibleRanking.length ? (
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTopVisibleCount((prev) => Math.min(prev + 5, rankingLimit))}
                        >
                          Mostrar 5 más
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          ) : null}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Alumnos Totales" value={kpis.alumnosTotales.toLocaleString()} icon={Users} iconBg="bg-teal-500/10" iconFg="text-teal-600" delay={0} />
            <StatCard title="Accesos Totales" value={monthlyTotalsKpi.accesosPeriodo.toLocaleString()} icon={TrendingUp} iconBg="bg-info/10" iconFg="text-info" delay={0.05} />
            <StatCard title="Accesos Permitidos" value={kpis.accesosPermitidos.toLocaleString()} icon={ShieldCheck} iconBg="bg-green-500/10" iconFg="text-green-600" delay={0.1} />
            <StatCard title="Accesos Denegados" value={kpis.accesosDenegados.toLocaleString()} icon={ShieldX} iconBg="bg-red-500/10" iconFg="text-red-500" delay={0.15} />
          </div>

          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-semibold">Accesos totales de la semana</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Totales, permitidos y denegados semanalmente</p>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-success inline-block rounded-full" /> Permitidos</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-destructive/80 inline-block rounded-full" /> Negativos</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 border-t-2 border-dashed border-info inline-block" style={{ width: 14 }} /> Totales</span>
              </div>
            </CardHeader>
            <CardContent className="min-w-0">
              <ResponsiveContainer width="100%" height={250} minWidth={1} minHeight={250}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCESS_CHART_COLORS.success} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={ACCESS_CHART_COLORS.success} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCESS_CHART_COLORS.destructive} stopOpacity={0.14} />
                      <stop offset="95%" stopColor={ACCESS_CHART_COLORS.destructive} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCESS_CHART_COLORS.info} stopOpacity={0.14} />
                      <stop offset="95%" stopColor={ACCESS_CHART_COLORS.info} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="permitidos" stroke={ACCESS_CHART_COLORS.success} strokeWidth={2.5} fill="url(#gA)" dot={false} activeDot={{ r: 4, fill: ACCESS_CHART_COLORS.success }} />
                  <Area type="monotone" dataKey="denegados" stroke={ACCESS_CHART_COLORS.destructive} strokeWidth={2} fill="url(#gC)" dot={false} activeDot={{ r: 4, fill: ACCESS_CHART_COLORS.destructive }} />
                  <Area type="monotone" dataKey="total" stroke={ACCESS_CHART_COLORS.info} strokeWidth={1.5} fill="url(#gT)" strokeDasharray="5 3" dot={false} activeDot={{ r: 3, fill: ACCESS_CHART_COLORS.info }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {!isFilteredView ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Trophy className="h-4 w-4 text-warning" />
                Top Carreras
              </CardTitle>
              <p className="text-xs text-muted-foreground">Carreras con más accesos históricos</p>
            </CardHeader>
            <CardContent className="min-w-0">
              <ResponsiveContainer width="100%" height={210} minWidth={1} minHeight={210}>
                <BarChart data={historicalTopCarrerasData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                  <XAxis dataKey="carrera" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="accesos" radius={[5, 5, 0, 0]} maxBarSize={48}>
                    {historicalTopCarrerasData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.9} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Trophy className="h-4 w-4 text-warning" />
                Top Usuarios
              </CardTitle>
              <p className="text-xs text-muted-foreground">Estudiantes con mayor actividad histórica</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mt-1">
                {paginatedTopStudents.map((u, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5 font-bold tabular-nums">
                      #{(topStudentsPageSafe - 1) * TOP_TABLE_PAGE_SIZE + i + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{u.nombre[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground truncate">{u.nombre}</span>
                        <span className="text-xs text-muted-foreground tabular-nums ml-2 flex-shrink-0">{u.accesos} accesos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                            initial={{ width: 0 }}
                            animate={{ width: String(u.pct) + '%' }}
                            transition={{ delay: 0.3 + i * 0.05, duration: 0.6 }}
                          />
                        </div>
                        <Badge variant="outlined" className="text-[10px] py-0 h-4 px-1.5">{u.carrera}</Badge>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Exitosos: {u.successful} · Fallidos: {u.failed}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={topStudentsPageSafe <= 1}
                  onClick={() => setTopStudentsPage((prev) => Math.max(1, prev - 1))}
                >
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  Página {topStudentsPageSafe} de {topStudentsTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={topStudentsPageSafe >= topStudentsTotalPages}
                  onClick={() => setTopStudentsPage((prev) => Math.min(topStudentsTotalPages, prev + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </motion.div>
  )
}

export default MonitoringAndReports
