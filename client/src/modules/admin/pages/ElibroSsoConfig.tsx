import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  KeyRound, CheckCircle2, XCircle, AlertTriangle,
  Clock,
  Activity, Gauge, Calendar,
} from 'lucide-react'
import { SectionHeader } from '@/components/ui/section-header'
import StatusCard from '@/components/ui/StatusCard'
import { useAppToast } from '@/components/ui/app-toast-provider'
import { ElibroCredentialsStaticCard } from '@/modules/admin/components/elibro-sso/ElibroCredentialsStaticCard'
import { ElibroGeneralStatusCard } from '@/modules/admin/components/elibro-sso/ElibroGeneralStatusCard'
import { ElibroLatencyCard } from '@/modules/admin/components/elibro-sso/ElibroLatencyCard'
import { ElibroOperationalValidationCard } from '@/modules/admin/components/elibro-sso/ElibroOperationalValidationCard'
import { ElibroRecentActivityCard } from '@/modules/admin/components/elibro-sso/ElibroRecentActivityCard'
import { ElibroValidationsWeekCard } from '@/modules/admin/components/elibro-sso/ElibroValidationsWeekCard'
import {
  getElibroConfigs,
  getElibroActiveOverview,
  type ElibroConfigOverviewResponse,
  type ElibroRecentActivityType,
} from '@/lib/api/elibro-config-api'
import { ApiClientError } from '@/lib/api/api-client'
// ─── Types ────────────────────────────────────────────────────────────────────
type ConnectionStatus = 'configured' | 'incomplete' | 'invalid' | 'pending'

interface ValidationState {
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string
  latency?: number
  checkedAt?: string
}

const EMPTY_LATENCY_HISTORY: Array<{ hora: string; ms: number }> = []
const EMPTY_VALIDATION_HISTORY: Array<{ day: string; ok: number; err: number }> = []

const statusConfig: Record<ConnectionStatus, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  configured: { label: 'Configurado', color: 'text-emerald-700 dark:text-emerald-300', icon: CheckCircle2, bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-400/30' },
  incomplete:  { label: 'Incompleto',  color: 'text-amber-700 dark:text-amber-300',   icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-400/30' },
  invalid:     { label: 'Inválido',    color: 'text-destructive dark:text-rose-300',  icon: XCircle,       bg: 'bg-destructive/5 border-destructive/20 dark:bg-destructive/10 dark:border-destructive/35' },
  pending:     { label: 'Pendiente',   color: 'text-primary dark:text-sky-300',      icon: Clock,         bg: 'bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/35' },
}

const relativeTime = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' })

function formatRelativeTime(iso?: string | null) {
  if (!iso) return 'Sin datos'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Sin datos'

  const diffMs = date.getTime() - Date.now()
  const diffMin = Math.round(diffMs / 60000)

  if (Math.abs(diffMin) < 60) {
    return relativeTime.format(diffMin, 'minute')
  }

  const diffHour = Math.round(diffMin / 60)
  if (Math.abs(diffHour) < 24) {
    return relativeTime.format(diffHour, 'hour')
  }

  const diffDay = Math.round(diffHour / 24)
  if (Math.abs(diffDay) <= 7) {
    return relativeTime.format(diffDay, 'day')
  }

  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateTime(iso?: string | null) {
  if (!iso) return 'Sin datos'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Sin datos'
  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const ElibroSsoConfig = () => {
  const [validation, setValidation] = useState<ValidationState>({ status: 'idle', message: '' })
  const [activitySearch, setActivitySearch] = useState('')
  const [activityTypeFilter, setActivityTypeFilter] = useState<'todos' | 'success' | 'warning' | 'info' | 'error'>('todos')
  const [overview, setOverview] = useState<ElibroConfigOverviewResponse | null>(null)
  const { showToast } = useAppToast()

  const loadOverview = useCallback(async (withSuccessToast = false) => {
    try {
      const configs = await getElibroConfigs()
      const hasActiveConfig = configs.some((config) => config.active)
      if (!hasActiveConfig) {
        setOverview(null)
        return
      }

      const payload = await getElibroActiveOverview()
      setOverview(payload)
      if (withSuccessToast) {
        showToast({
          severity: 'success',
          title: 'Vista actualizada',
          description: 'Los datos de eLibro se sincronizaron con el backend.',
        })
      }
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 500)) {
        setOverview(null)
        return
      }
      const message = error instanceof Error ? error.message : 'No se pudo cargar el overview de eLibro.'
      setOverview(null)
      showToast({
        severity: 'error',
        title: 'Error cargando monitoreo',
        description: message,
      })
    }
  }, [showToast])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOverview()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadOverview])

  const statusKey: ConnectionStatus = useMemo(() => {
    const rawState = overview?.status.state
    if (rawState === 'configured' || rawState === 'incomplete' || rawState === 'invalid' || rawState === 'pending') {
      return rawState
    }
    return 'pending'
  }, [overview?.status.state])

  const statusInfo = statusConfig[statusKey]
  const StatusIcon = statusInfo.icon

  const runtimeStatus = useMemo(() => ({
    provider: overview?.status.provider ?? 'Sin datos',
    lastValidationAt: overview?.status.lastValidationAt ?? null,
    lastValidationMessage: overview?.status.lastValidationMessage ?? validation.message,
    updatedAt: overview?.status.updatedAt ?? null,
    updatedByName: overview?.status.updatedByName ?? 'Sin datos',
    endpoint: overview?.config.endpoint ?? 'Sin datos',
  }), [overview, validation.message])

  const runtimeChecklist = useMemo(() => ({
    hasAuthToken: overview?.checklist.hasAuthToken ?? false,
    hasChannelId: overview?.checklist.hasChannelId ?? false,
    hasChannelSecret: overview?.checklist.hasChannelSecret ?? false,
    validEndpoint: overview?.checklist.validEndpoint ?? false,
    buildableChannel: overview?.checklist.buildableChannel ?? false,
  }), [overview])

  const runtimeKpis = useMemo(() => ({
    integrationStateLabel: overview?.kpis.integrationStateLabel ?? 'Sin datos',
    uptimeWeeklyPct: overview?.kpis.uptimeWeeklyPct ?? null,
    avgLatency24hMs: overview?.kpis.avgLatency24hMs ?? null,
    validations7dTotal: overview?.kpis.validations7dTotal ?? 0,
  }), [overview])

  const runtimeLatencyHistory = useMemo(() => {
    if (!overview?.charts.latency24h?.length) return EMPTY_LATENCY_HISTORY
    return overview.charts.latency24h.map((point) => ({
      hora: point.hour,
      ms: point.avgLatencyMs ?? 0,
    }))
  }, [overview])

  const runtimeValidationHistory = useMemo(() => {
    if (!overview?.charts.validations7d?.length) return EMPTY_VALIDATION_HISTORY
    return overview.charts.validations7d.map((point) => ({
      day: point.day,
      ok: point.ok,
      err: point.err,
    }))
  }, [overview])

  const runtimeUptime = useMemo(() => {
    const pct = overview?.charts.uptimeWeekly.pct ?? runtimeKpis.uptimeWeeklyPct
    return {
      pct,
      statusLabel: overview?.charts.uptimeWeekly.statusLabel ?? statusInfo.label,
    }
  }, [overview?.charts.uptimeWeekly, runtimeKpis.uptimeWeeklyPct, statusInfo.label])

  const uptimeChartData = useMemo(() => ([
    { name: 'Uptime', value: runtimeUptime.pct ?? 0, fill: '#10b981' },
  ]), [runtimeUptime.pct])

  const tableActivityRows = useMemo(() => {
    if (!overview?.recentActivity?.length) return []
    return overview.recentActivity.map((item) => {
      const type = (item.type as ElibroRecentActivityType)
      return {
        action: item.action,
        description: item.action,
        user: item.actorName || 'Sistema',
        time: formatRelativeTime(item.occurredAt),
        type: type === 'success' || type === 'warning' || type === 'info' || type === 'error' ? type : 'info',
        ip: 'N/D',
      }
    })
  }, [overview])

  const filteredActivity = useMemo(() => (
    tableActivityRows.filter((activity) => {
      const matchesSearch = (
        activity.user
        + activity.action
        + activity.description
        + activity.ip
      ).toLowerCase().includes(activitySearch.toLowerCase())

      const matchesType = activityTypeFilter === 'todos' || activity.type === activityTypeFilter
      return matchesSearch && matchesType
    })
  ), [tableActivityRows, activitySearch, activityTypeFilter])

  const uptimeStatusTone = useMemo(() => {
    if (statusKey === 'configured') return { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' }
    if (statusKey === 'incomplete') return { dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' }
    if (statusKey === 'invalid') return { dot: 'bg-destructive', text: 'text-destructive dark:text-rose-300' }
    return { dot: 'bg-primary', text: 'text-primary dark:text-sky-300' }
  }, [statusKey])

  const handleConfigChanged = useCallback(async () => {
    await loadOverview()
  }, [loadOverview])

  const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }


  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">

      {/* Header */}
      <motion.div variants={fade}>
      <SectionHeader
        icon={KeyRound}
        title="Configuración de eLibro"
        subtitle="Configuración de integración con eLibro"
      />
      </motion.div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Estado de integración"
          value={runtimeKpis.integrationStateLabel}
          icon={CheckCircle2}
          iconBg="bg-emerald-500/10"
          iconFg="text-emerald-600"
          subtitle="Estado actual backend"
          delay={0}
        />
        <StatusCard
          title="Uptime del servicio"
          value={runtimeKpis.uptimeWeeklyPct != null ? `${runtimeKpis.uptimeWeeklyPct.toFixed(1)}%` : 'Sin datos'}
          icon={Gauge}
          iconBg="bg-indigo-500/10"
          iconFg="text-indigo-600"
          subtitle="Sondas programadas 7 días"
          delay={0.05}
        />
        <StatusCard
          title="Latencia promedio"
          value={runtimeKpis.avgLatency24hMs != null ? `${runtimeKpis.avgLatency24hMs} ms` : 'Sin datos'}
          icon={Activity}
          iconBg="bg-violet-500/10"
          iconFg="text-violet-600"
          subtitle="Últimas 24 horas"
          delay={0.1}
        />
        <StatusCard
          title="Validaciones esta semana"
          value={runtimeKpis.validations7dTotal}
          icon={Calendar}
          iconBg="bg-cyan-500/10"
          iconFg="text-cyan-600"
          subtitle="Runs registradas"
          delay={0.15}
        />
      </div>

      {/* ── Row principal: credenciales + métricas operativas ── */}
      <div className="grid grid-cols-1 gap-4">

        {/* Credenciales y canal */}
        <motion.div variants={fade} className="space-y-3">
          <ElibroCredentialsStaticCard
            onConfigChanged={handleConfigChanged}
            onValidationStateChange={setValidation}
          />
        </motion.div>

      </div>

      {/* ── Estado general (con uptime) + validación operativa ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <motion.div variants={fade}>
          <ElibroGeneralStatusCard
            uptimeChartData={uptimeChartData}
            uptimePct={runtimeUptime.pct}
            uptimeStatusLabel={runtimeUptime.statusLabel}
            uptimeStatusTone={uptimeStatusTone}
            statusInfo={statusInfo}
            statusIcon={StatusIcon}
            runtimeStatus={runtimeStatus}
            formatRelativeTime={formatRelativeTime}
            formatDateTime={formatDateTime}
          />
        </motion.div>
        <motion.div variants={fade}>
          <ElibroOperationalValidationCard
            validation={validation}
            runtimeStatus={runtimeStatus}
            runtimeChecklist={runtimeChecklist}
          />
        </motion.div>
      </div>

      {/* ── Validaciones + latencia (mitad y mitad) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <motion.div variants={fade}>
          <ElibroValidationsWeekCard validationHistory={runtimeValidationHistory} />
        </motion.div>
        <motion.div variants={fade}>
          <ElibroLatencyCard latencyHistory={runtimeLatencyHistory} />
        </motion.div>
      </div>

      {/* ── Actividad reciente (data table) ── */}
      <motion.div variants={fade}>
        <ElibroRecentActivityCard
          filteredActivity={filteredActivity}
          totalRows={tableActivityRows.length}
          activitySearch={activitySearch}
          activityTypeFilter={activityTypeFilter}
          onSearchChange={setActivitySearch}
          onFilterChange={setActivityTypeFilter}
        />
        </motion.div>
    </motion.div>
  )
}

export default ElibroSsoConfig
