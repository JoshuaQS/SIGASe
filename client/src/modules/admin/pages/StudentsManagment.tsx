import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap,
  Search,
  Edit2,
  Trash2,
  MoreHorizontal,
  Users,
  BookOpen,
  UserX,
  PlayCircle,
  PauseCircle,
  Loader2,
  Plus,
  Upload,
  Download,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import StatCard from '@/components/ui/StatusCard'
import { SectionHeader } from '@/components/ui/section-header'
import { useAppToast } from '@/components/ui/app-toast-provider'
import { AppConfirmDialog } from '@/components/ui/confirmation-dialog'
import { StudentsCreateModal } from '@/modules/admin/components/student/creation/StudentsCreateModal'
import { CsvImportModal } from '@/modules/admin/components/student/csv-importer/CsvImportModal'
import type { CsvImportParsed } from '@/modules/admin/components/student/csv-importer/CsvImport'
import {
  deactivateStudent,
  deleteStudent,
  exportStudentsReport,
  importStudentsCsv,
  listStudents,
  reactivateStudent,
  type StudentBackendStatus,
  type StudentResponseDto,
} from '@/lib/api/students-api'
import { listActiveCareers, type CareerDto } from '@/lib/api/careers-api'

type UiStatus = 'activo' | 'inactivo' | 'pendiente'
type PendingActionType = 'deactivate' | 'reactivate' | 'delete'

type PendingAction = {
  type: PendingActionType
  student: StudentResponseDto
}

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
}

const statusStyles: Record<UiStatus, string> = {
  activo: 'text-emerald-600 border-emerald-200 bg-emerald-50',
  inactivo: 'text-muted-foreground border-border',
  pendiente: 'text-amber-700 border-amber-200 bg-amber-50',
}

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f97316']
const PAGE_SIZE = 8

function buildFullName(student: StudentResponseDto) {
  return [
    student.name,
    student.lastNamePaternal,
    student.lastNameMaternal ?? '',
  ].join(' ').replace(/\s+/g, ' ').trim()
}

function formatRelativeAccess(iso?: string | null) {
  if (!iso) return 'Sin acceso'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Sin acceso'

  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `hace ${Math.max(diffMin, 1)} min`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `hace ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `hace ${diffDays}d`
}

function buildCareersChartData(students: StudentResponseDto[]) {
  const bucket = new Map<string, number>()
  students.forEach((student) => {
    const key = student.career?.code ?? 'N/D'
    bucket.set(key, (bucket.get(key) ?? 0) + 1)
  })

  return Array.from(bucket.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value], index) => ({
      name,
      value,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }))
}

function buildWeeklyActivityData(students: StudentResponseDto[]) {
  const days: Array<{ key: string; day: string; accesos: number }> = []
  const now = new Date()

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(now)
    date.setHours(0, 0, 0, 0)
    date.setDate(now.getDate() - index)
    const key = date.toISOString().slice(0, 10)
    const short = date.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')
    const day = short.charAt(0).toUpperCase() + short.slice(1, 3)
    days.push({ key, day, accesos: 0 })
  }

  const byDate = new Map(days.map((item) => [item.key, item]))
  students.forEach((student) => {
    if (!student.lastLoginAt) return
    const key = new Date(student.lastLoginAt).toISOString().slice(0, 10)
    const target = byDate.get(key)
    if (target) {
      target.accesos += 1
    }
  })

  return days.map(({ day, accesos }) => ({ day, accesos }))
}

const StudentsManagement = () => {
  const { showToast } = useAppToast()
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [carreraF, setCarreraF] = useState('todas')
  const [estadoF, setEstadoF] = useState<'todos' | StudentBackendStatus>('todos')
  const [page, setPage] = useState(0)

  const [careers, setCareers] = useState<CareerDto[]>([])
  const [students, setStudents] = useState<StudentResponseDto[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [summary, setSummary] = useState({ total: 0, active: 0, inactive: 0 })

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 350)
    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const activeFilters = useMemo(() => ({
    query: debouncedSearch.trim() || undefined,
    careerCode: carreraF === 'todas' ? undefined : carreraF,
    status: estadoF === 'todos' ? undefined : estadoF,
  }), [debouncedSearch, carreraF, estadoF])

  const fetchCareers = useCallback(async () => {
    try {
      const response = await listActiveCareers()
      setCareers(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cargar el catálogo de carreras.'
      showToast({
        severity: 'warning',
        title: 'Carreras no disponibles',
        description: message,
      })
    }
  }, [showToast])

  const fetchSummary = useCallback(async () => {
    try {
      const baseFilters = {
        query: activeFilters.query,
        careerCode: activeFilters.careerCode,
      }
      const [total, active, inactive] = await Promise.all([
        listStudents({ ...baseFilters, page: 0, size: 1 }),
        listStudents({ ...baseFilters, page: 0, size: 1, status: 'ACTIVE' }),
        listStudents({ ...baseFilters, page: 0, size: 1, status: 'INACTIVE' }),
      ])
      setSummary({
        total: total.totalElements,
        active: active.totalElements,
        inactive: inactive.totalElements,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cargar el resumen de estudiantes.'
      showToast({
        severity: 'warning',
        title: 'Resumen no disponible',
        description: message,
      })
    }
  }, [activeFilters.query, activeFilters.careerCode, showToast])

  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true)
    try {
      const response = await listStudents({
        query: activeFilters.query,
        careerCode: activeFilters.careerCode,
        status: activeFilters.status,
        page,
        size: PAGE_SIZE,
        sortBy: 'updatedAt',
        sortDir: 'desc',
      })

      setStudents(response.content)
      setTotalElements(response.totalElements)
      setTotalPages(response.totalPages)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cargar la tabla de estudiantes.'
      showToast({
        severity: 'error',
        title: 'Error cargando estudiantes',
        description: message,
      })
    } finally {
      setLoadingStudents(false)
    }
  }, [activeFilters.query, activeFilters.careerCode, activeFilters.status, page, showToast])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchCareers()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [fetchCareers])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchSummary()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [fetchSummary])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchStudents()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [fetchStudents])

  const rows = useMemo(() => (
    students.map((student) => ({
      ...student,
      fullName: buildFullName(student),
      uiStatus:
        student.status === 'INACTIVE'
          ? 'inactivo' as const
          : student.mustChangePassword
            ? 'pendiente' as const
            : 'activo' as const,
      lastAccessLabel: formatRelativeAccess(student.lastLoginAt),
    }))
  ), [students])

  const pieData = useMemo(() => buildCareersChartData(students), [students])
  const actividadData = useMemo(() => buildWeeklyActivityData(students), [students])

  const confirmDialogCopy = useMemo(() => {
    if (!pendingAction) {
      return {
        title: '',
        description: '',
        confirmText: '',
        confirmColor: 'primary' as const,
      }
    }
    if (pendingAction.type === 'delete') {
      return {
        title: 'Eliminar estudiante',
        description: `Se eliminará el registro de ${buildFullName(pendingAction.student)}.`,
        confirmText: 'Eliminar',
        confirmColor: 'error' as const,
      }
    }
    if (pendingAction.type === 'deactivate') {
      return {
        title: 'Desactivar estudiante',
        description: `Se desactivará el acceso de ${buildFullName(pendingAction.student)}.`,
        confirmText: 'Desactivar',
        confirmColor: 'warning' as const,
      }
    }
    return {
      title: 'Reactivar estudiante',
      description: `Se reactivará el acceso de ${buildFullName(pendingAction.student)}.`,
      confirmText: 'Reactivar',
      confirmColor: 'success' as const,
    }
  }, [pendingAction])

  const handleConfirmAction = async () => {
    if (!pendingAction) return
    setActionLoading(true)
    try {
      if (pendingAction.type === 'delete') {
        await deleteStudent(pendingAction.student.id)
        showToast({
          severity: 'success',
          title: 'Estudiante eliminado',
          description: `${buildFullName(pendingAction.student)} fue eliminado correctamente.`,
        })
      } else if (pendingAction.type === 'deactivate') {
        await deactivateStudent(pendingAction.student.id, {
          reason: 'Desactivado desde el panel de gestión de estudiantes.',
        })
        showToast({
          severity: 'success',
          title: 'Estudiante desactivado',
          description: `${buildFullName(pendingAction.student)} ahora está inactivo.`,
        })
      } else {
        await reactivateStudent(pendingAction.student.id, {
          reason: 'Reactivado desde el panel de gestión de estudiantes.',
        })
        showToast({
          severity: 'success',
          title: 'Estudiante reactivado',
          description: `${buildFullName(pendingAction.student)} ahora está activo.`,
        })
      }

      const shouldGoBack = pendingAction.type === 'delete' && rows.length === 1 && page > 0
      setPendingAction(null)

      await fetchSummary()
      if (shouldGoBack) {
        setPage((current) => current - 1)
      } else {
        await fetchStudents()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo completar la acción.'
      showToast({
        severity: 'error',
        title: 'Acción no completada',
        description: message,
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleImportFile = async (file: File): Promise<boolean> => {
    setImportLoading(true)
    try {
      const result = await importStudentsCsv(file)
      showToast({
        severity: 'success',
        title: 'Importación completada',
        description: `Creados: ${result.created} · Actualizados: ${result.updated} · Omitidos: ${result.skipped}`,
      })
      await fetchSummary()
      if (page === 0) {
        await fetchStudents()
      } else {
        setPage(0)
      }
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo importar el archivo CSV.'
      showToast({
        severity: 'error',
        title: 'Importación fallida',
        description: message,
      })
      return false
    } finally {
      setImportLoading(false)
    }
  }

  const handleImportFromModal = useCallback(async (payload: CsvImportParsed) => {
    const imported = await handleImportFile(payload.file)
    if (imported) {
      setImportModalOpen(false)
    }
  }, [handleImportFile])

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const { blob, filename } = await exportStudentsReport({
        query: activeFilters.query,
        careerCode: activeFilters.careerCode,
        status: activeFilters.status,
        format: 'csv',
      })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      link.click()
      window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 2000)

      showToast({
        severity: 'success',
        title: 'Exportación completada',
        description: `Se descargó ${filename}.`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo exportar la lista de estudiantes.'
      showToast({
        severity: 'error',
        title: 'Exportación fallida',
        description: message,
      })
    } finally {
      setExportLoading(false)
    }
  }

  const handleStudentCreated = useCallback(async () => {
    await fetchSummary()
    if (page === 0) {
      await fetchStudents()
      return
    }
    setPage(0)
  }, [fetchSummary, fetchStudents, page])

  const showingFrom = totalElements === 0 ? 0 : page * PAGE_SIZE + 1
  const showingTo = totalElements === 0 ? 0 : Math.min((page + 1) * PAGE_SIZE, totalElements)
  const createdThisPage = rows.filter((row) => {
    const date = new Date(row.createdAt)
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }).length

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <AppConfirmDialog
        open={Boolean(pendingAction)}
        title={confirmDialogCopy.title}
        description={confirmDialogCopy.description}
        confirmText={actionLoading ? 'Procesando...' : confirmDialogCopy.confirmText}
        cancelText="Cancelar"
        confirmColor={confirmDialogCopy.confirmColor}
        onCancel={() => !actionLoading && setPendingAction(null)}
        onConfirm={() => {
          if (actionLoading) return
          void handleConfirmAction()
        }}
      />
      <StudentsCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => {
          void handleStudentCreated()
        }}
      />
      <CsvImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        importing={importLoading}
        onImport={handleImportFromModal}
      />

      <SectionHeader
        icon={GraduationCap}
        title="Gestión de Estudiantes"
        subtitle={`${summary.total} estudiantes registrados · ${summary.active} con acceso activo`}
        actions={(
          <>
 <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="md"
              className="gap-2"
              onClick={() => setImportModalOpen(true)}
            >
              <Upload className="w-3.5 h-3.5" />
              Importar
            </Button>
            <Button
              variant="outline"
              size="md"
              className="gap-2"
              isLoading={exportLoading}
              onClick={() => {
                void handleExport()
              }}
            >
              {!exportLoading && <Download className="w-3.5 h-3.5" />}
              Exportar
            </Button>
            <Button
              size="md"
              className="gap-2"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo estudiante
            </Button>
          </div>
          </>
        )}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Estudiantes"
          value={summary.total}
          icon={Users}
          iconBg="bg-indigo-500/10"
          iconFg="text-indigo-600"
          delay={0}
        />
        <StatCard
          title="Activos con eLibro"
          value={summary.active}
          subtitle="Acceso habilitado"
          icon={GraduationCap}
          iconBg="bg-emerald-500/10"
          iconFg="text-emerald-600"
          delay={0.05}
        />
        <StatCard
          title="Nuevos en esta página"
          value={createdThisPage}
          icon={BookOpen}
          iconBg="bg-violet-500/10"
          iconFg="text-violet-600"
          delay={0.1}
        />
        <StatCard
          title="Inactivos"
          value={summary.inactive}
          icon={UserX}
          iconBg="bg-amber-500/10"
          iconFg="text-amber-600"
          delay={0.15}
        />
      </div>

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
            {pieData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                Sin datos para graficar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                    {pieData.map((item, index) => <Cell key={`${item.name}-${index}`} fill={item.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar nombre o matrícula..."
                className="pl-9"
                size="sm"
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value)
                  setPage(0)
                }}
              />
            </div>

            <Select value={carreraF} onValueChange={(value) => {
              setCarreraF(value)
              setPage(0)
            }}>
              <SelectTrigger className="w-40" size="sm"><SelectValue placeholder="Carrera" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {careers.map((career) => (
                  <SelectItem key={career.id} value={career.code}>
                    {career.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={estadoF} onValueChange={(value) => {
              setEstadoF(value as typeof estadoF)
              setPage(0)
            }}>
              <SelectTrigger className="w-36" size="sm"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ACTIVE">Activos</SelectItem>
                <SelectItem value="INACTIVE">Inactivos</SelectItem>
              </SelectContent>
            </Select>

            <Badge variant="secondary" className="ml-auto text-xs">{totalElements} resultados</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/40">
                  {['Estudiante', 'Matrícula', 'Carrera', 'Cuatrimestre', 'Estado', 'Último acceso', 'Correo', ''].map((header) => (
                    <th key={header} className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingStudents ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cargando estudiantes...
                      </span>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No hay estudiantes para los filtros seleccionados.
                    </td>
                  </tr>
                ) : rows.map((student) => (
                  <tr key={student.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-bold text-primary">{student.fullName.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-foreground truncate max-w-[180px]">{student.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{student.enrollmentId}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outlined" className="text-xs">{student.career?.code ?? 'N/D'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{student.quarter}°</td>
                    <td className="px-4 py-3">
                      <Badge variant="outlined" className={`text-xs capitalize ${statusStyles[student.uiStatus]}`}>
                        {student.uiStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{student.lastAccessLabel}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{student.institutionalEmail}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-7 h-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => showToast({
                              severity: 'info',
                              title: 'Edición en construcción',
                              description: `La edición completa de ${student.fullName} se habilitará en un siguiente paso.`,
                            })}
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-2" />Editar
                          </DropdownMenuItem>
                          {student.status === 'ACTIVE' ? (
                            <DropdownMenuItem onClick={() => setPendingAction({ type: 'deactivate', student })}>
                              <PauseCircle className="w-3.5 h-3.5 mr-2" />
                              Desactivar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setPendingAction({ type: 'reactivate', student })}>
                              <PlayCircle className="w-3.5 h-3.5 mr-2" />
                              Reactivar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => setPendingAction({ type: 'delete', student })}>
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
              Mostrando {showingFrom}–{showingTo} de {totalElements}
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={loadingStudents || page === 0}
                onClick={() => setPage((current) => current - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={loadingStudents || totalPages === 0 || page >= totalPages - 1}
                onClick={() => setPage((current) => current + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default StudentsManagement
