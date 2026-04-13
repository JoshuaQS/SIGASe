import { useMemo, useState } from 'react'

import type {
  DashboardAccessResultFilter,
  DashboardAnalysisMetadataResponse,
  DashboardCareerSearchItem,
  DashboardDateFilterType,
  DashboardFilterScope,
  DashboardRankingMode,
  DashboardSortDirection,
  DashboardStudentSearchItem,
} from '@/features/dashboard/api/dashboard-api'
import {
  createDefaultFilterState,
  deriveBackendMode,
  type FilterState,
} from '@/features/dashboard/components/composer/composer-types'

export function useFilterComposer(metadata: DashboardAnalysisMetadataResponse) {
  const [state, setState] = useState<FilterState>(() => createDefaultFilterState(metadata))

  const setScope = (scope: DashboardFilterScope | null) => {
    setState((prev) => ({
      ...createDefaultFilterState(metadata),
      scope,
      sortDirection: prev.sortDirection ?? metadata.defaults.sortDirection,
    }))
  }

  const setStudentScopeChoice = (choice: FilterState['studentScopeChoice']) => {
    setState((prev) => ({
      ...prev,
      studentScopeChoice: choice,
      selectedStudent: null,
      rankingMode: metadata.defaults.rankingMode,
      topN: null,
    }))
  }

  const setCareerScopeChoice = (choice: FilterState['careerScopeChoice']) => {
    setState((prev) => ({
      ...prev,
      careerScopeChoice: choice,
      selectedCareers: [],
      allCareersSelected: false,
      rankingMode: metadata.defaults.rankingMode,
      topN: null,
    }))
  }

  const setSelectedStudent = (student: DashboardStudentSearchItem | null) => {
    setState((prev) => ({ ...prev, selectedStudent: student }))
  }

  const setSelectedCareers = (careers: DashboardCareerSearchItem[]) => {
    setState((prev) => ({ ...prev, selectedCareers: careers, allCareersSelected: false }))
  }

  const toggleCareer = (career: DashboardCareerSearchItem) => {
    setState((prev) => {
      const exists = prev.selectedCareers.some((item) => item.id === career.id)
      return {
        ...prev,
        allCareersSelected: false,
        selectedCareers: exists
          ? prev.selectedCareers.filter((item) => item.id !== career.id)
          : [...prev.selectedCareers, career],
      }
    })
  }

  const setAllCareersSelected = (enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      allCareersSelected: enabled,
      selectedCareers: enabled ? [] : prev.selectedCareers,
    }))
  }

  const setAccessResult = (accessResult: DashboardAccessResultFilter | null) => {
    setState((prev) => ({ ...prev, accessResult }))
  }

  const setDateFilterType = (dateFilterType: DashboardDateFilterType) => {
    setState((prev) => ({
      ...prev,
      dateFilterType,
      dateRange: dateFilterType === 'CUSTOM_RANGE' ? prev.dateRange : { from: undefined, to: undefined },
    }))
  }

  const setDateRange = (dateRange: FilterState['dateRange']) => {
    setState((prev) => ({ ...prev, dateRange }))
  }

  const setRankingMode = (rankingMode: DashboardRankingMode) => {
    setState((prev) => ({
      ...prev,
      rankingMode,
      topN: rankingMode === 'TOP' ? prev.topN : null,
    }))
  }

  const setTopN = (topN: number | null) => {
    setState((prev) => ({ ...prev, topN }))
  }

  const setSortDirection = (sortDirection: DashboardSortDirection) => {
    setState((prev) => ({ ...prev, sortDirection }))
  }

  const reset = () => {
    setState(createDefaultFilterState(metadata))
  }

  const derivedMode = useMemo(() => deriveBackendMode(state), [state])
  const isCareerMultiSelection = state.scope === 'CAREERS' && state.careerScopeChoice === 'MULTIPLE'
  const isGroupScope = derivedMode === 'ALL' || derivedMode === 'MULTI'

  return {
    state,
    setState,
    derivedMode,
    isCareerMultiSelection,
    isGroupScope,
    setScope,
    setStudentScopeChoice,
    setCareerScopeChoice,
    setSelectedStudent,
    setSelectedCareers,
    toggleCareer,
    setAllCareersSelected,
    setAccessResult,
    setDateFilterType,
    setDateRange,
    setRankingMode,
    setTopN,
    setSortDirection,
    reset,
  }
}
