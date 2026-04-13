import { motion } from 'framer-motion'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

import type { AdminDashboardMetrics } from '@/features/admins/api/admins-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'

const RADAR_COLORS: Record<string, string> = {
  ADMIN_TI: '#0d9488',
  ADMIN_BIBLIOTECA: '#8b5cf6',
}

const SEVERITY_DOT: Record<string, string> = {
  INFO: 'bg-primary',
  NOTICE: 'bg-blue-400',
  WARNING: 'bg-amber-500',
  SECURITY: 'bg-red-500',
  CRITICAL: 'bg-red-700',
}

const ACTION_DOT: Record<'UPDATE' | 'DEACTIVATE' | 'DELETE' | 'REACTIVATE', string> = {
  UPDATE: 'bg-blue-500',
  DEACTIVATE: 'bg-amber-500',
  DELETE: 'bg-red-500',
  REACTIVATE: 'bg-emerald-500',
}

type RadarModuleKey = 'DASHBOARD' | 'REPORTS' | 'ELIBRO_CONFIG' | 'STUDENTS' | 'LOGS'

const RADAR_MODULES: Array<{ key: RadarModuleKey; label: string }> = [
  { key: 'DASHBOARD', label: 'Gestión' },
  { key: 'REPORTS', label: 'Reportes' },
  { key: 'ELIBRO_CONFIG', label: 'Config.' },
  { key: 'STUDENTS', label: 'Estudiantes' },
  { key: 'LOGS', label: 'Logs' },
]

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
} satisfies React.CSSProperties

function formatRelativeAccess(iso?: string | null) {
  if (!iso) return 'Sin acceso'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Sin acceso'
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `hace ${Math.max(diffMin, 1)} min`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `hace ${diffHours}h`
  return `hace ${Math.floor(diffHours / 24)}d`
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin fecha'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'
  return parsed.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

function resolveModuleKey(activity: AdminDashboardMetrics['recentActivity'][number]): RadarModuleKey {
  const moduleRaw = (activity.module ?? '').trim().toUpperCase()
  if (moduleRaw.includes('REPORT')) return 'REPORTS'
  if (moduleRaw.includes('DASH')) return 'DASHBOARD'
  if (moduleRaw.includes('STUDENT')) return 'STUDENTS'
  if (moduleRaw.includes('ELIBRO')) return 'ELIBRO_CONFIG'
  if (moduleRaw.includes('LOG') || moduleRaw.includes('AUDIT') || moduleRaw.includes('ACCESS')) return 'LOGS'

  const action = activity.action.trim().toUpperCase()
  if (action.startsWith('STUDENT_')) return 'STUDENTS'
  if (action.startsWith('ELIBRO_') || action.startsWith('ELIBRO_CONFIG_')) return 'ELIBRO_CONFIG'
  if (action.startsWith('REPORT_')) return 'REPORTS'
  if (action.startsWith('AUDIT_') || action.startsWith('ACCESS_LOG_')) return 'LOGS'

  return 'DASHBOARD'
}

function buildRadarDataFromLogs(activity: AdminDashboardMetrics['recentActivity']) {
  const roles = Object.keys(RADAR_COLORS)

  const countsByModule: Record<RadarModuleKey, Record<string, number>> = {
    DASHBOARD: {},
    REPORTS: {},
    ELIBRO_CONFIG: {},
    STUDENTS: {},
    LOGS: {},
  }

  for (const item of activity) {
    const roleKey = item.role ?? 'UNKNOWN'
    if (!roles.includes(roleKey)) continue
    const moduleKey = resolveModuleKey(item)
    countsByModule[moduleKey][roleKey] = (countsByModule[moduleKey][roleKey] ?? 0) + 1
  }

  const maxByRole: Record<string, number> = Object.fromEntries(
    roles.map((role) => {
      const max = Math.max(
        0,
        ...RADAR_MODULES.map((m) => countsByModule[m.key][role] ?? 0),
      )
      return [role, max]
    }),
  )

  return RADAR_MODULES.map((m) => {
    const row: Record<string, number | string> = { area: m.label }
    for (const role of roles) {
      const raw = countsByModule[m.key][role] ?? 0
      const denom = maxByRole[role] || 0
      row[role] = denom > 0 ? Math.round((raw / denom) * 100) : 0
    }
    return row
  })
}

function prettifyAction(raw: string) {
  const normalized = raw.trim().replaceAll('_', ' ')
  return normalized.length > 42 ? `${normalized.slice(0, 42)}…` : normalized
}

/** Frase corta en español (él/ella); el código exacto sigue en el badge. */
function describeAuditActionEs(raw: string): string {
  const key = raw.trim().toUpperCase()
  const map: Record<string, string> = {
    ADMIN_CREATE: 'Registró un administrador',
    ADMIN_UPDATE: 'Actualizó un administrador',
    ADMIN_ACTIVATE: 'Activó un administrador',
    ADMIN_DEACTIVATE: 'Desactivó un administrador',
    ADMIN_RESET_PASSWORD: 'Restableció la contraseña',
    ADMIN_DELETE: 'Eliminó un administrador',
    STUDENT_CREATE: 'Registró un estudiante',
    STUDENT_UPDATE: 'Actualizó un estudiante',
    STUDENT_DEACTIVATE: 'Desactivó un estudiante',
    STUDENT_REACTIVATE: 'Reactivó un estudiante',
    STUDENT_DELETE: 'Eliminó un estudiante',
    STUDENT_IMPORT: 'Importó estudiantes',
    ELIBRO_CONFIG_CREATE: 'Registró la configuración de eLibro',
    ELIBRO_CONFIG_UPDATE: 'Actualizó la configuración de eLibro',
    ELIBRO_CONFIG_ACTIVATE: 'Activó la configuración de eLibro',
    ELIBRO_CONFIG_DEACTIVATE: 'Desactivó la configuración de eLibro',
    ELIBRO_CONFIG_DELETE: 'Eliminó la configuración de eLibro',
    ELIBRO_CONFIG_VALIDATE_CONTROLLED: 'Validó la conexión con eLibro',
    REPORT_EXPORT: 'Exportó un reporte',
    PASSWORD_RESET_REQUEST: 'Solicitó recuperación de contraseña',
    PASSWORD_RESET_CONFIRM: 'Confirmó una nueva contraseña',
  }
  if (map[key]) return map[key]
  if (!key) return 'Acción registrada'
  return key
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function resolveDotClass(action: string, severity?: string | null) {
  const a = action.trim().toUpperCase()
  if (a.includes('DELETE')) return ACTION_DOT.DELETE
  if (a.includes('DEACTIVATE')) return ACTION_DOT.DEACTIVATE
  if (a.includes('REACTIVATE')) return ACTION_DOT.REACTIVATE
  if (a.includes('UPDATE')) return ACTION_DOT.UPDATE
  return SEVERITY_DOT[severity ?? ''] ?? 'bg-muted-foreground'
}

type AdminGraphsProps = {
  metrics: AdminDashboardMetrics | null
}

const AdminGraphs = ({ metrics }: AdminGraphsProps) => {
  const activity = metrics?.recentActivity ?? []
  const radarData = activity.length > 0 ? buildRadarDataFromLogs(activity) : []
  const recentFive = activity.slice(0, 5)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:items-stretch">
      <Card className="flex h-full flex-col">
        <CardHeader className="pb-0 pt-5 px-5">
          <CardTitle className="text-sm font-semibold">Actividad por Rol y Módulo</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">Nivel de uso de cada módulo por tipo de rol · basado en acciones recientes</p>
        </CardHeader>
        <CardContent className="flex-1 px-5 pb-5 pt-4">
          {radarData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              Sin datos de actividad disponibles.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="78%">
                  <PolarGrid stroke="rgba(128,128,128,0.2)" />
                  <PolarAngleAxis dataKey="area" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} axisLine={false} tick={false} domain={[0, 100]} />
                  {Object.keys(RADAR_COLORS).map((role) => (
                    <Radar
                      key={role}
                      name={role === 'ADMIN_TI' ? 'Admin TI' : 'Admin Biblioteca'}
                      dataKey={role}
                      stroke={RADAR_COLORS[role]}
                      fill={RADAR_COLORS[role]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-3">
                {Object.entries(RADAR_COLORS).map(([role, color]) => (
                  <div key={role} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: color }} />
                    {role === 'ADMIN_TI' ? 'Admin TI' : 'Admin Biblioteca'}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="flex h-full flex-col">
        <CardHeader className="pb-2 shrink-0">
          <CardTitle className="text-sm font-semibold">Actividad Reciente</CardTitle>
          <p className="text-xs text-muted-foreground">Últimas acciones de administradores</p>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col min-h-0 p-0">
          <div className="flex flex-1 flex-col min-h-0 overflow-y-auto overscroll-contain">
            {recentFive.length === 0 ? (
              <div className="grid flex-1 min-h-[200px] place-items-center px-5 text-sm text-muted-foreground">
                Sin actividad reciente registrada.
              </div>
            ) : recentFive.map((a, i) => (
              <motion.div
                key={`${a.adminId ?? 'system'}-${a.occurredAt}-${i}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 + i * 0.035 }}
                className="flex items-stretch gap-3 px-5 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <div className="flex flex-col items-center flex-shrink-0 w-3 pt-1">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${resolveDotClass(a.action, a.severity)}`} />
                  {i < recentFive.length - 1 ? (
                    <div className="mt-1 w-px flex-1 min-h-[1.25rem] bg-border" aria-hidden />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {formatDateTime(a.occurredAt)}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {prettifyAction(a.action)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      · {a.adminName ?? 'Sistema'} · {a.module ?? 'SYSTEM'}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">
                    {describeAuditActionEs(a.action)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminGraphs