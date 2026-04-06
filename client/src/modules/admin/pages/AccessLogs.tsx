import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FileText, Search, Download, RefreshCw, CheckCircle, XCircle, AlertTriangle, Globe, Filter } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import StatusCard from '@/components/ui/StatusCard'
import { SectionHeader } from '@/components/ui/section-header'
import { toast } from 'sonner'

type LogStatus = 'exitoso' | 'fallido' | 'bloqueado'

const acciones = ['Consulta de libro', 'Descarga de PDF', 'Inicio de sesión', 'Búsqueda', 'Acceso denegado', 'Cierre de sesión']
const recursos = ['El señor de los anillos', 'Cálculo Diferencial', 'Base de Datos', 'Redes Computacionales', 'Sistemas Operativos', 'Algebra Lineal']
const ips = ['192.168.1.', '10.0.0.', '172.16.0.', '192.168.100.']
const nombres = ['García L. A.', 'Martínez R. L.', 'López C. M.', 'Torres J.', 'Ramírez K.', 'Hernández P.', 'Flores E.', 'Cruz J.']
const statusArr: LogStatus[] = ['exitoso', 'exitoso', 'exitoso', 'exitoso', 'fallido', 'bloqueado']

const logsData = Array.from({ length: 60 }, (_, i) => {
  const h = 14 - Math.floor(i / 4)
  const m = (i % 4) * 15
  return {
    id: String(i + 1),
    timestamp: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    usuario: nombres[i % nombres.length],
    matricula: `2023${String(i + 1).padStart(4, '0')}`,
    accion: acciones[i % acciones.length],
    recurso: recursos[i % recursos.length],
    ip: `${ips[i % ips.length]}${(i % 254) + 1}`,
    status: statusArr[i % statusArr.length],
    duracion: `${(i % 8) + 1}m ${(i * 7) % 60}s`,
  }
})

const volumeData = [
  { t: '08h', total: 67, exitosos: 62, fallidos: 5 },
  { t: '09h', total: 134, exitosos: 128, fallidos: 6 },
  { t: '10h', total: 189, exitosos: 182, fallidos: 7 },
  { t: '11h', total: 156, exitosos: 150, fallidos: 6 },
  { t: '12h', total: 245, exitosos: 237, fallidos: 8 },
  { t: '13h', total: 198, exitosos: 192, fallidos: 6 },
  { t: '14h', total: 123, exitosos: 119, fallidos: 4 },
]

const statusStyles: Record<LogStatus, { badge: string; icon: React.ElementType }> = {
  exitoso: { badge: 'text-emerald-600 border-emerald-200 bg-emerald-50', icon: CheckCircle },
  fallido: { badge: 'text-red-500 border-red-200 bg-red-50', icon: XCircle },
  bloqueado: { badge: 'text-amber-600 border-amber-200 bg-amber-50', icon: AlertTriangle },
}

const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }
const PAGE_SIZE = 10

const AccessLogs = () => {
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState('todos')
  const [accionF, setAccionF] = useState('todas')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)

  const filtered = useMemo(() => logsData.filter(l => {
    const s = (l.usuario + l.matricula + l.ip).toLowerCase().includes(search.toLowerCase())
    const st = statusF === 'todos' || l.status === statusF
    const ac = accionF === 'todas' || l.accion === accionF
    return s && st && ac
  }), [search, statusF, accionF])

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const exitosos = logsData.filter(l => l.status === 'exitoso').length
  const fallidos = logsData.filter(l => l.status === 'fallido').length
  const bloqueados = logsData.filter(l => l.status === 'bloqueado').length

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); toast.success('Logs actualizados') }, 1000)
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <SectionHeader
        icon={FileText}
        title="Logs de Acceso"
        subtitle="Registro detallado de todas las operaciones en eLibro"
        actions={
          <>
            <Button variant="outline" size="md" onClick={handleRefresh} disabled={loading} className="gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button variant="outline" size="md" className="gap-2" onClick={() => toast.success('Exportando logs...')}>
              <Download className="w-3.5 h-3.5" /> Exportar
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard title="Total Registros" value={logsData.length.toLocaleString()} icon={FileText} iconBg="bg-indigo-500/10" iconFg="text-indigo-600" trend={5.3} trendLabel="hoy" delay={0} />
        <StatusCard title="Exitosos" value={exitosos} subtitle={`${((exitosos / logsData.length) * 100).toFixed(1)}% tasa de éxito`} icon={CheckCircle} iconBg="bg-emerald-500/10" iconFg="text-emerald-600" delay={0.05} />
        <StatusCard title="Fallidos" value={fallidos} subtitle="Credenciales inválidas" icon={XCircle} iconBg="bg-red-500/10" iconFg="text-red-500" delay={0.1} />
        <StatusCard title="Bloqueados" value={bloqueados} subtitle="IPs con acceso restringido" icon={AlertTriangle} iconBg="bg-amber-500/10" iconFg="text-amber-600" delay={0.15} />
      </div>

      {/* Volume Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Volumen de Accesos — Hoy</CardTitle>
          <p className="text-xs text-muted-foreground">Solicitudes procesadas por hora</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={volumeData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fill="url(#gTotal)" dot={false} name="Total" />
              <Area type="monotone" dataKey="exitosos" stroke="#10b981" strokeWidth={1.5} fill="none" strokeDasharray="4 2" dot={false} name="Exitosos" />
              <Area type="monotone" dataKey="fallidos" stroke="#ef4444" strokeWidth={1.5} fill="none" dot={false} name="Fallidos" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Usuario, matrícula o IP..." className="pl-9 h-8 text-sm" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
            </div>
            <Select value={statusF} onValueChange={v => { setStatusF(v); setPage(0) }}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="exitoso">Exitosos</SelectItem>
                <SelectItem value="fallido">Fallidos</SelectItem>
                <SelectItem value="bloqueado">Bloqueados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={accionF} onValueChange={v => { setAccionF(v); setPage(0) }}>
              <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="Acción" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las acciones</SelectItem>
                {acciones.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="ml-auto text-xs">{filtered.length} registros</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/40">
                  {['Hora', 'Usuario', 'Matrícula', 'Acción', 'Recurso', 'IP', 'Duración', 'Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map(log => {
                  const s = statusStyles[log.status]
                  return (
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{log.timestamp}</td>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{log.usuario}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.matricula}</td>
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">{log.accion}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[160px]">{log.recurso}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {log.ip}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{log.duracion}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outlined" className={`text-[10px] gap-1 whitespace-nowrap ${s.badge}`}>
                          <s.icon className="w-3 h-3" />
                          {log.status}
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
export default AccessLogs;