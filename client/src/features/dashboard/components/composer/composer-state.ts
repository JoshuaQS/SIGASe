import type { DashboardAnalysisMetadataResponse } from '@/features/dashboard/api/dashboard-api'

import { DEFAULT_COMPOSER_STATE } from './composer.constants'
import type { ComposerState } from './composer.types'

export function createInitialComposerState(
  metadata?: DashboardAnalysisMetadataResponse | null,
): ComposerState {
  const sortOrder = metadata?.defaults.sortDirection === 'ASC' ? 'asc' : 'desc'
  return {
    ...DEFAULT_COMPOSER_STATE,
    sortOrder,
    dateRange: {},
    selectedCareerIds: [],
  }
}

