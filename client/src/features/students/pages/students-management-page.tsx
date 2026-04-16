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
  FileText,
  FileSpreadsheet,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { CsvImportModal } from '@/features/students/components/import/csv-import-modal'
import type { CsvImportParsed } from '@/features/students/components/import/csv-import'
import { StudentsTable, type StudentManagementRow } from '@/features/students/components/StudentsTable'
import { StudentCreateModal as CreateStudentModal } from '@/features/students/components/modals/create-student-modal'
import { EditStudentModal } from '@/features/students/components/modals/edit-student-modal'
import { StudentDetailModal } from '@/features/students/components/modals/student-detail-modal'
import { StudentsFiltersPopover } from '@/features/students/components/filters/students-filters-popover'
import { DEFAULT_STUDENTS_TABLE_FILTERS } from '@/features/students/components/filters/students-filter-fields'
import { DeleteUserModal } from '@/features/admins/components/modals/delete-user-modal'
import { StudentStatusChangeModal } from '@/features/students/components/modals/student-status-change-modal'
import { listActiveCareers, type CareerDto } from '@/features/careers/api/careers-api'
import { useTableFilterState } from '@/shared/hooks/use-table-filter-state'
import {
  deactivateStudent,
  deleteStudent,
  exportStudentsReport,
  getStudentMetrics,
  importStudentsCsv,
  listStudents,
  reactivateStudent,
  resendStudentOnboardingEmail,
  type StudentExportFormat,
  type StudentMetricsResponseDto,
  type StudentResponseDto,
} from '@/features/students/api/students-api'

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
}

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
    setDraftFilters,
    appliedFilters,
    applyFilters,
    resetDraftFilters,
    clearFilters,
  } = useTableFilterState(DEFAULT_STUDENTS_TABLE_FILTERS)

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

  const [importLoading, setImportLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [isHeaderExportOpen, setIsHeaderExportOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [viewStudent, setViewStudent] = useState<StudentResponseDto | null>(null)
  const [editingStudent, setEditingStudent] = useState<StudentResponseDto | null>(null)
  const [statusTarget, setStatusTarget] = useState<StudentResponseDto | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StudentResponseDto | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

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
        student.status === 'PENDING'
          ? 'pendiente' as const
          : student.status === 'INACTIVE'
            ? 'inactivo' as const
            : student.mustChangePassword
              ? 'pendiente' as const
              : 'activo' as const,
      lastAccessLabel: formatRelativeAccess(student.lastLoginAt),
    }))
  ), [students])

  const actividadData = useMemo(() => formatActivityData(metrics), [metrics])

  const handleStudentCreated = useCallback(async () => {
    await fetchMetrics()
    if (page === 0) {
      await fetchStudents()
      return
    }
    setPage(0)
  }, [fetchMetrics, fetchStudents, page])

  const handleImportFile = useCallback(async (file: File): Promise<boolean> => {
    setImportLoading(true)
    try {
      const result = await importStudentsCsv(file)
      const emailJobs = result.emailJobs ?? []
      const pendingJobs = emailJobs.filter((job) => job.status === 'PENDING').length
      const sentJobs = emailJobs.filter((job) => job.status === 'SENT').length
      const failedJobs = emailJobs.filter((job) => job.status === 'FAILED').length
      const terminalJobs = emailJobs.filter((job) => job.status === 'PERMANENT_FAILURE').length
      showToast({
        severity: 'success',
        title: 'Importación completada',
        description: `Filas procesadas: ${result.totalRows} · Exitosas: ${result.successCount} · Con error: ${result.errorCount}${emailJobs.length > 0 ? ` · Correos: pendientes ${pendingJobs}, enviados ${sentJobs}, fallidos ${failedJobs}, terminales ${terminalJobs}` : ''}`,
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
      setIsHeaderExportOpen(false)
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

  const handleResendOnboarding = useCallback(async (student: StudentResponseDto) => {
    if (resendLoading || student.status !== 'PENDING') return

    setResendLoading(true)
    try {
      await resendStudentOnboardingEmail(student.id)
      showToast({
        severity: 'success',
        title: 'Correo reenviado',
        description: `Se reenviaron las instrucciones de acceso a ${buildFullName(student)}.`,
      })
      await fetchStudents()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo reenviar el correo de onboarding.'
      showToast({
        severity: 'error',
        title: 'Reenvío fallido',
        description: message,
      })
    } finally {
      setResendLoading(false)
    }
  }, [fetchStudents, resendLoading, showToast])

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <CreateStudentModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => void handleStudentCreated()}
      />
      <EditStudentModal
        open={Boolean(editingStudent)}
        student={editingStudent}
        onClose={() => setEditingStudent(null)}
        onSuccess={() => void handleStudentCreated()}
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
            <Popover open={isHeaderExportOpen} onOpenChange={setIsHeaderExportOpen}>
              <PopoverTrigger asChild>
                <Button disabled={exportLoading} variant="outline" size="md" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[180px] p-2">
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setIsHeaderExportOpen(false)
                      void handleExport('csv')
                    }}
                  >
                    <FileText className="size-4" />
                    Descargar CSV
                  </Button>
                  <div className="my-1 h-px bg-border" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setIsHeaderExportOpen(false)
                      void handleExport('xlsx')
                    }}
                  >
                    <FileSpreadsheet className="size-4" />
                    Descargar XLSX
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
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
          subtitle="Registrados"
          icon={Users}
          variant="info"
          delay={0}
        />
        <StatCard
          title="Activos con eLibro"
          value={metrics.activeStudents}
          subtitle="Acceso habilitado"
          icon={GraduationCap}
          variant="success"
          delay={0.05}
        />
        <StatCard
          title="Accesos eLibro"
          value={metrics.totalAccesses}
          subtitle="Periodo actual"
          icon={Activity}
          variant="primary"
          delay={0.1}
        />
        <StatCard
          title="Inactivos"
          value={metrics.disabledStudents}
          subtitle="Sin acceso"
          icon={UserX}
          variant="warning"
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
            {(() => {
              const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#22c55e', '#f97316', '#ef4444', '#0ea5e9']

              const counts = new Map<string, number>()
              for (const student of rows) {
                const code = student.career?.code ?? 'N/D'
                counts.set(code, (counts.get(code) ?? 0) + 1)
              }

              const sorted = Array.from(counts.entries())
                .sort((a, b) => b[1] - a[1])

              const top = sorted.slice(0, 6)
              const restTotal = sorted.slice(6).reduce((acc, [, value]) => acc + value, 0)

              const pieData = [
                ...top.map(([code, value], i) => ({ name: code, value, color: colors[i % colors.length] })),
                ...(restTotal > 0 ? [{ name: 'Otros', value: restTotal, color: '#94a3b8' }] : []),
              ].filter((item) => item.value > 0)

              return (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="45%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )
            })()}
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
        onResendOnboarding={(student) => void handleResendOnboarding(student)}
        resendLoading={resendLoading}
        page={page}
        totalElements={totalElements}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize)
          setPage(0)
        }}
        toolbarRight={(
          <StudentsFiltersPopover
            careers={careers}
            draftFilters={draftFilters}
            appliedFilters={appliedFilters}
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            onDraftChange={setDraftFilters}
            onApply={() => {
              applyFilters()
              setPage(0)
            }}
            onReset={resetDraftFilters}
            onClear={() => {
              clearFilters()
              setPage(0)
            }}
          />
        )}
      />

    </motion.div>

  )
}

export default StudentsManagement
