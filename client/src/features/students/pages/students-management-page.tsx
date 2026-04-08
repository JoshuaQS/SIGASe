import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap,
  Users,
  BookOpen,
  UserX,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import StatCard from '@/shared/components/data-display/status-card'
import { SectionHeader } from '@/shared/components/ui/section-header'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { AppConfirmDialog } from '@/shared/components/ui/confirmation-dialog'
import { StudentsCreateModal } from '@/features/students/components/modals/create-student-modal'
import { CsvImportModal } from '@/features/students/components/import/csv-import-modal'
import type { CsvImportParsed } from '@/features/students/components/import/csv-import'
import { StudentDataTable, type StudentManagementRow } from '@/features/students/components/student-data-table'
import {
  deactivateStudent,
  deleteStudent,
  exportStudentsReport,
  importStudentsCsv,
  listStudents,
  reactivateStudent,
  type StudentBackendStatus,
  type StudentResponseDto,
} from '@/features/students/api/students-api'
import { listActiveCareers, type CareerDto } from '@/features/careers/api/careers-api'

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
  type ViewMode = 'table' | 'cards'
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [carreraF, setCarreraF] = useState('todas')
  const [estadoF, setEstadoF] = useState<'todos' | StudentBackendStatus>('todos')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [filtersOpen, setFiltersOpen] = useState(false)

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

  const activeFilterChips = useMemo(() => ([
    ...(carreraF !== 'todas'
      ? [{
          id: 'career',
          label: `Carrera: ${carreraF}`,
          onClear: () => {
            setCarreraF('todas')
            setPage(0)
          },
        }]
      : []),
    ...(estadoF !== 'todos'
      ? [{
          id: 'status',
          label: `Estado: ${estadoF === 'ACTIVE' ? 'Activo' : 'Inactivo'}`,
          onClear: () => {
            setEstadoF('todos')
            setPage(0)
          },
        }]
      : []),
    ...(searchInput.trim()
      ? [{
          id: 'search',
          label: `Búsqueda: ${searchInput.trim()}`,
          onClear: () => {
            setSearchInput('')
            setPage(0)
          },
        }]
      : []),
  ]), [carreraF, estadoF, searchInput])

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
        size: pageSize,
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
  }, [activeFilters.query, activeFilters.careerCode, activeFilters.status, page, pageSize, showToast])

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

  const rows = useMemo<StudentManagementRow[]>(() => (
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
      totalAccesses: student.lastLoginAt ? 1 : 0,
    }))
  ), [students])

  const pieData = useMemo(() => buildCareersChartData(students), [students])
  const actividadData = useMemo(() => buildWeeklyActivityData(students), [students])
  const createdThisPage = rows.filter((row) => {
    const date = new Date(row.createdAt)
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }).length

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

  const handleStudentCreated = useCallback(async () => {
    await fetchSummary()
    if (page === 0) {
      await fetchStudents()
      return
    }
    setPage(0)
  }, [fetchSummary, fetchStudents, page])

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

  const handleImportFile = useCallback(async (file: File): Promise<boolean> => {
    setImportLoading(true)
    try {
      const result = await importStudentsCsv(file)
      showToast({
        severity: 'success',
        title: 'Importación completada',
        description: `Filas procesadas: ${result.totalRows} · Exitosas: ${result.successCount} · Con error: ${result.errorCount}`,
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
  }, [fetchStudents, fetchSummary, page, showToast])

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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

      <StudentDataTable
        title="Alumnos totales"
        rows={rows}
        loading={loadingStudents}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchInput={searchInput}
        onSearchInputChange={(value) => {
          setSearchInput(value)
          setPage(0)
        }}
        onView={(student) => {
          showToast({
            severity: 'info',
            title: 'Perfil en construcción',
            description: `La vista de detalle de ${student.fullName} se habilitará en un siguiente paso.`,
          })
        }}
        onEdit={(student) => {
          showToast({
            severity: 'info',
            title: 'Edición en construcción',
            description: `La edición completa de ${student.fullName} se habilitará en un siguiente paso.`,
          })
        }}
        onDeactivate={(student) => setPendingAction({ type: 'deactivate', student })}
        onReactivate={(student) => setPendingAction({ type: 'reactivate', student })}
        onDelete={(student) => setPendingAction({ type: 'delete', student })}
        page={page}
        totalElements={totalElements}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize)
          setPage(0)
        }}
        onFiltersToggle={() => setFiltersOpen((current) => !current)}
        filtersOpen={filtersOpen}
        careers={careers}
        carreraF={carreraF}
        onCareerChange={(value) => {
          setCarreraF(value)
          setPage(0)
        }}
        estadoF={estadoF}
        onStatusChange={(value) => {
          setEstadoF(value)
          setPage(0)
        }}
        onClearFilters={() => {
          setCarreraF('todas')
          setEstadoF('todos')
          setSearchInput('')
          setPage(0)
        }}
        onCloseFilters={() => setFiltersOpen(false)}
        activeFilterChips={activeFilterChips}
      />

    </motion.div>
  )
}

export default StudentsManagement
