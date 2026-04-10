import { useCallback, useMemo, useState } from 'react'

type FilterUpdater<T> = T | ((current: T) => T)

function cloneFilterState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function isSameFilterState<T>(left: T, right: T) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function useTableFilterState<T>(initialFilters: T) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<T>(() => cloneFilterState(initialFilters))
  const [appliedFilters, setAppliedFilters] = useState<T>(() => cloneFilterState(initialFilters))

  const updateDraftFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setDraftFilters((current) => ({ ...current, [key]: value }))
  }, [])

  const applyFilters = useCallback(() => {
    const nextFilters = cloneFilterState(draftFilters)
    setAppliedFilters(nextFilters)
    setFiltersOpen(false)
    return nextFilters
  }, [draftFilters])

  const resetDraftFilters = useCallback(() => {
    setDraftFilters(cloneFilterState(appliedFilters))
  }, [appliedFilters])

  const clearFilters = useCallback(() => {
    const nextFilters = cloneFilterState(initialFilters)
    setDraftFilters(nextFilters)
    setAppliedFilters(nextFilters)
    setFiltersOpen(false)
    return nextFilters
  }, [initialFilters])

  const commitAppliedFilters = useCallback((updater: FilterUpdater<T>) => {
    setAppliedFilters((current) => {
      const resolved = typeof updater === 'function'
        ? (updater as (value: T) => T)(current)
        : updater
      const nextFilters = cloneFilterState(resolved)
      setDraftFilters(nextFilters)
      return nextFilters
    })
  }, [])

  const hasActiveFilters = useMemo(
    () => !isSameFilterState(appliedFilters, initialFilters),
    [appliedFilters, initialFilters],
  )

  const hasPendingChanges = useMemo(
    () => !isSameFilterState(draftFilters, appliedFilters),
    [draftFilters, appliedFilters],
  )

  return {
    filtersOpen,
    setFiltersOpen,
    draftFilters,
    setDraftFilters,
    appliedFilters,
    setAppliedFilters,
    updateDraftFilter,
    applyFilters,
    resetDraftFilters,
    clearFilters,
    commitAppliedFilters,
    hasActiveFilters,
    hasPendingChanges,
  }
}
