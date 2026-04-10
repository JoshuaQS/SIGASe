import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap,
  Users,
  UserX,
  Plus,
  Upload,
  Download,
  Activity,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import StatCard from '@/shared/components/data-display/status-card'
import { SectionHeader } from '@/shared/components/ui/section-header'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { AppConfirmDialog } from '@/shared/components/ui/confirmation-dialog'
import { ExportFormatDialog } from '@/shared/components/ui/export-format-dialog'
import { CsvImportModal } from '@/features/students/components/import/csv-import-modal'
import type { CsvImportParsed } from '@/features/students/components/import/csv-import'
import { StudentsTable, type StudentManagementRow } from '@/features/students/components/StudentsTable'
import { CreateStudentModal } from '@/modalsfinal/CreateStudentModal'
import { EditStudentModal } from '@/modalsfinal/EditStudentModal'
import { StudentDetailModal } from '@/modalsfinal/StudentDetailModal'
import { DeleteUserModal } from '@/modalsfinal/DeleteUserModal'
import { StudentStatusChangeModal } from '@/features/students/components/modals/student-status-change-modal'
import {
  deactivateStudent,
  deleteStudent,
  exportStudentsReport,
  getStudentMetrics,
  importStudentsCsv,
  listStudents,
  reactivateStudent,
  type StudentExportFormat,
  type StudentBackendStatus,
  type StudentMetricsResponseDto,
  type StudentResponseDto,
} from '@/features/students/api/students-api'
import { listActiveCareers, type CareerDto } from '@/features/careers/api/careers-api'
import { useTableFilterState } from '@/shared/hooks/use-table-filter-state'

type PendingActionType = 'delete'

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

const PAGE_SIZE = 8

const DEFAULT_TABLE_FILTERS = {
  careerCode: 'todas',
  status: 'todos' as 'todos' | StudentBackendStatus,
}

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

function formatActivityData(metrics: StudentMetricsResponseDto) {
  return metrics.activityByDate.map((point) => {
    const parsed = new Date(`${point.date}T00:00:00Z`)
    const short = parsed.toLocaleDateString('es-MX', { weekday: 'short', timeZone: 'UTC' }).replace('.', '')
    const day = short.charAt(0).toUpperCase() + short.slice(1, 3)
    return {
      day,
      accesos: point.total,
    }
  })
}

const StudentsManagement = () => {
  const { showToast } = useAppToast()
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const {
    filtersOpen,
    setFiltersOpen,
    draftFilters,
    appliedFilters,
    updateDraftFilter,
    applyFilters,
    resetDraftFilters,
    clearFilters,
    commitAppliedFilters,
  } = useTableFilterState(DEFAULT_TABLE_FILTERS)

  const [careers, setCareers] = useState<CareerDto[]>([])
  const [students, setStudents] = useState<StudentResponseDto[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [metrics, setMetrics] = useState<StudentMetricsResponseDto>({
    totalStudents: 0,
    activeStudents: 0,
    disabledStudents: 0,
    totalAccesses: 0,
    successfulAccesses: 0,
    failedAccesses: 0,
    successRate: 0,
    activityByDate: [],
  })

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [viewStudent, setViewStudent] = useState<StudentResponseDto | null>(null)
  const [editingStudent, setEditingStudent] = useState<StudentResponseDto | null>(null)
  const [statusTarget, setStatusTarget] = useState<StudentResponseDto | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StudentResponseDto | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 350)
    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const activeFilters = useMemo(() => ({
    query: debouncedSearch.trim() || undefined,
    careerCode: appliedFilters.careerCode === 'todas' ? undefined : appliedFilters.careerCode,
    status: appliedFilters.status === 'todos' ? undefined : appliedFilters.status,
  }), [appliedFilters.careerCode, appliedFilters.status, debouncedSearch])

  const activeFilterChips = useMemo(() => ([
    ...(appliedFilters.careerCode !== 'todas'
      ? [{
          id: 'career',
          label: `Carrera: ${appliedFilters.careerCode}`,
          onClear: () => {
            commitAppliedFilters((current) => ({ ...current, careerCode: 'todas' }))
          },
        }]
      : []),
    ...(appliedFilters.status !== 'todos'
      ? [{
          id: 'status',
          label: `Estado: ${appliedFilters.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}`,
          onClear: () => {
            commitAppliedFilters((current) => ({ ...current, status: 'todos' }))
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
  ]), [appliedFilters.careerCode, appliedFilters.status, commitAppliedFilters, searchInput])

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

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await getStudentMetrics()
      setMetrics(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron cargar las métricas reales de estudiantes.'
      showToast({
        severity: 'warning',
        title: 'Métricas no disponibles',
        description: message,
      })
    }
  }, [showToast])

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
      void fetchMetrics()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [fetchMetrics])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchStudents()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [fetchStudents])

  useEffect(() => {
    setPage(0)
  }, [appliedFilters.careerCode, appliedFilters.status])

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
    }))
  ), [students])

  const actividadData = useMemo(() => formatActivityData(metrics), [metrics])

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
  }, [pendingAction])

  const handleStudentCreated = useCallback(async () => {
    await fetchMetrics()
    if (page === 0) {
      await fetchStudents()
      return
    }
    setPage(0)
  }, [fetchMetrics, fetchStudents, page])

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
      }

      const shouldGoBack = pendingAction.type === 'delete' && rows.length === 1 && page > 0
      setPendingAction(null)

      await fetchMetrics()
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
      await fetchMetrics()
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
  }, [fetchStudents, fetchMetrics, page, showToast])

  const handleImportFromModal = useCallback(async (payload: CsvImportParsed) => {
    const imported = await handleImportFile(payload.file)
    if (imported) {
      setImportModalOpen(false)
    }
  }, [handleImportFile])

  const handleExport = async (format: StudentExportFormat) => {
    setExportLoading(true)
    try {
      const { blob, filename } = await exportStudentsReport({
        query: activeFilters.query,
        careerCode: activeFilters.careerCode,
        status: activeFilters.status,
        format,
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
      setExportDialogOpen(false)
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
      <ExportFormatDialog
        open={exportDialogOpen}
        title="Exportar estudiantes"
        description="Selecciona el formato de descarga para la consulta actual de estudiantes."
        loading={exportLoading}
        onClose={() => !exportLoading && setExportDialogOpen(false)}
        onSelect={(format) => {
          void handleExport(format as StudentExportFormat)
        }}
      />
      <CreateStudentModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => void handleStudentCreated()}
      />
      <EditStudentModal
        open={Boolean(editingStudent)}
        student={editingStudent}
        onClose={() => setEditingStudent(null)}
        onSaved={() => void handleStudentCreated()}
      />
      <StudentStatusChangeModal
        open={Boolean(statusTarget)}
        student={statusTarget}
        loading={statusLoading}
        onClose={() => {
          if (!statusLoading) setStatusTarget(null)
        }}
        onSubmit={(payload) => {
          if (!statusTarget || statusLoading) return
          setStatusLoading(true)
          const action = payload.nextStatus === 'INACTIVE' ? deactivateStudent : reactivateStudent
          void action(statusTarget.id, { reason: payload.reason })
            .then(async () => {
              showToast({
                severity: 'success',
                title: payload.nextStatus === 'INACTIVE' ? 'Estudiante deshabilitado' : 'Estudiante reactivado',
                description: `${buildFullName(statusTarget)} fue actualizado correctamente.`,
              })
              setStatusTarget(null)
              await fetchMetrics()
              await fetchStudents()
            })
            .catch((error) => {
              const message = error instanceof Error ? error.message : 'No se pudo actualizar el estado del estudiante.'
              showToast({
                severity: 'error',
                title: 'Estado no actualizado',
                description: message,
              })
            })
            .finally(() => setStatusLoading(false))
        }}
      />
      <StudentDetailModal
        open={Boolean(viewStudent)}
        student={viewStudent}
        onOpenChange={(open) => {
          if (!open) setViewStudent(null)
        }}
      />
      <DeleteUserModal
        open={Boolean(deleteTarget)}
        targetName={deleteTarget ? buildFullName(deleteTarget) : ''}
        targetMeta={deleteTarget ? `Mat. ${deleteTarget.enrollmentId} · ${deleteTarget.career?.code ?? 'N/D'} · ${deleteTarget.quarter}°` : undefined}
        entityLabel="estudiante"
        loading={deleteLoading}
        onClose={() => {
          if (!deleteLoading) setDeleteTarget(null)
        }}
        onConfirm={() => {
          if (!deleteTarget || deleteLoading) return
          setDeleteLoading(true)
          void deleteStudent(deleteTarget.id)
            .then(async () => {
              showToast({
                severity: 'success',
                title: 'Estudiante eliminado',
                description: `${buildFullName(deleteTarget)} fue eliminado correctamente.`,
              })
              setDeleteTarget(null)
              await fetchMetrics()
              await fetchStudents()
            })
            .catch((error) => {
              const message = error instanceof Error ? error.message : 'No se pudo eliminar el estudiante.'
              showToast({
                severity: 'error',
                title: 'Eliminación fallida',
                description: message,
              })
            })
            .finally(() => setDeleteLoading(false))
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
        subtitle={`${metrics.totalStudents} estudiantes registrados · ${metrics.activeStudents} con acceso activo`}
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
              onClick={() => setExportDialogOpen(true)}
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
          value={metrics.totalStudents}
          icon={Users}
          iconBg="bg-indigo-500/10"
          iconFg="text-indigo-600"
          delay={0}
        />
        <StatCard
          title="Activos con eLibro"
          value={metrics.activeStudents}
          subtitle="Acceso habilitado"
          icon={GraduationCap}
          iconBg="bg-emerald-500/10"
          iconFg="text-emerald-600"
          delay={0.05}
        />
        <StatCard
          title="Accesos eLibro"
          value={metrics.totalAccesses}
          subtitle="Periodo actual"
          icon={Activity}
          iconBg="bg-violet-500/10"
          iconFg="text-violet-600"
          delay={0.1}
        />
        <StatCard
          title="Inactivos"
          value={metrics.disabledStudents}
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
            <CardTitle className="text-sm font-semibold">Resumen de Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tasa de éxito</p>
                <p className="text-3xl font-semibold text-foreground">{metrics.successRate.toFixed(2)}%</p>
                <p className="text-sm text-muted-foreground">Calculado únicamente con accesos reales de eLibro.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/70 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Exitosos</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-800">{metrics.successfulAccesses}</p>
                </div>
                <div className="rounded-lg border border-rose-200/70 bg-rose-50/70 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Fallidos</p>
                  <p className="mt-1 text-2xl font-semibold text-rose-800">{metrics.failedAccesses}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <StudentsTable
        rows={rows}
        loading={loadingStudents}
        searchInput={searchInput}
        onSearchInputChange={(value) => {
          setSearchInput(value)
          setPage(0)
        }}
        onView={(student) => {
          setViewStudent(student)
        }}
        onEdit={(student) => {
          setEditingStudent(student)
        }}
        onDeactivate={(student) => setStatusTarget(student)}
        onReactivate={(student) => setStatusTarget(student)}
        onDelete={(student) => setDeleteTarget(student)}
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
        carreraF={draftFilters.careerCode}
        onCareerChange={(value) => {
          updateDraftFilter('careerCode', value)
        }}
        estadoF={draftFilters.status}
        onStatusChange={(value) => {
          updateDraftFilter('status', value)
        }}
        onClearFilters={() => {
          clearFilters()
          setSearchInput('')
          setPage(0)
        }}
        onResetFilters={resetDraftFilters}
        onApplyFilters={() => {
          applyFilters()
          setPage(0)
        }}
        activeFilterChips={activeFilterChips}
      />

    </motion.div>

  )
}

export default StudentsManagement
