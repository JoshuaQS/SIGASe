import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  KeyRound, CheckCircle2, XCircle, AlertTriangle,
  Clock, Link2, ShieldCheck,
} from 'lucide-react'
import { SectionHeader } from '@/shared/components/ui/section-header'
import StatusCard from '@/shared/components/data-display/status-card'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { ElibroCredentialsStaticCard } from '@/features/elibro-config/components/elibro-credentials-static-card'
import { ElibroServiceStatusPanel } from '@/features/elibro-config/components/elibro-service-status-panel'
import {
  getElibroConfigs,
  getElibroActiveOverview,
  validateElibroConfig,
  validateElibroConfigControlled,
  type ElibroConfigOverviewResponse,
} from '@/features/elibro-config/api/elibro-config-api'
import { ApiClientError } from '@/shared/lib/http/api-client'
import ElibroTestCard from '@/features/elibro-config/components/elibro-test-card'
const ELIBRO_FIXED_ENDPOINT = 'https://auth.elibro.net/auth/sso/'

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
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null)
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
  const connectionStatusVariant = statusKey === 'configured' ? 'success' : statusKey === 'invalid' ? 'destructive' : 'warning'

  const aes256Value = runtimeChecklist.hasChannelSecret ? 'Habilitado' : 'Inactivo'
  const aes256Variant = runtimeChecklist.hasChannelSecret ? 'primary' : 'destructive'

  const handleConfigChanged = useCallback(async () => {
    await loadOverview()
  }, [loadOverview])

  const handleValidateConnection = useCallback(
    async (configId: string) => {
      setValidation({ status: 'loading', message: 'Probando conexión con eLibro…' })
      try {
        const result = await validateElibroConfig(configId)
        const isError = result.validationStatus === 'INVALID'
        const message = result.validationMessage || (isError ? 'La validación falló.' : 'Validación completada correctamente.')
        setValidation({
          status: isError ? 'error' : 'success',
          message,
          latency: result.latencyMs ?? undefined,
          checkedAt: result.lastValidatedAt ?? undefined,
        })
        showToast({
          severity: isError ? 'error' : 'success',
          title: isError ? 'Validación con errores' : 'Conexión validada',
          description: message,
        })
        await loadOverview()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo validar la conexión con eLibro.'
        setValidation({ status: 'error', message })
        showToast({ severity: 'error', title: 'Error validando conexión', description: message })
      }
    },
    [loadOverview, showToast],
  )

  const handleControlledValidateConnection = useCallback(
    async (payload: { testUser: string; nextUrl?: string }) => {
      if (!selectedConfigId) {
        return { ok: false, statusCode: 0, message: 'No hay configuración seleccionada.', testUser: payload.testUser, nextUrl: payload.nextUrl ?? null }
      }
      setValidation({ status: 'loading', message: 'Ejecutando prueba controlada con eLibro…' })
      try {
        const result = await validateElibroConfigControlled(selectedConfigId, payload)
        const isError = result.validationStatus === 'INVALID'
        const message = result.validationMessage || (isError ? 'La prueba controlada falló.' : 'Prueba controlada ejecutada correctamente.')
        setValidation({ status: isError ? 'error' : 'success', message, latency: result.latencyMs ?? undefined })
        if (isError) {
          showToast({ severity: 'error', title: 'Prueba controlada con errores', description: message })
        } else {
          showToast({ severity: 'success', title: 'Prueba controlada exitosa', description: result.redirectUrl ?? message })
        }
        await loadOverview()
        return { ok: !isError, statusCode: 200, message, latencyMs: result.latencyMs ?? undefined, redirectUrl: result.redirectUrl, errorCode: result.errorCode, requestId: result.requestId, correlationId: result.correlationId, testUser: result.testUser, nextUrl: result.nextUrl }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo ejecutar la prueba controlada.'
        setValidation({ status: 'error', message })
        showToast({ severity: 'error', title: 'Error en prueba controlada', description: message })
        if (error instanceof ApiClientError) {
          return { ok: false, statusCode: error.status, message, errorCode: error.errorCode, testUser: payload.testUser, nextUrl: payload.nextUrl ?? null }
        }
        return { ok: false, statusCode: 500, message, testUser: payload.testUser, nextUrl: payload.nextUrl ?? null }
      }
    },
    [selectedConfigId, loadOverview, showToast],
  )

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
          variant={overview ? 'success' : 'destructive'}
          subtitle="Estado actual backend"
          delay={0}
        />
        <StatusCard
          title="Estado de conexión"
          value={connectionStatusValue}
          icon={connectionStatusIcon}
          variant={connectionStatusVariant}
          subtitle="Validación SSO activa"
          delay={0.05}
        />
        <StatusCard
          title="Cifrado AES-256"
          value={aes256Value}
          icon={ShieldCheck}
          variant={aes256Variant}
          subtitle="Channel Secret configurado"
          delay={0.1}
        />
      </div>
      {/* ── Credenciales y canal ── */}
      <motion.div variants={fade}>
        <ElibroCredentialsStaticCard
          onConfigChanged={handleConfigChanged}
          onValidationStateChange={setValidation}
          onSelectedConfigChange={setSelectedConfigId}
          onValidateConnection={handleValidateConnection}
          isValidationLoading={validation.status === 'loading'}
          endpoint={ELIBRO_FIXED_ENDPOINT}
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
      <ElibroTestCard
        endpoint={ELIBRO_FIXED_ENDPOINT}
        validation={validation}
        canValidate={Boolean(selectedConfigId) && validation.status !== 'loading'}
        disabled={statusKey !== 'configured'}
        disabledMessage="Configura y valida eLibro (estado: Configurado) para habilitar la prueba controlada."
        onValidateConnection={selectedConfigId ? handleControlledValidateConnection : undefined}
      />
    </motion.div>
  )
}

export default ElibroSsoConfig
