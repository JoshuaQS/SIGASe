import { useMemo } from 'react'
import { ArrowUpDown, Eye, LayoutList, Pencil, PlayCircle, Power, Trash2 } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { DataTable } from '@/shared/components/ui/data-table'
import { DataTableFiltersShell, type DataTableFilterChip } from '@/shared/components/ui/data-table-filters-shell'
import type { StudentResponseDto } from '@/features/students/api/students-api'

// ── Types ──────────────────────────────────────────────────────────────────────

export type StudentManagementRow = StudentResponseDto & {
  fullName: string
  uiStatus: 'activo' | 'inactivo' | 'pendiente'
  lastAccessLabel: string
  totalAccesses?: number
}

type StudentsTableProps = {
  rows: StudentManagementRow[]
  loading: boolean
  searchInput: string
  onSearchInputChange: (value: string) => void
  onDeactivate: (student: StudentManagementRow) => void
  onReactivate: (student: StudentManagementRow) => void
  onDelete: (student: StudentManagementRow) => void
  onView: (student: StudentManagementRow) => void
  onEdit: (student: StudentManagementRow) => void
  page: number
  totalElements: number
  totalPages: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onFiltersToggle: () => void
  filtersOpen: boolean
  careers: Array<{ id: string; code: string }>
  carreraF: string
  onCareerChange: (value: string) => void
  estadoF: 'todos' | StudentResponseDto['status']
  onStatusChange: (value: 'todos' | StudentResponseDto['status']) => void
  onClearFilters: () => void
  onResetFilters: () => void
  onApplyFilters: () => void
  activeFilterChips: DataTableFilterChip[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const statusStyles: Record<StudentManagementRow['uiStatus'], string> = {
  activo: 'text-emerald-600 border-emerald-200 bg-emerald-50',
  inactivo: 'text-muted-foreground border-border',
  pendiente: 'text-amber-700 border-amber-200 bg-amber-50',
}

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

function formatQuarter(quarter: number) {
  return `${quarter}°`
}

// ── Component ──────────────────────────────────────────────────────────────────

export function StudentsTable({
  rows,
  loading,
  searchInput,
  onSearchInputChange,
  onDeactivate,
  onReactivate,
  onDelete,
  onView,
  onEdit,
  page,
  totalElements,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onFiltersToggle,
  filtersOpen,
  careers,
  carreraF,
  onCareerChange,
  estadoF,
  onStatusChange,
  onClearFilters,
  onResetFilters,
  onApplyFilters,
  activeFilterChips,
}: StudentsTableProps) {
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

  const toolbarBelow = (
    <DataTableFiltersShell
      open={filtersOpen}
      chips={activeFilterChips}
      onApply={onApplyFilters}
      onReset={onResetFilters}
      onClear={onClearFilters}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Carrera</label>
          <select
            value={carreraF}
            onChange={(e) => onCareerChange(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="todas">Todas</option>
            {careers.map((career) => (
              <option key={career.id} value={career.code}>{career.code}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Estado</label>
          <select
            value={estadoF}
            onChange={(e) => onStatusChange(e.target.value as 'todos' | StudentResponseDto['status'])}
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
      title="Alumnos totales"
      meta={`${totalElements} alumnos en total · mostrando ${rows.length} en esta página`}
      search={{
        value: searchInput,
        onChange: onSearchInputChange,
        placeholder: 'Buscar por nombre o matrícula...',
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
          <LayoutList className="h-3 w-3" />
          Filtrar
        </Button>
      }
      toolbarBelow={toolbarBelow}
      renderTable={() => (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/40">
                {[
                  'Nombre completo',
                  'Correo institucional',
                  'Carrera',
                  'Cuatrimestre',
                  'Estado',
                  'Último acceso',
                  'Cantidad de accesos',
                  'Acciones',
                ].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col}
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Cargando estudiantes...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No hay estudiantes para los filtros seleccionados.
                  </td>
                </tr>
              ) : rows.map((student) => (
                <tr
                  key={student.id}
                  className="border-b border-border transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-[11px] font-semibold text-primary">{initials(student.fullName)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{student.fullName}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{student.enrollmentId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="max-w-[200px] truncate text-xs text-muted-foreground" title={student.institutionalEmail}>
                      {student.institutionalEmail}
                    </p>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="outlined"
                      className="inline-flex h-6 min-w-[42px] items-center justify-center rounded-md px-2 text-[10px] font-bold"
                      title={student.career?.name ?? student.career?.code ?? 'N/D'}
                    >
                      {student.career?.code ?? 'N/D'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-sm font-semibold text-foreground">{formatQuarter(student.quarter)}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outlined" className={`text-xs capitalize ${statusStyles[student.uiStatus]}`}>
                      {student.uiStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {student.lastAccessLabel}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-semibold text-foreground">
                    {student.totalAccesses ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Ver detalle"
                        onClick={() => onView(student)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Editar"
                        onClick={() => onEdit(student)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {student.status === 'ACTIVE' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-success hover:bg-destructive/10 hover:text-destructive"
                          title="Desactivar"
                          onClick={() => onDeactivate(student)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:bg-success/10 hover:text-success"
                          title="Reactivar"
                          onClick={() => onReactivate(student)}
                        >
                          <PlayCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Eliminar"
                        onClick={() => onDelete(student)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      renderCards={() => (
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
              Cargando estudiantes...
            </div>
          ) : rows.length === 0 ? (
            <div className="col-span-full rounded-xl border border-border bg-secondary/20 p-8 text-center text-sm text-muted-foreground">
              No hay estudiantes para los filtros seleccionados.
            </div>
          ) : rows.map((student) => (
            <div
              key={student.id}
              className="group flex h-full flex-col rounded-xl border border-border bg-background p-4 transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <div className="relative mb-4">
                <div className="absolute left-0 top-0">
                  <Badge
                    variant="outlined"
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${statusStyles[student.uiStatus]}`}
                  >
                    {student.uiStatus}
                  </Badge>
                </div>
                <div className="absolute right-0 top-0 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => onView(student)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => onEdit(student)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {student.status === 'ACTIVE' ? (
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => onDeactivate(student)}>
                      <Power className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => onReactivate(student)}>
                      <PlayCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => onDelete(student)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex min-w-0 items-start gap-3 pt-6">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-sm font-bold text-primary">{initials(student.fullName)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{student.fullName}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{student.enrollmentId}</p>
                  </div>
                </div>
              </div>
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="outlined" className="inline-flex h-6 min-w-[42px] items-center justify-center rounded-md px-2 text-[10px] font-bold">
                  {student.career?.code ?? 'N/D'}
                </Badge>
                <span className="truncate text-xs text-muted-foreground">{student.career?.name ?? 'Sin carrera'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2">
                  <p className="text-[11px]">Cuatrimestre</p>
                  <p className="text-sm font-semibold text-foreground">{formatQuarter(student.quarter)}</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2">
                  <p className="text-[11px]">Accesos</p>
                  <p className="text-sm font-semibold text-foreground">{student.totalAccesses ?? '—'}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end text-xs text-muted-foreground">
                {student.lastAccessLabel}
              </div>
            </div>
          ))}
        </div>
      )}
      pagination={{
        summary: `${totalElements} alumnos · ${rows.length} mostrados`,
        pageSize,
        pageSizeOptions: [5, 8, 10, 20, 50],
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
