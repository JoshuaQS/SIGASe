import { useMemo } from 'react'
import { ArrowUpDown, KeyRound, Pencil, PlayCircle, Power } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { DataTable } from '@/shared/components/ui/data-table'
import { DataTableFiltersShell, type DataTableFilterChip } from '@/shared/components/ui/data-table-filters-shell'

// ── Types ──────────────────────────────────────────────────────────────────────

export type AdminRole = 'ADMIN_TI' | 'ADMIN_BIBLIOTECA'

export type AdminManagementRow = {
  id: string
  nombre: string
  email: string
  rol: AdminRole
  area?: string
  estado: 'activo' | 'inactivo'
  ultimaAccion: string
  acciones?: number
}

type AdminsTableProps = {
  rows: AdminManagementRow[]
  searchInput: string
  onSearchInputChange: (value: string) => void
  roleFilter: 'todos' | AdminRole
  onRoleFilterChange: (value: 'todos' | AdminRole) => void
  statusFilter: 'todos' | 'ACTIVE' | 'INACTIVE'
  onStatusFilterChange: (value: 'todos' | 'ACTIVE' | 'INACTIVE') => void
  filtersOpen: boolean
  onFiltersToggle: () => void
  onApplyFilters: () => void
  onResetFilters: () => void
  onClearFilters: () => void
  activeFilterChips: DataTableFilterChip[]
  filteredCount: number
  page: number
  totalPages: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onEdit: (admin: AdminManagementRow) => void
  onDeactivate: (admin: AdminManagementRow) => void
  onActivate: (admin: AdminManagementRow) => void
  onResetPassword: (admin: AdminManagementRow) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const roleStyles: Record<AdminRole, { badge: string; label: string }> = {
  ADMIN_TI: { badge: 'text-violet-600 border-violet-200 bg-violet-50', label: 'Admin TI' },
  ADMIN_BIBLIOTECA: { badge: 'text-cyan-600 border-cyan-200 bg-cyan-50', label: 'Admin Biblioteca' },
}

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AdminsTable({
  rows,
  searchInput,
  onSearchInputChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  filtersOpen,
  onFiltersToggle,
  onApplyFilters,
  onResetFilters,
  onClearFilters,
  activeFilterChips,
  filteredCount,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDeactivate,
  onActivate,
  onResetPassword,
}: AdminsTableProps) {
  const pageCount = Math.max(totalPages, 1)

  const pageItems = useMemo(() => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
    const items: Array<number | string> = []
    const left = Math.max(2, page + 1 - 1)
    const right = Math.min(pageCount - 1, page + 1 + 1)
    items.push(1)
    if (left > 2) items.push('...')
    for (let n = left; n <= right; n++) items.push(n)
    if (right < pageCount - 1) items.push('...')
    items.push(pageCount)
    return items
  }, [page, pageCount])

  const filterPanel = (
    <DataTableFiltersShell
      open={filtersOpen}
      chips={activeFilterChips}
      onApply={onApplyFilters}
      onReset={onResetFilters}
      onClear={onClearFilters}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Rol</label>
          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value as 'todos' | AdminRole)}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="todos">Todos los roles</option>
            <option value="ADMIN_TI">Admin TI</option>
            <option value="ADMIN_BIBLIOTECA">Admin Biblioteca</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as 'todos' | 'ACTIVE' | 'INACTIVE')}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="todos">Todos</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
          </select>
        </div>
      </div>
    </DataTableFiltersShell>
  )

  return (
    <DataTable
      title="Administradores"
      meta={`${filteredCount} administradores, mostrando ${rows.length}`}
      search={{
        value: searchInput,
        onChange: onSearchInputChange,
        placeholder: 'Buscar por nombre o correo...',
      }}
      viewToggle={true}
      tableLabel="Table"
      cardsLabel="Cards"
      toolbarRight={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={onFiltersToggle}
        >
          <ArrowUpDown className="h-3 w-3" />
          Filtrar
        </Button>
      }
      toolbarBelow={filterPanel}
      renderTable={() => (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/40">
                {['Nombre', 'Correo', 'Rol', 'Estado', 'Acciones', 'Última acción', ''].map((col) => (
                  <th
                    key={col || '_menu'}
                    className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                  >
                    {col ? (
                      <span className="inline-flex items-center gap-1">
                        {col}
                        <ArrowUpDown className="h-3 w-3" />
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No hay administradores para los filtros seleccionados.
                  </td>
                </tr>
              ) : rows.map((admin) => {
                const role = roleStyles[admin.rol]
                const isActive = admin.estado === 'activo'
                return (
                  <tr
                    key={admin.id}
                    className="border-b border-border transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-[11px] font-semibold text-primary">{initials(admin.nombre)}</span>
                        </div>
                        <span className="max-w-[180px] truncate text-sm font-semibold text-foreground">
                          {admin.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{admin.email}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outlined" className={`text-xs ${role.badge}`}>{role.label}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="outlined"
                        className={`text-xs capitalize ${isActive ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-muted-foreground border-border'}`}
                      >
                        {admin.estado}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-sm font-semibold text-foreground">
                      {admin.acciones !== undefined ? admin.acciones : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {admin.ultimaAccion}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Editar"
                          onClick={() => onEdit(admin)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Restablecer contraseña"
                          onClick={() => onResetPassword(admin)}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        {isActive ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-success hover:bg-destructive/10 hover:text-destructive"
                            title="Desactivar"
                            onClick={() => onDeactivate(admin)}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:bg-success/10 hover:text-success"
                            title="Activar"
                            onClick={() => onActivate(admin)}
                          >
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      renderCards={() => (
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {rows.length === 0 ? (
            <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
              No hay administradores para los filtros seleccionados.
            </div>
          ) : rows.map((admin) => {
            const role = roleStyles[admin.rol]
            const isActive = admin.estado === 'activo'
            return (
              <div
                key={admin.id}
                className="group flex flex-col rounded-xl border border-border bg-background p-4 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-xs font-bold text-primary">{initials(admin.nombre)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{admin.nombre}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{admin.email}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outlined"
                    className={`ml-2 flex-shrink-0 text-xs capitalize ${isActive ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-muted-foreground border-border'}`}
                  >
                    {admin.estado}
                  </Badge>
                </div>
                <Badge variant="outlined" className={`mb-3 self-start text-xs ${role.badge}`}>
                  {role.label}
                </Badge>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{admin.ultimaAccion}</span>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => onEdit(admin)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {isActive ? (
                      <Button type="button" variant="ghost" size="icon-xs" onClick={() => onDeactivate(admin)}>
                        <Power className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button type="button" variant="ghost" size="icon-xs" onClick={() => onActivate(admin)}>
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      pagination={{
        summary: `${filteredCount} administradores · ${rows.length} mostrados`,
        pageSize,
        pageSizeOptions: [5, 10, 20],
        onPageSizeChange,
        items: pageItems,
        active: page + 1,
        onItemClick: (item) => {
          if (typeof item === 'number') onPageChange(item - 1)
        },
      }}
    />
  )
}
