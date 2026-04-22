import type { ComposerState } from './composer.types'

export const TOP_N_OPTIONS = [1, 5, 10, 20, 50] as const
export type TopNOption = (typeof TOP_N_OPTIONS)[number]

export const DEFAULT_COMPOSER_STATE: ComposerState = {
  filterType: null,
  scope: null,
  selectedStudentId: null,
  selectedCareerIds: [],
  accessType: null,
  dateEnabled: false,
  dateRange: {},
  rankingEnabled: false,
  topN: 10,
  sortOrder: 'desc',
}

