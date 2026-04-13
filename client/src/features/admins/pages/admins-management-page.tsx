import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Shield, UserCheck, Clock } from 'lucide-react'
import { Card } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Dialog, DialogContent } from '@/shared/components/ui/dialog'
import StatCard from '@/shared/components/data-display/status-card'
import { SectionHeader } from '@/shared/components/ui/section-header'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { AdminsTable, type AdminManagementRow, type AdminRole } from '@/features/admins/components/AdminsTable'
import AdminGraphs from '@/features/admins/components/admin-graphs'
import type { AdminFormValues } from '@/features/admins/components/modals/create-admin-modal'
import { CreateAdminModal } from '@/features/admins/components/modals/create-admin-modal'
import { useTableFilterState } from '@/shared/hooks/use-table-filter-state'
import { AppConfirmDialog } from '@/shared/components/ui/confirmation-dialog'
import {
  listAdmins,
  createAdmin,
  updateAdmin,
  deactivateAdmin,
  resetAdminPassword,
  deleteAdmin,
  getAdminDashboardMetrics,
  type AdminResponseDto,
  type AdminBackendRole,
  type AdminBackendStatus,
  type AdminDashboardMetrics,
} from '@/features/admins/api/admins-api'
import {
  ModalFormBody,
  ModalFormFooter,
  ModalFormHeader,
  modalFormShellClass,
} from '@/shared/components/ui/forms/modal-form-primitives'

// ── Constants ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5

const EMPTY_FORM: AdminFormValues = {
  email: '', name: '', lastNamePaternal: '', lastNameMaternal: '',
  password: '', role: 'ADMIN_TI', status: 'ACTIVE',
}

const DEFAULT_TABLE_FILTERS = {
  role: 'todos' as 'todos' | AdminRole,
  status: 'todos' as 'todos' | AdminBackendStatus,
}

// ── Types ──────────────────────────────────────────────────────────────────────

type ConfirmAction =
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
  const [loading, setLoading] = useState(true)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null)

  // ── Filter / pagination state ─────────────────────────────────────────────
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
  const [newPassword, setNewPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

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
    } catch {
      // Non-critical — widgets degrade gracefully
    }
  }, [])

  const fetchAdmins = useCallback(async () => {
    setLoading(true)
    try {
      const response = await listAdmins({
        query: debouncedSearch.trim() || undefined,
        role: appliedFilters.role === 'todos' ? undefined : (appliedFilters.role as AdminBackendRole),
        status: appliedFilters.status === 'todos' ? undefined : appliedFilters.status,
        page,
        size: pageSize,
        sortBy: 'updatedAt',
        sortDir: 'desc',
      })
      setAdmins(response.content)
      setTotalElements(response.totalElements)
      setTotalPages(response.totalPages)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cargar la lista de administradores.'
      showToast({ severity: 'error', title: 'Error cargando administradores', description: message })
    } finally {
      setLoading(false)
    }
  }, [appliedFilters.role, appliedFilters.status, debouncedSearch, page, pageSize, showToast])

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
  }, [appliedFilters.role, appliedFilters.status])

  // ── Table rows ────────────────────────────────────────────────────────────
  const rows = useMemo(
    () => admins.map((a) => toRow(a, actionsMap)),
    [admins, actionsMap],
  )

  const activeFilterChips = useMemo(() => ([
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
    ...(appliedFilters.role !== 'todos'
      ? [{
          id: 'role',
          label: `Rol: ${appliedFilters.role === 'ADMIN_TI' ? 'Admin TI' : 'Admin Biblioteca'}`,
          onClear: () => {
            commitAppliedFilters((current) => ({ ...current, role: 'todos' }))
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
  ]), [appliedFilters.role, appliedFilters.status, commitAppliedFilters, searchInput])

  // ── Create ────────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setFormValues(EMPTY_FORM)
    setCreateModalOpen(true)
  }

  const handleCreate = async () => {
    setFormLoading(true)
    try {
      await createAdmin({ ...formValues, lastNameMaternal: formValues.lastNameMaternal || null })
      showToast({ severity: 'success', title: 'Administrador creado', description: `${formValues.name} ${formValues.lastNamePaternal} fue registrado correctamente.` })
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
      password: '', role: source.role as AdminBackendRole, status: source.status,
    })
  }

  const handleEdit = async () => {
    if (!editingAdmin) return
    setFormLoading(true)
    try {
      await updateAdmin(editingAdmin.id, {
        email: formValues.email, name: formValues.name,
        lastNamePaternal: formValues.lastNamePaternal,
        lastNameMaternal: formValues.lastNameMaternal || null,
        role: formValues.role,
      })
      showToast({ severity: 'success', title: 'Administrador actualizado', description: `${formValues.name} ${formValues.lastNamePaternal} fue actualizado correctamente.` })
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
    if (!resetAdmin || !newPassword.trim()) return
    setResetLoading(true)
    try {
      await resetAdminPassword(resetAdmin.id, { newPassword: newPassword.trim() })
      showToast({ severity: 'success', title: 'Contraseña restablecida', description: `La contraseña de ${buildFullName(resetAdmin)} fue actualizada.` })
      setResetAdmin(null)
      setNewPassword('')
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
        title={confirmAction?.type === 'delete' ? 'Eliminar administrador' : 'Deshabilitar administrador'}
        description={confirmAction?.type === 'delete'
          ? 'Esta acción eliminará definitivamente al administrador. Esta operación no se puede deshacer.'
          : 'Esta acción bloqueará el acceso del administrador al sistema. Podrás reactivarlo más tarde desde backend.'}
        confirmText={confirmAction?.type === 'delete' ? 'Eliminar' : 'Deshabilitar'}
        cancelText="Cancelar"
        confirmColor={confirmAction?.type === 'delete' ? 'error' : 'warning'}
        onCancel={() => !confirmLoading && setConfirmAction(null)}
        onConfirm={() => { if (!confirmLoading) void handleConfirmDialog() }}
      />

      {/* Create / edit modal */}
      <CreateAdminModal
        open={createModalOpen || Boolean(editingAdmin)}
        mode={editingAdmin ? 'edit' : 'create'}
        values={formValues}
        loading={formLoading}
        admin={editingAdmin}
        onClose={() => { setCreateModalOpen(false); setEditingAdmin(null) }}
        onChange={(key, value) => setFormValues((prev) => ({ ...prev, [key]: value }))}
        onSubmit={editingAdmin ? handleEdit : handleCreate}
      />

      {/* Reset password modal */}
      <Dialog open={Boolean(resetAdmin)} onOpenChange={(open) => { if (!open) { setResetAdmin(null); setNewPassword('') } }}>
        <DialogContent showCloseButton={false} animation="fade" className="max-w-md border-0 bg-transparent p-0 shadow-none">
          <div className={modalFormShellClass}>
            <ModalFormHeader
              avatar={<span className="text-sm font-semibold text-primary">
                {resetAdmin ? buildFullName(resetAdmin).split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') : ''}
              </span>}
              title="Restablecer contraseña"
              subtitle={resetAdmin ? buildFullName(resetAdmin) : ''}
              onClose={() => { setResetAdmin(null); setNewPassword('') }}
            />
            <ModalFormBody>
              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-foreground">Nueva contraseña</span>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Ingresa la nueva contraseña" autoComplete="new-password" />
              </label>
            </ModalFormBody>
            <ModalFormFooter>
              <Button variant="outline" onClick={() => { setResetAdmin(null); setNewPassword('') }} disabled={resetLoading}>Cancelar</Button>
              <Button onClick={() => void handleResetPassword()} isLoading={resetLoading} disabled={!newPassword.trim()}>Restablecer</Button>
            </ModalFormFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <SectionHeader
        icon={Users}
        title="Gestión de Administradores"
        subtitle={`${summary.total} administradores · ${summary.active} activos`}
        actions={
          <Button size="md" className="gap-2" onClick={handleOpenCreate}>
            <Plus className="w-3.5 h-3.5" /> Invitar Admin
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard className="min-h-[120px]" title="Total Admins" value={summary.total} icon={Users} variant="primary" delay={0} />
        <StatCard className="min-h-[120px]" title="Admin TI" value={summary.adminTi} icon={Shield} variant="warning" delay={0.05} />
        <StatCard className="min-h-[120px]" title="Activos" value={summary.active} icon={UserCheck} variant="success" delay={0.1} />
        <StatCard
          className="min-h-[120px]"
          title="Acciones hoy"
          value={summary.actionsToday}
          icon={Clock}
          variant="info"
          trend={summary.trend}
          trendLabel="vs ayer"
          delay={0.15}
        />
      </div>

      <AdminGraphs metrics={metrics} />

      {/* Admin table */}
      <AdminsTable
        rows={rows}
        searchInput={searchInput}
        onSearchInputChange={(value) => { setSearchInput(value); setPage(0) }}
        roleFilter={draftFilters.role}
        onRoleFilterChange={(value) => { updateDraftFilter('role', value) }}
        statusFilter={draftFilters.status}
        onStatusFilterChange={(value) => { updateDraftFilter('status', value) }}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen((c) => !c)}
        onApplyFilters={() => {
          applyFilters()
          setPage(0)
        }}
        onResetFilters={resetDraftFilters}
        onClearFilters={() => {
          clearFilters()
          setSearchInput('')
          setPage(0)
        }}
        activeFilterChips={activeFilterChips}
        filteredCount={totalElements}
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(next) => { setPageSize(next); setPage(0) }}
        onEdit={handleOpenEdit}
        onResetPassword={(row) => {
          const source = admins.find((a) => a.id === row.id)
          if (source) { setResetAdmin(source); setNewPassword('') }
        }}
        onDeactivate={(row) => {
          const source = admins.find((a) => a.id === row.id)
          if (source) setConfirmAction({ type: 'deactivate', admin: source })
        }}
        onDelete={(row) => {
          const source = admins.find((a) => a.id === row.id)
          if (source) setConfirmAction({ type: 'delete', admin: source })
        }}
      />
    </motion.div>
  )
}

export default AdminsManagement
