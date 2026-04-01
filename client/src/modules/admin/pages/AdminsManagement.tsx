import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
    Users, Search, Plus, Edit2, Trash2, MoreHorizontal,
    Shield, Crown, UserCheck, Clock, Download,
} from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { button as Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import StatCard from '@/components/ui/StatusCard'
import { SectionHeader } from '@/components/ui/section-header'
import { useAppToast } from '@/components/ui/app-toast-provider'

type Rol = 'superadmin' | 'admin' | 'supervisor'

const admins = [
    { id: '1', nombre: 'Dr. Ramírez Flores Jorge', email: 'jramirez@utez.edu.mx', rol: 'superadmin' as Rol, area: 'Dirección Académica', estado: 'activo', ultimaAccion: 'hace 5 min', acciones: 234 },
    { id: '2', nombre: 'Lic. Torres Mendoza Ana', email: 'atorres@utez.edu.mx', rol: 'admin' as Rol, area: 'Servicios Escolares', estado: 'activo', ultimaAccion: 'hace 1h', acciones: 187 },
    { id: '3', nombre: 'Ing. López Cruz Pedro', email: 'plopez@utez.edu.mx', rol: 'admin' as Rol, area: 'Tecnologías de la Info.', estado: 'activo', ultimaAccion: 'hace 2h', acciones: 156 },
    { id: '4', nombre: 'Mtra. García Vega María', email: 'mgarcia@utez.edu.mx', rol: 'supervisor' as Rol, area: 'Control Escolar', estado: 'activo', ultimaAccion: 'ayer', acciones: 98 },
    { id: '5', nombre: 'Ing. Hernández Díaz Luis', email: 'lhernandez@utez.edu.mx', rol: 'supervisor' as Rol, area: 'Biblioteca', estado: 'inactivo', ultimaAccion: 'hace 3d', acciones: 45 },
    { id: '6', nombre: 'Lic. Martínez Reyes Sara', email: 'smartinez@utez.edu.mx', rol: 'admin' as Rol, area: 'Recursos Humanos', estado: 'activo', ultimaAccion: 'hace 4h', acciones: 112 },
]

const recentActions = [
    { admin: 'Ramírez J.', action: 'Actualizó credenciales eLibro', time: '14:32', severity: 'info' },
    { admin: 'Torres A.', action: 'Exportó reporte de estudiantes (1,065 reg.)', time: '13:58', severity: 'info' },
    { admin: 'López P.', action: 'Suspendió acceso de estudiante ID #4521', time: '13:15', severity: 'warning' },
    { admin: 'García M.', action: 'Creó nuevo período académico 2025-A', time: '12:40', severity: 'success' },
    { admin: 'Ramírez J.', action: 'Eliminó log de auditoría antiguo (>90d)', time: '11:20', severity: 'warning' },
]

const actividadRol = [
    { area: 'Gestión', superadmin: 90, admin: 70, supervisor: 40 },
    { area: 'Reportes', superadmin: 85, admin: 80, supervisor: 55 },
    { area: 'Config.', superadmin: 95, admin: 30, supervisor: 10 },
    { area: 'Estudiantes', superadmin: 60, admin: 90, supervisor: 75 },
    { area: 'Logs', superadmin: 75, admin: 50, supervisor: 30 },
]

const rolStyles: Record<Rol, { badge: string; icon: React.ElementType; label: string }> = {
    superadmin: { badge: 'text-violet-600 border-violet-200 bg-violet-50', icon: Crown, label: 'Superadmin' },
    admin: { badge: 'text-indigo-600 border-indigo-200 bg-indigo-50', icon: Shield, label: 'Admin' },
    supervisor: { badge: 'text-cyan-600 border-cyan-200 bg-cyan-50', icon: UserCheck, label: 'Supervisor' },
}

const sevColors: Record<string, string> = { info: 'bg-blue-500', warning: 'bg-amber-500', success: 'bg-emerald-500' }
const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }
const PAGE_SIZE = 5

const AdminsManagement = () => {
    const { showToast } = useAppToast()
    const [search, setSearch] = useState('')
    const [rolFilter, setRolFilter] = useState('todos')
    const [page, setPage] = useState(0)

    const filtered = useMemo(() => admins.filter(a => {
        const s = (a.nombre + a.email).toLowerCase().includes(search.toLowerCase())
        const r = rolFilter === 'todos' || a.rol === rolFilter
        return s && r
    }), [search, rolFilter])

    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

    return (
        <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <SectionHeader
                icon={Users}
                title="Gestión de Administradores"
                subtitle={`${admins.length} administradores · ${admins.filter(a => a.estado === 'activo').length} activos`}
                actions={
                    <>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => showToast({ severity: 'success', title: 'Exportando reporte', description: 'La lista de administradores se está generando...' })}>
                            <Download className="w-3.5 h-3.5" /> Exportar
                        </Button>
                        <Button size="sm" className="gap-2" onClick={() => showToast({ severity: 'info', title: 'Invitación enviada', description: 'Se ha abierto el formulario para invitar a un nuevo administrador.' })}>
                            <Plus className="w-3.5 h-3.5" /> Invitar Admin
                        </Button>
                    </>
                }
            />

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Admins" value={admins.length} icon={Users} iconBg="bg-violet-500/10" iconFg="text-violet-600" delay={0} />
                <StatCard title="Superadmins" value={admins.filter(a => a.rol === 'superadmin').length} icon={Crown} iconBg="bg-amber-500/10" iconFg="text-amber-600" delay={0.05} />
                <StatCard title="Sesiones activas" value="4" subtitle="Conectados ahora" icon={Shield} iconBg="bg-emerald-500/10" iconFg="text-emerald-600" delay={0.1} />
                <StatCard title="Acciones hoy" value="47" icon={Clock} iconBg="bg-cyan-500/10" iconFg="text-cyan-600" trend={18.4} trendLabel="vs ayer" delay={0.15} />
            </div>

            {/* Charts + Recent Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Radar - Activity by Role */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Actividad por Rol y Módulo</CardTitle>
                        <p className="text-xs text-muted-foreground">Nivel de uso de cada módulo por tipo de rol</p>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <RadarChart data={actividadRol}>
                                <PolarGrid stroke="rgba(128,128,128,0.2)" />
                                <PolarAngleAxis dataKey="area" tick={{ fill: '#64748b', fontSize: 11 }} />
                                <Radar name="Superadmin" dataKey="superadmin" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
                                <Radar name="Admin" dataKey="admin" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={1.5} />
                                <Radar name="Supervisor" dataKey="supervisor" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 2" />
                                <Tooltip contentStyle={tooltipStyle} />
                            </RadarChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 mt-2">
                            {[{ label: 'Superadmin', color: '#8b5cf6' }, { label: 'Admin', color: '#6366f1' }, { label: 'Supervisor', color: '#06b6d4' }].map(l => (
                                <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: l.color }} />
                                    {l.label}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Actions Timeline */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Actividad Reciente</CardTitle>
                        <p className="text-xs text-muted-foreground">Últimas acciones de administradores</p>
                    </CardHeader>
                    <CardContent className="p-0">
                        {recentActions.map((a, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + i * 0.05 }}
                                className="flex items-start gap-3 px-5 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                    <div className={`w-2 h-2 rounded-full mt-1 ${sevColors[a.severity]}`} />
                                    {i < recentActions.length - 1 && <div className="w-px h-6 bg-border" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground mb-0.5">{a.admin} · {a.time}</p>
                                    <p className="text-sm text-foreground leading-tight">{a.action}</p>
                                </div>
                            </motion.div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px] max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input placeholder="Buscar administrador..." className="pl-9 h-8 text-sm" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
                        </div>
                        <Select value={rolFilter} onValueChange={v => { setRolFilter(v); setPage(0) }}>
                            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Rol" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos los roles</SelectItem>
                                <SelectItem value="superadmin">Superadmin</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="supervisor">Supervisor</SelectItem>
                            </SelectContent>
                        </Select>
                        <Badge variant="secondary" className="ml-auto text-xs">{filtered.length} administradores</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-y border-border bg-muted/40">
                                    {['Administrador', 'Email', 'Rol', 'Área', 'Estado', 'Última acción', 'Acciones', ''].map(h => (
                                        <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paged.map(admin => {
                                    const rol = rolStyles[admin.rol]
                                    return (
                                        <tr key={admin.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-xs font-bold text-primary">{admin.nombre[4]}</span>
                                                    </div>
                                                    <span className="font-medium text-foreground truncate max-w-[160px]">{admin.nombre}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{admin.email}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className={`text-xs gap-1 ${rol.badge}`}>
                                                    <rol.icon className="w-3 h-3" />{rol.label}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">{admin.area}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className={`text-xs ${admin.estado === 'activo' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-muted-foreground'}`}>
                                                    {admin.estado}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{admin.ultimaAccion}</td>
                                            <td className="px-4 py-3 font-semibold text-foreground tabular-nums">{admin.acciones}</td>
                                            <td className="px-4 py-3">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="w-7 h-7"><MoreHorizontal className="w-4 h-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => showToast({ severity: 'info', title: 'Editor de permisos', description: `Iniciando edición de permisos para ${admin.nombre}` })}>
                                                            <Edit2 className="w-3.5 h-3.5 mr-2" />Editar permisos
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive" onClick={() => showToast({ severity: 'error', title: 'Acceso revocado', description: `Se ha revocado el acceso de ${admin.nombre} satisfactoriamente.` })}>
                                                            <Trash2 className="w-3.5 h-3.5 mr-2" />Revocar acceso
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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

export default AdminsManagement;
