import { useMemo } from 'react'
import { ArrowUpDown, KeyRound, Loader2, Pencil, Power, RotateCcw, Trash2 } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { DataTable } from '@/shared/components/ui/data-table'
import type { ReactNode } from 'react'

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
  filteredCount: number
  loading?: boolean
  page: number
  totalPages: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onEdit: (admin: AdminManagementRow) => void
  onResetPassword: (admin: AdminManagementRow) => void
  onDeactivate: (admin: AdminManagementRow) => void
  onReactivate: (admin: AdminManagementRow) => void
  onDelete: (admin: AdminManagementRow) => void
  toolbarRight?: ReactNode
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const roleStyles: Record<AdminRole, { badge: string; label: string }> = {
  ADMIN_TI: { badge: 'text-violet-700 border-violet-200 bg-violet-50 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300', label: 'Admin TI' },
  ADMIN_BIBLIOTECA: { badge: 'text-cyan-700 border-cyan-200 bg-cyan-50 dark:border-cyan-900/60 dark:bg-cyan-950/30 dark:text-cyan-300', label: 'Admin Biblioteca' },
}

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AdminsTable({
  rows,
  searchInput,
  onSearchInputChange,
  filteredCount,
  loading = false,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
  onDelete,
  toolbarRight,
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

  return (
    <DataTable
      title="Administradores"
      meta={
        loading
          ? `Cargando administradores... ${filteredCount} encontrados`
          : `${filteredCount} administradores, mostrando ${rows.length}`
      }
      search={{
        value: searchInput,
        onChange: onSearchInputChange,
        placeholder: 'Buscar por nombre o correo...',
      }}
      viewToggle={true}
      tableLabel="Table"
      cardsLabel="Cards"
      toolbarRight={toolbarRight}
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
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando administradores...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
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
                        className={`text-xs capitalize ${isActive
                          ? 'text-emerald-700 border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : 'text-muted-foreground border-border bg-background dark:border-border/80 dark:bg-muted/30 dark:text-muted-foreground'
                        }`}
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
                          disabled={loading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Cambiar contraseña"
                          onClick={() => onResetPassword(admin)}
                          disabled={loading}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        {isActive ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-success hover:bg-destructive/10 hover:text-destructive"
                            title="Deshabilitar"
                            onClick={() => onDeactivate(admin)}
                            disabled={loading}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-success hover:bg-success/10 hover:text-success"
                            title="Reactivar"
                            onClick={() => onReactivate(admin)}
                            disabled={loading}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title="Eliminar"
                          onClick={() => onDelete(admin)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
          {loading ? (
            <div className="col-span-full flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando administradores...
            </div>
          ) : rows.length === 0 ? (
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
                    className={`ml-2 flex-shrink-0 text-xs capitalize ${isActive
                      ? 'text-emerald-700 border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'text-muted-foreground border-border bg-background dark:border-border/80 dark:bg-muted/30 dark:text-muted-foreground'
                    }`}
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
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => onEdit(admin)} disabled={loading}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => onResetPassword(admin)} disabled={loading}>
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    {isActive ? (
                      <Button type="button" variant="ghost" size="icon-xs" onClick={() => onDeactivate(admin)} disabled={loading}>
                        <Power className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button type="button" variant="ghost" size="icon-xs" onClick={() => onReactivate(admin)} disabled={loading}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => onDelete(admin)} disabled={loading}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
        onPageSizeChange,
        items: pageItems,
        active: page + 1,
        onItemClick: (item) => {
          if (!loading && typeof item === 'number') onPageChange(item - 1)
        },
      }}
    />
  )
}
