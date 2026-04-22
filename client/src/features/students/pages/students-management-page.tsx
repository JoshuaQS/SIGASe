import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  RefreshCw,
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
import { SplitHeroImportModal } from '@/features/students/components/import/SplitHeroImportModal'
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
  downloadStudentsImportTemplate,
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
const DEFAULT_SORT_BY: 'updatedAt' = 'updatedAt'
const DEFAULT_SORT_DIR: 'desc' = 'desc'

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
  const [pageJumpValue, setPageJumpValue] = useState('1')
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [sortBy, setSortBy] = useState<'updatedAt' | 'name' | 'enrollmentId' | 'career' | 'quarter' | 'status' | 'lastLoginAt'>(DEFAULT_SORT_BY)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIR)
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
    careerDistribution: [],
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
  const pendingSortScrollTopRef = useRef<number | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 350)
    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const activeFilters = useMemo(() => {
    const emailLocalPart = (appliedFilters.institutionalEmail ?? '').split('@')[0]?.trim() ?? ''
    const quarterValue =
      appliedFilters.quarter === 'todos'
        ? undefined
        : Number(String(appliedFilters.quarter))

    return {
      query: debouncedSearch.trim() || undefined,
      institutionalEmail: emailLocalPart || undefined,
      careerCode: appliedFilters.careerCode === 'todas' ? undefined : appliedFilters.careerCode,
      sex: appliedFilters.sex === 'todos' ? undefined : appliedFilters.sex,
      quarter: Number.isFinite(quarterValue) ? quarterValue : undefined,
      status: appliedFilters.status === 'todos' ? undefined : appliedFilters.status,
    }
  }, [appliedFilters, debouncedSearch])

  const hasActiveTableState = useMemo(() => {
    const hasSearch = searchInput.trim().length > 0
    const hasSort = sortBy !== DEFAULT_SORT_BY || sortDir !== DEFAULT_SORT_DIR

    const d = DEFAULT_STUDENTS_TABLE_FILTERS
    const hasFilters =
      (appliedFilters.institutionalEmail ?? '') !== d.institutionalEmail
      || appliedFilters.careerCode !== d.careerCode
      || appliedFilters.sex !== d.sex
      || appliedFilters.quarter !== d.quarter
      || appliedFilters.status !== d.status

    return hasSearch || hasSort || hasFilters
  }, [appliedFilters, searchInput, sortBy, sortDir])

  const handleResetTableState = useCallback(() => {
    setSearchInput('')
    clearFilters()
    setSortBy(DEFAULT_SORT_BY)
    setSortDir(DEFAULT_SORT_DIR)
    setPage(0)
  }, [clearFilters])

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
        institutionalEmail: activeFilters.institutionalEmail,
        careerCode: activeFilters.careerCode,
        sex: activeFilters.sex,
        quarter: activeFilters.quarter,
        status: activeFilters.status,
        page,
        size: pageSize,
        sortBy,
        sortDir,
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
  }, [activeFilters, page, pageSize, showToast, sortBy, sortDir])

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
  }, [appliedFilters, debouncedSearch])

  useEffect(() => {
    setPageJumpValue(String(page + 1))
  }, [page])

  useEffect(() => {
    if (loadingStudents) return
    if (pendingSortScrollTopRef.current === null) return

    const mainScrollable = document.querySelector('main.overflow-y-auto') as HTMLElement | null
    const fallback = document.scrollingElement as HTMLElement | null
    const target = mainScrollable ?? fallback
    if (!target) {
      pendingSortScrollTopRef.current = null
      return
    }

    const top = pendingSortScrollTopRef.current
    window.requestAnimationFrame(() => {
      target.scrollTop = top
      pendingSortScrollTopRef.current = null
    })
  }, [loadingStudents])

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
  const careerDistributionPieData = useMemo(() => {
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#22c55e', '#f97316', '#ef4444', '#0ea5e9']

    const totalsByCode = new Map(metrics.careerDistribution.map((item) => [item.careerCode, item.total]))
    const all = careers.map((career, i) => ({
      code: career.code,
      fullName: career.name,
      value: totalsByCode.get(career.code) ?? 0,
      color: colors[i % colors.length],
    }))

    // Keep stable ordering by catalog code to avoid visual jumps.
    return all.sort((a, b) => a.code.localeCompare(b.code))
  }, [careers, metrics.careerDistribution])

  const handlePageJumpSubmit = useCallback((submittedValue?: string) => {
    const raw = (submittedValue ?? pageJumpValue).trim()
    if (!raw) {
      setPageJumpValue(String(page + 1))
      return
    }

    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) {
      setPageJumpValue(String(page + 1))
      return
    }

    const boundedPage = Math.max(1, Math.min(Math.floor(parsed), Math.max(totalPages, 1)))
    setPageJumpValue(String(boundedPage))
    if (boundedPage - 1 !== page) {
      setPage(boundedPage - 1)
    }
  }, [page, pageJumpValue, totalPages])

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

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const { blob, filename } = await downloadStudentsImportTemplate('xlsx')
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      link.click()
      window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 2000)

      showToast({
        severity: 'success',
        title: 'Plantilla descargada',
        description: `Se descargó ${filename}.`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo descargar la plantilla oficial.'
      showToast({
        severity: 'error',
        title: 'Descarga fallida',
        description: message,
      })
    }
  }, [showToast])

  const handleExport = async (format: StudentExportFormat) => {
    setExportLoading(true)
    try {
      const { blob, filename } = await exportStudentsReport({
        query: activeFilters.query,
        institutionalEmail: activeFilters.institutionalEmail,
        careerCode: activeFilters.careerCode,
        sex: activeFilters.sex,
        quarter: activeFilters.quarter,
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
      <SplitHeroImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        importing={importLoading}
        onImport={handleImportFromModal}
        onDownloadTemplate={() => {
          void handleDownloadTemplate()
        }}
      />

      <SectionHeader
        icon={GraduationCap}
        title="Gestión de Estudiantes"
        subtitle="Administra el registro, el estado y el acceso de estudiantes en un solo lugar."
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
          title="Estudiantes habilitados"
          value={metrics.activeStudents}
          subtitle="Acceso habilitado"
          icon={GraduationCap}
          variant="success"
          delay={0.05}
        />
        <StatCard
          title="Estudiantes deshabilitados"
          value={metrics.disabledStudents}
          subtitle="Sin acceso"
          icon={UserX}
          variant="destructive"
          delay={0.1}
        />
        <StatCard
          title="Accesos a eLibro"
          value={metrics.totalAccesses}
          subtitle="Periodo actual"
          icon={Activity}
          variant="primary"
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
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={careerDistributionPieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="code"
                >
                  {careerDistributionPieData.map((entry, index) => (
                    <Cell key={`${entry.code}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(_value, _name, props) => {
                    const payload = (props as { payload?: { fullName?: string } }).payload
                    return [props.value, payload?.fullName ?? String(props.name ?? '')]
                  }}
                  labelFormatter={(_label, payload) => {
                    const item = payload?.[0]?.payload as { fullName?: string; code?: string } | undefined
                    return item?.fullName ?? item?.code ?? ''
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: '11px' }}
                  formatter={(value, _entry) => {
                    const code = String(value)
                    const item = careerDistributionPieData.find((it) => it.code === code)
                    return item?.code ?? code
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <StudentsTable
        rows={rows}
        loading={loadingStudents}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={(nextSortBy) => {
          const mainScrollable = document.querySelector('main.overflow-y-auto') as HTMLElement | null
          const fallback = document.scrollingElement as HTMLElement | null
          const target = mainScrollable ?? fallback
          if (target) {
            pendingSortScrollTopRef.current = target.scrollTop
          }

          // Cycle: default -> desc -> asc (only one active column).
          if (sortBy !== nextSortBy) {
            setSortBy(nextSortBy)
            setSortDir('desc')
            return
          }

          setSortDir((current) => (current === 'desc' ? 'asc' : 'desc'))
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
        pageJumpValue={pageJumpValue}
        onPageJumpChange={setPageJumpValue}
        onPageJumpSubmit={handlePageJumpSubmit}
        toolbarRight={(
          <div className="flex items-center gap-2">
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

            {hasActiveTableState ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                title="Reestablecer"
                onClick={handleResetTableState}
                className="group overflow-hidden"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="max-w-0 overflow-hidden opacity-0 transition-all duration-250 delay-200 group-hover:max-w-32 group-hover:opacity-100 group-hover:delay-250">
                  reestablecer
                </span>
              </Button>
            ) : null}
          </div>
        )}
      />

    </motion.div>

  )
}

export default StudentsManagement
