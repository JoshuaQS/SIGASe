import type {
  DashboardAnalysisMetadataResponse,
  DashboardAnalysisRequest,
} from '@/features/dashboard/api/dashboard-api'

import type { TOP_N_OPTIONS } from './composer.constants'

export type ComposerFilterType = 'alumno' | 'carrera'
export type ComposerScope = 'individual' | 'todos' | 'varias' | 'todas'
export type ComposerAccessType = 'exitoso' | 'fallido' | 'ambos'
export type ComposerSortOrder = 'asc' | 'desc'

export type ComposerState = {
  filterType: ComposerFilterType | null
  scope: ComposerScope | null
  selectedStudentId: string | null
  selectedCareerIds: string[]
  accessType: ComposerAccessType | null
  dateEnabled: boolean
  dateRange: {
    from?: Date
    to?: Date
  }
  rankingEnabled: boolean
  topN: (typeof TOP_N_OPTIONS)[number]
  sortOrder: ComposerSortOrder
}

export type ComposerValidationResult = {
  isValid: boolean
  reason?: string
}

export type ComposerOutputContract = {
  context: {
    title: string
    badges: string[]
  }
  kpis: string[]
  charts: string[]
  tables: string[]
  rankings: string[]
}

export type ComposerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (request: DashboardAnalysisRequest) => Promise<boolean> | boolean
  onReset: () => Promise<void> | void
  /** Cuando existe, alinea el orden inicial / reset con defaults del backend. */
  metadata?: DashboardAnalysisMetadataResponse | null
  currentLayoutLabel?: string | null
  lastAppliedSummary?: string | null
  currentWidgets?: string[]
  /** Incrementado desde ComposerShell al “Reiniciar” el panel; sincroniza el estado local del diálogo. */
  resetSignal?: number
}

