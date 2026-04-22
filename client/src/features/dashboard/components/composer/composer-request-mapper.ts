import type { DashboardAnalysisRequest } from '@/features/dashboard/api/dashboard-api'

import type { ComposerState } from './composer.types'
import { validateComposerState } from './composer-validation'

function mapAccessResult(accessType: ComposerState['accessType']): DashboardAnalysisRequest['accessResult'] {
  if (accessType === 'exitoso') return 'SUCCESS'
  if (accessType === 'fallido') return 'FAILED'
  return 'ALL'
}

function mapSortDirection(sortOrder: ComposerState['sortOrder']): DashboardAnalysisRequest['sortDirection'] {
  return sortOrder === 'asc' ? 'ASC' : 'DESC'
}

export function buildComposerRequest(state: ComposerState): DashboardAnalysisRequest | null {
  const validation = validateComposerState(state)
  if (!validation.isValid) return null

  const accessResult = mapAccessResult(state.accessType)
  const sortDirection = mapSortDirection(state.sortOrder)

  const dateFilterType: DashboardAnalysisRequest['dateFilterType'] = state.dateEnabled
    ? 'CUSTOM_RANGE'
    : 'NONE'
  const dateFrom = state.dateEnabled ? state.dateRange.from!.toISOString() : null
  const dateTo = state.dateEnabled ? state.dateRange.to!.toISOString() : null

  if (state.filterType === 'alumno') {
    const mode: DashboardAnalysisRequest['mode'] = state.scope === 'individual' ? 'INDIVIDUAL' : 'ALL'
    const rankingMode: DashboardAnalysisRequest['rankingMode'] = state.scope === 'todos' && state.rankingEnabled ? 'TOP' : 'NONE'
    const topN = rankingMode === 'TOP' ? state.topN : null

    return {
      scope: 'STUDENTS',
      mode,
      studentId: state.scope === 'individual' ? state.selectedStudentId : null,
      careerIds: null,
      accessResult,
      dateFilterType,
      dateFrom,
      dateTo,
      rankingMode,
      topN,
      sortDirection,
      widgetControls: null,
    }
  }

  // Carrera
  const mode: DashboardAnalysisRequest['mode'] =
    state.scope === 'individual' ? 'INDIVIDUAL' : state.scope === 'varias' ? 'MULTI' : 'ALL'

  const rankingMode: DashboardAnalysisRequest['rankingMode'] =
    state.scope === 'varias' || state.scope === 'todas' ? 'TOP' : 'NONE'
  const topN = rankingMode === 'TOP' ? state.topN : null

  return {
    scope: 'CAREERS',
    mode,
    studentId: null,
    careerIds: state.scope === 'todas' ? null : state.selectedCareerIds,
    accessResult,
    dateFilterType,
    dateFrom,
    dateTo,
    rankingMode,
    topN,
    sortDirection,
    widgetControls: null,
  }
}

