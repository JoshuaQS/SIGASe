import { useMemo } from 'react'
import { ArrowUpDown, Eye, LayoutGrid, LayoutList, Pencil, PlayCircle, Power, Search, Trash2 } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { SegmentedControl } from '@/shared/components/ui/segmented-control'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import type { StudentResponseDto } from '@/features/students/api/students-api'

export type StudentManagementRow = StudentResponseDto & {
  fullName: string
  uiStatus: 'activo' | 'inactivo' | 'pendiente'
  lastAccessLabel: string
  totalAccesses?: number
}

type StudentDataTableProps = {
  title: string
  rows: StudentManagementRow[]
  loading: boolean
  viewMode: 'table' | 'cards'
  onViewModeChange: (value: 'table' | 'cards') => void
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
  onCloseFilters: () => void
  activeFilterChips: Array<{ id: string; label: string; onClear: () => void }>
}

const statusStyles: Record<StudentManagementRow['uiStatus'], string> = {
  activo: 'text-emerald-600 border-emerald-200 bg-emerald-50',
  inactivo: 'text-muted-foreground border-border',
  pendiente: 'text-amber-700 border-amber-200 bg-amber-50',
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

function formatQuarter(quarter: number) {
  return `${quarter}°`
}

export function StudentDataTable({
  title,
  rows,
  loading,
  viewMode,
  onViewModeChange,
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
  onCloseFilters,
  activeFilterChips,
}: StudentDataTableProps) {
  const pageCount = Math.max(totalPages, 1)
  const showingFrom = totalElements === 0 ? 0 : page * pageSize + 1
  const showingTo = totalElements === 0 ? 0 : Math.min((page + 1) * pageSize, totalElements)
  const resultsChipLabel = `${totalElements} alumnos, Mostrando: ${rows.length}`

  const paginationItems = useMemo(() => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)

    const items: Array<number | string> = []
    const left = Math.max(2, page + 1 - 1)
    const right = Math.min(pageCount - 1, page + 1 + 1)

    items.push(1)
    if (left > 2) items.push('...')
    for (let item = left; item <= right; item += 1) items.push(item)
    if (right < pageCount - 1) items.push('...')
    items.push(pageCount)
    return items
  }, [page, pageCount])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2 pb-3 pt-2">
        <div className="grid gap-2 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-center">
          <div className="flex h-full flex-col justify-between gap-1">
            <CardTitle className="h-6 text-base font-semibold leading-6">{title}</CardTitle>
            <Badge variant="secondary" className="h-5 w-fit rounded-full px-2.5 text-[11px] font-medium leading-5">
              {resultsChipLabel}
            </Badge>
          </div>

          <div className="flex w-full flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-end xl:flex-nowrap">
            <div className="w-full md:min-w-[240px] md:max-w-[360px] xl:w-[420px] xl:max-w-none">
              <Input
                placeholder="Buscar por nombre o matrícula..."
                className="w-full"
                size="md"
                startAdornment={<Search className="h-4 w-4" />}
                value={searchInput}
                onChange={(event) => onSearchInputChange(event.target.value)}
              />
            </div>
            <SegmentedControl
              value={viewMode}
              onChange={onViewModeChange}
              size="md"
              className="w-full md:w-auto"
              ariaLabel="Vista de tabla o tarjetas"
              options={[
                { value: 'table', label: <span className="inline-flex items-center gap-1.5"><LayoutList className="h-3.5 w-3.5" />Table</span> },
                { value: 'cards', label: <span className="inline-flex items-center gap-1.5"><LayoutGrid className="h-3.5 w-3.5" />Cards</span> },
              ]}
            />
            <Button type="button" variant="outline" size="md" className="h-9 w-full gap-2 md:w-auto" onClick={onFiltersToggle}>
              <LayoutList className="h-3.5 w-3.5" />
              Filtrar
            </Button>
          </div>
        </div>

        {filtersOpen ? (
          <div className="rounded-xl border border-border bg-card p-4 shadow-lg">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Carrera</label>
                <select
                  value={carreraF}
                  onChange={(event) => onCareerChange(event.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="todas">Todas</option>
                  {careers.map((career) => (
                    <option key={career.id} value={career.code}>
                      {career.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Estado</label>
                <select
                  value={estadoF}
                  onChange={(event) => onStatusChange(event.target.value as 'todos' | StudentResponseDto['status'])}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="todos">Todos</option>
                  <option value="ACTIVE">Activos</option>
                  <option value="INACTIVE">Inactivos</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex items-center justify-between pt-2">
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onClearFilters}>
                  Limpiar filtros
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 px-3" onClick={onCloseFilters}>
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {activeFilterChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilterChips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {chip.label}
                <button type="button" className="text-muted-foreground transition-colors hover:text-foreground" onClick={chip.onClear}>
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="p-0">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-secondary/40">
                  {[
                    { label: 'Nombre completo', sortable: true },
                    { label: 'Correo institucional', sortable: true },
                    { label: 'Carrera', sortable: true },
                    { label: 'Cuatrimestre', sortable: true },
                    { label: 'Estado', sortable: true },
                    { label: 'Último acceso', sortable: true },
                    { label: 'Cantidad de accesos', sortable: true },
                    { label: 'Acciones', sortable: true },
                  ].map((column) => (
                    <th
                      key={column.label}
                      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                    >
                      <span className="inline-flex items-center gap-1">
                        {column.label}
                        {column.sortable ? <ArrowUpDown className="h-3 w-3" /> : null}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Cargando estudiantes...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No hay estudiantes para los filtros seleccionados.
                    </td>
                  </tr>
                ) : rows.map((student, index) => (
                  <tr
                    key={student.id}
                    className={`border-b border-border transition-colors hover:bg-accent/40 ${
                      index % 2 === 1 ? 'bg-secondary/15' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                          <span className="text-[11px] font-semibold text-primary">
                            {initials(student.fullName)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {student.fullName}
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {student.enrollmentId}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="max-w-[220px] truncate text-xs text-muted-foreground" title={student.institutionalEmail}>
                        {student.institutionalEmail}
                      </p>
                    </td>

                    <td className="px-4 py-3.5">
                    <Badge
                      variant="outlined"
                      className="inline-flex h-6 min-w-[42px] items-center justify-center rounded-md px-2 text-[10px] font-bold"
                      title={student.career?.name ?? student.career?.code ?? 'N/D'}
                    >
                      {student.career?.code ?? 'N/D'}
                    </Badge>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-foreground">{formatQuarter(student.quarter)}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge
                        variant="outlined"
                        className={`text-xs capitalize ${statusStyles[student.uiStatus]}`}
                      >
                        {student.uiStatus}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {student.lastAccessLabel}
                    </td>

                    <td className="px-4 py-3.5 text-sm font-semibold text-foreground">
                      {student.totalAccesses ?? '—'}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon-xs" className="text-muted-foreground hover:bg-muted hover:text-foreground" title="Ver detalle" onClick={() => onView(student)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon-xs" className="text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar" onClick={() => onEdit(student)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {student.status === 'ACTIVE' ? (
                          <Button type="button" variant="ghost" size="icon-xs" className="text-success hover:bg-destructive/10 hover:text-destructive" title="Desactivar" onClick={() => onDeactivate(student)}>
                            <Power className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button type="button" variant="ghost" size="icon-xs" className="text-muted-foreground hover:bg-success/10 hover:text-success" title="Reactivar" onClick={() => onReactivate(student)}>
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button type="button" variant="ghost" size="icon-xs" className="text-destructive hover:bg-destructive/10 hover:text-destructive" title="Eliminar" onClick={() => onDelete(student)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <div className="col-span-full py-10 text-center text-sm text-muted-foreground">Cargando estudiantes...</div>
            ) : rows.length === 0 ? (
              <div className="col-span-full rounded-xl border border-border bg-secondary/20 p-8 text-center text-sm text-muted-foreground">
                No hay estudiantes para los filtros seleccionados.
              </div>
            ) : rows.map((student) => (
              <div key={student.id} className="group flex h-full flex-col rounded-xl border border-border bg-background p-4 transition-all hover:border-primary/30 hover:shadow-sm">
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
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => onView(student)}><Eye className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => onEdit(student)}><Pencil className="h-4 w-4" /></Button>
                    {student.status === 'ACTIVE' ? (
                      <Button type="button" variant="ghost" size="icon-xs" onClick={() => onDeactivate(student)}><Power className="h-4 w-4" /></Button>
                    ) : (
                      <Button type="button" variant="ghost" size="icon-xs" onClick={() => onReactivate(student)}><PlayCircle className="h-4 w-4" /></Button>
                    )}
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => onDelete(student)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex min-w-0 items-start gap-3 pt-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
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

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            Mostrando {showingFrom}–{showingTo} de {totalElements}
          </span>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filas:</span>
            <input
              value={String(pageSize)}
              onChange={(event) => {
                const next = Number(event.target.value)
                if (!Number.isFinite(next)) return
                onPageSizeChange(Math.max(1, Math.floor(next)))
              }}
              inputMode="numeric"
              className="h-8 w-16 rounded-md border border-border bg-background px-2 text-xs text-foreground"
            />
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={page === 0 || loading} onClick={() => onPageChange(page - 1)}>
                Anterior
              </Button>
              <div className="hidden items-center gap-1 md:flex">
                {paginationItems.map((item, index) => (
                  typeof item === 'number' ? (
                    <Button
                      key={`${item}-${index}`}
                      type="button"
                      variant={item === page + 1 ? 'secondary' : 'outline'}
                      size="sm"
                      className="h-8 min-w-8 px-2 text-xs"
                      onClick={() => onPageChange(item - 1)}
                      disabled={loading}
                    >
                      {item}
                    </Button>
                  ) : (
                    <span key={`${item}-${index}`} className="px-1 text-xs text-muted-foreground">...</span>
                  )
                ))}
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={loading || totalPages === 0 || page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
