import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart2, Download, RefreshCw, TrendingUp, Users, BookOpen, Clock, Sparkles, Settings2 } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { button as Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProtectedField } from '@/components/ui/forms/protected-field'
import StatCard from '@/components/ui/StatusCard'
import { SectionHeader } from '@/components/ui/section-header'
import { useAppToast } from '@/components/ui/app-toast-provider'
import { MonitoringFiltersCard } from '../components/monitoring/components/monitoring-composer/monitoring-filters-card'
import ElibroStatusPanel from '@/modules/admin/components/monitoring/ElibroStatusPanel'
import { ElibroConfigModal } from '@/modules/admin/components/monitoring/ElibroConfigModal'
import { MonitoringComposerBar } from '../components/monitoring/components/monitoring-composer/monitoring-composer-bar'

const CHART_COLORS = ['#10b981', '#059669', '#34d399', '#14b8a6', '#f59e0b', '#ef4444']

const dataByPeriod: Record<string, { label: string; accesos: number; descargas: number; consultas: number }[]> = {
  hoy: [
    { label: '00h', accesos: 12, descargas: 4, consultas: 8 },
    { label: '04h', accesos: 5, descargas: 1, consultas: 4 },
    { label: '08h', accesos: 67, descargas: 23, consultas: 44 },
    { label: '10h', accesos: 134, descargas: 45, consultas: 89 },
    { label: '12h', accesos: 189, descargas: 67, consultas: 122 },
    { label: '14h', accesos: 245, descargas: 89, consultas: 156 },
    { label: '16h', accesos: 198, descargas: 72, consultas: 126 },
    { label: '18h', accesos: 112, descargas: 38, consultas: 74 },
    { label: '20h', accesos: 56, descargas: 14, consultas: 42 },
    { label: '22h', accesos: 23, descargas: 6, consultas: 17 },
  ],
  semana: [
    { label: 'Lun', accesos: 245, descargas: 89, consultas: 156 },
    { label: 'Mar', accesos: 312, descargas: 123, consultas: 189 },
    { label: 'Mié', accesos: 289, descargas: 98, consultas: 191 },
    { label: 'Jue', accesos: 421, descargas: 167, consultas: 254 },
    { label: 'Vie', accesos: 378, descargas: 145, consultas: 233 },
    { label: 'Sáb', accesos: 156, descargas: 45, consultas: 111 },
    { label: 'Dom', accesos: 89, descargas: 23, consultas: 66 },
  ],
  mes: [
    { label: 'Sem 1', accesos: 1845, descargas: 623, consultas: 1222 },
    { label: 'Sem 2', accesos: 2312, descargas: 876, consultas: 1436 },
    { label: 'Sem 3', accesos: 1987, descargas: 712, consultas: 1275 },
    { label: 'Sem 4', accesos: 2654, descargas: 934, consultas: 1720 },
  ],
  semestre: [
    { label: 'Ago', accesos: 4234, descargas: 1423, consultas: 2811 },
    { label: 'Sep', accesos: 5678, descargas: 1987, consultas: 3691 },
    { label: 'Oct', accesos: 6123, descargas: 2145, consultas: 3978 },
    { label: 'Nov', accesos: 5489, descargas: 1876, consultas: 3613 },
    { label: 'Dic', accesos: 3987, descargas: 1234, consultas: 2753 },
  ],
}

const carreraData = [
  { carrera: 'ISC', accesos: 1245 },
  { carrera: 'IGE', accesos: 987 },
  { carrera: 'LAE', accesos: 876 },
  { carrera: 'IMA', accesos: 654 },
  { carrera: 'IBI', accesos: 543 },
  { carrera: 'ICO', accesos: 432 },
]

const topUsuarios = [
  { nombre: 'García Rodríguez L.', accesos: 89, carrera: 'ISC', pct: 100 },
  { nombre: 'Martínez López A.', accesos: 76, carrera: 'IGE', pct: 85 },
  { nombre: 'López Cruz M.', accesos: 65, carrera: 'LAE', pct: 73 },
  { nombre: 'Hernández García K.', accesos: 58, carrera: 'IMA', pct: 65 },
  { nombre: 'Rodríguez Pérez J.', accesos: 47, carrera: 'ISC', pct: 53 },
]

const kpiByPeriod: Record<string, { accesos: number; usuarios: number; nuevos: number; tiempoMedio: string; t1: number; t2: number; t3: number }> = {
  hoy: { accesos: 312, usuarios: 89, nuevos: 14, tiempoMedio: '4m 23s', t1: 8.3, t2: 4.2, t3: -2.1 },
  semana: { accesos: 1890, usuarios: 324, nuevos: 87, tiempoMedio: '5m 12s', t1: 12.4, t2: 7.1, t3: 3.5 },
  mes: { accesos: 8798, usuarios: 1234, nuevos: 312, tiempoMedio: '4m 58s', t1: 6.7, t2: 3.2, t3: -1.4 },
  semestre: { accesos: 25511, usuarios: 1876, nuevos: 954, tiempoMedio: '5m 03s', t1: 18.2, t2: 11.6, t3: 9.8 },
}

type HealthTone = 'muted' | 'warning' | 'destructive' | 'success';
type HealthState = 'Operativo' | 'Degradado' | 'Caído' | 'Pendiente';

const TONE_FILL: Record<HealthTone, string> = {
  muted: 'hsl(var(--muted))',
  warning: 'hsl(var(--warning))',
  destructive: 'hsl(var(--destructive))',
  success: 'hsl(var(--success))',
};

const STATUS_HTTP: Record<HealthState, string> = {
  Operativo: '200 OK',
  Degradado: '408 / Timeout',
  Caído: '500 / 401 / 403',
  Pendiente: 'Sin config.',
};

const TONE_CLASS: Record<HealthTone, { text: string; bg: string; border: string; dot: string }> = {
  success: {
    text: 'text-success',
    bg: 'bg-success/10',
    border: 'ring-success/20',
    dot: 'bg-success',
  },
  warning: {
    text: 'text-warning',
    bg: 'bg-warning/10',
    border: 'ring-warning/20',
    dot: 'bg-warning',
  },
  destructive: {
    text: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'ring-destructive/20',
    dot: 'bg-destructive',
  },
  muted: {
    text: 'text-muted-foreground',
    bg: 'bg-muted',
    border: 'ring-border/50',
    dot: 'bg-muted-foreground',
  },
};

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'hsl(var(--foreground))',
}

const MonitoringAndReports = () => {
  const { showToast } = useAppToast()
  const [periodo, setPeriodo] = useState('semana')
  const [carrera, setCarrera] = useState('todas')
  const [loading, setLoading] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)

  const chartData = dataByPeriod[periodo]
  const kpis = kpiByPeriod[periodo]
  const filteredCarrera = carrera === 'todas' ? carreraData : carreraData.filter(d => d.carrera === carrera)
  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); showToast({ severity: 'success', title: 'Sincronización completa', description: 'Los datos operativos se han actualizado con éxito.' }) }, 1200)
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <SectionHeader
        icon={BarChart2}
        title="Monitoreo y Reportes"
        subtitle="Analytics en tiempo real del ecosistema eLibro · UTEZ"
        actions={
          <>
            <Button variant="outline" size="md" onClick={handleRefresh} disabled={loading} className="gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button variant="outline" size="md" className="gap-2" onClick={() => showToast({ severity: 'success', title: 'Generando reporte', description: 'El reporte de monitoreo se está exportando...' })}>
              <Download className="w-3.5 h-3.5" />
              Exportar
            </Button>
          </>
        }
      />

      {/* Filtros */}
      <MonitoringFiltersCard />

      {/* KPIS elibro */}



      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Accesos Totales" value={kpis.accesos.toLocaleString()} icon={TrendingUp} iconBg="bg-emerald-500/10" iconFg="text-emerald-600" trend={kpis.t1} trendLabel="vs período ant." delay={0} />
        <StatCard title="Usuarios Activos" value={kpis.usuarios.toLocaleString()} icon={Users} iconBg="bg-teal-500/10" iconFg="text-teal-600" trend={kpis.t2} trendLabel="vs período ant." delay={0.05} />
        <StatCard title="Nuevos Usuarios" value={kpis.nuevos} icon={BookOpen} iconBg="bg-green-500/10" iconFg="text-green-600" trend={kpis.t3} trendLabel="vs período ant." delay={0.1} />
        <StatCard title="Tiempo Medio Sesión" value={kpis.tiempoMedio} subtitle="Promedio por usuario activo" icon={Clock} iconBg="bg-primary/10" iconFg="text-primary" delay={0.15} />
      </div>

      {/* Main Chart — Area */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-semibold">Accesos por Tiempo</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Volumen de actividad en el período seleccionado</p>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 inline-block rounded-full" /> Accesos</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-teal-400 inline-block rounded-full" /> Consultas</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 border-t-2 border-dashed border-green-400 inline-block" style={{ width: 14 }} /> Descargas</span>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="accesos" stroke="#10b981" strokeWidth={2.5} fill="url(#gA)" dot={false} activeDot={{ r: 4, fill: '#10b981' }} />
              <Area type="monotone" dataKey="consultas" stroke="#14b8a6" strokeWidth={2} fill="url(#gC)" dot={false} activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="descargas" stroke="#34d399" strokeWidth={1.5} fill="none" strokeDasharray="5 3" dot={false} activeDot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Uso por Carrera */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Uso por Carrera</CardTitle>
            <p className="text-xs text-muted-foreground">Accesos acumulados en el período</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={filteredCarrera} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                <XAxis dataKey="carrera" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="accesos" radius={[5, 5, 0, 0]} maxBarSize={48}>
                  {filteredCarrera.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Usuarios */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Usuarios</CardTitle>
            <p className="text-xs text-muted-foreground">Estudiantes con mayor actividad en el período</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-1">
              {topUsuarios.map((u, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5 font-bold tabular-nums">#{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{u.nombre[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate">{u.nombre}</span>
                      <span className="text-xs text-muted-foreground tabular-nums ml-2 flex-shrink-0">{u.accesos} acc.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${u.pct}%` }}
                          transition={{ delay: 0.3 + i * 0.05, duration: 0.6 }}
                        />
                      </div>
                      <Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5">{u.carrera}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
            <ElibroConfigModal
              initialConfig={null}
              onClose={() => setIsConfigOpen(false)}
            />
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default MonitoringAndReports
