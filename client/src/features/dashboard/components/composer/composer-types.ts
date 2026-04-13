import type {
  DashboardAccessResultFilter,
  DashboardAnalysisField,
  DashboardAnalysisMetadataResponse,
  DashboardAnalysisOptionsRequest,
  DashboardAnalysisOptionsResponse,
  DashboardAnalysisRequest,
  DashboardCareerSearchItem,
  DashboardDateFilterType,
  DashboardFilterMode,
  DashboardFilterScope,
  DashboardRankingMode,
  DashboardSortDirection,
  DashboardStudentSearchItem,
} from '@/features/dashboard/api/dashboard-api'

export type StudentScopeChoice = 'INDIVIDUAL' | 'ALL'
export type CareerScopeChoice = 'INDIVIDUAL' | 'MULTIPLE'
export type ScopeChoice = StudentScopeChoice | CareerScopeChoice

export interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

export interface FilterState {
  scope: DashboardFilterScope | null
  studentScopeChoice: StudentScopeChoice | null
  careerScopeChoice: CareerScopeChoice | null
  selectedStudent: DashboardStudentSearchItem | null
  selectedCareers: DashboardCareerSearchItem[]
  allCareersSelected: boolean
  accessResult: DashboardAccessResultFilter | null
  dateFilterType: DashboardDateFilterType
  dateRange: DateRange
  rankingMode: DashboardRankingMode
  topN: number | null
  sortDirection: DashboardSortDirection
}

export interface FilterComposerProps {
  metadata: DashboardAnalysisMetadataResponse
  currentLayoutLabel?: string | null
  lastAppliedSummary?: string | null
  currentWidgets?: string[]
  onApply: (request: DashboardAnalysisRequest) => Promise<boolean> | boolean
  onReset: () => Promise<void> | void
}

export const CAREER_MULTI_SELECT_ALL_TOKEN = '__ALL_CAREERS__'

export function createDefaultFilterState(
  metadata: DashboardAnalysisMetadataResponse,
): FilterState {
  return {
    scope: null,
    studentScopeChoice: null,
    careerScopeChoice: null,
    selectedStudent: null,
    selectedCareers: [],
    allCareersSelected: false,
    accessResult: null,
    dateFilterType: 'NONE',
    dateRange: { from: undefined, to: undefined },
    rankingMode: metadata.defaults.rankingMode,
    topN: null,
    sortDirection: metadata.defaults.sortDirection,
  }
}

export function getCurrentStep(state: FilterState): number {
  if (!state.scope) return 0
  if (!getVisualScopeChoice(state)) return 1

  if (state.scope === 'STUDENTS' && state.studentScopeChoice === 'INDIVIDUAL' && !state.selectedStudent) {
    return 2
  }

  if (state.scope === 'CAREERS' && state.careerScopeChoice === 'INDIVIDUAL' && state.selectedCareers.length === 0) {
    return 2
  }

  if (
    state.scope === 'CAREERS'
    && state.careerScopeChoice === 'MULTIPLE'
    && !state.allCareersSelected
    && state.selectedCareers.length === 0
  ) {
    return 2
  }

  return 3
}

export function getCurrentStepFromBackend(
  nextStep: DashboardAnalysisField | null | undefined,
  fallbackState: FilterState,
): number {
  if (nextStep === null) {
    return 3
  }

  switch (nextStep) {
    case 'SCOPE':
      return 0
    case 'MODE':
      return 1
    case 'STUDENT_ID':
    case 'CAREER_IDS':
      return 2
    case 'ACCESS_RESULT':
    case 'DATE_FILTER_TYPE':
    case 'DATE_FROM':
    case 'DATE_TO':
    case 'RANKING_MODE':
    case 'TOP_N':
    case 'SORT_DIRECTION':
      return 3
    default:
      return getCurrentStep(fallbackState)
  }
}

export function getVisualScopeChoice(state: FilterState): ScopeChoice | null {
  if (state.scope === 'STUDENTS') return state.studentScopeChoice
  if (state.scope === 'CAREERS') return state.careerScopeChoice
  return null
}

export function deriveBackendMode(state: FilterState): DashboardFilterMode | null {
  // Mapper estrictamente visual: traduce la UX del wizard al contrato backend.
  // La validez real del modo la sigue resolviendo /dashboard/analysis/options y /dashboard/analysis.
  if (state.scope === 'STUDENTS') {
    return state.studentScopeChoice
  }

  if (state.scope === 'CAREERS') {
    if (state.careerScopeChoice === 'INDIVIDUAL') {
      return 'INDIVIDUAL'
    }

    if (state.careerScopeChoice === 'MULTIPLE') {
      if (state.allCareersSelected) {
        return 'ALL'
      }
      if (state.selectedCareers.length === 1) {
        return 'INDIVIDUAL'
      }
      return 'MULTI'
    }
  }

  return null
}

export function deriveCareerIds(state: FilterState): string[] | null {
  // "ALL" no se detecta comparando contra un catálogo exhaustivo.
  // Se resuelve con la acción explícita "Seleccionar todas" para no depender de autocomplete
  // como fuente total del universo de carreras.
  if (state.scope !== 'CAREERS' || state.allCareersSelected) {
    return null
  }

  if (state.selectedCareers.length === 0) {
    return null
  }

  return Array.from(new Set(state.selectedCareers.map((career) => career.id)))
}

export function buildOptionsRequest(state: FilterState): DashboardAnalysisOptionsRequest {
  return {
    scope: state.scope,
    mode: deriveBackendMode(state),
    studentId: state.selectedStudent?.id ?? null,
    careerIds: deriveCareerIds(state),
    accessResult: state.accessResult,
    dateFilterType: state.dateFilterType,
    dateFrom: state.dateFilterType === 'CUSTOM_RANGE' && state.dateRange.from
      ? state.dateRange.from.toISOString()
      : null,
    dateTo: state.dateFilterType === 'CUSTOM_RANGE' && state.dateRange.to
      ? state.dateRange.to.toISOString()
      : null,
    rankingMode: state.rankingMode,
    topN: state.topN,
    sortDirection: state.sortDirection,
  }
}

export function buildAnalysisRequest(
  state: FilterState,
  options: DashboardAnalysisOptionsResponse | null,
): DashboardAnalysisRequest | null {
  const scope = state.scope
  const mode = deriveBackendMode(state)

  if (!scope || !mode) {
    return null
  }

  const effectiveDefaults = options?.effectiveDefaults

  return {
    scope,
    mode,
    studentId: state.selectedStudent?.id ?? null,
    careerIds: mode === 'ALL' ? null : deriveCareerIds(state),
    accessResult: state.accessResult ?? null,
    dateFilterType: state.dateFilterType ?? effectiveDefaults?.dateFilterType ?? 'NONE',
    dateFrom: state.dateFilterType === 'CUSTOM_RANGE' && state.dateRange.from
      ? state.dateRange.from.toISOString()
      : null,
    dateTo: state.dateFilterType === 'CUSTOM_RANGE' && state.dateRange.to
      ? state.dateRange.to.toISOString()
      : null,
    rankingMode: state.rankingMode ?? effectiveDefaults?.rankingMode ?? 'NONE',
    topN: state.rankingMode === 'TOP'
      ? state.topN ?? effectiveDefaults?.topN ?? null
      : null,
    sortDirection: state.sortDirection ?? effectiveDefaults?.sortDirection ?? 'DESC',
    widgetControls: null,
  }
}

export function isFilterComplete(state: FilterState, options: DashboardAnalysisOptionsResponse | null): boolean {
  if (!options) return false
  return Boolean(buildAnalysisRequest(state, options) && options.canSubmit)
}

export function getFilterSummary(state: FilterState): string {
  if (!state.scope) return 'Elige un universo para empezar a construir el análisis'

  const parts: string[] = []
  const mode = deriveBackendMode(state)

  if (state.scope === 'STUDENTS') {
    if (mode === 'INDIVIDUAL') {
      parts.push(`Alumno: ${state.selectedStudent?.displayLabel ?? 'Pendiente'}`)
    } else {
      parts.push('Todos los alumnos')
    }
  }

  if (state.scope === 'CAREERS') {
    if (state.allCareersSelected) {
      parts.push('Todas las carreras')
    } else if (mode === 'INDIVIDUAL') {
      parts.push(`Carrera: ${state.selectedCareers[0]?.displayLabel ?? 'Pendiente'}`)
    } else {
      parts.push(`${state.selectedCareers.length} carreras seleccionadas`)
    }
  }

  parts.push(`Resultado: ${state.accessResult ?? 'Pendiente'}`)

  if (state.dateFilterType === 'CUSTOM_RANGE' && state.dateRange.from && state.dateRange.to) {
    parts.push('Con rango personalizado')
  }

  if (state.rankingMode === 'TOP' && state.topN) {
    parts.push(`Top ${state.topN}`)
  }

  return parts.join(' · ')
}

export function applyOptionsDefaults(
  state: FilterState,
  options: DashboardAnalysisOptionsResponse,
): FilterState {
  const nextRankingMode = options.ranking.allowedModes.includes(state.rankingMode)
    ? state.rankingMode
    : options.effectiveDefaults.rankingMode
  const nextTopN = nextRankingMode === 'TOP'
    ? state.topN ?? options.effectiveDefaults.topN
    : null

  return {
    ...state,
    accessResult: state.accessResult,
    dateFilterType: state.dateFilterType ?? options.effectiveDefaults.dateFilterType,
    rankingMode: nextRankingMode,
    topN: nextTopN,
    sortDirection: state.sortDirection ?? options.effectiveDefaults.sortDirection ?? 'DESC',
  }
}
