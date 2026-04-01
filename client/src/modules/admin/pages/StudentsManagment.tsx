import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap, Search, Download, Upload, Plus,
  Edit2, Trash2, MoreHorizontal, Users, BookOpen, UserX,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { button as Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import StatCard from '@/components/ui/StatusCard'
import { SectionHeader } from '@/components/ui/section-header'
import { useAppToast } from '@/components/ui/app-toast-provider'

type Status = 'activo' | 'inactivo' | 'suspendido'
const nombres = ['García López Ana', 'Martínez Rodríguez Luis', 'Hernández Cruz María', 'López Díaz Carlos', 'González Vega Sara', 'Ramírez Torres José', 'Flores Reyes Elena', 'Torres Morales Pedro']
const accesosArr = [89, 76, 65, 58, 47, 34, 67, 45, 82, 71]
const estados: Status[] = ['activo', 'activo', 'activo', 'activo', 'inactivo', 'suspendido']

const mockData = Array.from({ length: 50 }, (_, i) => ({
  id: String(i + 1),
  matricula: `202${Math.floor(i / 12) + 1}${String((i % 12) + 1).padStart(4, '0')}`,
  nombre: nombres[i % nombres.length],
  carrera: ['ISC', 'IGE', 'LAE', 'IMA', 'IBI', 'ICO'][i % 6],
  semestre: (i % 8) + 1,
  estado: estados[i % estados.length],
  ultimoAcceso: `${(i % 7) + 1}d`,
  accesos: accesosArr[i % accesosArr.length],
}))

const pieData = [
  { name: 'ISC', value: 312, color: '#6366f1' },
  { name: 'IGE', value: 245, color: '#8b5cf6' },
  { name: 'LAE', value: 198, color: '#06b6d4' },
  { name: 'IMA', value: 167, color: '#10b981' },
  { name: 'IBI', value: 143, color: '#f59e0b' },
]

const actividadData = [
  { day: 'Lun', accesos: 312 }, { day: 'Mar', accesos: 389 }, { day: 'Mié', accesos: 267 },
  { day: 'Jue', accesos: 445 }, { day: 'Vie', accesos: 398 }, { day: 'Sáb', accesos: 145 }, { day: 'Dom', accesos: 78 },
]

const statusStyles: Record<Status, string> = {
  activo: 'text-emerald-600 border-emerald-200 bg-emerald-50',
  inactivo: 'text-muted-foreground border-border',
  suspendido: 'text-red-600 border-red-200 bg-red-50',
}

const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }
const PAGE_SIZE = 8

const StudentsManagement = () => {
  const { showToast } = useAppToast()
  const [search, setSearch] = useState('')
  const [carreraF, setCarreraF] = useState('todas')
  const [estadoF, setEstadoF] = useState('todos')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => mockData.filter(e => {
    const s = (e.nombre + e.matricula).toLowerCase().includes(search.toLowerCase())
    const c = carreraF === 'todas' || e.carrera === carreraF
    const es = estadoF === 'todos' || e.estado === estadoF
    return s && c && es
  }), [search, carreraF, estadoF])

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const activos = mockData.filter(e => e.estado === 'activo').length

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <SectionHeader
        icon={GraduationCap}
        title="Gestión de Estudiantes"
        subtitle={`${mockData.length} estudiantes registrados · ${activos} con acceso activo`}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => showToast({ severity: 'info', title: 'Importación', description: 'Iniciando proceso de importación de estudiantes...' })}>
              <Upload className="w-3.5 h-3.5" /> Importar
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => showToast({ severity: 'success', title: 'Reporte generado', description: 'La lista de estudiantes se ha exportado correctamente.' })}>
              <Download className="w-3.5 h-3.5" /> Exportar
            </Button>
            <Button size="sm" className="gap-2" onClick={() => showToast({ severity: 'info', title: 'Registro Nuevo', description: 'Abriendo formulario de registro de estudiante...' })}>
              <Plus className="w-3.5 h-3.5" /> Nuevo Estudiante
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Estudiantes" value="1,065" icon={Users} iconBg="bg-indigo-500/10" iconFg="text-indigo-600" trend={8.3} trendLabel="este mes" delay={0} />
        <StatCard title="Activos con eLibro" value={activos} subtitle="Acceso habilitado" icon={GraduationCap} iconBg="bg-emerald-500/10" iconFg="text-emerald-600" delay={0.05} />
        <StatCard title="Nuevos este mes" value="87" icon={BookOpen} iconBg="bg-violet-500/10" iconFg="text-violet-600" trend={12.4} trendLabel="vs mes ant." delay={0.1} />
        <StatCard title="Sin actividad 7d" value="142" icon={UserX} iconBg="bg-amber-500/10" iconFg="text-amber-600" trend={-5.2} trendLabel="mejora" delay={0.15} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Actividad de Accesos — Últimos 7 días</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={actividadData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="accesos" fill="#6366f1" fillOpacity={0.85} radius={[5, 5, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribución por Carrera</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Buscar nombre o matrícula..." className="pl-9 h-8 text-sm" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
            </div>
            <Select value={carreraF} onValueChange={v => { setCarreraF(v); setPage(0) }}>
              <SelectTrigger className="w-32 h-8 text-sm"><SelectValue placeholder="Carrera" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {['ISC', 'IGE', 'LAE', 'IMA', 'IBI', 'ICO'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={estadoF} onValueChange={v => { setEstadoF(v); setPage(0) }}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="inactivo">Inactivos</SelectItem>
                <SelectItem value="suspendido">Suspendidos</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="ml-auto text-xs">{filtered.length} resultados</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/40">
                  {['Estudiante', 'Matrícula', 'Carrera', 'Semestre', 'Estado', 'Último acceso', 'Accesos', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map(est => (
                  <tr key={est.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-bold text-primary">{est.nombre[0]}</span>
                        </div>
                        <span className="font-medium text-foreground truncate max-w-[150px]">{est.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{est.matricula}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{est.carrera}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{est.semestre}°</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs capitalize ${statusStyles[est.estado]}`}>{est.estado}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">hace {est.ultimoAcceso}</td>
                    <td className="px-4 py-3 font-semibold text-foreground tabular-nums">{est.accesos}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-7 h-7"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => showToast({ severity: 'info', title: 'Perfil de Estudiante', description: `Visualizando detalles de ${est.nombre}` })}>
                            <Edit2 className="w-3.5 h-3.5 mr-2" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => showToast({ severity: 'error', title: 'Estudiante eliminado', description: `Se ha eliminado el registro de ${est.nombre} satisfactoriamente.` })}>
                            <Trash2 className="w-3.5 h-3.5 mr-2" />Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
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
export default StudentsManagement;