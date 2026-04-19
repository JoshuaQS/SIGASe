import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownUp,
  ArrowUpDown,
  BarChart3,
  CalendarDays,
  CheckIcon,
  ChevronsUpDownIcon,
  Filter,
  Layers,
  Loader2,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Table,
  TrendingUp,
  XIcon,
} from 'lucide-react'

import {
  searchDashboardCareers,
  searchDashboardStudents,
  type DashboardAnalysisMetadataResponse,
  type DashboardAnalysisRequest,
  type DashboardCareerSearchItem,
  type DashboardStudentSearchItem,
} from '@/features/dashboard/api/dashboard-api'
import { listActiveCareers } from '@/features/careers/api/careers-api'
import {
  Stepper,
  type Step,
} from '@/features/dashboard/components/composer/stepper'
import { DateRangeSelector } from '@/features/dashboard/components/date-range/date-range-selector'
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Switch } from '@/shared/components/ui/switch'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'

const COMPOSER_STEPPER_STEPS: Step[] = [
  {
    id: 'type',
    label: 'Tipo de filtrado',
    description: 'Alumno o carrera',
    icon: Filter,
  },
  {
    id: 'scope',
    label: 'Alcance',
    description: 'Individual o grupos',
    icon: Layers,
  },
  {
    id: 'selection',
    label: 'Selección',
    description: 'Registros específicos',
    icon: Search,
  },
  {
    id: 'config',
    label: 'Configuración',
    description: 'Resultado, fechas y ranking',
    icon: SlidersHorizontal,
  },
]

const PREVIEW_BAR_HEIGHTS_PCT = [38, 72, 45, 88, 52, 67, 41, 59] as const

function toCareerSearchItems(
  careers: Array<{ id: string; code: string; name: string }>,
): DashboardCareerSearchItem[] {
  return careers.map((career) => ({
    id: career.id,
    code: career.code,
    name: career.name,
    displayLabel: `${career.code} - ${career.name}`,
    subtitle: career.code,
    status: 'ACTIVE',
  }))
}

type ComposerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  metadata: DashboardAnalysisMetadataResponse
  currentLayoutLabel?: string | null
  lastAppliedSummary?: string | null
  currentWidgets?: string[]
  resetSignal?: number
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
  if (!state.accessType) return null

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
      dateFrom:
        state.dateFilter && state.dateRange.from
          ? state.dateRange.from.toISOString()
          : null,
      dateTo:
        state.dateFilter && state.dateRange.to
          ? state.dateRange.to.toISOString()
          : null,
      rankingMode: supportsRanking && state.ranking ? 'TOP' : 'NONE',
      topN: supportsRanking && state.ranking ? state.topN : null,
      sortDirection: state.sortOrder === 'asc' ? 'ASC' : 'DESC',
      widgetControls: null,
    }
  }

  if (state.scope === 'individual' && state.selectedCareers.length === 0)
    return null
  if (state.scope === 'varias' && state.selectedCareers.length < 2) return null
  const supportsRanking = supportsRankingForState(state)

  return {
    scope: 'CAREERS',
    mode:
      state.scope === 'todas'
        ? 'ALL'
        : state.scope === 'varias'
          ? 'MULTI'
          : 'INDIVIDUAL',
    studentId: null,
    careerIds: state.scope === 'todas' ? null : state.selectedCareers,
    accessResult: mapAccessType(state.accessType),
    dateFilterType: state.dateFilter ? 'CUSTOM_RANGE' : 'NONE',
    dateFrom:
      state.dateFilter && state.dateRange.from
        ? state.dateRange.from.toISOString()
        : null,
    dateTo:
      state.dateFilter && state.dateRange.to
        ? state.dateRange.to.toISOString()
        : null,
    rankingMode: supportsRanking && state.ranking ? 'TOP' : 'NONE',
    topN: supportsRanking && state.ranking ? state.topN : null,
    sortDirection: state.sortOrder === 'asc' ? 'ASC' : 'DESC',
    widgetControls: null,
  }
}

function getPreviewStage(state: FilterState) {
  if (!state.filterType) return 'initial'
  if (!state.scope) return 'initial'

  const hasSelection =
    (state.filterType === 'alumno' &&
      (state.scope === 'todos' || Boolean(state.selectedStudent))) ||
    (state.filterType === 'carrera' &&
      (state.scope === 'todas' ||
        (state.scope === 'individual' && state.selectedCareers.length > 0) ||
        (state.scope === 'varias' && state.selectedCareers.length > 0)))

  if (!hasSelection) return 'partial'
  return 'advanced'
}

function PreviewPanel({ state }: { state: FilterState }) {
  const stage = getPreviewStage(state)
  const supportsRanking = supportsRankingForState(state)
  const isStudentIndividualScope =
    state.filterType === 'alumno' && state.scope === 'individual'
  const isStudentAllScope =
    state.filterType === 'alumno' && state.scope === 'todos'
  const isCareerIndividualScope =
    state.filterType === 'carrera' && state.scope === 'individual'
  const isCareerMultiScope =
    state.filterType === 'carrera' && state.scope === 'varias'
  const isCareerAllScope = state.filterType === 'carrera' && state.scope === 'todas'
  const isCareerScope =
    isCareerIndividualScope || isCareerMultiScope || isCareerAllScope
  const isCareerGroupScope = isCareerMultiScope || isCareerAllScope
  const hasStudentSelected = Boolean(state.selectedStudent)
  const hasCareerSelected =
    state.scope === 'individual' ? state.selectedCareers.length > 0 : true
  const hasAccessTypeSelected = Boolean(state.accessType)
  const hasDateRangeSelected =
    state.dateFilter && Boolean(state.dateRange.from && state.dateRange.to)
  const isInitialStage = stage === 'initial'
  const isSuccessOnly = state.accessType === 'exitoso'
  const isFailedOnly = state.accessType === 'fallido'
  const isBothResults = state.accessType === 'ambos'

  const individualKpiLabels = isSuccessOnly
    ? ['Alumno', 'Total', 'Exitosos', 'Taza']
    : isFailedOnly
      ? ['Alumno', 'Total', 'Fallidos', 'Taza']
      : ['Alumno', 'Total', 'Exitosos', 'Fallidos']

  const showSplit = isInitialStage || state.accessType === 'ambos'
  const showRanking = supportsRanking && state.ranking
  const showTable =
    !isInitialStage &&
    !showRanking &&
    (state.filterType === 'carrera' ||
      state.scope === 'todos' ||
      state.scope === 'todas' ||
      state.scope === 'varias')

  return (
    <div className='w-1/2 min-h-0'>
      {isStudentIndividualScope ? (
        <div className='flex h-full min-h-[520px] flex-col rounded-3xl border border-white/40 bg-white/10 p-4 shadow-none backdrop-blur-none dark:border-white/10 dark:bg-slate-950/15'>
          <p className='mb-4 text-xs font-medium text-muted-foreground uppercase tracking-wide'>
            Vista previa del dashboard
          </p>

          <div className='space-y-4'>
            <div className='rounded-lg border bg-card p-3'>
              <div className='mb-2 flex items-center gap-2'>
                <Table className='h-4 w-4 text-muted-foreground' />
                <span
                  className={cn(
                    'rounded-full px-2 py-0 text-[10px] font-semibold leading-4',
                    isFailedOnly
                      ? 'bg-rose-200/70 text-rose-500'
                      : 'bg-primary/20 text-muted-foreground',
                  )}
                >
                  Contexto análisis
                </span>
              </div>
              <div className='space-y-3'>
                {Array.from({ length: 2 }).map((_, row) => (
                  <div key={row} className='grid grid-cols-4 gap-2'>
                    <div className='h-2.5 rounded-md bg-muted' />
                    <div className='h-2.5 rounded-md bg-muted' />
                    <div className='h-2.5 rounded-md bg-muted' />
                    <div className='h-2.5 rounded-md bg-muted' />
                  </div>
                ))}
              </div>
            </div>

            {hasStudentSelected && hasAccessTypeSelected ? (
              <div className='grid grid-cols-4 gap-3'>
                {individualKpiLabels.map((label, index) => (
                  <div
                    key={label}
                    className='rounded-lg border bg-card p-3 space-y-2'
                  >
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0 text-[10px] font-semibold leading-4',
                        isFailedOnly || (isBothResults && index === 3)
                          ? 'bg-rose-200/70 text-rose-500'
                          : 'bg-primary/20 text-muted-foreground',
                      )}
                    >
                      {label}
                    </span>
                    <div
                      className={cn(
                        'h-6 w-12 rounded-md',
                        isFailedOnly || (isBothResults && index === 3)
                          ? 'bg-rose-300/80'
                          : 'bg-primary/35',
                      )}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {hasAccessTypeSelected ? (
              <div className='rounded-lg border bg-card p-4'>
                <div className='mb-3 flex items-center justify-between gap-3'>
                  <div className='flex items-center gap-2'>
                    <BarChart3 className='h-4 w-4 text-muted-foreground' />
                    <span
                      className={cn(
                        'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold leading-none',
                        isFailedOnly
                          ? 'bg-rose-200/70 text-rose-500'
                          : 'bg-primary/20 text-muted-foreground',
                      )}
                    >
                      Gráfica Accesos
                    </span>
                  </div>
                  {hasDateRangeSelected ? (
                    <div className='flex items-center gap-2'>
                      <CalendarDays className='h-4 w-4 text-muted-foreground' />
                      <span
                        className={cn(
                          'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold leading-none',
                          isFailedOnly
                            ? 'bg-rose-200/70 text-rose-500'
                            : 'bg-primary/20 text-muted-foreground',
                        )}
                      >
                        Rango de fechas
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className='flex h-24 items-end gap-1'>
                  {PREVIEW_BAR_HEIGHTS_PCT.map((pct, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex-1 rounded-t transition-all',
                        isSuccessOnly
                          ? 'bg-primary/35'
                          : isFailedOnly
                            ? 'bg-rose-300/80'
                            : i % 2 === 0
                              ? 'bg-primary/35'
                              : 'bg-rose-300/80',
                      )}
                      style={{ height: `${pct}%` }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : isStudentAllScope && hasAccessTypeSelected ? (
        <div className='flex h-full min-h-[520px] flex-col rounded-3xl border border-white/40 bg-white/10 p-4 shadow-none backdrop-blur-none dark:border-white/10 dark:bg-slate-950/15'>
          <p className='mb-4 text-xs font-medium text-muted-foreground uppercase tracking-wide'>
            Vista previa del dashboard
          </p>

          <div className='space-y-4'>
            <div className='rounded-lg border bg-card p-3'>
              <div className='mb-2 flex items-center gap-2'>
                <Table className='h-4 w-4 text-muted-foreground' />
                <span
                  className={cn(
                    'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold leading-none',
                    isFailedOnly
                      ? 'bg-rose-200/70 text-rose-500'
                      : 'bg-primary/20 text-muted-foreground',
                  )}
                >
                  Contexto análisis
                </span>
              </div>
              <div className='space-y-3'>
                {Array.from({ length: 2 }).map((_, row) => (
                  <div key={row} className='grid grid-cols-4 gap-2'>
                    <div className='h-2.5 rounded-md bg-muted' />
                    <div className='h-2.5 rounded-md bg-muted' />
                    <div className='h-2.5 rounded-md bg-muted' />
                    <div className='h-2.5 rounded-md bg-muted' />
                  </div>
                ))}
              </div>
            </div>

            <div className='grid grid-cols-4 gap-3'>
              {(isBothResults
                ? ['Alumnos totales', 'Totales', 'Exitosos', 'Fallidos']
                : isSuccessOnly
                  ? ['Alumnos totales', 'Totales', 'Exitosos', 'Taza']
                  : ['Alumnos totales', 'Totales', 'Fallidos', 'Taza']
              ).map((label, index) => (
                <div key={label} className='rounded-lg border bg-card p-3 space-y-2'>
                  <span
                    className={cn(
                      'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold leading-none',
                      isFailedOnly || (isBothResults && index === 3)
                        ? 'bg-rose-200/70 text-rose-500'
                        : 'bg-primary/20 text-muted-foreground',
                    )}
                  >
                    {label}
                  </span>
                  <div
                    className={cn(
                      'h-6 w-16 rounded-md',
                      isFailedOnly || (isBothResults && index === 3)
                        ? 'bg-rose-300/80'
                        : 'bg-primary/35',
                    )}
                  />
                </div>
              ))}
            </div>

            {showRanking ? (
              isBothResults ? (
                <div className='grid grid-cols-2 gap-3'>
                  <div className='rounded-lg border bg-card p-4'>
                    <div className='mb-3 flex items-center gap-2'>
                      <TrendingUp className='h-4 w-4 text-primary' />
                      <span className='text-xs font-medium'>
                        Top {state.topN} Exitosos
                      </span>
                    </div>
                    {Array.from({ length: Math.min(state.topN, 8) }).map(
                      (_, i) => (
                        <div key={i} className='py-1.5'>
                          <Skeleton
                            variant='pill'
                            size='line'
                            tone='primary'
                            className='flex-1 opacity-80'
                          />
                        </div>
                      ),
                    )}
                  </div>
                  <div className='rounded-lg border bg-card p-4'>
                    <div className='mb-3 flex items-center gap-2'>
                      <TrendingUp className='h-4 w-4 text-rose-500' />
                      <span className='text-xs font-medium text-rose-500'>
                        Top {state.topN} Fallidos
                      </span>
                    </div>
                    {Array.from({ length: Math.min(state.topN, 8) }).map(
                      (_, i) => (
                        <div key={i} className='py-1.5'>
                          <Skeleton
                            variant='pill'
                            size='line'
                            tone='danger'
                            className='flex-1 opacity-80'
                          />
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ) : (
                <div className='rounded-lg border bg-card p-4'>
                  <div className='mb-3 flex items-center gap-2'>
                    <TrendingUp className='h-4 w-4 text-primary' />
                    <span className='text-xs font-medium'>Top {state.topN}</span>
                  </div>
                  {Array.from({ length: Math.min(state.topN, 8) }).map(
                    (_, i) => (
                      <div key={i} className='py-1.5'>
                        <Skeleton
                          variant='pill'
                          size='line'
                          tone={isFailedOnly ? 'danger' : 'primary'}
                          className='flex-1 opacity-80'
                        />
                      </div>
                    ),
                  )}
                </div>
              )
            ) : (
              <div className='rounded-lg border bg-card p-4'>
                <div className='mb-3 flex items-center justify-between gap-3'>
                  <div className='flex items-center gap-2'>
                    <BarChart3
                      className={cn(
                        'h-4 w-4',
                        isFailedOnly ? 'text-rose-500' : 'text-primary',
                      )}
                    />
                    <span
                      className={cn(
                        'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold leading-none',
                        isFailedOnly
                          ? 'bg-rose-200/70 text-rose-500'
                          : 'bg-primary/20 text-muted-foreground',
                      )}
                    >
                      Gráfica Accesos
                    </span>
                  </div>

                  <div className='flex items-center gap-2'>
                    {hasDateRangeSelected ? (
                      <div className='flex items-center gap-2'>
                        <CalendarDays
                          className={cn(
                            'h-4 w-4',
                            isFailedOnly ? 'text-rose-500' : 'text-muted-foreground',
                          )}
                        />
                        <span
                          className={cn(
                            'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold leading-none',
                            isFailedOnly
                              ? 'bg-rose-200/70 text-rose-500'
                              : 'bg-primary/20 text-muted-foreground',
                          )}
                        >
                          Rango de fechas
                        </span>
                      </div>
                    ) : null}
                    {state.sortOrder === 'asc' ? (
                      <ArrowUpDown
                        className={cn(
                          'h-4 w-4',
                          isFailedOnly ? 'text-rose-500' : 'text-muted-foreground',
                        )}
                      />
                    ) : (
                      <ArrowDownUp
                        className={cn(
                          'h-4 w-4',
                          isFailedOnly ? 'text-rose-500' : 'text-muted-foreground',
                        )}
                      />
                    )}
                  </div>
                </div>

                {isBothResults ? (
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='rounded-md border p-3'>
                      <div className='mb-2 inline-flex h-5 items-center rounded-full bg-primary/20 px-2 text-[10px] font-semibold leading-none text-muted-foreground'>
                        Exitosos
                      </div>
                      <div className='flex h-20 items-end gap-1'>
                        {PREVIEW_BAR_HEIGHTS_PCT.map((pct, i) => (
                          <div
                            key={`s-${i}`}
                            className='flex-1 rounded-t bg-primary/35'
                            style={{ height: `${pct}%` }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className='rounded-md border p-3'>
                      <div className='mb-2 inline-flex h-5 items-center rounded-full bg-rose-200/70 px-2 text-[10px] font-semibold leading-none text-rose-500'>
                        Fallidos
                      </div>
                      <div className='flex h-20 items-end gap-1'>
                        {PREVIEW_BAR_HEIGHTS_PCT.map((pct, i) => (
                          <div
                            key={`f-${i}`}
                            className='flex-1 rounded-t bg-rose-300/80'
                            style={{ height: `${pct}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className='flex h-24 items-end gap-1'>
                    {PREVIEW_BAR_HEIGHTS_PCT.map((pct, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex-1 rounded-t transition-all',
                          isSuccessOnly
                            ? 'bg-primary/35'
                            : isFailedOnly
                              ? 'bg-rose-300/80'
                              : i % 2 === 0
                                ? 'bg-primary/35'
                                : 'bg-rose-300/80',
                        )}
                        style={{ height: `${pct}%` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : isCareerScope && hasAccessTypeSelected ? (
        <div className='flex h-full min-h-[520px] flex-col rounded-3xl border border-white/40 bg-white/10 p-4 shadow-none backdrop-blur-none dark:border-white/10 dark:bg-slate-950/15'>
          <p className='mb-4 text-xs font-medium text-muted-foreground uppercase tracking-wide'>
            Vista previa del dashboard
          </p>

          <div className='space-y-4'>
            <div className='rounded-lg border bg-card p-3'>
              <div className='mb-2 flex items-center gap-2'>
                <Table className='h-4 w-4 text-muted-foreground' />
                <span
                  className={cn(
                    'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold leading-none',
                    isFailedOnly
                      ? 'bg-rose-200/70 text-rose-500'
                      : 'bg-primary/20 text-muted-foreground',
                  )}
                >
                  Contexto análisis
                </span>
              </div>
              <div className='space-y-3'>
                {Array.from({ length: 2 }).map((_, row) => (
                  <div key={row} className='grid grid-cols-4 gap-2'>
                    <div className='h-2.5 rounded-md bg-muted' />
                    <div className='h-2.5 rounded-md bg-muted' />
                    <div className='h-2.5 rounded-md bg-muted' />
                    <div className='h-2.5 rounded-md bg-muted' />
                  </div>
                ))}
              </div>
            </div>

            {hasCareerSelected ? (
              <>
                <div className='grid grid-cols-4 gap-3'>
                  {(isBothResults
                    ? [
                        isCareerAllScope
                          ? 'Todas las carreras'
                          : isCareerMultiScope
                            ? 'Carreras'
                            : 'Carrera',
                        'Totales',
                        'Exitosos',
                        'Fallidos',
                      ]
                    : isSuccessOnly
                      ? [
                          isCareerAllScope
                            ? 'Todas las carreras'
                            : isCareerMultiScope
                              ? 'Carreras'
                              : 'Carrera',
                          'Totales',
                          'Exitosos',
                          'Taza',
                        ]
                      : [
                          isCareerAllScope
                            ? 'Todas las carreras'
                            : isCareerMultiScope
                              ? 'Carreras'
                              : 'Carrera',
                          'Totales',
                          'Fallidos',
                          'Taza',
                        ]
                  ).map((label, index) => (
                    <div
                      key={label}
                      className='rounded-lg border bg-card p-3 space-y-2'
                    >
                      <span
                        className={cn(
                          'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold leading-none',
                          isFailedOnly || (isBothResults && index === 3)
                            ? 'bg-rose-200/70 text-rose-500'
                            : 'bg-primary/20 text-muted-foreground',
                        )}
                      >
                        {label}
                      </span>
                      <div
                        className={cn(
                          'h-6 w-16 rounded-md',
                          isFailedOnly || (isBothResults && index === 3)
                            ? 'bg-rose-300/80'
                            : 'bg-primary/35',
                        )}
                      />
                    </div>
                  ))}
                </div>

                {showRanking ? (
                  <>
                    {hasDateRangeSelected ? (
                      <div className='flex justify-end'>
                        <div className='flex items-center gap-2'>
                          <CalendarDays
                            className={cn(
                              'h-4 w-4',
                              isFailedOnly ? 'text-rose-500' : 'text-muted-foreground',
                            )}
                          />
                          <span
                            className={cn(
                              'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold leading-none',
                              isFailedOnly
                                ? 'bg-rose-200/70 text-rose-500'
                                : 'bg-primary/20 text-muted-foreground',
                            )}
                          >
                            Rango de fechas
                          </span>
                        </div>
                      </div>
                    ) : null}
                    {isBothResults ? (
                      <div className='grid grid-cols-2 gap-3'>
                        <div className='rounded-lg border bg-card p-4'>
                          <div className='mb-3 flex items-center gap-2'>
                            <TrendingUp className='h-4 w-4 text-primary' />
                            <span className='text-xs font-medium'>
                              Top {state.topN} Exitosos
                            </span>
                          </div>
                          {Array.from({ length: Math.min(state.topN, 8) }).map(
                            (_, i) => (
                              <div key={i} className='py-1.5'>
                                <Skeleton
                                  variant='pill'
                                  size='line'
                                  tone='primary'
                                  className='flex-1 opacity-80'
                                />
                              </div>
                            ),
                          )}
                        </div>
                        <div className='rounded-lg border bg-card p-4'>
                          <div className='mb-3 flex items-center gap-2'>
                            <TrendingUp className='h-4 w-4 text-rose-500' />
                            <span className='text-xs font-medium text-rose-500'>
                              Top {state.topN} Fallidos
                            </span>
                          </div>
                          {Array.from({ length: Math.min(state.topN, 8) }).map(
                            (_, i) => (
                              <div key={i} className='py-1.5'>
                                <Skeleton
                                  variant='pill'
                                  size='line'
                                  tone='danger'
                                  className='flex-1 opacity-80'
                                />
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className='rounded-lg border bg-card p-4'>
                        <div className='mb-3 flex items-center gap-2'>
                          <TrendingUp className='h-4 w-4 text-primary' />
                          <span className='text-xs font-medium'>
                            Top {state.topN}
                          </span>
                        </div>
                        {Array.from({ length: Math.min(state.topN, 8) }).map(
                          (_, i) => (
                            <div key={i} className='py-1.5'>
                              <Skeleton
                                variant='pill'
                                size='line'
                                tone={isFailedOnly ? 'danger' : 'primary'}
                                className='flex-1 opacity-80'
                              />
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className='rounded-lg border bg-card p-4'>
                    <div className='mb-3 flex items-center justify-between gap-3'>
                      <div className='flex items-center gap-2'>
                        <BarChart3
                          className={cn(
                            'h-4 w-4',
                            isFailedOnly ? 'text-rose-500' : 'text-primary',
                          )}
                        />
                        <span
                          className={cn(
                            'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold leading-none',
                            isFailedOnly
                              ? 'bg-rose-200/70 text-rose-500'
                              : 'bg-primary/20 text-muted-foreground',
                          )}
                        >
                          Gráfica Accesos
                        </span>
                      </div>

                      <div className='flex items-center gap-2'>
                        {hasDateRangeSelected ? (
                          <div className='flex items-center gap-2'>
                            <CalendarDays
                              className={cn(
                                'h-4 w-4',
                                isFailedOnly
                                  ? 'text-rose-500'
                                  : 'text-muted-foreground',
                              )}
                            />
                            <span
                              className={cn(
                                'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold leading-none',
                                isFailedOnly
                                  ? 'bg-rose-200/70 text-rose-500'
                                  : 'bg-primary/20 text-muted-foreground',
                              )}
                            >
                              Rango de fechas
                            </span>
                          </div>
                        ) : null}
                        {isCareerGroupScope ? (
                          state.sortOrder === 'asc' ? (
                            <ArrowUpDown
                              className={cn(
                                'h-4 w-4',
                                isFailedOnly
                                  ? 'text-rose-500'
                                  : 'text-muted-foreground',
                              )}
                            />
                          ) : (
                            <ArrowDownUp
                              className={cn(
                                'h-4 w-4',
                                isFailedOnly
                                  ? 'text-rose-500'
                                  : 'text-muted-foreground',
                              )}
                            />
                          )
                        ) : null}
                      </div>
                    </div>

                    {isBothResults ? (
                      <div className='grid grid-cols-2 gap-3'>
                        <div className='rounded-md border p-3'>
                          <div className='mb-2 inline-flex h-5 items-center rounded-full bg-primary/20 px-2 text-[10px] font-semibold leading-none text-muted-foreground'>
                            Exitosos
                          </div>
                          <div className='flex h-20 items-end gap-1'>
                            {PREVIEW_BAR_HEIGHTS_PCT.map((pct, i) => (
                              <div
                                key={`cs-${i}`}
                                className='flex-1 rounded-t bg-primary/35'
                                style={{ height: `${pct}%` }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className='rounded-md border p-3'>
                          <div className='mb-2 inline-flex h-5 items-center rounded-full bg-rose-200/70 px-2 text-[10px] font-semibold leading-none text-rose-500'>
                            Fallidos
                          </div>
                          <div className='flex h-20 items-end gap-1'>
                            {PREVIEW_BAR_HEIGHTS_PCT.map((pct, i) => (
                              <div
                                key={`cf-${i}`}
                                className='flex-1 rounded-t bg-rose-300/80'
                                style={{ height: `${pct}%` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className='flex h-24 items-end gap-1'>
                        {PREVIEW_BAR_HEIGHTS_PCT.map((pct, i) => (
                          <div
                            key={i}
                            className={cn(
                              'flex-1 rounded-t transition-all',
                              isSuccessOnly
                                ? 'bg-primary/35'
                                : isFailedOnly
                                  ? 'bg-rose-300/80'
                                  : i % 2 === 0
                                    ? 'bg-primary/35'
                                    : 'bg-rose-300/80',
                            )}
                            style={{ height: `${pct}%` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <div className='flex h-full min-h-[520px] flex-col rounded-3xl border border-white/40 bg-white/10 p-4 shadow-none backdrop-blur-none dark:border-white/10 dark:bg-slate-950/15'>
          <p className='mb-4 text-xs font-medium text-muted-foreground uppercase tracking-wide'>
            Vista previa del dashboard
          </p>
          <div className='space-y-4'>
            <div className='grid grid-cols-4 gap-3'>
              {Array.from({ length: 4 }).map((_, id) => (
                <div
                  key={id}
                  className='rounded-lg border bg-card p-3 space-y-2'
                >
                  {isInitialStage ? (
                    <>
                      <div className='h-3 w-16 rounded-full bg-primary/25' />
                      <div className='h-8 w-14 rounded-xl bg-primary/35' />
                    </>
                  ) : (
                    <>
                      <Skeleton variant='pill' size='pillSm' tone='muted' />
                      <Skeleton
                        variant='value'
                        size='value'
                        tone={stage === 'advanced' ? 'primary' : 'muted'}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className='rounded-lg border bg-card p-4'>
              <div className='mb-3 flex items-center gap-2'>
                <BarChart3
                  className={cn(
                    'h-4 w-4',
                    isInitialStage || stage === 'advanced'
                      ? 'text-primary'
                      : 'text-muted-foreground',
                  )}
                />
                <Skeleton variant='pill' size='pillLg' />
              </div>
              <div className='flex h-32 items-end gap-1'>
                {PREVIEW_BAR_HEIGHTS_PCT.map((pct, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex-1 rounded-t transition-all',
                      isInitialStage || stage === 'advanced'
                        ? 'bg-primary/40'
                        : 'bg-muted',
                    )}
                    style={{ height: `${pct}%` }}
                  />
                ))}
              </div>
            </div>

            {showSplit ? (
              <div className='grid grid-cols-2 gap-3'>
                {isInitialStage ? (
                  <>
                    <div className='rounded-lg border bg-card p-3 space-y-2'>
                      <div className='h-3 w-20 rounded-full bg-primary/25' />
                      <div className='h-16 w-full rounded-md bg-primary/40' />
                    </div>
                    <div className='rounded-lg border bg-card p-3 space-y-2'>
                      <div className='h-3 w-20 rounded-full bg-primary/25' />
                      <div className='h-16 w-full rounded-md bg-primary/40' />
                    </div>
                  </>
                ) : (
                  <>
                    <div className='rounded-lg border bg-card p-3 space-y-2'>
                      <div className='h-3 w-20 rounded-full bg-primary/25' />
                      <div className='h-16 w-full rounded-md bg-primary/40' />
                    </div>
                    <div className='rounded-lg border bg-card p-3 space-y-2'>
                      <div
                        className={cn(
                          'h-3 w-20 rounded-full',
                          state.accessType === 'ambos'
                            ? 'bg-rose-200/70'
                            : 'bg-primary/25',
                        )}
                      />
                      <div
                        className={cn(
                          'h-16 w-full rounded-md',
                          state.accessType === 'ambos'
                            ? 'bg-rose-300/80'
                            : 'bg-primary/40',
                        )}
                      />
                    </div>
                  </>
                )}
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
                    <span className='w-4 text-xs text-muted-foreground'>
                      {i + 1}
                    </span>
                    <Skeleton
                      variant='pill'
                      size='line'
                      tone='primary'
                      className='flex-1 opacity-70'
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {showTable ? (
              <div className='rounded-lg border bg-card p-4 space-y-3'>
                <div className='flex items-center gap-2'>
                  <Table className='h-4 w-4 text-muted-foreground' />
                  <Skeleton
                    variant='pill'
                    size='pillMd'
                    tone={isInitialStage ? 'success' : 'muted'}
                  />
                </div>
                {Array.from({ length: 4 }).map(
                  (_, row) => (
                    <div
                      key={row}
                      className='grid grid-cols-[1fr_4fr_1fr] gap-2'
                    >
                      <Skeleton variant='line' size='line' />
                      <Skeleton variant='line' size='line' />
                      <Skeleton variant='line' size='line' />
                    </div>
                  ),
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Composer({
  open,
  onOpenChange,
  metadata,
  resetSignal = 0,
  onApply,
  onReset,
}: ComposerProps) {
  const composer = useFilterComposer()
  const { showToast } = useAppToast()

  const [studentSearch, setStudentSearch] = useState('')
  const [careerSearch, setCareerSearch] = useState('')
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [careersLoading, setCareersLoading] = useState(false)
  const [careerComboboxOpen, setCareerComboboxOpen] = useState(false)
  const [careerBadgesExpanded, setCareerBadgesExpanded] = useState(false)
  const [careerCatalogCache, setCareerCatalogCache] = useState<
    DashboardCareerSearchItem[] | null
  >(null)
  const [students, setStudents] = useState<DashboardStudentSearchItem[]>([])
  const [careers, setCareers] = useState<DashboardCareerSearchItem[]>([])
  const [selectedStudentSnapshot, setSelectedStudentSnapshot] =
    useState<DashboardStudentSearchItem | null>(null)

  const deferredStudentSearch = useDeferredValue(studentSearch)
  const deferredCareerSearch = useDeferredValue(careerSearch)

  const step = getCurrentStep(composer.state)
  const selectedStudentItem = useMemo(
    () =>
      students.find((item) => item.id === composer.state.selectedStudent) ??
      selectedStudentSnapshot ??
      null,
    [composer.state.selectedStudent, selectedStudentSnapshot, students],
  )
  const selectedCareerLabel = useMemo(() => {
    if (composer.state.selectedCareers.length === 0) return null
    const selectedId = composer.state.selectedCareers[0]
    return (
      careers.find((career) => career.id === selectedId)?.displayLabel ??
      selectedId
    )
  }, [careers, composer.state.selectedCareers])
  const visibleCareerBadgeIds = useMemo(() => {
    const maxShownItems = 2
    return careerBadgesExpanded
      ? composer.state.selectedCareers
      : composer.state.selectedCareers.slice(0, maxShownItems)
  }, [careerBadgesExpanded, composer.state.selectedCareers])
  const hiddenCareerBadgeCount =
    composer.state.selectedCareers.length - visibleCareerBadgeIds.length

  const handleCareerSearchChange = (next: string) => {
    setCareerSearch(next)
    setCareersLoading(true)
  }

  useEffect(() => {
    if (!composer.state.selectedStudent) {
      setSelectedStudentSnapshot(null)
    }
  }, [composer.state.selectedStudent])

  useEffect(() => {
    composer.reset()
    setStudentSearch('')
    setCareerSearch('')
    setStudentsLoading(false)
    setCareersLoading(false)
    setCareerComboboxOpen(false)
    setCareerBadgesExpanded(false)
    setCareerCatalogCache(null)
    setStudents([])
    setCareers([])
    setSelectedStudentSnapshot(null)
  }, [composer.reset, resetSignal])

  useEffect(() => {
    if (
      deferredStudentSearch.trim().length < 2 ||
      composer.state.filterType !== 'alumno'
    )
      return

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
    if (composer.state.filterType !== 'carrera') return
    if (composer.state.scope === 'todas') return
    if (!careerComboboxOpen) return

    let active = true
    const query = deferredCareerSearch.trim()

    const request =
      query.length === 0
        ? careerCatalogCache
          ? Promise.resolve({ items: careerCatalogCache })
          : listActiveCareers().then((items) => {
              const mapped = toCareerSearchItems(items)
              setCareerCatalogCache(mapped)
              return { items: mapped }
            })
        : searchDashboardCareers(query, 20)

    void request
      .then((response: { items: DashboardCareerSearchItem[] }) => {
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
  }, [
    composer.state.filterType,
    composer.state.scope,
    deferredCareerSearch,
    careerComboboxOpen,
    careerCatalogCache,
  ])

  const handleApply = async () => {
    const request = toDashboardRequest(
      composer.state,
      metadata.defaults.sortDirection,
    )
    if (!request) return

    const ok = await onApply(request)
    if (ok) {
      showToast({
        severity: 'success',
        title: 'Análisis preparado',
        description:
          'El dashboard se actualizó con la configuración seleccionada.',
      })
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        animation='fade'
        size='4'
        className='max-w-[1240px] max-h-[92vh] p-0 overflow-hidden'
      >
        <DialogHeader className='px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='text-lg'>Compositor de análisis</DialogTitle>
          <DialogDescription>
            Construye el dashboard en tiempo real antes de ejecutar el análisis.
          </DialogDescription>
        </DialogHeader>

        <div className='max-h-[calc(92vh-92px)] overflow-y-auto p-6'>
          <div className='w-full space-y-6'>
            <Stepper
              steps={COMPOSER_STEPPER_STEPS}
              currentStep={step}
              orientation='horizontal'
              size='md'
              className='w-full'
            />

            <div className='flex w-full items-stretch gap-6 min-h-[620px]'>
              <div className='w-1/2 min-w-0'>
                <Card className='h-full'>
                  <CardContent className='h-full p-5'>
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
                          <label className='text-sm font-medium'>
                            Tipo de filtrado
                          </label>
                          <div className='grid grid-cols-2 gap-2'>
                            {(['alumno', 'carrera'] as const).map((type) => (
                              <Button
                                key={type}
                                variant={
                                  composer.state.filterType === type
                                    ? 'primary'
                                    : 'outline'
                                }
                                size='sm'
                                className='h-9 w-full'
                                onClick={() => {
                                  composer.setFilterType(type)
                                  setStudentSearch('')
                                  setCareerSearch('')
                                  setStudents([])
                                  setCareers([])
                                  setStudentsLoading(false)
                                  setCareersLoading(false)
                                  setSelectedStudentSnapshot(null)
                                }}
                              >
                                {type === 'alumno' ? 'Alumno(s)' : 'Carrera(s)'}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {composer.state.filterType ? (
                          <div className='space-y-2'>
                            <label className='text-sm font-medium'>
                              Alcance
                            </label>
                            <div
                              className={cn(
                                'grid gap-2',
                                composer.state.filterType === 'alumno'
                                  ? 'grid-cols-2'
                                  : 'grid-cols-3',
                              )}
                            >
                              {composer.state.filterType === 'alumno' ? (
                                <>
                                  <Button
                                    variant={
                                      composer.state.scope === 'individual'
                                        ? 'primary'
                                        : 'outline'
                                    }
                                    size='sm'
                                    className='w-full'
                                    onClick={() =>
                                      composer.setScope('individual')
                                    }
                                  >
                                    Individual
                                  </Button>
                                  <Button
                                    variant={
                                      composer.state.scope === 'todos'
                                        ? 'primary'
                                        : 'outline'
                                    }
                                    size='sm'
                                    className='w-full'
                                    onClick={() => composer.setScope('todos')}
                                  >
                                    Todos
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant={
                                      composer.state.scope === 'individual'
                                        ? 'primary'
                                        : 'outline'
                                    }
                                    size='sm'
                                    className='w-full'
                                    onClick={() =>
                                      composer.setScope('individual')
                                    }
                                  >
                                    Una
                                  </Button>
                                  <Button
                                    variant={
                                      composer.state.scope === 'varias'
                                        ? 'primary'
                                        : 'outline'
                                    }
                                    size='sm'
                                    className='w-full'
                                    onClick={() => composer.setScope('varias')}
                                  >
                                    Varias
                                  </Button>
                                  <Button
                                    variant={
                                      composer.state.scope === 'todas'
                                        ? 'primary'
                                        : 'outline'
                                    }
                                    size='sm'
                                    className='w-full'
                                    onClick={() => composer.setScope('todas')}
                                  >
                                    Todas
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ) : null}

                        {composer.state.scope ? (
                          <div className='space-y-3 border-t pt-3'>
                            {composer.state.filterType === 'alumno' &&
                            composer.state.scope === 'individual' ? (
                              <div className='space-y-2'>
                                <div className='relative'>
                                  <Search className='pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-foreground/45' />
                                  <Input
                                    placeholder='Buscar alumno por nombre o matrícula...'
                                    value={studentSearch}
                                    onChange={(event) => {
                                      const next = event.target.value
                                      setStudentSearch(next)
                                      if (composer.state.selectedStudent) {
                                        composer.setSelectedStudent(null)
                                        setSelectedStudentSnapshot(null)
                                      }
                                      const query = next.trim()
                                      if (query.length < 2) {
                                        setStudents([])
                                        setStudentsLoading(false)
                                        return
                                      }
                                      setStudentsLoading(true)
                                    }}
                                    className='h-8 pl-10 text-sm'
                                  />
                                </div>
                                {composer.state.selectedStudent &&
                                selectedStudentItem &&
                                studentSearch.trim().length < 2 ? (
                                  <div className='h-40 rounded-md border bg-muted/20 px-3 py-2'>
                                    <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
                                      Alumno seleccionado
                                    </p>
                                    <p className='mt-2 text-sm font-medium'>
                                      {selectedStudentItem.displayLabel}
                                    </p>
                                    <p className='mt-1 text-xs text-muted-foreground'>
                                      Matrícula:{' '}
                                      {selectedStudentItem.enrollmentId}
                                    </p>
                                  </div>
                                ) : (
                                  <div className='h-40 overflow-auto rounded-md border'>
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
                                            composer.state.selectedStudent ===
                                              student.id &&
                                              'bg-accent font-medium',
                                          )}
                                          onClick={() => {
                                            composer.setSelectedStudent(
                                              student.id,
                                            )
                                            setSelectedStudentSnapshot(student)
                                            setStudentSearch('')
                                            setStudents([])
                                            setStudentsLoading(false)
                                          }}
                                        >
                                          {student.displayLabel}
                                        </button>
                                      ))
                                    ) : (
                                      <div className='px-3 py-2 text-xs text-muted-foreground'>
                                        Escribe al menos 2 caracteres.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : null}

                            {composer.state.filterType === 'carrera' &&
                            composer.state.scope !== 'todas' ? (
                              <div className='space-y-2'>
                                <Popover
                                  open={careerComboboxOpen}
                                  onOpenChange={(open) => {
                                    setCareerComboboxOpen(open)
                                    if (open) {
                                      setCareersLoading(true)
                                    }
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      type='button'
                                      variant='outline'
                                      role='combobox'
                                      aria-expanded={careerComboboxOpen}
                                      className='h-auto min-h-8 w-full justify-between bg-transparent py-1.5'
                                    >
                                      <div className='flex flex-wrap items-center gap-1 pr-2.5 text-left'>
                                        {composer.state.scope ===
                                          'individual' ? (
                                          selectedCareerLabel ? (
                                            <Badge
                                              variant='outlined'
                                              className='rounded-sm text-xs'
                                            >
                                              {selectedCareerLabel}
                                            </Badge>
                                          ) : (
                                            <span className='text-sm text-muted-foreground'>
                                              Selecciona carrera
                                            </span>
                                          )
                                        ) : composer.state.selectedCareers
                                            .length > 0 ? (
                                          <>
                                            {visibleCareerBadgeIds.map(
                                              (careerId) => {
                                                const label =
                                                  careers.find(
                                                    (career) =>
                                                      career.id === careerId,
                                                  )?.displayLabel ?? careerId
                                                return (
                                                  <Badge
                                                    key={careerId}
                                                    variant='outlined'
                                                    className='rounded-sm text-xs'
                                                  >
                                                    {label}
                                                    <span
                                                      role='button'
                                                      tabIndex={0}
                                                      className='ml-1 inline-flex cursor-pointer rounded-sm p-0.5 hover:bg-muted'
                                                      onClick={(event) => {
                                                        event.stopPropagation()
                                                        composer.toggleCareer(
                                                          careerId,
                                                        )
                                                      }}
                                                      onKeyDown={(event) => {
                                                        if (
                                                          event.key !==
                                                            'Enter' &&
                                                          event.key !== ' '
                                                        )
                                                          return
                                                        event.preventDefault()
                                                        event.stopPropagation()
                                                        composer.toggleCareer(
                                                          careerId,
                                                        )
                                                      }}
                                                    >
                                                      <XIcon className='size-3' />
                                                    </span>
                                                  </Badge>
                                                )
                                              },
                                            )}
                                            {hiddenCareerBadgeCount > 0 ||
                                            careerBadgesExpanded ? (
                                              <Badge
                                                variant='outlined'
                                                className='cursor-pointer rounded-sm text-xs'
                                                onClick={(event) => {
                                                  event.stopPropagation()
                                                  setCareerBadgesExpanded(
                                                    (prev) => !prev,
                                                  )
                                                }}
                                              >
                                                {careerBadgesExpanded
                                                  ? 'Ver menos'
                                                  : `+${hiddenCareerBadgeCount} más`}
                                              </Badge>
                                            ) : null}
                                          </>
                                        ) : (
                                          <span className='text-sm text-muted-foreground'>
                                            Selecciona carreras
                                          </span>
                                        )}
                                      </div>
                                      <ChevronsUpDownIcon className='size-4 shrink-0 text-muted-foreground/80' />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    align='start'
                                    sideOffset={6}
                                    className='w-[var(--radix-popover-trigger-width)] p-0 overflow-hidden'
                                  >
                                    <Command className='overflow-hidden'>
                                      <CommandInput
                                        placeholder='Buscar carrera...'
                                        value={careerSearch}
                                        onValueChange={handleCareerSearchChange}
                                      />
                                      <CommandList className='max-h-56 overflow-y-auto overscroll-contain'>
                                        {careersLoading ? (
                                          <CommandGroup>
                                            <div className='px-2 py-2 text-xs text-muted-foreground inline-flex items-center gap-2'>
                                              <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                              Buscando carreras...
                                            </div>
                                          </CommandGroup>
                                        ) : careers.length > 0 ? (
                                          <CommandGroup>
                                            {careers.map((career) => {
                                              const selected =
                                                composer.state.selectedCareers.includes(
                                                  career.id,
                                                )
                                              return (
                                                <CommandItem
                                                  key={career.id}
                                                  value={career.displayLabel}
                                                  onSelect={() => {
                                                    if (
                                                      composer.state.scope ===
                                                      'individual'
                                                    ) {
                                                      composer.setSelectedCareers(
                                                        [career.id],
                                                      )
                                                      setCareerComboboxOpen(
                                                        false,
                                                      )
                                                    } else {
                                                      composer.toggleCareer(
                                                        career.id,
                                                      )
                                                    }
                                                  }}
                                                >
                                                  <span className='truncate'>
                                                    {career.displayLabel}
                                                  </span>
                                                  {selected ? (
                                                    <CheckIcon
                                                      size={16}
                                                      className='ml-auto'
                                                    />
                                                  ) : null}
                                                </CommandItem>
                                              )
                                            })}
                                          </CommandGroup>
                                        ) : (
                                          <CommandEmpty>
                                            No se encontraron carreras.
                                          </CommandEmpty>
                                        )}
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            ) : null}

                            <Select
                              onValueChange={(value) =>
                                composer.setAccessType(value as AccessType)
                              }
                              value={composer.state.accessType ?? undefined}
                            >
                              <SelectTrigger className='h-8 text-sm'>
                                <SelectValue placeholder='Selecciona un tipo de acceso' />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='exitoso'>Exitoso</SelectItem>
                                <SelectItem value='fallido'>Fallido</SelectItem>
                                <SelectItem value='ambos'>Ambos</SelectItem>
                              </SelectContent>
                            </Select>

                            {composer.isGroupScope ? (
                              <div className='space-y-2'>
                                {composer.state.filterType === 'alumno' &&
                                composer.state.scope === 'todos' &&
                                composer.state.accessType ? (
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    className='h-8 w-full justify-center gap-2 text-sm'
                                    onClick={() =>
                                      composer.setSortOrder(
                                        composer.state.sortOrder === 'desc'
                                          ? 'asc'
                                          : 'desc',
                                      )
                                    }
                                  >
                                    {composer.state.sortOrder === 'desc' ? (
                                      <ArrowDownUp className='h-4 w-4' />
                                    ) : (
                                      <ArrowUpDown className='h-4 w-4' />
                                    )}
                                    {composer.state.sortOrder === 'desc'
                                      ? 'Mayor a menor'
                                      : 'Menor a mayor'}
                                  </Button>
                                ) : composer.state.filterType === 'carrera' &&
                                  (composer.state.scope === 'varias' ||
                                    composer.state.scope === 'todas') &&
                                  composer.state.accessType ? (
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    className='h-8 w-full justify-center gap-2 text-sm'
                                    onClick={() =>
                                      composer.setSortOrder(
                                        composer.state.sortOrder === 'desc'
                                          ? 'asc'
                                          : 'desc',
                                      )
                                    }
                                  >
                                    {composer.state.sortOrder === 'desc' ? (
                                      <ArrowDownUp className='h-4 w-4' />
                                    ) : (
                                      <ArrowUpDown className='h-4 w-4' />
                                    )}
                                    {composer.state.sortOrder === 'desc'
                                      ? 'Mayor a menor'
                                      : 'Menor a mayor'}
                                  </Button>
                                ) : null}

                                <div className='flex items-center justify-between'>
                                  <span className='text-xs font-medium'>
                                    Ranking
                                  </span>
                                  <Switch
                                    checked={composer.state.ranking}
                                    onCheckedChange={composer.setRanking}
                                  />
                                </div>
                                {composer.state.ranking ? (
                                  <Select
                                    onValueChange={(value) =>
                                      composer.setTopN(Number(value))
                                    }
                                    value={String(composer.state.topN)}
                                  >
                                    <SelectTrigger className='h-8 text-sm'>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(composer.state.filterType === 'alumno'
                                        ? ALUMNO_TOP_OPTIONS
                                        : CARRERA_TOP_OPTIONS
                                      ).map((n) => (
                                        <SelectItem key={n} value={String(n)}>
                                          Top {n}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : null}
                              </div>
                            ) : (
                              <div className='space-y-2'>
                                <div className='flex items-center justify-between'>
                                  <span className='text-xs font-medium'>
                                    Filtro de fecha
                                  </span>
                                  <Switch
                                    checked={composer.state.dateFilter}
                                    onCheckedChange={composer.setDateFilter}
                                  />
                                </div>
                                {composer.state.dateFilter ? (
                                  <DateRangeSelector
                                    label='Rango de fecha'
                                    value={composer.state.dateRange}
                                    onChange={(range) =>
                                      composer.setDateRange({
                                        from: range?.from,
                                        to: range?.to,
                                      })
                                    }
                                  />
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
                          <Button
                            size='sm'
                            className='flex-1'
                            disabled={!composer.isComplete}
                            onClick={() => void handleApply()}
                          >
                            Aplicar análisis
                          </Button>
                        </div>

                        {selectedStudentItem ? (
                          <p className='text-xs text-muted-foreground'>
                            Seleccionado: {selectedStudentItem.displayLabel}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <PreviewPanel state={composer.state} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
