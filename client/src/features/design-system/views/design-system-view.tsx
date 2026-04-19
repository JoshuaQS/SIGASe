import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Info,
  Mail,
  Search,
  ShieldAlert,
  Lock,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { FormField } from '@/shared/components/ui/forms/form-field'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { ProtectedField } from '@/shared/components/ui/forms/protected-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { SEVERITY, type ToastSeverity } from '@/shared/components/ui/app-toast-provider'
import { DataTable } from '@/shared/components/ui/data-table'
import { DataTableFiltersPopover, type FilterFieldConfig, type FilterState } from '@/shared/components/table-filters'

type ConfirmScenario = {
  key: string
  title: string
  description: string
  confirmColor: 'primary' | 'error' | 'success' | 'warning' | 'info'
  confirmText: string
  hideActions?: boolean
}

type ToastPreviewSeverity = ToastSeverity

type ToastPreviewItem = {
  key: string
  severity: ToastPreviewSeverity
  title: string
  description: string
}

type ShowcaseStudent = {
  matricula: string
  nombre: string
  correo: string
  carrera: string
  estado: 'activo' | 'pendiente' | 'inactivo'
  ultimoAcceso: string
}

type ShowcaseFilters = {
  search: string
  estado: string
  carrera: string[]
  resultado: string
  dateFrom: string
  dateTo: string
}

const CONFIRM_SCENARIOS: ConfirmScenario[] = [
  {
    key: 'delete-admin',
    title: 'Eliminar administrador',
    description: 'Esta acción eliminará definitivamente al administrador. Esta operación no se puede deshacer.',
    confirmColor: 'error',
    confirmText: 'Eliminar',
  },
  {
    key: 'logout',
    title: 'Cerrar sesión',
    description: 'Se cerrará la sesión actual y tendrás que autenticarte nuevamente para continuar.',
    confirmColor: 'warning',
    confirmText: 'Cerrar sesión',
  },
  {
    key: 'expired',
    title: 'Sesión expirada',
    description: 'Tu sesión venció por seguridad. Inicia sesión nuevamente para continuar con SIGASe.',
    confirmColor: 'info',
    confirmText: '',
    hideActions: true,
  },
]

const TOAST_PREVIEWS: ToastPreviewItem[] = [
  {
    key: 'toast-success',
    severity: 'success',
    title: 'Estudiante creado correctamente.',
    description: 'El registro quedó activo en el portal institucional.',
  },
  {
    key: 'toast-error',
    severity: 'error',
    title: 'No fue posible conectar con eLibro.',
    description: 'Verifica credenciales del canal y vuelve a intentar.',
  },
  {
    key: 'toast-warning',
    severity: 'warning',
    title: 'Sesión expirada.',
    description: 'Inicia sesión nuevamente para continuar.',
  },
  {
    key: 'toast-info',
    severity: 'info',
    title: 'Exportación generada.',
    description: 'El archivo CSV ya está listo para descarga.',
  },
]

const STUDENTS_ROWS: ShowcaseStudent[] = [
  { matricula: '20223TSU001', nombre: 'Andrea Vázquez', correo: 'andrea.vazquez@utez.edu.mx', carrera: 'Desarrollo de Software', estado: 'activo', ultimoAcceso: '2026-04-19 09:20' },
  { matricula: '20223TSU015', nombre: 'Luis García', correo: 'luis.garcia@utez.edu.mx', carrera: 'Mecatrónica', estado: 'pendiente', ultimoAcceso: '2026-04-18 12:03' },
  { matricula: '20223TSU022', nombre: 'Karen Torres', correo: 'karen.torres@utez.edu.mx', carrera: 'Nanotecnología', estado: 'inactivo', ultimoAcceso: '2026-04-17 18:49' },
  { matricula: '20223TSU034', nombre: 'Diego Morales', correo: 'diego.morales@utez.edu.mx', carrera: 'Redes Inteligentes', estado: 'activo', ultimoAcceso: '2026-04-19 07:14' },
  { matricula: '20223TSU041', nombre: 'María López', correo: 'maria.lopez@utez.edu.mx', carrera: 'Desarrollo de Software', estado: 'activo', ultimoAcceso: '2026-04-18 15:10' },
  { matricula: '20223TSU059', nombre: 'Ángel Cruz', correo: 'angel.cruz@utez.edu.mx', carrera: 'Mecatrónica', estado: 'pendiente', ultimoAcceso: '2026-04-16 10:32' },
]

const FILTER_FIELDS: FilterFieldConfig[] = [
  { id: 'search', type: 'search', placeholder: 'Buscar estudiante o matrícula' },
  {
    id: 'estado',
    type: 'select',
    label: 'Estado',
    options: [
      { label: 'Activo', value: 'activo' },
      { label: 'Pendiente', value: 'pendiente' },
      { label: 'Inactivo', value: 'inactivo' },
    ],
    placeholder: 'Todos',
  },
  {
    id: 'carrera',
    type: 'multi-select',
    label: 'Carrera',
    options: [
      { label: 'Desarrollo de Software', value: 'Desarrollo de Software' },
      { label: 'Mecatrónica', value: 'Mecatrónica' },
      { label: 'Nanotecnología', value: 'Nanotecnología' },
      { label: 'Redes Inteligentes', value: 'Redes Inteligentes' },
    ],
  },
  {
    id: 'resultado',
    type: 'select',
    label: 'Resultado',
    options: [
      { label: 'Exitoso', value: 'ok' },
      { label: 'Fallido', value: 'failed' },
    ],
    placeholder: 'Todos',
  },
  { id: 'dateFrom', type: 'datetime-local', label: 'Desde' },
  { id: 'dateTo', type: 'datetime-local', label: 'Hasta' },
]

const EMPTY_FILTERS: ShowcaseFilters = {
  search: '',
  estado: '',
  carrera: [],
  resultado: '',
  dateFrom: '',
  dateTo: '',
}

function dialogPreviewIcon(confirmColor: ConfirmScenario['confirmColor']) {
  if (confirmColor === 'error') return ShieldAlert
  if (confirmColor === 'warning') return AlertTriangle
  if (confirmColor === 'success') return CheckCircle2
  if (confirmColor === 'info') return Info
  return HelpCircle
}

function GroupTitle({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

export default function DesignSystemView() {
  const [role, setRole] = useState('admin-ti')
  const [studentStatus, setStudentStatus] = useState('activo')
  const [onlyErrors, setOnlyErrors] = useState(false)
  const [authToken, setAuthToken] = useState('tk_live_sigase_****')
  const [tableSearch, setTableSearch] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(4)
  const [pageJump, setPageJump] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<ShowcaseFilters>(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<ShowcaseFilters>(EMPTY_FILTERS)

  const filteredStudents = STUDENTS_ROWS.filter((row) => {
    const searchTerm = (tableSearch || appliedFilters.search).trim().toLowerCase()
    if (searchTerm) {
      const haystack = `${row.matricula} ${row.nombre} ${row.correo}`.toLowerCase()
      if (!haystack.includes(searchTerm)) return false
    }
    if (appliedFilters.estado && row.estado !== appliedFilters.estado) return false
    if (appliedFilters.carrera.length > 0 && !appliedFilters.carrera.includes(row.carrera)) return false
    return true
  })

  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / pageSize))
  const safePageIndex = Math.min(pageIndex, pageCount - 1)
  const paginatedStudents = filteredStudents.slice(safePageIndex * pageSize, safePageIndex * pageSize + pageSize)

  return (
    <div className="w-full space-y-4">
      <main className="grid w-full gap-4 xl:grid-cols-3">
        <section id="buttons-badges" className="scroll-mt-24 h-full rounded-xl border border-border bg-card p-4">
          <div className="space-y-4">
            <GroupTitle>Variantes</GroupTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">primary</Button>
              <Button variant="secondary">secondary</Button>
              <Button variant="outline">outline</Button>
              <Button variant="ghost">ghost</Button>
              <Button variant="destructive">destructive</Button>
              <Button variant="success">success</Button>
              <Button variant="warning">warning</Button>
              <Button variant="link">link</Button>
            </div>

            <GroupTitle>Tamaños</GroupTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs">xs</Button>
              <Button size="sm">sm</Button>
              <Button size="md">md</Button>
              <Button size="lg">lg</Button>
            </div>

            <GroupTitle>Estados</GroupTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled>disabled</Button>
              <Button isLoading>loading</Button>
            </div>

            <GroupTitle>Icon-only</GroupTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="icon" aria-label="favorite" leftIcon={CheckCircle2} />
              <Button size="icon" variant="outline" aria-label="add" leftIcon={UserPlus} />
              <Button size="icon" variant="secondary" aria-label="export" leftIcon={ExternalLink} />
              <Button size="icon" variant="ghost" aria-label="alerts" leftIcon={AlertTriangle} />
              <Button size="icon" variant="destructive" aria-label="delete" leftIcon={Trash2} />
              <Button size="icon" variant="success" aria-label="confirm" leftIcon={CheckCircle2} />
            </div>

            <GroupTitle>Con icono + texto</GroupTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Button leftIcon={UserPlus}>primary</Button>
              <Button variant="outline" leftIcon={ExternalLink}>outline</Button>
              <Button variant="destructive" leftIcon={Trash2}>destructive</Button>
            </div>

            <GroupTitle>Badges</GroupTitle>
            <GroupTitle>Variantes base</GroupTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outlined">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>

            <GroupTitle>Semánticas nativas</GroupTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="muted">Muted</Badge>
              <Badge variant="filled">Filled</Badge>
            </div>
          </div>
        </section>

        <section id="form-controls" className="scroll-mt-24 h-full rounded-xl border border-border bg-card p-4">
          <div className="space-y-5">
            <GroupTitle>Tipos</GroupTitle>
            <div className="grid gap-3 md:grid-cols-3">
              <FormField label="TEXT" layout="compact">
                {({ controlProps }) => <Input {...controlProps} placeholder="Nombre completo" />}
              </FormField>
              <FormField label="EMAIL" layout="compact">
                {({ controlProps }) => (
                  <Input {...controlProps} type="email" placeholder="correo@utez.edu.mx" startAdornment={<Mail className="h-4 w-4" />} />
                )}
              </FormField>
              <FormField label="SEARCH" layout="compact">
                {({ controlProps }) => (
                  <Input {...controlProps} placeholder="Buscar..." startAdornment={<Search className="h-4 w-4" />} />
                )}
              </FormField>
              <FormField label="CHANNEL ID" layout="compact">
                {({ controlProps }) => <Input {...controlProps} placeholder="ch_utez_sigase_001" startAdornment={<Lock className="h-4 w-4" />} />}
              </FormField>
              <FormField label="DATE" layout="compact">
                {({ controlProps }) => <Input {...controlProps} type="date" defaultValue="2026-04-19" />}
              </FormField>
            </div>

            <GroupTitle>Estados</GroupTitle>
            <div className="grid gap-3 md:grid-cols-3">
              <FormField label="DEFAULT" layout="compact">
                {({ controlProps }) => <Input {...controlProps} placeholder="Default" />}
              </FormField>
              <FormField label="ERROR" layout="compact">
                {({ controlProps }) => <Input {...controlProps} invalid placeholder="Error" />}
              </FormField>
              <FormField label="SUCCESS" layout="compact">
                {({ controlProps }) => <Input {...controlProps} success placeholder="Válido" />}
              </FormField>
              <FormField label="DISABLED" layout="compact">
                {({ controlProps }) => <Input {...controlProps} disabled placeholder="Deshabilitado" />}
              </FormField>
              <FormField label="READONLY" layout="compact">
                {({ controlProps }) => <Input {...controlProps} readOnly placeholder="Solo lectura" />}
              </FormField>
              <FormField label="LOADING" layout="compact">
                {({ controlProps }) => <Input {...controlProps} loading placeholder="Cargando..." />}
              </FormField>
            </div>

            <GroupTitle>Variantes nativas</GroupTitle>
            <div className="grid gap-3 md:grid-cols-3">
              <FormField label="DEFAULT" layout="compact">
                {({ controlProps }) => <Input {...controlProps} variant="default" placeholder="Variant default" />}
              </FormField>
              <FormField label="FILLED" layout="compact">
                {({ controlProps }) => <Input {...controlProps} variant="filled" placeholder="Variant filled" />}
              </FormField>
              <FormField label="PROTECTED" layout="compact">
                {({ controlProps }) => <Input {...controlProps} variant="protected" placeholder="Variant protected" />}
              </FormField>
            </div>

            <GroupTitle>Protected-field</GroupTitle>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="DISPLAY" layout="compact">
                {() => <ProtectedField mode="display" value="•••••••" />}
              </FormField>
              <FormField label="EDIT" layout="compact">
                {() => <ProtectedField mode="edit" value={authToken} onChange={setAuthToken} />}
              </FormField>
            </div>

            <GroupTitle>Selects</GroupTitle>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="ROL ADMINISTRATIVO" layout="compact">
                {({ controlProps }) => (
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger {...controlProps}>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin-ti">Administrador TI</SelectItem>
                      <SelectItem value="admin-biblioteca">Administrador Biblioteca</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </FormField>
              <FormField label="ESTADO ESTUDIANTE" layout="compact">
                {({ controlProps }) => (
                  <Select value={studentStatus} onValueChange={setStudentStatus}>
                    <SelectTrigger {...controlProps}>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            </div>

            <GroupTitle>Checks</GroupTitle>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="CHECKBOX" layout="compact">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border" />
                  Solo registros con error
                </label>
              </FormField>
              <FormField label="RADIO GROUP" layout="compact">
                <div className="flex items-center gap-4 text-sm text-foreground">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="scope" defaultChecked className="h-4 w-4 border-border" />
                    Todos
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="scope" className="h-4 w-4 border-border" />
                    Activos
                  </label>
                </div>
              </FormField>
              <FormField label="SWITCH" layout="compact">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Switch checked={onlyErrors} onCheckedChange={setOnlyErrors} />
                  Solo fallidos
                </label>
              </FormField>
            </div>

            <GroupTitle>FormField compone</GroupTitle>
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              label, required/optional, description, error/warning/success, control (children), layout, icon y a11y
              (id/aria-describedby/aria-invalid).
            </div>
          </div>
        </section>

        <section id="toasts-confirmation" className="scroll-mt-24 rounded-xl border border-border bg-card p-4">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {TOAST_PREVIEWS.map((toast) => {
                const severityCfg = SEVERITY[toast.severity]
                const Icon = severityCfg.icon

                return (
                  <div
                    key={toast.key}
                    className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md"
                  >
                    <div className="grid grid-cols-[auto_1fr_auto] items-stretch gap-3.5 px-3 py-2.5">
                      <div className={`flex h-10 w-10 min-h-[40px] aspect-square shrink-0 items-center justify-center rounded-lg ${severityCfg.iconBg}`}>
                        <Icon className={`h-5 w-5 ${severityCfg.iconFg}`} strokeWidth={2.3} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-semibold leading-tight text-foreground">{toast.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-tight text-muted-foreground">
                          {toast.description}
                        </p>
                      </div>
                      <button className="shrink-0 rounded-lg p-1 text-muted-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="h-[2px] w-full bg-border/50">
                      <div className={`h-full ${severityCfg.progressBg} rounded-full`} style={{ width: '100%' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pt-6">
            <div className="grid gap-3">
              {CONFIRM_SCENARIOS.map((scenario) => (
                <div key={scenario.key} className="relative mx-auto w-full max-w-sm rounded-lg border border-border bg-card p-3 shadow-sm">
                  <button className="absolute right-2.5 top-2.5 text-muted-foreground" aria-label="Cerrar vista previa">
                    <X className="h-3.5 w-3.5" />
                  </button>

                  <div className="mb-2.5 flex justify-center">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm ${
                        scenario.confirmColor === 'error'
                          ? 'border-destructive/35 bg-destructive/10 shadow-destructive/30'
                          : scenario.confirmColor === 'warning'
                            ? 'border-warning/40 bg-warning/10 shadow-warning/30'
                            : 'border-info/40 bg-info/10 shadow-info/30'
                      }`}
                    >
                      {(() => {
                        const Icon = dialogPreviewIcon(scenario.confirmColor)
                        const iconTone =
                          scenario.confirmColor === 'error'
                            ? 'text-destructive'
                            : scenario.confirmColor === 'warning'
                              ? 'text-warning'
                              : 'text-info'
                        return <Icon className={`h-5 w-5 ${iconTone}`} />
                      })()}
                    </div>
                  </div>
                  <p className="text-center text-base font-semibold leading-tight text-foreground">{scenario.title}</p>
                  <p className="mx-auto mt-1.5 max-w-[280px] text-center text-xs leading-relaxed text-muted-foreground">{scenario.description}</p>

                  {!scenario.hideActions ? (
                    <div className="mx-auto mt-3 grid max-w-[280px] gap-2 sm:grid-cols-2">
                      <Button variant="outline" size="sm" className="h-8 text-sm font-semibold">
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-sm font-semibold"
                        variant={scenario.confirmColor === 'error' ? 'destructive' : 'warning'}
                      >
                        {scenario.confirmText}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="xl:col-span-3 scroll-mt-24 rounded-xl border border-border bg-card p-4">
          <div className="space-y-4">
            <GroupTitle>DataTable descompuesta</GroupTitle>
            <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
              <div className="rounded-md border border-border bg-muted/20 p-2">Header: title + meta</div>
              <div className="rounded-md border border-border bg-muted/20 p-2">Toolbar: search + filters + acciones</div>
              <div className="rounded-md border border-border bg-muted/20 p-2">Body: table/cards + filas con badges</div>
              <div className="rounded-md border border-border bg-muted/20 p-2">ToolbarBelow: filtros aplicados</div>
              <div className="rounded-md border border-border bg-muted/20 p-2">Pagination: page, pageSize, jump</div>
              <div className="rounded-md border border-border bg-muted/20 p-2">Actions: editar, reintentar, desactivar</div>
            </div>

            <DataTable
              title="Estudiantes SIGASe"
              meta={`${filteredStudents.length} registros`}
              search={{
                value: tableSearch,
                onChange: (value) => {
                  setTableSearch(value)
                  setPageIndex(0)
                },
                placeholder: 'Buscar matrícula, nombre o correo',
              }}
              toolbarRight={
                <div className="flex items-center gap-2">
                  <DataTableFiltersPopover<ShowcaseFilters>
                    title="Filtros de estudiantes"
                    fields={FILTER_FIELDS}
                    value={draftFilters}
                    activeCountValue={appliedFilters}
                    open={filtersOpen}
                    onOpenChange={setFiltersOpen}
                    onChange={(next) => setDraftFilters(next as ShowcaseFilters)}
                    onApply={() => {
                      setAppliedFilters(draftFilters)
                      setPageIndex(0)
                    }}
                    onReset={() => setDraftFilters(appliedFilters)}
                    onClear={() => {
                      setDraftFilters(EMPTY_FILTERS)
                      setAppliedFilters(EMPTY_FILTERS)
                    }}
                  />
                  <Button size="sm" variant="outline">Exportar</Button>
                  <Button size="sm" leftIcon={UserPlus}>Crear</Button>
                </div>
              }
              toolbarBelow={
                <div className="flex flex-wrap gap-2">
                  {appliedFilters.estado ? <Badge variant="secondary">Estado: {appliedFilters.estado}</Badge> : null}
                  {appliedFilters.carrera.map((career) => (
                    <Badge key={career} variant="secondary">{career}</Badge>
                  ))}
                  {appliedFilters.search ? <Badge variant="secondary">Búsqueda: {appliedFilters.search}</Badge> : null}
                  {!appliedFilters.estado && appliedFilters.carrera.length === 0 && !appliedFilters.search ? (
                    <Badge variant="muted">Sin filtros aplicados</Badge>
                  ) : null}
                </div>
              }
              renderTable={() => (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5">Matrícula</th>
                        <th className="px-4 py-2.5">Nombre</th>
                        <th className="px-4 py-2.5">Correo</th>
                        <th className="px-4 py-2.5">Carrera</th>
                        <th className="px-4 py-2.5">Estado</th>
                        <th className="px-4 py-2.5">Último acceso</th>
                        <th className="px-4 py-2.5">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedStudents.map((row) => (
                        <tr key={row.matricula} className="border-t border-border/70">
                          <td className="px-4 py-2.5 font-medium text-foreground">{row.matricula}</td>
                          <td className="px-4 py-2.5">{row.nombre}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{row.correo}</td>
                          <td className="px-4 py-2.5">{row.carrera}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant={row.estado === 'activo' ? 'success' : row.estado === 'pendiente' ? 'warning' : 'muted'}>
                              {row.estado}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{row.ultimoAcceso}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1.5">
                              <Button size="xs" variant="outline">Editar</Button>
                              <Button size="xs" variant="warning">Reintentar</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              renderCards={() => (
                <div className="grid gap-3 p-3 md:grid-cols-2 lg:grid-cols-3">
                  {paginatedStudents.map((row) => (
                    <div key={row.matricula} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-semibold">{row.nombre}</p>
                      <p className="text-xs text-muted-foreground">{row.matricula}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.correo}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge variant={row.estado === 'activo' ? 'success' : row.estado === 'pendiente' ? 'warning' : 'muted'}>
                          {row.estado}
                        </Badge>
                        <Button size="xs" variant="outline">Ver</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              pagination={{
                summary: `Mostrando ${paginatedStudents.length} de ${filteredStudents.length} registros`,
                pageIndex: safePageIndex,
                pageCount,
                canPreviousPage: safePageIndex > 0,
                canNextPage: safePageIndex < pageCount - 1,
                onPreviousPage: () => setPageIndex((current) => Math.max(0, current - 1)),
                onNextPage: () => setPageIndex((current) => Math.min(pageCount - 1, current + 1)),
                pageSize,
                onPageSizeChange: (next) => {
                  setPageSize(next)
                  setPageIndex(0)
                },
                pageJump: {
                  value: pageJump,
                  onChange: setPageJump,
                  onSubmit: () => {
                    const target = Number(pageJump)
                    if (Number.isNaN(target)) return
                    const nextIndex = Math.min(Math.max(target - 1, 0), pageCount - 1)
                    setPageIndex(nextIndex)
                  },
                  label: 'Ir a',
                },
              }}
            />

            <GroupTitle>FilterPopover aislado</GroupTitle>
            <div className="flex flex-wrap items-center gap-3">
              <DataTableFiltersPopover<ShowcaseFilters>
                title="Popover de filtros (demo)"
                fields={FILTER_FIELDS}
                value={draftFilters}
                activeCountValue={appliedFilters}
                onChange={(next) => setDraftFilters(next as ShowcaseFilters)}
                onApply={() => setAppliedFilters(draftFilters)}
                onReset={() => setDraftFilters(appliedFilters)}
                onClear={() => {
                  setDraftFilters(EMPTY_FILTERS)
                  setAppliedFilters(EMPTY_FILTERS)
                }}
              />
              <Button size="sm" variant="outline" onClick={() => setFiltersOpen((v) => !v)}>
                Toggle popover en toolbar
              </Button>
            </div>

            <GroupTitle>Header de tabla aislado</GroupTitle>
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="flex flex-col justify-between gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Estudiantes SIGASe</h3>
                  <p className="text-xs text-muted-foreground">Header: title + meta + toolbar</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input placeholder="Buscar…" className="h-8 w-44 text-xs" />
                  <Button size="sm" variant="outline">Filtros</Button>
                  <Button size="sm" variant="outline">Exportar</Button>
                </div>
              </div>
            </div>

            <GroupTitle>Columnas de tabla aisladas</GroupTitle>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Matrícula</th>
                    <th className="px-4 py-2.5">Nombre</th>
                    <th className="px-4 py-2.5">Correo</th>
                    <th className="px-4 py-2.5">Carrera</th>
                    <th className="px-4 py-2.5">Estado</th>
                    <th className="px-4 py-2.5">Último acceso</th>
                    <th className="px-4 py-2.5">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {STUDENTS_ROWS.slice(0, 2).map((row) => (
                    <tr key={`isolated-${row.matricula}`} className="border-t border-border/70">
                      <td className="px-4 py-2.5 font-medium text-foreground">{row.matricula}</td>
                      <td className="px-4 py-2.5">{row.nombre}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{row.correo}</td>
                      <td className="px-4 py-2.5">{row.carrera}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={row.estado === 'activo' ? 'success' : row.estado === 'pendiente' ? 'warning' : 'muted'}>
                          {row.estado}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{row.ultimoAcceso}</td>
                      <td className="px-4 py-2.5">
                        <Button size="xs" variant="outline">Editar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <GroupTitle>Paginación de tabla aislada</GroupTitle>
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-border px-5 py-3.5 sm:flex-row sm:items-center">
              <p className="text-xs text-muted-foreground">Mostrando 4 de 6 registros</p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Filas:</span>
                  <Input value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value) || 1)} className="h-7 w-16 text-xs" />
                </div>
                <div className="flex items-center gap-1">
                  <Button size="xs" variant="outline" onClick={() => setPageIndex((current) => Math.max(0, current - 1))}>
                    Prev
                  </Button>
                  <span className="px-2 text-xs text-muted-foreground">Página {safePageIndex + 1} de {pageCount}</span>
                  <Button size="xs" variant="outline" onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}>
                    Next
                  </Button>
                </div>
                <div className="ml-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Ir a:</span>
                  <Input value={pageJump} onChange={(e) => setPageJump(e.target.value)} className="h-7 w-16 text-xs" />
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      const target = Number(pageJump)
                      if (Number.isNaN(target)) return
                      setPageIndex(Math.min(Math.max(target - 1, 0), pageCount - 1))
                    }}
                  >
                    Ir
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
