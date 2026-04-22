import { useCallback, useMemo, useState } from 'react'

export type FilterType = 'alumno' | 'carrera'
export type Scope = 'individual' | 'todos' | 'varias' | 'todas'
export type AccessType = 'exitoso' | 'fallido' | 'ambos'
export type SortOrder = 'asc' | 'desc'

export type FilterState = {
  filterType: FilterType | null
  scope: Scope | null
  selectedStudent: string | null
  selectedCareers: string[]
  accessType: AccessType | null
  dateFilter: boolean
  dateRange: { from?: Date; to?: Date }
  ranking: boolean
  topN: number
  sortOrder: SortOrder
}

export const ALUMNO_TOP_OPTIONS = [5, 10, 15, 20] as const
export const CARRERA_TOP_OPTIONS = [5, 10, 15, 20] as const

export function supportsRankingForState(state: FilterState): boolean {
  if (!state.filterType || !state.scope) return false
  if (state.filterType === 'alumno') return state.scope === 'todos'
  return state.scope === 'varias' || state.scope === 'todas'
}

export function getCurrentStep(state: FilterState) {
  if (!state.filterType) return 0
  if (!state.scope) return 1

  const selectionOk =
    (state.filterType === 'alumno' &&
      (state.scope === 'todos' || Boolean(state.selectedStudent))) ||
    (state.filterType === 'carrera' &&
      (state.scope === 'todas' ||
        (state.scope === 'individual' && state.selectedCareers.length > 0) ||
        (state.scope === 'varias' && state.selectedCareers.length > 0)))

  if (!selectionOk) return 2
  return 3
}

function createInitialState(): FilterState {
  return {
    filterType: null,
    scope: null,
    selectedStudent: null,
    selectedCareers: [],
    accessType: null,
    dateFilter: false,
    dateRange: {},
    ranking: false,
    topN: ALUMNO_TOP_OPTIONS[1],
    sortOrder: 'desc',
  }
}

export function useFilterComposer() {
  const [state, setState] = useState<FilterState>(() => createInitialState())

  const isGroupScope = useMemo(() => {
    if (!state.filterType || !state.scope) return false
    if (state.filterType === 'alumno') return state.scope === 'todos'
    return state.scope === 'varias' || state.scope === 'todas'
  }, [state.filterType, state.scope])

  const isComplete = useMemo(() => {
    if (!state.filterType || !state.scope) return false
    if (!state.accessType) return false

    if (state.filterType === 'alumno') {
      if (state.scope === 'individual' && !state.selectedStudent) return false
      if (state.scope !== 'individual' && state.scope !== 'todos') return false
    }

    if (state.filterType === 'carrera') {
      if (state.scope === 'individual' && state.selectedCareers.length < 1) return false
      if (state.scope === 'varias' && state.selectedCareers.length < 2) return false
    }

    if (state.dateFilter && !(state.dateRange.from && state.dateRange.to)) return false

    const rankingSupported = supportsRankingForState(state)
    if (rankingSupported && (state.scope === 'varias' || state.scope === 'todas') && !state.ranking) {
      // In the backend contract these scopes always run ranking widgets.
      return false
    }

    if (state.ranking && !rankingSupported) return false

    return true
  }, [state])

  const reset = useCallback(() => setState(createInitialState()), [])

  const setFilterType = useCallback((filterType: FilterType) => {
    setState((prev) => ({
      ...createInitialState(),
      filterType,
      scope: null,
      sortOrder: prev.sortOrder,
    }))
  }, [])

  const setScope = useCallback((scope: Scope) => {
    setState((prev) => {
      const next: FilterState = {
        ...prev,
        scope,
        selectedStudent: null,
        selectedCareers: [],
        accessType: prev.accessType,
        dateFilter: prev.dateFilter,
        dateRange: prev.dateRange,
        ranking: prev.ranking,
        topN: prev.topN,
        sortOrder: prev.sortOrder,
      }

      // Enforce ranking default behavior for career groups.
      if (prev.filterType === 'carrera' && (scope === 'varias' || scope === 'todas')) {
        next.ranking = true
        next.topN = CARRERA_TOP_OPTIONS[1]
      }

      // Student groups can optionally enable ranking.
      if (prev.filterType === 'alumno' && scope === 'todos') {
        next.topN = ALUMNO_TOP_OPTIONS[1]
      }

      return next
    })
  }, [])

  const setSelectedStudent = useCallback((studentId: string | null) => {
    setState((prev) => ({ ...prev, selectedStudent: studentId }))
  }, [])

  const setSelectedCareers = useCallback((careerIds: string[]) => {
    setState((prev) => ({ ...prev, selectedCareers: careerIds }))
  }, [])

  const toggleCareer = useCallback((careerId: string) => {
    setState((prev) => {
      const exists = prev.selectedCareers.includes(careerId)
      return {
        ...prev,
        selectedCareers: exists
          ? prev.selectedCareers.filter((id) => id !== careerId)
          : [...prev.selectedCareers, careerId],
      }
    })
  }, [])

  const setAccessType = useCallback((accessType: AccessType) => {
    setState((prev) => ({ ...prev, accessType }))
  }, [])

  const setDateFilter = useCallback((enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      dateFilter: enabled,
      dateRange: enabled ? prev.dateRange : {},
    }))
  }, [])

  const setDateRange = useCallback((range: { from?: Date; to?: Date }) => {
    setState((prev) => ({ ...prev, dateRange: range }))
  }, [])

  const setRanking = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, ranking: enabled }))
  }, [])

  const setTopN = useCallback((topN: number) => {
    setState((prev) => ({ ...prev, topN }))
  }, [])

  const setSortOrder = useCallback((sortOrder: SortOrder) => {
    setState((prev) => ({ ...prev, sortOrder }))
  }, [])

  return {
    state,
    isGroupScope,
    isComplete,
    reset,
    setFilterType,
    setScope,
    setSelectedStudent,
    setSelectedCareers,
    toggleCareer,
    setAccessType,
    setDateFilter,
    setDateRange,
    setRanking,
    setTopN,
    setSortOrder,
  }
}

