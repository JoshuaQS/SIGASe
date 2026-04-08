import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Shield, UserCheck, Clock } from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Dialog, DialogContent } from '@/shared/components/ui/dialog'
import StatCard from '@/shared/components/data-display/status-card'
import { SectionHeader } from '@/shared/components/ui/section-header'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { AppConfirmDialog } from '@/shared/components/ui/confirmation-dialog'
import { AdminDataTable, type AdminManagementRow, type AdminRole } from '@/features/admins/components/admin-data-table'
import { CreateAdminModal, type AdminFormValues } from '@/features/admins/components/modals/create-admin-modal'
import {
  listAdmins,
  createAdmin,
  updateAdmin,
  activateAdmin,
  deactivateAdmin,
  resetAdminPassword,
  getAdminDashboardMetrics,
  type AdminResponseDto,
  type AdminBackendRole,
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

const RADAR_COLORS: Record<string, string> = {
  ADMIN_TI: '#0d9488',
  ADMIN_BIBLIOTECA: '#8b5cf6',
}

const SEVERITY_DOT: Record<string, string> = {
  INFO: 'bg-primary',
  NOTICE: 'bg-blue-400',
  WARNING: 'bg-amber-500',
  SECURITY: 'bg-red-500',
  CRITICAL: 'bg-red-700',
}

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
}

const EMPTY_FORM: AdminFormValues = {
  email: '', name: '', lastNamePaternal: '', lastNameMaternal: '',
  password: '', role: 'ADMIN_TI', status: 'ACTIVE',
}

// ── Types ──────────────────────────────────────────────────────────────────────

type PendingAction =
  | { type: 'deactivate'; admin: AdminResponseDto }
  | { type: 'activate'; admin: AdminResponseDto }

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
  const diffDays = Math.floor(diffHours / 24)
  return `hace ${diffDays}d`
}

function formatRelativeOccurredAt(iso: string) {
  return formatRelativeAccess(iso)
}

function toRow(
  admin: AdminResponseDto,
  actionsMap: Map<string, number>,
): AdminManagementRow {
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

/**
 * Pivots flat roleModuleActivity rows into the format Recharts RadarChart expects:
 * [{ area: 'ADMINS', ADMIN_TI: 45, ADMIN_BIBLIOTECA: 10 }, ...]
 */
function buildRadarData(roleModuleActivity: AdminDashboardMetrics['roleModuleActivity']) {
  const map = new Map<string, Record<string, number>>()

  for (const item of roleModuleActivity) {
    const existing = map.get(item.module) ?? {}
    existing[item.role] = item.count
    map.set(item.module, existing)
  }

  return Array.from(map.entries()).map(([module, counts]) => ({
    area: module,
    ...counts,
  }))
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
  const [roleFilter, setRoleFilter] = useState<'todos' | AdminRole>('todos')
  const [page, setPage] = useState(0)

  // ── Action state ──────────────────────────────────────────────────────────
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

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

  // ── Derived: actionsPerAdmin lookup map ───────────────────────────────────
  const actionsMap = useMemo<Map<string, number>>(() => {
    if (!metrics) return new Map()
    return new Map(metrics.actionsPerAdmin.map((a) => [a.adminId, Number(a.totalActions)]))
  }, [metrics])

  // ── Derived: KPIs from metrics ────────────────────────────────────────────
  const summary = useMemo(() => ({
    total: metrics?.totalAdmins ?? 0,
    adminTi: metrics?.adminTiCount ?? 0,
    active: metrics?.activeAdmins ?? 0,
    inactive: metrics?.inactiveAdmins ?? 0,
    actionsToday: metrics?.actionsToday ?? 0,
    trend: metrics?.trendPercentage ?? 0,
  }), [metrics])

  // ── Derived: radar chart data ─────────────────────────────────────────────
  const radarData = useMemo(
    () => (metrics ? buildRadarData(metrics.roleModuleActivity) : []),
    [metrics],
  )

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
        role: roleFilter === 'todos' ? undefined : (roleFilter as AdminBackendRole),
        page,
        size: PAGE_SIZE,
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
  }, [debouncedSearch, roleFilter, page, showToast])

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = window.setTimeout(() => { void fetchMetrics() }, 0)
    return () => window.clearTimeout(id)
  }, [fetchMetrics])

  useEffect(() => {
    const id = window.setTimeout(() => { void fetchAdmins() }, 0)
    return () => window.clearTimeout(id)
  }, [fetchAdmins])

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

  // ── Activate / Deactivate ─────────────────────────────────────────────────
  const confirmDialogCopy = useMemo(() => {
    if (!pendingAction) return { title: '', description: '', confirmText: '', confirmColor: 'primary' as const }
    const name = buildFullName(pendingAction.admin)
    if (pendingAction.type === 'deactivate') {
      return { title: 'Desactivar administrador', description: `Se desactivará el acceso de ${name}. Podrá ser reactivado en cualquier momento.`, confirmText: 'Desactivar', confirmColor: 'error' as const }
    }
    return { title: 'Activar administrador', description: `Se reactivará el acceso de ${name}.`, confirmText: 'Activar', confirmColor: 'success' as const }
  }, [pendingAction])

  const handleConfirmAction = async () => {
    if (!pendingAction) return
    setActionLoading(true)
    try {
      const reason = pendingAction.type === 'deactivate'
        ? 'Desactivado desde el panel de gestión de administradores.'
        : 'Activado desde el panel de gestión de administradores.'

      if (pendingAction.type === 'deactivate') {
        await deactivateAdmin(pendingAction.admin.id, { reason })
        showToast({ severity: 'success', title: 'Administrador desactivado', description: `${buildFullName(pendingAction.admin)} ya no tiene acceso al sistema.` })
      } else {
        await activateAdmin(pendingAction.admin.id, { reason })
        showToast({ severity: 'success', title: 'Administrador activado', description: `${buildFullName(pendingAction.admin)} volvió a tener acceso.` })
      }

      const shouldGoBack = rows.length === 1 && page > 0
      setPendingAction(null)
      void fetchMetrics()
      if (shouldGoBack) { setPage((c) => c - 1) } else { await fetchAdmins() }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo completar la acción.'
      showToast({ severity: 'error', title: 'Acción no completada', description: message })
    } finally {
      setActionLoading(false)
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

      {/* Confirm dialog — activate / deactivate */}
      <AppConfirmDialog
        open={Boolean(pendingAction)}
        title={confirmDialogCopy.title}
        description={confirmDialogCopy.description}
        confirmText={actionLoading ? 'Procesando...' : confirmDialogCopy.confirmText}
        cancelText="Cancelar"
        confirmColor={confirmDialogCopy.confirmColor}
        onCancel={() => !actionLoading && setPendingAction(null)}
        onConfirm={() => { if (actionLoading) return; void handleConfirmAction() }}
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
        <StatCard title="Total Admins"  value={summary.total}      icon={Users}      iconBg="bg-violet-500/10"  iconFg="text-violet-600"  delay={0} />
        <StatCard title="Admin TI"      value={summary.adminTi}    icon={Shield}     iconBg="bg-amber-500/10"   iconFg="text-amber-600"   delay={0.05} />
        <StatCard title="Activos"       value={summary.active}     icon={UserCheck}  iconBg="bg-emerald-500/10" iconFg="text-emerald-600" delay={0.1} />
        <StatCard
          title="Acciones hoy"
          value={summary.actionsToday}
          icon={Clock}
          iconBg="bg-cyan-500/10"
          iconFg="text-cyan-600"
          trend={summary.trend}
          trendLabel="vs ayer"
          delay={0.15}
        />
      </div>

      {/* Charts + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Radar — activity by role and module */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Actividad por Rol y Módulo</CardTitle>
            <p className="text-xs text-muted-foreground">Nivel de uso de cada módulo por tipo de rol · últimos 30 días</p>
          </CardHeader>
          <CardContent>
            {radarData.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">Sin datos de actividad disponibles.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(128,128,128,0.2)" />
                    <PolarAngleAxis dataKey="area" tick={{ fill: '#64748b', fontSize: 11 }} />
                    {Object.keys(RADAR_COLORS).map((role) => (
                      <Radar
                        key={role}
                        name={role === 'ADMIN_TI' ? 'Admin TI' : 'Admin Biblioteca'}
                        dataKey={role}
                        stroke={RADAR_COLORS[role]}
                        fill={RADAR_COLORS[role]}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {Object.entries(RADAR_COLORS).map(([role, color]) => (
                    <div key={role} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                      {role === 'ADMIN_TI' ? 'Admin TI' : 'Admin Biblioteca'}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Actividad Reciente</CardTitle>
            <p className="text-xs text-muted-foreground">Últimas acciones de administradores</p>
          </CardHeader>
          <CardContent className="p-0">
            {!metrics || metrics.recentActivity.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">Sin actividad reciente registrada.</p>
            ) : metrics.recentActivity.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="flex items-start gap-3 px-5 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full mt-1 ${SEVERITY_DOT[a.severity ?? ''] ?? 'bg-muted-foreground'}`} />
                  {i < metrics.recentActivity.length - 1 && <div className="w-px h-6 bg-border" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {a.adminName ?? 'Sistema'} · {formatRelativeOccurredAt(a.occurredAt)}
                  </p>
                  <p className="text-sm text-foreground leading-tight truncate">
                    {a.action}{a.module ? ` · ${a.module}` : ''}
                  </p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Admin table */}
      <AdminDataTable
        title="Administradores"
        rows={rows}
        searchInput={searchInput}
        onSearchInputChange={(value) => { setSearchInput(value); setPage(0) }}
        roleFilter={roleFilter}
        onRoleFilterChange={(value) => { setRoleFilter(value); setPage(0) }}
        filteredCount={totalElements}
        page={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onEdit={handleOpenEdit}
        onDeactivate={(row) => {
          const source = admins.find((a) => a.id === row.id)
          if (source) setPendingAction({ type: 'deactivate', admin: source })
        }}
        onActivate={(row) => {
          const source = admins.find((a) => a.id === row.id)
          if (source) setPendingAction({ type: 'activate', admin: source })
        }}
        onResetPassword={(row) => {
          const source = admins.find((a) => a.id === row.id)
          if (source) { setResetAdmin(source); setNewPassword('') }
        }}
      />
    </motion.div>
  )
}

export default AdminsManagement
