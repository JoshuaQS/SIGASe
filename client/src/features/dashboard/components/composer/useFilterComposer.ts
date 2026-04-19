import { useCallback, useMemo, useState } from 'react'

export type FilterType = 'alumno' | 'carrera'
export type AlumnoScope = 'individual' | 'todos'
export type CarreraScope = 'individual' | 'varias' | 'todas'
export type Scope = AlumnoScope | CarreraScope
export type AccessType = 'exitoso' | 'fallido' | 'ambos'
export type SortOrder = 'asc' | 'desc'

export interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

export interface FilterState {
  filterType: FilterType | null
  scope: Scope | null
  selectedStudent: string | null
  selectedCareers: string[]
  accessType: AccessType | null
  dateFilter: boolean
  dateRange: DateRange
  sortOrder: SortOrder
  ranking: boolean
  topN: number
}

export const ALUMNO_TOP_OPTIONS = [5, 10, 15, 20, 25, 30] as const
export const CARRERA_TOP_OPTIONS = [3, 5, 10] as const

export const DEFAULT_FILTER_STATE: FilterState = {
  filterType: null,
  scope: null,
  selectedStudent: null,
  selectedCareers: [],
  accessType: null,
  dateFilter: false,
  dateRange: { from: undefined, to: undefined },
  sortOrder: 'desc',
  ranking: false,
  topN: 10,
}

export function supportsRankingForState(
  state: Pick<FilterState, 'filterType' | 'scope'>,
): boolean {
  if (state.filterType === 'alumno') {
    return state.scope === 'todos'
  }

  if (state.filterType === 'carrera') {
    return state.scope === 'varias' || state.scope === 'todas'
  }

  return false
}

export function getCurrentStep(state: FilterState): number {
  if (!state.filterType) return 0
  if (!state.scope) return 1

  if (
    state.filterType === 'alumno' &&
    state.scope === 'individual' &&
    !state.selectedStudent
  )
    return 2
  if (
    state.filterType === 'carrera' &&
    state.scope === 'individual' &&
    state.selectedCareers.length === 0
  )
    return 2
  if (
    state.filterType === 'carrera' &&
    state.scope === 'varias' &&
    state.selectedCareers.length < 2
  )
    return 2

  return 3
}

export function isFilterComplete(state: FilterState): boolean {
  if (!state.filterType || !state.scope) return false
  if (!state.accessType) return false

  if (state.filterType === 'alumno') {
    if (state.scope === 'individual' && !state.selectedStudent) return false
  }

  if (state.filterType === 'carrera') {
    if (state.scope === 'individual' && state.selectedCareers.length === 0)
      return false
    if (state.scope === 'varias' && state.selectedCareers.length < 2)
      return false
  }

  if (state.dateFilter && (!state.dateRange.from || !state.dateRange.to))
    return false
  if (state.ranking && !state.topN) return false

  return true
}

export function useFilterComposer() {
  const [state, setState] = useState<FilterState>({ ...DEFAULT_FILTER_STATE })

  const setFilterType = useCallback((type: FilterType | null) => {
    setState(() => ({
      ...DEFAULT_FILTER_STATE,
      filterType: type,
    }))
  }, [])

  const setScope = useCallback((scope: Scope | null) => {
    setState((prev) => ({
      ...prev,
      scope,
      selectedStudent: null,
      selectedCareers: [],
      ranking: false,
      topN: DEFAULT_FILTER_STATE.topN,
    }))
  }, [])

  const setSelectedStudent = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedStudent: id }))
  }, [])

  const setSelectedCareers = useCallback((ids: string[]) => {
    setState((prev) => ({ ...prev, selectedCareers: ids }))
  }, [])

  const toggleCareer = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      selectedCareers: prev.selectedCareers.includes(id)
        ? prev.selectedCareers.filter((careerId) => careerId !== id)
        : [...prev.selectedCareers, id],
    }))
  }, [])

  const setAccessType = useCallback((type: AccessType | null) => {
    setState((prev) => ({ ...prev, accessType: type }))
  }, [])

  const setDateFilter = useCallback((enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      dateFilter: enabled,
      dateRange: enabled ? prev.dateRange : { from: undefined, to: undefined },
    }))
  }, [])

  const setDateRange = useCallback((range: DateRange) => {
    setState((prev) => ({ ...prev, dateRange: range }))
  }, [])

  const setSortOrder = useCallback((order: SortOrder) => {
    setState((prev) => ({ ...prev, sortOrder: order }))
  }, [])

  const setRanking = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, ranking: enabled }))
  }, [])

  const setTopN = useCallback((topN: number) => {
    setState((prev) => ({ ...prev, topN }))
  }, [])

  const reset = useCallback(() => {
    setState({ ...DEFAULT_FILTER_STATE })
  }, [])

  const isComplete = useMemo(() => isFilterComplete(state), [state])

  const isGroupScope = useMemo(() => {
    if (state.filterType === 'alumno') return state.scope === 'todos'
    if (state.filterType === 'carrera')
      return state.scope === 'varias' || state.scope === 'todas'
    return false
  }, [state.filterType, state.scope])

  return {
    state,
    isComplete,
    isGroupScope,
    setFilterType,
    setScope,
    setSelectedStudent,
    setSelectedCareers,
    toggleCareer,
    setAccessType,
    setDateFilter,
    setDateRange,
    setSortOrder,
    setRanking,
    setTopN,
    reset,
  }
}
