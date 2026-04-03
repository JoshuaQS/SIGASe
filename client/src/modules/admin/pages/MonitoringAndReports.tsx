import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart2, RefreshCw, TrendingUp, Users, ShieldCheck, ShieldX, Trophy } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { button as Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import StatCard from '@/components/ui/StatusCard'
import { SectionHeader } from '@/components/ui/section-header'
import { useAppToast } from '@/components/ui/app-toast-provider'
import { MonitoringFiltersCard } from '../components/monitoring/components/monitoring-composer/monitoring-filters-card'

const CHART_COLORS = ['#10b981', '#0DA2E7', '#34d399', '#14b8a6', '#f59e0b', '#ef4444']
const KPI_TOTALS_PERIOD = 'mes' as const
const TOP_USERS_PERIOD = 'semana' as const

const ACCESS_CHART_COLORS = {
  success: 'hsl(var(--success))',
  destructive: 'hsl(var(--destructive))',
  info: 'hsl(var(--info))',
}

const dataByPeriod: Record<string, { label: string; total: number; permitidos: number; denegados: number }[]> = {
  hoy: [
    { label: '00h', total: 12, permitidos: 10, denegados: 2 },
    { label: '04h', total: 5, permitidos: 4, denegados: 1 },
    { label: '08h', total: 67, permitidos: 59, denegados: 8 },
    { label: '10h', total: 134, permitidos: 118, denegados: 16 },
    { label: '12h', total: 189, permitidos: 167, denegados: 22 },
    { label: '14h', total: 245, permitidos: 218, denegados: 27 },
    { label: '16h', total: 198, permitidos: 176, denegados: 22 },
    { label: '18h', total: 112, permitidos: 99, denegados: 13 },
    { label: '20h', total: 56, permitidos: 49, denegados: 7 },
    { label: '22h', total: 23, permitidos: 20, denegados: 3 },
  ],
  semana: [
    { label: 'Lun', total: 245, permitidos: 156, denegados: 89 },
    { label: 'Mar', total: 312, permitidos: 189, denegados: 123 },
    { label: 'Mié', total: 289, permitidos: 191, denegados: 98 },
    { label: 'Jue', total: 421, permitidos: 254, denegados: 167 },
    { label: 'Vie', total: 378, permitidos: 239, denegados: 145 },
    { label: 'Sáb', total: 156, permitidos: 111, denegados: 45 },
    { label: 'Dom', total: 89, permitidos: 66, denegados: 23 },
  ],
  mes: [
    { label: 'Sem 1', total: 1845, permitidos: 1658, denegados: 187 },
    { label: 'Sem 2', total: 2312, permitidos: 2079, denegados: 233 },
    { label: 'Sem 3', total: 1987, permitidos: 1788, denegados: 199 },
    { label: 'Sem 4', total: 2654, permitidos: 2381, denegados: 273 },
  ],
  semestre: [
    { label: 'Ago', total: 4234, permitidos: 3811, denegados: 423 },
    { label: 'Sep', total: 5678, permitidos: 5112, denegados: 566 },
    { label: 'Oct', total: 6123, permitidos: 5520, denegados: 603 },
    { label: 'Nov', total: 5489, permitidos: 4940, denegados: 549 },
    { label: 'Dic', total: 3987, permitidos: 3610, denegados: 377 },
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

const topUsuariosByPeriod: Record<string, { nombre: string; accesos: number; carrera: string; pct: number }[]> = {
  semana: [
  { nombre: 'Luna García Rodríguez ', accesos: 89, carrera: 'IDyGS', pct: 100 },
  { nombre: 'Angel Martínez López ', accesos: 76, carrera: 'ICO', pct: 85 },
  { nombre: 'Maria López Cruz ', accesos: 65, carrera: 'LAE', pct: 73 },
  { nombre: 'Karen Hernández García ', accesos: 58, carrera: 'IMA', pct: 65 },
  { nombre: 'Josue Rodríguez Pérez', accesos: 47, carrera: 'ISC', pct: 53 },
  ],
}

const kpiByPeriod: Record<string, { alumnosTotales: number; accesosPeriodo: number; accesosPermitidos: number; accesosDenegados: number; t1: number; t2: number; t3: number; t4: number }> = {
  hoy: { alumnosTotales: 1248, accesosPeriodo: 1041, accesosPermitidos: 922, accesosDenegados: 119, t1: 1.8, t2: 8.3, t3: 6.1, t4: -3.4 },
  semana: { alumnosTotales: 1248, accesosPeriodo: 421, accesosPermitidos: 254, accesosDenegados: 167, t1: 2.1, t2: 12.4, t3: 10.2, t4: -4.6 },
  mes: { alumnosTotales: 1256, accesosPeriodo: 8798, accesosPermitidos: 7906, accesosDenegados: 892, t1: 3.4, t2: 6.7, t3: 5.2, t4: -2.3 },
  semestre: { alumnosTotales: 1294, accesosPeriodo: 25511, accesosPermitidos: 22993, accesosDenegados: 2518, t1: 4.8, t2: 18.2, t3: 15.9, t4: -6.1 },
}

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'hsl(var(--foreground))',
}

const MonitoringAndReports = () => {
  const { showToast } = useAppToast()
  const periodo = 'semana'
  const [loading, setLoading] = useState(false)

  const chartData = dataByPeriod[periodo]
  const kpis = kpiByPeriod[periodo]
  const monthlyTotalsKpi = kpiByPeriod[KPI_TOTALS_PERIOD]
  const topUsuarios = topUsuariosByPeriod[TOP_USERS_PERIOD] ?? []
  const topCarrerasData = [...carreraData].sort((a, b) => b.accesos - a.accesos).slice(0, 5)
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
          <Button variant="outline" size="md" onClick={handleRefresh} disabled={loading} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        }
      />

      {/* Filtros */}
      <MonitoringFiltersCard
        onExport={() =>
          showToast({
            severity: 'success',
            title: 'Generando reporte',
            description: 'El reporte de monitoreo se está exportando...',
          })
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Alumnos Totales" value={kpis.alumnosTotales.toLocaleString()} icon={Users} iconBg="bg-teal-500/10" iconFg="text-teal-600" trend={kpis.t1} trendLabel="vs período ant." delay={0} />
        <StatCard title="Accesos Totales" value={monthlyTotalsKpi.accesosPeriodo.toLocaleString()} icon={TrendingUp} iconBg="bg-info/10" iconFg="text-info" trend={monthlyTotalsKpi.t2} trendLabel="vs período ant." delay={0.05} />
        <StatCard title="Accesos Permitidos" value={kpis.accesosPermitidos.toLocaleString()} icon={ShieldCheck} iconBg="bg-green-500/10" iconFg="text-green-600" trend={kpis.t3} trendLabel="vs período ant." delay={0.1} />
        <StatCard title="Accesos Denegados" value={kpis.accesosDenegados.toLocaleString()} icon={ShieldX} iconBg="bg-red-500/10" iconFg="text-red-500" trend={kpis.t4} trendLabel="vs período ant." delay={0.15} />
      </div>

      {/* Main Chart — Area */}
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

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Uso por Carrera */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-warning" />
              Top Carreras
            </CardTitle>
            <p className="text-xs text-muted-foreground">Carreras con más accesos mensualmente</p>
          </CardHeader>
          <CardContent className="min-w-0">
            <ResponsiveContainer width="100%" height={210} minWidth={1} minHeight={210}>
              <BarChart data={topCarrerasData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                <XAxis dataKey="carrera" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="accesos" radius={[5, 5, 0, 0]} maxBarSize={48}>
                  {topCarrerasData.map((_, i) => (
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
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-warning" />
              Top Usuarios
            </CardTitle>
            <p className="text-xs text-muted-foreground">Estudiantes con mayor actividad mensualmente</p>
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
                      <span className="text-xs text-muted-foreground tabular-nums ml-2 flex-shrink-0">{u.accesos} accesos</span>
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
                      <Badge variant="outlined" className="text-[10px] py-0 h-4 px-1.5">{u.carrera}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}

export default MonitoringAndReports
