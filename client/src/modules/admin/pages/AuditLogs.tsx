import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Search, Download, RefreshCw, AlertTriangle,
  Info, AlertCircle, Filter, Activity, Layers, Eye,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { button as Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionHeader } from '@/components/ui/section-header'
import { useAppToast } from '@/components/ui/app-toast-provider'
import StatusCard from '@/components/ui/StatusCard'
type Severity = 'info' | 'warning' | 'critical'
type AuditLog = {
  id: string; timestamp: string; admin: string; accion: string;
  modulo: string; descripcion: string; severity: Severity; ip: string;
}

const auditLogs: AuditLog[] = [
  { id: '1', timestamp: '14:32:15', admin: 'Dr. Ramírez J.', accion: 'UPDATE', modulo: 'Configuración', descripcion: 'Actualizó credenciales de API eLibro (Client Secret rotado)', severity: 'warning', ip: '192.168.1.10' },
  { id: '2', timestamp: '14:15:02', admin: 'Lic. Torres A.', accion: 'EXPORT', modulo: 'Estudiantes', descripcion: 'Exportó reporte completo de 1,065 estudiantes en formato XLSX', severity: 'info', ip: '192.168.1.25' },
  { id: '3', timestamp: '13:58:44', admin: 'Ing. López P.', accion: 'SUSPEND', modulo: 'Estudiantes', descripcion: 'Suspendió cuenta del estudiante ID #4521 por uso indebido', severity: 'critical', ip: '10.0.0.5' },
  { id: '4', timestamp: '13:30:11', admin: 'Mtra. García M.', accion: 'CREATE', modulo: 'Académico', descripcion: 'Creó nuevo período académico: Enero-Junio 2025', severity: 'info', ip: '192.168.1.30' },
  { id: '5', timestamp: '13:15:33', admin: 'Dr. Ramírez J.', accion: 'DELETE', modulo: 'Logs', descripcion: 'Eliminó logs de auditoría con antigüedad mayor a 90 días', severity: 'warning', ip: '192.168.1.10' },
  { id: '6', timestamp: '12:45:22', admin: 'Ing. López P.', accion: 'GRANT', modulo: 'Permisos', descripcion: 'Otorgó permisos de administrador a cuenta smtnez@utez.edu.mx', severity: 'critical', ip: '10.0.0.5' },
  { id: '7', timestamp: '12:20:08', admin: 'Lic. Torres A.', accion: 'UPDATE', modulo: 'Estudiantes', descripcion: 'Actualizó datos de 45 estudiantes de forma masiva (importación)', severity: 'warning', ip: '192.168.1.25' },
  { id: '8', timestamp: '11:55:19', admin: 'Mtra. García M.', accion: 'VIEW', modulo: 'Reportes', descripcion: 'Consultó reporte de actividad de administradores del mes', severity: 'info', ip: '192.168.1.30' },
  { id: '9', timestamp: '11:30:44', admin: 'Dr. Ramírez J.', accion: 'CONFIG', modulo: 'Sistema', descripcion: 'Modificó parámetros de conexión: timeout aumentado a 60s', severity: 'warning', ip: '192.168.1.10' },
  { id: '10', timestamp: '11:10:02', admin: 'Lic. Torres A.', accion: 'REVOKE', modulo: 'Permisos', descripcion: 'Revocó acceso de cuenta inactiva lhernandez@utez.edu.mx', severity: 'info', ip: '192.168.1.25' },
  { id: '11', timestamp: '10:45:33', admin: 'Ing. López P.', accion: 'CREATE', modulo: 'Admins', descripcion: 'Creó nueva cuenta de administrador para área de Biblioteca', severity: 'info', ip: '10.0.0.5' },
  { id: '12', timestamp: '10:20:15', admin: 'Mtra. García M.', accion: 'EXPORT', modulo: 'Logs', descripcion: 'Exportó logs de acceso del mes de noviembre (2,840 registros)', severity: 'info', ip: '192.168.1.30' },
]

const actividadPorModulo = [
  { modulo: 'Estudiantes', acciones: 34 },
  { modulo: 'Config.', acciones: 28 },
  { modulo: 'Permisos', acciones: 19 },
  { modulo: 'Logs', acciones: 15 },
  { modulo: 'Académico', acciones: 12 },
  { modulo: 'Sistema', acciones: 9 },
]

const CHART_COLORS_MOD = ['#6366f1', '#8b5cf6', '#ef4444', '#f59e0b', '#06b6d4', '#10b981']

const sevStyles: Record<Severity, { badge: string; bar: string; label: string; icon: React.ElementType }> = {
  info: { badge: 'text-blue-600 border-blue-200 bg-blue-50', bar: 'bg-blue-500', label: 'INFO', icon: Info },
  warning: { badge: 'text-amber-600 border-amber-200 bg-amber-50', bar: 'bg-amber-500', label: 'WARN', icon: AlertTriangle },
  critical: { badge: 'text-red-600 border-red-200 bg-red-50', bar: 'bg-red-500', label: 'CRÍTICO', icon: AlertCircle },
}

const accionColors: Record<string, string> = {
  CREATE: '#10b981', UPDATE: '#f59e0b', DELETE: '#ef4444',
  EXPORT: '#6366f1', SUSPEND: '#ef4444', GRANT: '#ef4444',
  REVOKE: '#f59e0b', CONFIG: '#f59e0b', VIEW: '#64748b',
}

const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }
const PAGE_SIZE = 8

const AuditLogs = () => {
  const { showToast } = useAppToast()
  const [search, setSearch] = useState('')
  const [sevF, setSevF] = useState('todos')
  const [modF, setModF] = useState('todos')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)

  const filtered = useMemo(() => auditLogs.filter(l => {
    const s = (l.admin + l.descripcion + l.accion).toLowerCase().includes(search.toLowerCase())
    const sv = sevF === 'todos' || l.severity === sevF
    const md = modF === 'todos' || l.modulo === modF
    return s && sv && md
  }), [search, sevF, modF])

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const criticals = auditLogs.filter(l => l.severity === 'critical').length
  const warnings = auditLogs.filter(l => l.severity === 'warning').length

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <SectionHeader
        icon={Shield}
        title="Logs de Auditoría"
        subtitle="Trazabilidad completa de acciones administrativas en el sistema"
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setLoading(true)
                setTimeout(() => {
                  setLoading(false)
                  showToast({
                    severity: 'success',
                    title: 'Actualizado',
                    description: 'Los logs de auditoría se actualizaron correctamente.',
                  })
                }, 1000)
              }}
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
              onClick={() =>
                showToast({
                  severity: 'info',
                  title: 'Exportando auditoría',
                  description: 'Se está generando el archivo de auditoría.',
                })
              }
            >
              <Download className="w-3.5 h-3.5" /> Exportar
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard title="Total Acciones" value={auditLogs.length} icon={Activity} iconBg="bg-indigo-500/10" iconFg="text-indigo-600" trend={22.4} trendLabel="vs ayer" delay={0} />
        <StatusCard title="Eventos Críticos" value={criticals} subtitle="Requieren revisión" icon={AlertCircle} iconBg="bg-red-500/10" iconFg="text-red-500" delay={0.05} />
        <StatusCard title="Advertencias" value={warnings} icon={AlertTriangle} iconBg="bg-amber-500/10" iconFg="text-amber-600" delay={0.1} />
        <StatusCard title="Módulos Afectados" value="6" subtitle="Con actividad hoy" icon={Layers} iconBg="bg-violet-500/10" iconFg="text-violet-600" delay={0.15} />
      </div>

      {/* Timeline + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity by Module */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Actividad por Módulo</CardTitle>
            <p className="text-xs text-muted-foreground">Acciones administrativas por área del sistema</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={actividadPorModulo} layout="vertical" margin={{ top: 0, right: 8, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="modulo" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} width={65} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="acciones" radius={[0, 5, 5, 0]} maxBarSize={18}>
                  {actividadPorModulo.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS_MOD[i % CHART_COLORS_MOD.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Forensic Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Línea de Tiempo — Eventos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {auditLogs.slice(0, 5).map((log, i) => {
              const s = sevStyles[log.severity]
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.06 }}
                  className="flex items-start gap-3 px-5 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col items-center gap-1 mt-1 flex-shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${s.bar}`} />
                    {i < 4 && <div className="w-px h-6 bg-border" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-mono text-muted-foreground">{log.timestamp}</span>
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded" style={{ color: accionColors[log.accion] }}>{log.accion}</span>
                      <span className="text-[10px] text-muted-foreground">· {log.admin}</span>
                    </div>
                    <p className="text-xs text-foreground leading-tight truncate">{log.descripcion}</p>
                  </div>
                  <Badge variant="outlined" className={`text-[10px] flex-shrink-0 h-5 px-1.5 ${s.badge}`}>{s.label}</Badge>
                </motion.div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Audit Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Admin, acción o descripción..." className="pl-9 h-8 text-sm" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
            </div>
            <Select value={sevF} onValueChange={v => { setSevF(v); setPage(0) }}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Severidad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="info">Informativo</SelectItem>
                <SelectItem value="warning">Advertencia</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
              </SelectContent>
            </Select>
            <Select value={modF} onValueChange={v => { setModF(v); setPage(0) }}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Módulo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {['Configuración', 'Estudiantes', 'Permisos', 'Logs', 'Académico', 'Sistema', 'Admins', 'Reportes'].map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="ml-auto text-xs">{filtered.length} eventos</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/40">
                  {['Hora', 'Admin', 'Acción', 'Módulo', 'Descripción', 'IP', 'Severidad'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map(log => {
                  const s = sevStyles[log.severity]
                  return (
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{log.timestamp}</td>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap text-sm">{log.admin}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-muted" style={{ color: accionColors[log.accion] || '#64748b' }}>
                          {log.accion}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outlined" className="text-xs">{log.modulo}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[300px] truncate">{log.descripcion}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{log.ip}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outlined" className={`text-[10px] gap-1 ${s.badge}`}>
                          <s.icon className="w-3 h-3" />
                          {s.label}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
export default AuditLogs;