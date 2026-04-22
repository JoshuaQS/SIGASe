import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Shield, UserCheck, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import StatCard from '@/shared/components/data-display/status-card'
import { SectionHeader } from '@/shared/components/ui/section-header'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { AdminsTable, type AdminManagementRow, type AdminRole } from '@/features/admins/components/AdminsTable'
import AdminGraphs from '@/features/admins/components/admin-graphs'
import type { AdminFormValues } from '@/features/admins/components/modals/create-admin-modal'
import { CreateAdminModal } from '@/features/admins/components/modals/create-admin-modal'
import { AdminsFiltersPopover } from '@/features/admins/components/filters/admins-filters-popover'
import { DEFAULT_ADMINS_TABLE_FILTERS } from '@/features/admins/components/filters/admins-filter-fields'
import { useTableFilterState } from '@/shared/hooks/use-table-filter-state'
import { AppConfirmDialog } from '@/shared/components/ui/confirmation-dialog'
import {
  listAdmins,
  createAdmin,
  updateAdmin,
  activateAdmin,
  deactivateAdmin,
  resetAdminPassword,
  deleteAdmin,
  getAdminDashboardMetrics,
  type AdminResponseDto,
  type AdminBackendRole,
  type AdminDashboardMetrics,
} from '@/features/admins/api/admins-api'

// ── Constants ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8

const EMPTY_FORM: AdminFormValues = {
  email: '', name: '', lastNamePaternal: '', lastNameMaternal: '',
  role: 'ADMIN_TI',
}

// ── Types ──────────────────────────────────────────────────────────────────────

type ConfirmAction =
  | { type: 'activate'; admin: AdminResponseDto }
  | { type: 'deactivate'; admin: AdminResponseDto }
  | { type: 'delete'; admin: AdminResponseDto }

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildFullName(admin: AdminResponseDto) {
  return [admin.name, admin.lastNamePaternal, admin.lastNameMaternal ?? '']
    .join(' ').replace(/\s+/g, ' ').trim()
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
  return `hace ${Math.floor(diffHours / 24)}d`
}

function toRow(admin: AdminResponseDto, actionsMap: Map<string, number>): AdminManagementRow {
  return {
    id: admin.id,
    nombre: buildFullName(admin),
    email: admin.email,
    rol: admin.role as AdminRole,
    estado: admin.status === 'ACTIVE' ? 'activo' : 'inactivo',
    ultimaAccion: formatRelativeAccess(admin.lastLoginAt),
    acciones: actionsMap.get(admin.id),
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

const AdminsManagement = () => {
  const { showToast } = useAppToast()

  // ── Data state ────────────────────────────────────────────────────────────
  const [admins, setAdmins] = useState<AdminResponseDto[]>([])
  const [adminsLoading, setAdminsLoading] = useState(false)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null)

  // ── Filter / pagination state ─────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [sortBy, setSortBy] = useState<'updatedAt' | 'email' | 'name' | 'role' | 'status' | 'lastLoginAt'>('updatedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const {
    filtersOpen,
    setFiltersOpen,
    draftFilters,
    setDraftFilters,
    appliedFilters,
    applyFilters,
    resetDraftFilters,
    clearFilters,
  } = useTableFilterState(DEFAULT_ADMINS_TABLE_FILTERS)

  // ── Confirmation state ────────────────────────────────────────────────────
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // ── Create / edit modal state ─────────────────────────────────────────────
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<AdminResponseDto | null>(null)
  const [formValues, setFormValues] = useState<AdminFormValues>(EMPTY_FORM)
  const [formLoading, setFormLoading] = useState(false)

  // ── Reset password modal state ────────────────────────────────────────────
  const [resetAdmin, setResetAdmin] = useState<AdminResponseDto | null>(null)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  // ── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput), 350)
    return () => window.clearTimeout(id)
  }, [searchInput])

  // ── Derived ───────────────────────────────────────────────────────────────
  const actionsMap = useMemo<Map<string, number>>(() => {
    if (!metrics) return new Map()
    return new Map(metrics.actionsPerAdmin.map((a) => [a.adminId, Number(a.totalActions)]))
  }, [metrics])

  const summary = useMemo(() => ({
    total: metrics?.totalAdmins ?? 0,
    adminTi: metrics?.adminTiCount ?? 0,
    active: metrics?.activeAdmins ?? 0,
    inactive: metrics?.inactiveAdmins ?? 0,
    actionsToday: metrics?.actionsToday ?? 0,
    trend: metrics?.trendPercentage ?? 0,
  }), [metrics])

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    try {
      const data = await getAdminDashboardMetrics()
      setMetrics(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cargar la analítica de administradores.'
      showToast({
        severity: 'warning',
        title: 'Métricas no disponibles',
        description: message,
      })
    }
  }, [showToast])

  const fetchAdmins = useCallback(async () => {
    setAdminsLoading(true)
    try {
      const response = await listAdmins({
        query: debouncedSearch.trim() || undefined,
        role: appliedFilters.role === 'todos' ? undefined : (appliedFilters.role as AdminBackendRole),
        status: appliedFilters.status === 'todos' ? undefined : appliedFilters.status,
        page,
        size: pageSize,
        sortBy,
        sortDir,
      })
      setAdmins(response.content)
      setTotalElements(response.totalElements)
      setTotalPages(response.totalPages)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cargar la lista de administradores.'
      showToast({ severity: 'error', title: 'Error cargando administradores', description: message })
    } finally {
      setAdminsLoading(false)
    }
  }, [appliedFilters.role, appliedFilters.status, debouncedSearch, page, pageSize, showToast, sortBy, sortDir])

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = window.setTimeout(() => { void fetchMetrics() }, 0)
    return () => window.clearTimeout(id)
  }, [fetchMetrics])

  useEffect(() => {
    const id = window.setTimeout(() => { void fetchAdmins() }, 0)
    return () => window.clearTimeout(id)
  }, [fetchAdmins])

  useEffect(() => {
    setPage(0)
  }, [appliedFilters.role, appliedFilters.status, debouncedSearch, sortBy, sortDir])

  // ── Table rows ────────────────────────────────────────────────────────────
  const rows = useMemo(
    () => admins.map((a) => toRow(a, actionsMap)),
    [admins, actionsMap],
  )

  // ── Create ────────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setFormValues(EMPTY_FORM)
    setCreateModalOpen(true)
  }

  const handleCreate = async (nextValues: AdminFormValues) => {
    setFormValues(nextValues)
    setFormLoading(true)
    try {
      await createAdmin({
        email: nextValues.email ?? '',
        name: nextValues.name ?? '',
        lastNamePaternal: nextValues.lastNamePaternal ?? '',
        lastNameMaternal: nextValues.lastNameMaternal || null,
        role: nextValues.role,
      })
      showToast({ severity: 'success', title: 'Administrador creado', description: `${nextValues.name} ${nextValues.lastNamePaternal} fue registrado correctamente.` })
      setCreateModalOpen(false)
      void fetchMetrics()
      if (page === 0) { await fetchAdmins() } else { setPage(0) }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el administrador.'
      showToast({ severity: 'error', title: 'Error al crear', description: message })
    } finally {
      setFormLoading(false)
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleOpenEdit = (row: AdminManagementRow) => {
    const source = admins.find((a) => a.id === row.id)
    if (!source) return
      setEditingAdmin(source)
      setFormValues({
        email: source.email, name: source.name,
        lastNamePaternal: source.lastNamePaternal,
        lastNameMaternal: source.lastNameMaternal ?? '',
        role: source.role as AdminBackendRole,
      })
  }

  const handleEdit = async (nextValues: AdminFormValues) => {
    if (!editingAdmin) return
    setFormValues(nextValues)
    setFormLoading(true)
    try {
      await updateAdmin(editingAdmin.id, {
        email: nextValues.email ?? '',
        name: nextValues.name ?? '',
        lastNamePaternal: nextValues.lastNamePaternal ?? '',
        lastNameMaternal: nextValues.lastNameMaternal || null,
        role: nextValues.role,
      })
      showToast({ severity: 'success', title: 'Administrador actualizado', description: `${nextValues.name} ${nextValues.lastNamePaternal} fue actualizado correctamente.` })
      setEditingAdmin(null)
      void fetchMetrics()
      await fetchAdmins()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el administrador.'
      showToast({ severity: 'error', title: 'Error al actualizar', description: message })
    } finally {
      setFormLoading(false)
    }
  }

  const handleConfirmDialog = async () => {
    if (!confirmAction) return
    setConfirmLoading(true)
    try {
      if (confirmAction.type === 'activate') {
        const reason = 'Reactivado desde el panel de gestión de administradores.'
        await activateAdmin(confirmAction.admin.id, { reason })
        showToast({
          severity: 'success',
          title: 'Administrador reactivado',
          description: `${buildFullName(confirmAction.admin)} recuperó acceso al sistema.`,
        })
        const shouldGoBack = rows.length === 1 && page > 0
        setConfirmAction(null)
        void fetchMetrics()
        if (shouldGoBack) { setPage((c) => c - 1) } else { await fetchAdmins() }
        return
      }

      if (confirmAction.type === 'deactivate') {
        const reason = 'Desactivado desde el panel de gestión de administradores.'
        await deactivateAdmin(confirmAction.admin.id, { reason })
        showToast({
          severity: 'success',
          title: 'Administrador deshabilitado',
          description: `${buildFullName(confirmAction.admin)} ya no tiene acceso al sistema.`,
        })
        const shouldGoBack = rows.length === 1 && page > 0
        setConfirmAction(null)
        void fetchMetrics()
        if (shouldGoBack) { setPage((c) => c - 1) } else { await fetchAdmins() }
        return
      }

      await deleteAdmin(confirmAction.admin.id)
      showToast({
        severity: 'success',
        title: 'Administrador eliminado',
        description: `${buildFullName(confirmAction.admin)} fue eliminado correctamente.`,
      })
      const shouldGoBack = rows.length === 1 && page > 0
      setConfirmAction(null)
      void fetchMetrics()
      if (shouldGoBack) { setPage((c) => c - 1) } else { await fetchAdmins() }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo completar la acción.'
      showToast({ severity: 'error', title: 'Acción no completada', description: message })
    } finally {
      setConfirmLoading(false)
    }
  }

  // ── Reset password ────────────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!resetAdmin) return
    setResetLoading(true)
    try {
      await resetAdminPassword(resetAdmin.id, {})
      showToast({ severity: 'success', title: 'Contraseña restablecida', description: `Se generó una nueva contraseña temporal para ${buildFullName(resetAdmin)}.` })
      setResetAdmin(null)
      setResetConfirmOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo restablecer la contraseña.'
      showToast({ severity: 'error', title: 'Error al restablecer', description: message })
    } finally {
      setResetLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <AppConfirmDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'delete'
            ? 'Eliminar administrador'
            : confirmAction?.type === 'activate'
              ? 'Reactivar administrador'
              : 'Deshabilitar administrador'
        }
        description={
          confirmAction?.type === 'delete'
            ? 'Esta acción eliminará definitivamente al administrador. Esta operación no se puede deshacer.'
            : confirmAction?.type === 'activate'
              ? 'Esta acción restaurará el acceso del administrador al sistema de forma inmediata.'
              : 'Esta acción bloqueará el acceso del administrador al sistema. Podrás reactivarlo más tarde desde backend.'
        }
        confirmText={
          confirmAction?.type === 'delete'
            ? 'Eliminar'
            : confirmAction?.type === 'activate'
              ? 'Reactivar'
              : 'Deshabilitar'
        }
        cancelText="Cancelar"
        confirmColor={
          confirmAction?.type === 'delete'
            ? 'error'
            : confirmAction?.type === 'activate'
              ? 'success'
              : 'warning'
        }
        onCancel={() => !confirmLoading && setConfirmAction(null)}
        onConfirm={() => { if (!confirmLoading) void handleConfirmDialog() }}
        isConfirming={confirmLoading}
      />

      <AppConfirmDialog
        open={resetConfirmOpen}
        title="Confirmar restablecimiento de contraseña"
        description={
          resetAdmin
            ? `Se generará una contraseña temporal para ${buildFullName(resetAdmin)} y se enviará por correo.`
            : 'Se actualizará la contraseña del administrador seleccionado.'
        }
        confirmText="Generar contraseña"
        cancelText="Cancelar"
        confirmColor="warning"
        onCancel={() => !resetLoading && setResetConfirmOpen(false)}
        onConfirm={() => {
          if (resetLoading) return
          void handleResetPassword()
        }}
        isConfirming={resetLoading}
      />

      {/* Create / edit modal */}
      <CreateAdminModal
        open={createModalOpen || Boolean(editingAdmin)}
        mode={editingAdmin ? 'edit' : 'create'}
        values={formValues}
        loading={formLoading}
        admin={editingAdmin}
        onClose={() => { setCreateModalOpen(false); setEditingAdmin(null) }}
        onSubmit={editingAdmin ? handleEdit : handleCreate}
      />

      {/* Header */}
      <SectionHeader
        icon={Users}
        title="Gestión de Administradores"
        subtitle="Gestiona cuentas administrativas y controla quién puede operar el sistema."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              className="gap-2"
              onClick={() => {
                void fetchMetrics()
                void fetchAdmins()
              }}
              disabled={adminsLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${adminsLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button size="md" className="gap-2" onClick={handleOpenCreate}>
              <Plus className="w-3.5 h-3.5" />
              Registrar administrador
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard className="min-h-[120px]" title="Administradores totales" value={summary.total} icon={Users} variant="primary" delay={0} />
        <StatCard className="min-h-[120px]" title="Administradores de Biblioteca totales" value={summary.adminTi} icon={Shield} variant="warning" delay={0.05} />
        <StatCard className="min-h-[120px]" title="Administradores habilitados" value={summary.active} icon={UserCheck} variant="success" delay={0.1} />
          <StatCard
            className="min-h-[120px]"
            title="Acciones de hoy"
            value={summary.actionsToday}
            icon={Clock}
            variant="info"
            trend={summary.trend}
          trendLabel="vs período ant."
            delay={0.15}
          />
      </div>

      <AdminGraphs metrics={metrics} />

      {/* Admin table */}
      <AdminsTable
        rows={rows}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={(nextSortBy) => {
          setSortDir((currentDir) => (sortBy === nextSortBy ? (currentDir === 'asc' ? 'desc' : 'asc') : 'asc'))
          setSortBy(nextSortBy)
          setPage(0)
        }}
        filteredCount={totalElements}
        loading={adminsLoading}
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize)
          setPage(0)
        }}
        onEdit={handleOpenEdit}
        onResetPassword={(row) => {
          const source = admins.find((a) => a.id === row.id)
          if (source) {
            setResetAdmin(source)
            setResetConfirmOpen(true)
          }
        }}
        onDeactivate={(row) => {
          const source = admins.find((a) => a.id === row.id)
          if (source) setConfirmAction({ type: 'deactivate', admin: source })
        }}
        onReactivate={(row) => {
          const source = admins.find((a) => a.id === row.id)
          if (source) setConfirmAction({ type: 'activate', admin: source })
        }}
        onDelete={(row) => {
          const source = admins.find((a) => a.id === row.id)
          if (source) setConfirmAction({ type: 'delete', admin: source })
        }}
        toolbarRight={(
          <AdminsFiltersPopover
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

export default AdminsManagement
