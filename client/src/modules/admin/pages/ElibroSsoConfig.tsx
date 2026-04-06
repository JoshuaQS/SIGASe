import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  KeyRound, CheckCircle2, XCircle, AlertTriangle,
  Clock, Link2, ShieldCheck,
} from 'lucide-react'
import { SectionHeader } from '@/components/ui/section-header'
import StatusCard from '@/components/ui/StatusCard'
import { useAppToast } from '@/components/ui/app-toast-provider'
import { ElibroCredentialsStaticCard } from '@/modules/admin/components/elibro-sso/ElibroCredentialsStaticCard'
import { ElibroServiceStatusPanel } from '@/modules/admin/components/elibro-sso/ElibroServiceStatusPanel'
import {
  getElibroConfigs,
  getElibroActiveOverview,
  type ElibroConfigOverviewResponse,
} from '@/lib/api/elibro-config-api'
import { ApiClientError } from '@/lib/api/api-client'
import ElibroTestCard from '../components/elibro-sso/ElibroTestCard'
// ─── Types ────────────────────────────────────────────────────────────────────
type ConnectionStatus = 'configured' | 'incomplete' | 'invalid' | 'pending'

interface ValidationState {
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string
  latency?: number
  checkedAt?: string
}

const statusConfig: Record<ConnectionStatus, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  configured: { label: 'Configurado', color: 'text-emerald-700 dark:text-emerald-300', icon: CheckCircle2, bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-400/30' },
  incomplete: { label: 'Incompleto', color: 'text-amber-700 dark:text-amber-300', icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-400/30' },
  invalid: { label: 'Inválido', color: 'text-destructive dark:text-rose-300', icon: XCircle, bg: 'bg-destructive/5 border-destructive/20 dark:bg-destructive/10 dark:border-destructive/35' },
  pending: { label: 'Pendiente', color: 'text-primary dark:text-sky-300', icon: Clock, bg: 'bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/35' },
}

const relativeTime = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' })

function formatRelativeTime(iso?: string | null) {
  if (!iso) return 'Sin datos'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Sin datos'

  const diffMs = date.getTime() - Date.now()
  const diffMin = Math.round(diffMs / 60000)

  if (Math.abs(diffMin) < 60) return relativeTime.format(diffMin, 'minute')

  const diffHour = Math.round(diffMin / 60)
  if (Math.abs(diffHour) < 24) return relativeTime.format(diffHour, 'hour')

  const diffDay = Math.round(diffHour / 24)
  if (Math.abs(diffDay) <= 7) return relativeTime.format(diffDay, 'day')

  return date.toLocaleString('es-MX', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateTime(iso?: string | null) {
  if (!iso) return 'Sin datos'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Sin datos'
  return date.toLocaleString('es-MX', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const ElibroSsoConfig = () => {
  const [validation, setValidation] = useState<ValidationState>({ status: 'idle', message: '' })
  const [overview, setOverview] = useState<ElibroConfigOverviewResponse | null>(null)
  const { showToast } = useAppToast()

  const loadOverview = useCallback(async (withSuccessToast = false) => {
    try {
      const configs = await getElibroConfigs()
      const hasActiveConfig = configs.some((config) => config.status === 'ACTIVE')
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
    const timeoutId = window.setTimeout(() => { void loadOverview() }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadOverview])

  const statusKey: ConnectionStatus = useMemo(() => {
    const rawState = overview?.status.state
    if (rawState === 'configured' || rawState === 'incomplete' || rawState === 'invalid' || rawState === 'pending') {
      return rawState
    }
    return 'pending'
  }, [overview?.status.state])

  const runtimeStatus = useMemo(() => ({
    provider: overview?.status.provider ?? 'Sin datos',
    lastValidationAt: overview?.status.lastValidationAt ?? null,
    updatedAt: overview?.status.updatedAt ?? null,
    updatedByName: overview?.status.updatedByName ?? 'Sin datos',
    nextUrl: overview?.config.nextUrl ?? 'Sin datos',
  }), [overview])

  const runtimeChecklist = useMemo(() => ({
    hasAuthToken: overview?.checklist.hasAuthToken ?? false,
    hasChannelId: overview?.checklist.hasChannelId ?? false,
    hasChannelSecret: overview?.checklist.hasChannelSecret ?? false,
    validEndpoint: overview?.checklist.validEndpoint ?? false,
    buildableChannel: overview?.checklist.buildableChannel ?? false,
  }), [overview])

  const integrationStateLabel = overview?.kpis.integrationStateLabel ?? 'Sin datos'

  // ── KPI derivations ──────────────────────────────────────────────────────
  const connectionStatusValue = statusKey === 'configured' ? 'Activa' : statusKey === 'invalid' ? 'Error' : 'Inactiva'
  const connectionStatusIcon = statusKey === 'configured' ? Link2 : statusKey === 'invalid' ? XCircle : AlertTriangle
  const connectionStatusIconBg = statusKey === 'configured' ? 'bg-emerald-500/10' : statusKey === 'invalid' ? 'bg-destructive/10' : 'bg-amber-500/10'
  const connectionStatusIconFg = statusKey === 'configured' ? 'text-emerald-600' : statusKey === 'invalid' ? 'text-destructive' : 'text-amber-600'

  const aes256Value = runtimeChecklist.hasChannelSecret ? 'Habilitado' : 'Inactivo'
  const aes256IconBg = runtimeChecklist.hasChannelSecret ? 'bg-indigo-500/10' : 'bg-muted'
  const aes256IconFg = runtimeChecklist.hasChannelSecret ? 'text-indigo-600' : 'text-muted-foreground'

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatusCard
          title="Estado de integración"
          value={integrationStateLabel}
          icon={CheckCircle2}
          iconBg="bg-emerald-500/10"
          iconFg="text-emerald-600"
          subtitle="Estado actual backend"
          delay={0}
        />
        <StatusCard
          title="Estado de conexión"
          value={connectionStatusValue}
          icon={connectionStatusIcon}
          iconBg={connectionStatusIconBg}
          iconFg={connectionStatusIconFg}
          subtitle="Validación SSO activa"
          delay={0.05}
        />
        <StatusCard
          title="Cifrado AES-256"
          value={aes256Value}
          icon={ShieldCheck}
          iconBg={aes256IconBg}
          iconFg={aes256IconFg}
          subtitle="Channel Secret configurado"
          delay={0.1}
        />
      </div>
      {/* ── Credenciales y canal ── */}
      <motion.div variants={fade}>
        <ElibroCredentialsStaticCard
          onConfigChanged={handleConfigChanged}
          onValidationStateChange={setValidation}
        />
      </motion.div>

      {/* ── Estado del servicio ── */}
      <motion.div variants={fade}>
        <ElibroServiceStatusPanel
          statusKey={statusKey}
          integrationStateLabel={integrationStateLabel}
          runtimeStatus={runtimeStatus}
          runtimeChecklist={runtimeChecklist}
          formatRelativeTime={formatRelativeTime}
          formatDateTime={formatDateTime}
        />
      </motion.div>
      <ElibroTestCard />
    </motion.div>
  )
}

export default ElibroSsoConfig
