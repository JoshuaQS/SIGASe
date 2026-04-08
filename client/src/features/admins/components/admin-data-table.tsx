import { ArrowUpDown, Edit2, KeyRound, MoreHorizontal, Search, Shield, UserCheck, UserMinus, UserPlus } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'

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

type AdminDataTableProps = {
  title: string
  rows: AdminManagementRow[]
  searchInput: string
  onSearchInputChange: (value: string) => void
  roleFilter: 'todos' | AdminRole
  onRoleFilterChange: (value: 'todos' | AdminRole) => void
  filteredCount: number
  page: number
  totalPages: number
  pageSize: number
  onPageChange: (page: number) => void
  onEdit: (admin: AdminManagementRow) => void
  onDeactivate: (admin: AdminManagementRow) => void
  onActivate: (admin: AdminManagementRow) => void
  onResetPassword: (admin: AdminManagementRow) => void
}

const roleStyles: Record<AdminRole, { badge: string; icon: React.ElementType; label: string }> = {
  ADMIN_TI: { badge: 'text-violet-600 border-violet-200 bg-violet-50', icon: Shield, label: 'Admin TI' },
  ADMIN_BIBLIOTECA: { badge: 'text-cyan-600 border-cyan-200 bg-cyan-50', icon: UserCheck, label: 'Admin Biblioteca' },
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function AdminDataTable({
  title,
  rows,
  searchInput,
  onSearchInputChange,
  roleFilter,
  onRoleFilterChange,
  filteredCount,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onEdit,
  onDeactivate,
  onActivate,
  onResetPassword,
}: AdminDataTableProps) {
  const showingFrom = filteredCount === 0 ? 0 : page * pageSize + 1
  const showingTo = filteredCount === 0 ? 0 : Math.min((page + 1) * pageSize, filteredCount)
  const resultsChipLabel = `${filteredCount} administradores, Mostrando: ${rows.length}`

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 pb-3 pt-2">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex h-full flex-col justify-between gap-1">
            <CardTitle className="h-6 text-base font-semibold leading-6">{title}</CardTitle>
            <Badge variant="secondary" className="h-5 w-fit rounded-full px-2.5 text-[11px] font-medium leading-5">
              {resultsChipLabel}
            </Badge>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:w-auto">
            <Input
              placeholder="Buscar administrador..."
              className="w-full sm:min-w-[240px] lg:w-[320px]"
              size="md"
              startAdornment={<Search className="h-4 w-4" />}
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
            />
            <Select value={roleFilter} onValueChange={(value) => onRoleFilterChange(value as 'todos' | AdminRole)}>
              <SelectTrigger className="h-9 w-full sm:w-[220px]" size="md">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los roles</SelectItem>
                <SelectItem value="ADMIN_TI">Admin TI</SelectItem>
                <SelectItem value="ADMIN_BIBLIOTECA">Admin Biblioteca</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-secondary/40">
                {[
                  { label: 'Administrador' },
                  { label: 'Email' },
                  { label: 'Rol' },
                  { label: 'Estado' },
                  { label: 'Acciones' },
                  { label: 'Último acceso' },
                  { label: '' },
                ].map((column) => (
                  <th
                    key={column.label || 'menu'}
                    className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1">
                      {column.label}
                      {column.label ? <ArrowUpDown className="h-3 w-3" /> : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No hay administradores para los filtros seleccionados.
                  </td>
                </tr>
              ) : rows.map((admin, index) => {
                const role = roleStyles[admin.rol]
                const isActive = admin.estado === 'activo'

                return (
                  <tr
                    key={admin.id}
                    className={`border-b border-border transition-colors hover:bg-accent/40 ${index % 2 === 1 ? 'bg-secondary/15' : ''}`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                          <span className="text-[11px] font-semibold text-primary">{initials(admin.nombre)}</span>
                        </div>
                        <span className="max-w-[200px] truncate text-sm font-semibold text-foreground">{admin.nombre}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{admin.email}</td>

                    <td className="px-4 py-3.5">
                      <Badge variant="outlined" className={`text-xs gap-1 ${role.badge}`}>
                        <role.icon className="h-3 w-3" />
                        {role.label}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge
                        variant="outlined"
                        className={`text-xs capitalize ${isActive ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-muted-foreground border-border'}`}
                      >
                        {admin.estado}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {admin.acciones !== undefined
                        ? <span className="font-mono font-semibold text-foreground">{admin.acciones}</span>
                        : <span className="text-muted-foreground/50">—</span>}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{admin.ultimaAccion}</td>

                    <td className="px-4 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(admin)}>
                            <Edit2 className="mr-2 h-3.5 w-3.5" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onResetPassword(admin)}>
                            <KeyRound className="mr-2 h-3.5 w-3.5" />
                            Restablecer contraseña
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {isActive ? (
                            <DropdownMenuItem className="text-destructive" onClick={() => onDeactivate(admin)}>
                              <UserMinus className="mr-2 h-3.5 w-3.5" />
                              Desactivar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="text-emerald-600" onClick={() => onActivate(admin)}>
                              <UserPlus className="mr-2 h-3.5 w-3.5" />
                              Activar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            Mostrando {showingFrom}–{showingTo} de {filteredCount}
          </span>

          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={totalPages === 0 || page >= totalPages - 1}
              onClick={() => onPageChange(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
