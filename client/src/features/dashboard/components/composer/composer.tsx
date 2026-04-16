import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarIcon,
  Filter,
  Layers,
  Loader2,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Table,
  TrendingUp,
} from 'lucide-react'
import { format } from 'date-fns'

import {
  searchDashboardCareers,
  searchDashboardStudents,
  type DashboardAnalysisMetadataResponse,
  type DashboardAnalysisRequest,
  type DashboardCareerSearchItem,
  type DashboardStudentSearchItem,
} from '@/features/dashboard/api/dashboard-api'
import { Stepper, type Step } from '@/features/dashboard/components/composer/stepper'
import {
  ALUMNO_TOP_OPTIONS,
  CARRERA_TOP_OPTIONS,
  getCurrentStep,
  type AccessType,
  type FilterState,
  supportsRankingForState,
  useFilterComposer,
} from '@/features/dashboard/components/composer/useFilterComposer'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Calendar } from '@/shared/components/ui/calendar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/lib/utils'

const COMPOSER_STEPPER_STEPS: Step[] = [
  { id: 'type', label: 'Tipo de filtrado', description: 'Alumno o carrera', icon: Filter },
  { id: 'scope', label: 'Alcance', description: 'Individual o grupos', icon: Layers },
  { id: 'selection', label: 'Selección', description: 'Registros específicos', icon: Search },
  { id: 'config', label: 'Configuración', description: 'Resultado, fechas y ranking', icon: SlidersHorizontal },
]

const PREVIEW_BAR_HEIGHTS_PCT = [38, 72, 45, 88, 52, 67, 41, 59] as const

type ComposerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  metadata: DashboardAnalysisMetadataResponse
  currentLayoutLabel?: string | null
  lastAppliedSummary?: string | null
  currentWidgets?: string[]
  onApply: (request: DashboardAnalysisRequest) => Promise<boolean> | boolean
  onReset: () => Promise<void> | void
}

function mapAccessType(accessType: AccessType): 'ALL' | 'SUCCESS' | 'FAILED' {
  if (accessType === 'exitoso') return 'SUCCESS'
  if (accessType === 'fallido') return 'FAILED'
  return 'ALL'
}

function toDashboardRequest(
  state: FilterState,
  defaultSortDirection: DashboardAnalysisRequest['sortDirection'],
): DashboardAnalysisRequest | null {
  if (!state.filterType || !state.scope) return null

  if (state.filterType === 'alumno') {
    if (state.scope === 'individual' && !state.selectedStudent) return null
    const supportsRanking = supportsRankingForState(state)

    return {
      scope: 'STUDENTS',
      mode: state.scope === 'todos' ? 'ALL' : 'INDIVIDUAL',
      studentId: state.scope === 'individual' ? state.selectedStudent : null,
      careerIds: null,
      accessResult: mapAccessType(state.accessType),
      dateFilterType: state.dateFilter ? 'CUSTOM_RANGE' : 'NONE',
      dateFrom: state.dateFilter && state.dateRange.from ? state.dateRange.from.toISOString() : null,
      dateTo: state.dateFilter && state.dateRange.to ? state.dateRange.to.toISOString() : null,
      rankingMode: supportsRanking && state.ranking ? 'TOP' : 'NONE',
      topN: supportsRanking && state.ranking ? state.topN : null,
      sortDirection: state.sortOrder === 'asc' ? 'ASC' : defaultSortDirection,
      widgetControls: null,
    }
  }

  if (state.scope === 'individual' && state.selectedCareers.length === 0) return null
  if (state.scope === 'varias' && state.selectedCareers.length < 2) return null
  const supportsRanking = supportsRankingForState(state)

  return {
    scope: 'CAREERS',
    mode: state.scope === 'todas' ? 'ALL' : state.scope === 'varias' ? 'MULTI' : 'INDIVIDUAL',
    studentId: null,
    careerIds: state.scope === 'todas' ? null : state.selectedCareers,
    accessResult: mapAccessType(state.accessType),
    dateFilterType: state.dateFilter ? 'CUSTOM_RANGE' : 'NONE',
    dateFrom: state.dateFilter && state.dateRange.from ? state.dateRange.from.toISOString() : null,
    dateTo: state.dateFilter && state.dateRange.to ? state.dateRange.to.toISOString() : null,
    rankingMode: supportsRanking && state.ranking ? 'TOP' : 'NONE',
    topN: supportsRanking && state.ranking ? state.topN : null,
    sortDirection: state.sortOrder === 'asc' ? 'ASC' : defaultSortDirection,
    widgetControls: null,
  }
}

function getPreviewStage(state: FilterState) {
  if (!state.filterType) return 'initial'
  if (!state.scope) return 'initial'

  const hasSelection =
    (state.filterType === 'alumno' && (state.scope === 'todos' || Boolean(state.selectedStudent)))
    || (state.filterType === 'carrera' && (
      state.scope === 'todas'
      || (state.scope === 'individual' && state.selectedCareers.length > 0)
      || (state.scope === 'varias' && state.selectedCareers.length > 0)
    ))

  if (!hasSelection) return 'partial'
  return 'advanced'
}

function PreviewPanel({ state }: { state: FilterState }) {
  const stage = getPreviewStage(state)
  const supportsRanking = supportsRankingForState(state)

  const showSplit = state.accessType === 'ambos'
  const showRanking = supportsRanking && state.ranking
  const showTable = !showRanking && (state.filterType === 'carrera' || state.scope === 'todos' || state.scope === 'todas' || state.scope === 'varias')

  return (
    <div className='w-[45%] space-y-4'>
      <p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>Vista previa del dashboard</p>
      <div className='rounded-xl border bg-muted/30 p-4 space-y-4'>
        <div className='grid grid-cols-3 gap-3'>
          {[1, 2, 3].map((id) => (
            <div key={id} className='rounded-lg border bg-card p-3 space-y-2'>
              <Skeleton className={cn('h-3 w-16', stage !== 'initial' && 'bg-primary/20')} />
              <Skeleton className={cn('h-6 w-12', stage === 'advanced' && 'bg-primary/35')} />
            </div>
          ))}
        </div>

        <div className='rounded-lg border bg-card p-4'>
          <div className='mb-3 flex items-center gap-2'>
            <BarChart3 className={cn('h-4 w-4', stage === 'advanced' ? 'text-primary' : 'text-muted-foreground')} />
            <Skeleton className='h-3 w-24' />
          </div>
          <div className='flex h-24 items-end gap-1'>
            {PREVIEW_BAR_HEIGHTS_PCT.map((pct, i) => (
              <div
                key={i}
                className={cn('flex-1 rounded-t transition-all', stage === 'advanced' ? 'bg-primary/40' : 'bg-muted')}
                style={{ height: `${pct}%` }}
              />
            ))}
          </div>
        </div>

        {showSplit ? (
          <div className='grid grid-cols-2 gap-3'>
            <div className='rounded-lg border bg-card p-3 space-y-2'>
              <Skeleton className='h-3 w-20 bg-emerald-100' />
              <Skeleton className='h-16 w-full' />
            </div>
            <div className='rounded-lg border bg-card p-3 space-y-2'>
              <Skeleton className='h-3 w-20 bg-rose-100' />
              <Skeleton className='h-16 w-full' />
            </div>
          </div>
        ) : null}

        {showRanking ? (
          <div className='rounded-lg border bg-card p-4'>
            <div className='mb-3 flex items-center gap-2'>
              <TrendingUp className='h-4 w-4 text-primary' />
              <span className='text-xs font-medium'>Top {state.topN}</span>
            </div>
            {Array.from({ length: Math.min(state.topN, 5) }).map((_, i) => (
              <div key={i} className='flex items-center gap-2 py-1.5'>
                <span className='w-4 text-xs text-muted-foreground'>{i + 1}</span>
                <Skeleton className='h-3 flex-1 bg-primary/15' />
              </div>
            ))}
          </div>
        ) : null}

        {showTable ? (
          <div className='rounded-lg border bg-card p-4 space-y-3'>
            <div className='flex items-center gap-2'>
              <Table className='h-4 w-4 text-muted-foreground' />
              <Skeleton className='h-3 w-20' />
            </div>
            {Array.from({ length: stage === 'initial' ? 2 : 4 }).map((_, row) => (
              <div key={row} className='grid grid-cols-4 gap-2'>
                <Skeleton className='h-2.5' />
                <Skeleton className='h-2.5' />
                <Skeleton className='h-2.5' />
                <Skeleton className='h-2.5' />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function Composer({
  open,
  onOpenChange,
  metadata,
  onApply,
  onReset,
}: ComposerProps) {
  const composer = useFilterComposer()
  const { showToast } = useAppToast()

  const [studentSearch, setStudentSearch] = useState('')
  const [careerSearch, setCareerSearch] = useState('')
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [careersLoading, setCareersLoading] = useState(false)
  const [students, setStudents] = useState<DashboardStudentSearchItem[]>([])
  const [careers, setCareers] = useState<DashboardCareerSearchItem[]>([])

  const deferredStudentSearch = useDeferredValue(studentSearch)
  const deferredCareerSearch = useDeferredValue(careerSearch)

  const step = getCurrentStep(composer.state)
  const selectedStudentItem = useMemo(
    () => students.find((item) => item.id === composer.state.selectedStudent) ?? null,
    [composer.state.selectedStudent, students],
  )

  useEffect(() => {
    if (deferredStudentSearch.trim().length < 2 || composer.state.filterType !== 'alumno') return

    let active = true

    void searchDashboardStudents(deferredStudentSearch.trim(), 12)
      .then((response) => {
        if (!active) return
        setStudents(response.items)
      })
      .catch(() => {
        if (!active) return
        setStudents([])
      })
      .finally(() => {
        if (active) setStudentsLoading(false)
      })

    return () => {
      active = false
    }
  }, [composer.state.filterType, deferredStudentSearch])

  useEffect(() => {
    if (deferredCareerSearch.trim().length < 2 || composer.state.filterType !== 'carrera') return

    let active = true

    void searchDashboardCareers(deferredCareerSearch.trim(), 20)
      .then((response) => {
        if (!active) return
        setCareers(response.items)
      })
      .catch(() => {
        if (!active) return
        setCareers([])
      })
      .finally(() => {
        if (active) setCareersLoading(false)
      })

    return () => {
      active = false
    }
  }, [composer.state.filterType, deferredCareerSearch])

  const handleApply = async () => {
    const request = toDashboardRequest(composer.state, metadata.defaults.sortDirection)
    if (!request) return

    const ok = await onApply(request)
    if (ok) {
      showToast({
        severity: 'success',
        title: 'Análisis preparado',
        description: 'El dashboard se actualizó con la configuración seleccionada.',
      })
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent animation="fade" size='4' className='max-w-[1100px] p-0 overflow-hidden'>
        <DialogHeader className='px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='text-lg'>Compositor de análisis</DialogTitle>
          <DialogDescription>
            Construye el dashboard en tiempo real antes de ejecutar el análisis.
          </DialogDescription>
        </DialogHeader>

        <div className='p-6'>
          <div className='flex gap-6 w-full min-h-[520px]'>
            <div className='w-[55%] space-y-6'>
              <Stepper
                steps={COMPOSER_STEPPER_STEPS}
                currentStep={step}
                orientation='horizontal'
                size='md'
                className='w-full'
              />

              <Card>
                <CardContent className='p-5'>
                  <div className='flex items-start gap-4'>
                    <div className='flex shrink-0 flex-col items-center pt-7'>
                      <Stepper
                        steps={COMPOSER_STEPPER_STEPS}
                        currentStep={step}
                        orientation='vertical'
                        size='sm'
                        showLabels={false}
                      />
                    </div>

                    <div className='min-w-0 flex-1 space-y-4'>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium'>Tipo de filtrado</label>
                        <div className='grid grid-cols-2 gap-2'>
                          {(['alumno', 'carrera'] as const).map((type) => (
                            <Button
                              key={type}
                              variant={composer.state.filterType === type ? 'primary' : 'outline'}
                              size='sm'
                              className='w-full'
                              onClick={() => {
                                composer.setFilterType(type)
                                setStudentSearch('')
                                setCareerSearch('')
                                setStudents([])
                                setCareers([])
                                setStudentsLoading(false)
                                setCareersLoading(false)
                              }}
                            >
                              {type === 'alumno' ? 'Alumno(s)' : 'Carrera(s)'}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {composer.state.filterType ? (
                        <div className='space-y-2'>
                          <label className='text-sm font-medium'>Alcance</label>
                          <div className={cn(
                            'grid gap-2',
                            composer.state.filterType === 'alumno' ? 'grid-cols-2' : 'grid-cols-3',
                          )}>
                            {composer.state.filterType === 'alumno' ? (
                              <>
                                <Button variant={composer.state.scope === 'individual' ? 'primary' : 'outline'} size='sm' className='w-full' onClick={() => composer.setScope('individual')}>Individual</Button>
                                <Button variant={composer.state.scope === 'todos' ? 'primary' : 'outline'} size='sm' className='w-full' onClick={() => composer.setScope('todos')}>Todos</Button>
                              </>
                            ) : (
                              <>
                                <Button variant={composer.state.scope === 'individual' ? 'primary' : 'outline'} size='sm' className='w-full' onClick={() => composer.setScope('individual')}>Una</Button>
                                <Button variant={composer.state.scope === 'varias' ? 'primary' : 'outline'} size='sm' className='w-full' onClick={() => composer.setScope('varias')}>Varias</Button>
                                <Button variant={composer.state.scope === 'todas' ? 'primary' : 'outline'} size='sm' className='w-full' onClick={() => composer.setScope('todas')}>Todas</Button>
                              </>
                            )}
                          </div>
                        </div>
                      ) : null}

                      {composer.state.scope ? (
                        <div className='space-y-3 border-t pt-3'>
                          {composer.state.filterType === 'alumno' && composer.state.scope === 'individual' ? (
                            <div className='space-y-2'>
                              <div className='relative'>
                                <Search className='absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
                                <Input
                                  placeholder='Buscar alumno...'
                                  value={studentSearch}
                                  onChange={(event) => {
                                    const next = event.target.value
                                    setStudentSearch(next)
                                    const query = next.trim()
                                    if (query.length < 2) {
                                      setStudents([])
                                      setStudentsLoading(false)
                                      return
                                    }
                                    setStudentsLoading(true)
                                  }}
                                  className='h-8 pl-8 text-sm'
                                />
                              </div>
                              <div className='max-h-32 overflow-auto rounded-md border'>
                                {studentsLoading ? (
                                  <div className='px-3 py-2 text-xs text-muted-foreground inline-flex items-center gap-2'>
                                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                    Buscando alumnos...
                                  </div>
                                ) : students.length > 0 ? (
                                  students.map((student) => (
                                    <button
                                      key={student.id}
                                      type='button'
                                      className={cn(
                                        'w-full px-2.5 py-1.5 text-left text-xs hover:bg-accent',
                                        composer.state.selectedStudent === student.id && 'bg-accent font-medium',
                                      )}
                                      onClick={() => composer.setSelectedStudent(student.id)}
                                    >
                                      {student.displayLabel}
                                    </button>
                                  ))
                                ) : (
                                  <div className='px-3 py-2 text-xs text-muted-foreground'>Escribe al menos 2 caracteres.</div>
                                )}
                              </div>
                            </div>
                          ) : null}

                          {composer.state.filterType === 'carrera' && composer.state.scope !== 'todas' ? (
                            <div className='space-y-2'>
                              <div className='relative'>
                                <Search className='absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
                                <Input
                                  placeholder='Buscar carrera...'
                                  value={careerSearch}
                                  onChange={(event) => {
                                    const next = event.target.value
                                    setCareerSearch(next)
                                    const query = next.trim()
                                    if (query.length < 2) {
                                      setCareers([])
                                      setCareersLoading(false)
                                      return
                                    }
                                    setCareersLoading(true)
                                  }}
                                  className='h-8 pl-8 text-sm'
                                />
                              </div>
                              <div className='max-h-32 overflow-auto rounded-md border'>
                                {careersLoading ? (
                                  <div className='px-3 py-2 text-xs text-muted-foreground inline-flex items-center gap-2'>
                                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                    Buscando carreras...
                                  </div>
                                ) : careers.length > 0 ? (
                                  careers.map((career) => {
                                    const selected = composer.state.selectedCareers.includes(career.id)
                                    return (
                                      <button
                                        key={career.id}
                                        type='button'
                                        className={cn('w-full px-2.5 py-1.5 text-left text-xs hover:bg-accent', selected && 'bg-accent font-medium')}
                                        onClick={() => {
                                          if (composer.state.scope === 'individual') {
                                            composer.setSelectedCareers([career.id])
                                          } else {
                                            composer.toggleCareer(career.id)
                                          }
                                        }}
                                      >
                                        {career.displayLabel}
                                      </button>
                                    )
                                  })
                                ) : (
                                  <div className='px-3 py-2 text-xs text-muted-foreground'>Escribe al menos 2 caracteres.</div>
                                )}
                              </div>
                              {composer.state.scope === 'varias' && composer.state.selectedCareers.length > 0 ? (
                                <div className='flex flex-wrap gap-1.5'>
                                  {composer.state.selectedCareers.map((careerId) => {
                                    const label = careers.find((career) => career.id === careerId)?.displayLabel ?? careerId
                                    return (
                                      <Badge key={careerId} variant='outlined' className='cursor-pointer text-xs' onClick={() => composer.toggleCareer(careerId)}>
                                        {label}
                                      </Badge>
                                    )
                                  })}
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          <Select onValueChange={(value) => composer.setAccessType(value as AccessType)} value={composer.state.accessType}>
                            <SelectTrigger className='h-8 text-sm'><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value='exitoso'>Exitoso</SelectItem>
                              <SelectItem value='fallido'>Fallido</SelectItem>
                              <SelectItem value='ambos'>Ambos</SelectItem>
                            </SelectContent>
                          </Select>

                          {composer.isGroupScope ? (
                            <div className='space-y-2'>
                              <div className='flex items-center justify-between'>
                                <span className='text-xs font-medium'>Ranking</span>
                                <Switch checked={composer.state.ranking} onCheckedChange={composer.setRanking} />
                              </div>
                              {composer.state.ranking ? (
                                <Select onValueChange={(value) => composer.setTopN(Number(value))} value={String(composer.state.topN)}>
                                  <SelectTrigger className='h-8 text-sm'><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {(composer.state.filterType === 'alumno' ? ALUMNO_TOP_OPTIONS : CARRERA_TOP_OPTIONS).map((n) => (
                                      <SelectItem key={n} value={String(n)}>Top {n}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : null}
                            </div>
                          ) : (
                            <div className='space-y-2'>
                              <div className='flex items-center justify-between'>
                                <span className='text-xs font-medium'>Filtro de fecha</span>
                                <Switch checked={composer.state.dateFilter} onCheckedChange={composer.setDateFilter} />
                              </div>
                              {composer.state.dateFilter ? (
                                <div className='flex gap-2'>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant='outline' size='sm' className='flex-1 justify-start text-xs'>
                                        <CalendarIcon className='mr-1 h-3 w-3' />
                                        {composer.state.dateRange.from ? format(composer.state.dateRange.from, 'dd/MM/yy') : 'Desde'}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className='w-auto p-0'>
                                      <Calendar mode='single' selected={composer.state.dateRange.from} onSelect={(date) => composer.setDateRange({ ...composer.state.dateRange, from: date })} />
                                    </PopoverContent>
                                  </Popover>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant='outline' size='sm' className='flex-1 justify-start text-xs'>
                                        <CalendarIcon className='mr-1 h-3 w-3' />
                                        {composer.state.dateRange.to ? format(composer.state.dateRange.to, 'dd/MM/yy') : 'Hasta'}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className='w-auto p-0'>
                                      <Calendar mode='single' selected={composer.state.dateRange.to} onSelect={(date) => composer.setDateRange({ ...composer.state.dateRange, to: date })} />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ) : null}

                      <div className='flex gap-2 pt-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            composer.reset()
                            void onReset()
                          }}
                        >
                          <RefreshCcw className='h-3.5 w-3.5' />
                        </Button>
                        <Button size='sm' className='flex-1' disabled={!composer.isComplete} onClick={() => void handleApply()}>
                          Aplicar análisis
                        </Button>
                      </div>

                      {selectedStudentItem ? (
                        <p className='text-xs text-muted-foreground'>Seleccionado: {selectedStudentItem.displayLabel}</p>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <PreviewPanel state={composer.state} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
