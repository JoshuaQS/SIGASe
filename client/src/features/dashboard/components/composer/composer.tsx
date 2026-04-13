import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  Check,
  Filter,
  Layers,
  Loader2,
  RefreshCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react'

import {
  resolveDashboardAnalysisOptions,
  searchDashboardCareers,
  searchDashboardStudents,
  type DashboardAnalysisField,
  type DashboardAnalysisOptionsResponse,
  type DashboardCareerSearchItem,
  type DashboardStudentSearchItem,
} from '@/features/dashboard/api/dashboard-api'
import { DateRangeSelector } from '@/features/dashboard/components/date-range/date-range-selector'
import {
  applyOptionsDefaults,
  buildAnalysisRequest,
  buildOptionsRequest,
  getCurrentStep,
  getCurrentStepFromBackend,
  getVisualScopeChoice,
  type FilterComposerProps,
  type FilterState,
} from '@/features/dashboard/components/composer/composer-types'
import { useFilterComposer } from '@/features/dashboard/components/composer/useFilterComposer'
import { Stepper, type Step } from '@/features/dashboard/components/composer/stepper'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/shared/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/lib/utils'

const COMPOSER_STEPPER_STEPS: Step[] = [
  { id: 'scope', label: 'Tipo de análisis', description: 'Alumnos o carreras', icon: Filter },
  { id: 'mode', label: 'Alcance', description: 'Cómo quieres verlo', icon: Layers },
  { id: 'selection', label: 'Selección', description: 'Quién o qué quieres revisar', icon: Search },
  { id: 'config', label: 'Configuración', description: 'Resultado, periodo y ranking', icon: SlidersHorizontal },
]

const CAREER_WARMUP_QUERIES = ['in', 'li', 'de'] as const

function SearchResultsPanel<T extends { id: string; displayLabel: string; subtitle: string }>({
  query,
  loading,
  items,
  emptyMessage,
  onSelect,
}: {
  query: string
  loading: boolean
  items: T[]
  emptyMessage: string
  onSelect: (item: T) => void
}) {
  if (query.trim().length < 2) {
    return (
      <div className="flex min-h-36 items-center rounded-lg border border-dashed px-3 py-4 text-xs text-muted-foreground">
        Escribe al menos 2 caracteres para buscar.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-36 space-y-2 rounded-lg border p-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-36 items-center rounded-lg border border-dashed px-3 py-4 text-xs text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="min-h-36 max-h-52 overflow-auto rounded-lg border">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-accent/60"
        >
          <span className="text-sm font-medium">{item.displayLabel}</span>
          <span className="text-xs text-muted-foreground">{item.subtitle}</span>
        </button>
      ))}
    </div>
  )
}

function mergeCareerResults(responses: DashboardCareerSearchItem[][], maxItems = 12) {
  const merged = new Map<string, DashboardCareerSearchItem>()

  responses.flat().forEach((item) => {
    if (!merged.has(item.id)) {
      merged.set(item.id, item)
    }
  })

  return Array.from(merged.values())
    .sort((left, right) => left.displayLabel.localeCompare(right.displayLabel, 'es'))
    .slice(0, maxItems)
}

function hasResolvedSelection(state: FilterState) {
  if (!state.scope) return false

  if (state.scope === 'STUDENTS') {
    if (state.studentScopeChoice === 'ALL') return true
    if (state.studentScopeChoice === 'INDIVIDUAL') return Boolean(state.selectedStudent)
    return false
  }

  if (state.careerScopeChoice === 'INDIVIDUAL') {
    return state.selectedCareers.length > 0
  }

  if (state.careerScopeChoice === 'MULTIPLE') {
    return state.allCareersSelected || state.selectedCareers.length > 0
  }

  return false
}

function getNextStepMessage(field: DashboardAnalysisField | null, optionsLoading: boolean, isReadyToApply: boolean) {
  if (optionsLoading) {
    return 'Ajustando la siguiente parte del análisis…'
  }

  if (isReadyToApply) {
    return 'Ya puedes aplicar el análisis.'
  }

  switch (field) {
    case 'SCOPE':
      return 'Empieza eligiendo el tipo de análisis.'
    case 'MODE':
      return 'Ahora define el alcance.'
    case 'STUDENT_ID':
      return 'Selecciona el alumno que quieres revisar.'
    case 'CAREER_IDS':
      return 'Selecciona una o varias carreras.'
    case 'ACCESS_RESULT':
      return 'Elige el resultado que quieres ver.'
    case 'DATE_FILTER_TYPE':
    case 'DATE_FROM':
    case 'DATE_TO':
      return 'Si quieres, ajusta el periodo.'
    case 'RANKING_MODE':
    case 'TOP_N':
    case 'SORT_DIRECTION':
      return 'Termina de configurar el ranking.'
    default:
      return 'Sigue construyendo el análisis.'
  }
}

function CareerMultiSelectCombobox({
  query,
  onQueryChange,
  loading,
  items,
  selectedItems,
  allSelected,
  onToggleItem,
  onToggleAll,
}: {
  query: string
  onQueryChange: (value: string) => void
  loading: boolean
  items: DashboardCareerSearchItem[]
  selectedItems: DashboardCareerSearchItem[]
  allSelected: boolean
  onToggleItem: (item: DashboardCareerSearchItem) => void
  onToggleAll: (enabled: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedIds = useMemo(() => new Set(selectedItems.map((item) => item.id)), [selectedItems])
  const triggerLabel = allSelected
    ? 'Todas las carreras'
    : selectedItems.length > 0
      ? `${selectedItems.length} carreras seleccionadas`
      : 'Abrir selector de carreras'

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between">
            <span className={cn('truncate', !allSelected && selectedItems.length === 0 && 'text-muted-foreground')}>
              {triggerLabel}
            </span>
            <Search className="size-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(420px,calc(100vw-2rem))] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={onQueryChange}
              placeholder="Buscar por clave o nombre"
            />
            <CommandList>
              <CommandGroup heading="Acciones">
                <CommandItem
                  data-checked={allSelected}
                  onSelect={() => onToggleAll(!allSelected)}
                >
                  <Check className={cn('size-4', allSelected ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex min-w-0 flex-col">
                    <span>Seleccionar todas</span>
                    <span className="text-xs text-muted-foreground">Resuelve `mode=ALL` sin depender de un catálogo exhaustivo.</span>
                  </div>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              {loading ? (
                <div className="space-y-2 px-3 py-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <>
                  <CommandGroup heading={query.trim().length >= 2 ? 'Resultados' : 'Opciones sugeridas'}>
                    {items.map((item) => {
                      const checked = selectedIds.has(item.id)
                      return (
                        <CommandItem
                          key={item.id}
                          data-checked={checked}
                          onSelect={() => onToggleItem(item)}
                        >
                          <Check className={cn('size-4', checked ? 'opacity-100' : 'opacity-0')} />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate">{item.displayLabel}</span>
                            <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                          </div>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                  <CommandEmpty>
                    {query.trim().length >= 2
                      ? 'No encontramos carreras para esa búsqueda.'
                      : 'Abre el selector y usa la búsqueda para acotar carreras específicas.'}
                  </CommandEmpty>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="flex flex-wrap gap-2">
        {allSelected ? (
          <Badge variant="default">Todas las carreras</Badge>
        ) : selectedItems.length > 0 ? (
          selectedItems.map((career) => (
            <Badge key={career.id} variant="outlined" className="gap-1 px-2 py-1">
              {career.displayLabel}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => onToggleItem(career)}
              >
                ×
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">
            Aún no has agregado carreras. Puedes abrir el combobox y seleccionar varias sin escribir desde cero.
          </span>
        )}
      </div>
    </div>
  )
}

function ComposerBody({
  metadata,
  onApply,
  onReset,
  onRequestClose,
}: FilterComposerProps & { onRequestClose?: () => void }) {
  const composer = useFilterComposer(metadata)
  const { showToast } = useAppToast()
  const { state, setState } = composer
  const [studentQuery, setStudentQuery] = useState('')
  const [careerQuery, setCareerQuery] = useState('')
  const deferredStudentQuery = useDeferredValue(studentQuery)
  const deferredCareerQuery = useDeferredValue(careerQuery)
  const [studentResults, setStudentResults] = useState<DashboardStudentSearchItem[]>([])
  const [careerResults, setCareerResults] = useState<DashboardCareerSearchItem[]>([])
  const [studentSearchLoading, setStudentSearchLoading] = useState(false)
  const [careerSearchLoading, setCareerSearchLoading] = useState(false)
  const [options, setOptions] = useState<DashboardAnalysisOptionsResponse | null>(null)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [applyLoading, setApplyLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const optionsRequest = useMemo(() => buildOptionsRequest(state), [state])
  const analysisRequest = useMemo(() => buildAnalysisRequest(state, options), [state, options])
  const currentStep = useMemo(
    () => getCurrentStepFromBackend(options?.nextStep, state),
    [options?.nextStep, state],
  )
  const isReadyToApply = Boolean(analysisRequest && options?.canSubmit)
  const rankingLockedToTop =
    options?.ranking.allowed === true
    && options.ranking.allowedModes.length === 1
    && options.ranking.allowedModes[0] === 'TOP'
  const hasScope = Boolean(state.scope)
  const hasScopeChoice = Boolean(getVisualScopeChoice(state))
  const selectionResolved = hasResolvedSelection(state)
  const showResultStep = selectionResolved
  const showAdvancedStep = showResultStep && state.accessResult !== null

  useEffect(() => {
    let cancelled = false
    setOptionsLoading(true)

    void resolveDashboardAnalysisOptions(optionsRequest)
      .then((response) => {
        if (cancelled) return
        setOptions(response)
        setState((prev) => {
          const next = applyOptionsDefaults(prev, response)
          if (
            next.accessResult === prev.accessResult
            && next.dateFilterType === prev.dateFilterType
            && next.rankingMode === prev.rankingMode
            && next.topN === prev.topN
            && next.sortDirection === prev.sortDirection
          ) {
            return prev
          }
          return next
        })
      })
      .catch((error) => {
        if (cancelled) return
        const description = error instanceof Error ? error.message : 'No se pudieron resolver las opciones del wizard.'
        showToast({
          severity: 'error',
          title: 'Error resolviendo opciones',
          description,
        })
      })
      .finally(() => {
        if (!cancelled) {
          setOptionsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [optionsRequest, setState, showToast])

  useEffect(() => {
    if (state.scope !== 'STUDENTS' || state.studentScopeChoice !== 'INDIVIDUAL') {
      setStudentResults([])
      return
    }

    if (deferredStudentQuery.trim().length < 2) {
      setStudentResults([])
      return
    }

    let cancelled = false
    setStudentSearchLoading(true)

    void searchDashboardStudents(deferredStudentQuery.trim(), 10)
      .then((response) => {
        if (!cancelled) {
          setStudentResults(response.items)
        }
      })
      .catch((error) => {
        if (cancelled) return
        const description = error instanceof Error ? error.message : 'No se pudo buscar alumnos.'
        showToast({
          severity: 'error',
          title: 'Autocomplete de alumnos',
          description,
        })
      })
      .finally(() => {
        if (!cancelled) {
          setStudentSearchLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [deferredStudentQuery, showToast, state.scope, state.studentScopeChoice])

  useEffect(() => {
    if (state.scope !== 'CAREERS' || !state.careerScopeChoice || state.allCareersSelected) {
      setCareerResults([])
      return
    }

    let cancelled = false
    const normalizedQuery = deferredCareerQuery.trim()

    if (state.careerScopeChoice === 'INDIVIDUAL') {
      if (normalizedQuery.length < 2) {
        setCareerResults([])
        return
      }

      setCareerSearchLoading(true)
      void searchDashboardCareers(normalizedQuery, 10)
        .then((response) => {
          if (!cancelled) {
            setCareerResults(response.items)
          }
        })
        .catch((error) => {
          if (cancelled) return
          const description = error instanceof Error ? error.message : 'No se pudo buscar carreras.'
          showToast({
            severity: 'error',
            title: 'Autocomplete de carreras',
            description,
          })
        })
        .finally(() => {
          if (!cancelled) {
            setCareerSearchLoading(false)
          }
        })

      return () => {
        cancelled = true
      }
    }

    setCareerSearchLoading(true)

    if (normalizedQuery.length >= 2) {
      void searchDashboardCareers(normalizedQuery, 12)
        .then((response) => {
          if (!cancelled) {
            setCareerResults(response.items)
          }
        })
        .catch((error) => {
          if (cancelled) return
          const description = error instanceof Error ? error.message : 'No se pudo buscar carreras.'
          showToast({
            severity: 'error',
            title: 'Autocomplete de carreras',
            description,
          })
        })
        .finally(() => {
          if (!cancelled) {
            setCareerSearchLoading(false)
          }
        })

      return () => {
        cancelled = true
      }
    }

    void Promise.all(CAREER_WARMUP_QUERIES.map((query) => searchDashboardCareers(query, 6)))
      .then((responses) => {
        if (!cancelled) {
          setCareerResults(mergeCareerResults(responses.map((response) => response.items)))
        }
      })
      .catch((error) => {
        if (cancelled) return
        const description = error instanceof Error ? error.message : 'No se pudieron cargar sugerencias iniciales de carreras.'
        showToast({
          severity: 'warning',
          title: 'Sugerencias de carreras',
          description,
        })
      })
      .finally(() => {
        if (!cancelled) {
          setCareerSearchLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [deferredCareerQuery, showToast, state.allCareersSelected, state.careerScopeChoice, state.scope])

  const handleApply = async () => {
    if (!analysisRequest) return
    setApplyLoading(true)
    try {
      const applied = await onApply(analysisRequest)
      if (applied) {
        onRequestClose?.()
      }
    } finally {
      setApplyLoading(false)
    }
  }

  const handleReset = async () => {
    setResetLoading(true)
    try {
      composer.reset()
      setStudentQuery('')
      setCareerQuery('')
      setStudentResults([])
      setCareerResults([])
      await onReset()
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-[520px] w-full space-y-5">
      <div className="w-full space-y-5">
        <Stepper
          steps={COMPOSER_STEPPER_STEPS}
          currentStep={optionsLoading ? getCurrentStep(state) : currentStep}
          orientation="horizontal"
          size="md"
        />

        <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de análisis</label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={state.scope === 'STUDENTS' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => composer.setScope('STUDENTS')}
                    >
                      Alumnos
                    </Button>
                    <Button
                      type="button"
                      variant={state.scope === 'CAREERS' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => composer.setScope('CAREERS')}
                    >
                      Carreras
                    </Button>
                  </div>
                </div>

                {hasScope ? (
                  <div className="space-y-2 border-t pt-4">
                    <label className="text-sm font-medium">Alcance</label>

                    {state.scope === 'STUDENTS' ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={state.studentScopeChoice === 'INDIVIDUAL' ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => composer.setStudentScopeChoice('INDIVIDUAL')}
                        >
                          Individual
                        </Button>
                        <Button
                          type="button"
                          variant={state.studentScopeChoice === 'ALL' ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => composer.setStudentScopeChoice('ALL')}
                        >
                          Todos
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant={state.careerScopeChoice === 'INDIVIDUAL' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => composer.setCareerScopeChoice('INDIVIDUAL')}
                          >
                            Individual
                          </Button>
                          <Button
                            type="button"
                            variant={state.careerScopeChoice === 'MULTIPLE' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => composer.setCareerScopeChoice('MULTIPLE')}
                          >
                            Varias
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Dentro de “Varias” puedes elegir algunas carreras o usar “Seleccionar todas”.
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                {hasScope && hasScopeChoice ? (
                  <div className="space-y-3 border-t pt-4">
                    <div>
                      <label className="text-sm font-medium">Selección</label>
                    </div>

                    {state.scope === 'STUDENTS' && state.studentScopeChoice === 'INDIVIDUAL' ? (
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={studentQuery}
                            placeholder="Buscar por matrícula o nombre"
                            className="pl-9"
                            onChange={(event) => {
                              setStudentQuery(event.target.value)
                              composer.setSelectedStudent(null)
                            }}
                          />
                        </div>
                        <SearchResultsPanel
                          query={studentQuery}
                          loading={studentSearchLoading}
                          items={studentResults}
                          emptyMessage="No encontramos alumnos para esa búsqueda."
                          onSelect={(item) => {
                            composer.setSelectedStudent(item)
                            setStudentQuery(item.displayLabel)
                          }}
                        />
                        {state.selectedStudent ? (
                          <div className="rounded-lg border bg-muted/30 px-3 py-2">
                            <p className="text-sm font-medium">{state.selectedStudent.displayLabel}</p>
                            <p className="text-xs text-muted-foreground">{state.selectedStudent.subtitle}</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {state.scope === 'CAREERS' && state.careerScopeChoice === 'INDIVIDUAL' ? (
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={careerQuery}
                            placeholder="Buscar por clave o nombre"
                            className="pl-9"
                            onChange={(event) => {
                              setCareerQuery(event.target.value)
                              composer.setSelectedCareers([])
                              composer.setAllCareersSelected(false)
                            }}
                          />
                        </div>
                        <SearchResultsPanel
                          query={careerQuery}
                          loading={careerSearchLoading}
                          items={careerResults}
                          emptyMessage="No encontramos carreras para esa búsqueda."
                          onSelect={(item) => {
                            composer.setSelectedCareers([item])
                            setCareerQuery(item.displayLabel)
                          }}
                        />
                        {state.selectedCareers[0] ? (
                          <div className="rounded-lg border bg-muted/30 px-3 py-2">
                            <p className="text-sm font-medium">{state.selectedCareers[0].displayLabel}</p>
                            <p className="text-xs text-muted-foreground">{state.selectedCareers[0].subtitle}</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {state.scope === 'CAREERS' && state.careerScopeChoice === 'MULTIPLE' ? (
                      <div className="space-y-3">
                        <CareerMultiSelectCombobox
                          query={careerQuery}
                          onQueryChange={setCareerQuery}
                          loading={careerSearchLoading}
                          items={careerResults}
                          selectedItems={state.selectedCareers}
                          allSelected={state.allCareersSelected}
                          onToggleItem={composer.toggleCareer}
                          onToggleAll={composer.setAllCareersSelected}
                        />

                        <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                          {state.allCareersSelected
                            ? 'La vista se preparará como un análisis global de carreras.'
                            : state.selectedCareers.length === 1
                              ? 'Con una sola carrera, el dashboard se enfocará en ese detalle.'
                              : state.selectedCareers.length > 1
                                ? 'Con varias carreras, el análisis se prepara como una vista comparativa.'
                                : 'Selecciona una o varias carreras, o activa “Seleccionar todas”.'}
                        </div>
                      </div>
                    ) : null}

                    {state.scope === 'STUDENTS' && state.studentScopeChoice === 'ALL' ? (
                      <div className="rounded-lg border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                        El análisis se construirá con todo el universo de alumnos.
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {showResultStep ? (
                  <div className="space-y-4 border-t pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Resultado</label>
                      <Select
                        value={state.accessResult ?? undefined}
                        onValueChange={(value) => composer.setAccessResult(value as typeof state.accessResult)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el resultado" />
                        </SelectTrigger>
                        <SelectContent>
                          {(options?.allowedAccessResults ?? metadata.accessResults).map((result) => (
                            <SelectItem key={result} value={result}>
                              {result === 'ALL' ? 'Ambos' : result === 'SUCCESS' ? 'Exitosos' : 'Fallidos'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : null}

                {showAdvancedStep ? (
                  <div className="space-y-4 border-t pt-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <label className="text-sm font-medium">Periodo</label>
                        </div>
                        <Switch
                          checked={state.dateFilterType === 'CUSTOM_RANGE'}
                          onCheckedChange={(checked) => composer.setDateFilterType(checked ? 'CUSTOM_RANGE' : 'NONE')}
                        />
                      </div>

                      {state.dateFilterType === 'CUSTOM_RANGE' ? (
                        <DateRangeSelector
                          label="Rango de fechas"
                          value={state.dateRange}
                          onChange={(range) => composer.setDateRange({
                            from: range?.from,
                            to: range?.to,
                          })}
                        />
                      ) : null}
                    </div>

                    {options?.ranking.allowed ? (
                      <div className="space-y-2 border-t pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-sm font-medium">Ranking</label>
                          {rankingLockedToTop ? (
                            <Badge variant="default">Obligatorio</Badge>
                          ) : null}
                        </div>

                        {!rankingLockedToTop ? (
                          <div className="flex flex-wrap gap-2">
                            {options.ranking.allowedModes.map((mode) => (
                              <Button
                                key={mode}
                                type="button"
                                size="sm"
                                variant={state.rankingMode === mode ? 'primary' : 'outline'}
                                onClick={() => composer.setRankingMode(mode)}
                              >
                                {mode === 'NONE' ? 'Sin ranking' : 'Top ranking'}
                              </Button>
                            ))}
                          </div>
                        ) : null}

                        {state.rankingMode === 'TOP' && options.ranking.allowedTopN.length > 0 ? (
                          <Select
                            value={String(state.topN ?? options.ranking.defaultTopN ?? '')}
                            onValueChange={(value) => composer.setTopN(Number(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona el top N" />
                            </SelectTrigger>
                            <SelectContent>
                              {options.ranking.allowedTopN.map((topN) => (
                                <SelectItem key={topN} value={String(topN)}>
                                  Top {topN}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <div className="text-sm text-muted-foreground">
                    {getNextStepMessage(options?.nextStep ?? null, optionsLoading, isReadyToApply)}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={resetLoading} onClick={handleReset}>
                      {resetLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                      Reiniciar
                    </Button>
                    <Button type="button" size="sm" disabled={!isReadyToApply || applyLoading} onClick={handleApply}>
                      {applyLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                      Aplicar análisis
                    </Button>
                  </div>
                </div>
        </div>
      </div>
    </div>
  )
}

export type ComposerModalProps = FilterComposerProps & {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showDefaultTrigger?: boolean
}

export default function Composer(props: ComposerModalProps) {
  const {
    open: openProp,
    onOpenChange,
    showDefaultTrigger = false,
    ...bodyProps
  } = props
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)

  const open = openProp ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    onOpenChange?.(next)
    if (openProp === undefined) {
      setUncontrolledOpen(next)
    }
  }

  return (
    <>
      {showDefaultTrigger ? (
        <Button variant="primary" onClick={() => setOpen(true)}>
          Abrir compositor
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent animation="fade" className="max-w-[min(1240px,96vw)] p-0">
          <div className="border-b px-6 py-4">
            <DialogHeader className="space-y-1">
              <DialogTitle>Compositor de análisis</DialogTitle>
              <DialogDescription>
                Construye el análisis paso por paso. El backend resolverá el layout final, los widgets y las restricciones válidas.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="max-h-[84vh] overflow-auto px-6 py-5">
            <ComposerBody
              {...bodyProps}
              onRequestClose={() => setOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
