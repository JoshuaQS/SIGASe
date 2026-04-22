import { api } from '@/shared/lib/http/api-client'
import type { ApiEnvelope } from '@/shared/types/api'

export type DashboardFilterScope = 'STUDENTS' | 'CAREERS'
export type DashboardFilterMode = 'INDIVIDUAL' | 'ALL' | 'MULTI'
export type DashboardAccessResultFilter = 'ALL' | 'SUCCESS' | 'FAILED'
export type DashboardRankingMode = 'NONE' | 'TOP'
export type DashboardDateFilterType = 'NONE' | 'CUSTOM_RANGE'
export type DashboardSortDirection = 'ASC' | 'DESC'
export type DashboardLayoutType =
  | 'OVERVIEW'
  | 'STUDENT_DETAIL'
  | 'STUDENT_RANKING'
  | 'STUDENT_RANKING_SPLIT'
  | 'CAREER_DETAIL'
  | 'CAREER_RANKING'
  | 'CAREER_RANKING_SPLIT'
export type DashboardWidgetType =
  | 'KPI_GROUP'
  | 'AREA_TREND'
  | 'TOP_STUDENTS_TABLE'
  | 'TOP_CAREERS_TABLE'
  | 'STUDENT_ACCESS_SUMMARY'
  | 'STUDENT_ACTIVITY_TABLE'
  | 'STUDENT_RANKING_TABLE'
  | 'STUDENT_RESULT_BREAKDOWN'
  | 'CAREER_RANKING_TABLE'
  | 'CAREER_COMPARISON_TABLE'
  | 'CAREER_RANKING_SUCCESS_TABLE'
  | 'CAREER_RANKING_FAILED_TABLE'
  | 'CAREER_RESULT_BREAKDOWN'
  | 'CAREER_STUDENT_TABLE'
export type DashboardAnalysisField =
  | 'SCOPE'
  | 'MODE'
  | 'STUDENT_ID'
  | 'CAREER_IDS'
  | 'ACCESS_RESULT'
  | 'DATE_FILTER_TYPE'
  | 'DATE_FROM'
  | 'DATE_TO'
  | 'RANKING_MODE'
  | 'TOP_N'
  | 'SORT_DIRECTION'
export type DashboardExportFormat = 'CSV' | 'XLSX'

export interface DashboardAnalysisMetadataResponse {
  scopes: DashboardFilterScope[]
  modes: DashboardFilterMode[]
  accessResults: DashboardAccessResultFilter[]
  rankingModes: DashboardRankingMode[]
  dateStrategy: {
    allowed: DashboardDateFilterType[]
    defaultType: DashboardDateFilterType
    defaultRollingRangeDays: number
  }
  defaults: {
    accessResult: DashboardAccessResultFilter
    dateFilterType: DashboardDateFilterType
    rankingMode: DashboardRankingMode
    sortDirection: DashboardSortDirection
  }
  contract: {
    version: string
    supportedLayouts: DashboardLayoutType[]
    capabilities: {
      adaptiveAnalysis: boolean
      contextualOptions: boolean
      autocomplete: boolean
      export: boolean
    }
  }
}

export interface DashboardAnalysisOptionsRequest {
  scope?: DashboardFilterScope | null
  mode?: DashboardFilterMode | null
  studentId?: string | null
  careerIds?: string[] | null
  accessResult?: DashboardAccessResultFilter | null
  dateFilterType?: DashboardDateFilterType | null
  dateFrom?: string | null
  dateTo?: string | null
  rankingMode?: DashboardRankingMode | null
  topN?: number | null
  sortDirection?: DashboardSortDirection | null
}

export interface DashboardAnalysisOptionsResponse {
  allowedModes: DashboardFilterMode[]
  allowedAccessResults: DashboardAccessResultFilter[]
  ranking: {
    allowed: boolean
    allowedModes: DashboardRankingMode[]
    allowedTopN: number[]
    defaultTopN: number | null
    defaultSortDirection: DashboardSortDirection | null
  }
  dateFilter: {
    allowed: DashboardDateFilterType[]
    defaultType: DashboardDateFilterType
  }
  requiredFields: DashboardAnalysisField[]
  forbiddenFields: DashboardAnalysisField[]
  effectiveDefaults: {
    accessResult: DashboardAccessResultFilter
    dateFilterType: DashboardDateFilterType
    rankingMode: DashboardRankingMode
    topN: number | null
    sortDirection: DashboardSortDirection | null
  }
  canSubmit: boolean
  nextStep: DashboardAnalysisField | null
  missingRequiredFields: DashboardAnalysisField[]
}

export interface DashboardAutocompleteCareerRef {
  id: string
  code: string
  name: string
}

export interface DashboardStudentSearchItem {
  id: string
  displayLabel: string
  subtitle: string
  enrollmentId: string
  fullName: string
  career: DashboardAutocompleteCareerRef
  status: string
}

export interface DashboardCareerSearchItem {
  id: string
  displayLabel: string
  subtitle: string
  code: string
  name: string
  status: string
}

export interface DashboardAutocompleteResponse<T> {
  query: string
  limit: number
  items: T[]
}

export interface DashboardTableWidgetControlRequest {
  page?: number | null
  size?: number | null
  sortBy?: string | null
  sortDirection?: DashboardSortDirection | null
}

export interface DashboardAnalysisWidgetControlsRequest {
  studentActivityTable?: DashboardTableWidgetControlRequest | null
  careerStudentTable?: DashboardTableWidgetControlRequest | null
}

export interface DashboardAnalysisRequest {
  scope: DashboardFilterScope
  mode: DashboardFilterMode
  studentId?: string | null
  careerIds?: string[] | null
  accessResult?: DashboardAccessResultFilter | null
  dateFilterType?: DashboardDateFilterType | null
  dateFrom?: string | null
  dateTo?: string | null
  rankingMode?: DashboardRankingMode | null
  topN?: number | null
  sortDirection?: DashboardSortDirection | null
  widgetControls?: DashboardAnalysisWidgetControlsRequest | null
}

export interface DashboardAnalysisExportRequest {
  analysis: DashboardAnalysisRequest
  format: DashboardExportFormat
}

export interface DashboardFilterSummary {
  scope: DashboardFilterScope
  mode: DashboardFilterMode
  accessResult: DashboardAccessResultFilter
  dateFilterType: DashboardDateFilterType
  dateFrom: string | null
  dateTo: string | null
  rankingMode: DashboardRankingMode
  topN: number | null
  sortDirection: DashboardSortDirection
}

export type DashboardEmptyWidgetConfig = Record<string, never>

export interface DashboardTableWidgetConfig {
  page: number
  size: number
  sortBy: string
  sortDirection: DashboardSortDirection
}

export interface DashboardRankingWidgetConfig {
  topN: number
  sortDirection: DashboardSortDirection
}

export interface DashboardTopListWidgetConfig {
  limit: number
  sortDirection: DashboardSortDirection
}

export interface DashboardBreakdownWidgetConfig {
  sortBy: string
  sortDirection: DashboardSortDirection
  tieBreaker: string
}

export interface DashboardComparisonWidgetConfig {
  sortBy: string
  sortDirection: DashboardSortDirection
}

export type DashboardWidgetConfig =
  | DashboardEmptyWidgetConfig
  | DashboardTableWidgetConfig
  | DashboardRankingWidgetConfig
  | DashboardTopListWidgetConfig
  | DashboardBreakdownWidgetConfig
  | DashboardComparisonWidgetConfig

export interface DashboardTrendPoint {
  day: string
  successful: number
  failed: number
}

export interface DashboardSummaryWidgetData {
  totalStudents: number
  activeStudents: number
  inactiveStudents: number
  successfulAccessesInRange: number
  failedAccessesInRange: number
  successRate: number
  uniqueStudentsWithSuccessfulAccess: number
  currentElibroConfigStatus: string
  lastAccessAt: string | null
  lastSuccessfulAccessAt: string | null
  lastFailedAccessAt: string | null
}

export interface DashboardAccessTrendWidgetData {
  dateFrom: string
  dateTo: string
  points: DashboardTrendPoint[]
}

export interface DashboardTopStudentItem {
  studentId: string
  name: string
  enrollmentId: string
  successfulAccesses: number
  failedAccesses: number
  totalAccesses: number
}

export interface DashboardTopStudentsWidgetData {
  dateFrom: string
  dateTo: string
  limit: number
  sortDir: string
  students: DashboardTopStudentItem[]
}

export interface DashboardTopCareerItem {
  careerCode: string
  careerName: string
  successfulAccesses: number
  failedAccesses: number
  totalAccesses: number
}

export interface DashboardTopCareersWidgetData {
  dateFrom: string
  dateTo: string
  limit: number
  sortDir: string
  careers: DashboardTopCareerItem[]
}

export interface DashboardStudentAccessSummaryWidgetData {
  studentId: string
  studentName: string
  enrollmentId: string
  totalAccesses: number
  successfulAccesses: number
  failedAccesses: number
  successRate: number
}

export interface DashboardStudentActivityItem {
  accessLogId: string
  occurredAt: string
  result: string
  latencyMs: number | null
  channelName: string | null
  requestId: string | null
  providerErrorCode: string | null
  errorCode: string | null
}

export interface DashboardStudentActivityTableWidgetData {
  page: number
  size: number
  totalElements: number
  sortBy: string
  sortDirection: DashboardSortDirection
  items: DashboardStudentActivityItem[]
}

export interface DashboardCareerKpiWidgetData {
  careerId: string
  careerCode: string
  careerName: string
  totalAccesses: number
  successfulAccesses: number
  failedAccesses: number
  uniqueStudentsImpacted: number
  successRate: number
  lastAccessAt: string | null
  lastSuccessfulAccessAt: string | null
  lastFailedAccessAt: string | null
}

export interface DashboardBreakdownItem {
  result: string
  total: number
}

export interface DashboardCareerResultBreakdownWidgetData {
  careerId: string
  careerCode: string
  careerName: string
  totalAccesses: number
  successfulAccesses: number
  failedAccesses: number
  items: DashboardBreakdownItem[]
}

export interface DashboardCareerStudentTableItem {
  studentId: string
  studentName: string
  enrollmentId: string
  successfulAccesses: number
  failedAccesses: number
  totalAccesses: number
  successRate: number
}

export interface DashboardCareerStudentTableWidgetData {
  page: number
  size: number
  totalElements: number
  sortBy: string
  sortDirection: DashboardSortDirection
  items: DashboardCareerStudentTableItem[]
}

export interface DashboardStudentRankingKpiWidgetData {
  totalAccesses: number
  successfulAccesses: number
  failedAccesses: number
  uniqueStudentsImpacted: number
  successRate: number
  lastAccessAt: string | null
  lastSuccessfulAccessAt: string | null
  lastFailedAccessAt: string | null
}

export interface DashboardStudentRankingTableItem {
  position: number
  studentId: string
  studentName: string
  enrollmentId: string
  successfulAccesses: number
  failedAccesses: number
  totalAccesses: number
  successRate: number
}

export interface DashboardStudentRankingTableWidgetData {
  topN: number
  sortDirection: string
  totalCandidates: number
  items: DashboardStudentRankingTableItem[]
}

export interface DashboardStudentResultBreakdownWidgetData {
  totalAccesses: number
  successfulAccesses: number
  failedAccesses: number
  items: DashboardBreakdownItem[]
}

export interface DashboardCareerRankingKpiWidgetData {
  totalAccesses: number
  successfulAccesses: number
  failedAccesses: number
  uniqueCareersImpacted: number
  successRate: number
  lastAccessAt: string | null
  lastSuccessfulAccessAt: string | null
  lastFailedAccessAt: string | null
}

export interface DashboardCareerRankingTableItem {
  position: number
  careerId: string
  careerCode: string
  careerName: string
  rankingValue: number
}

export interface DashboardCareerRankingTableWidgetData {
  topN: number
  sortDirection: string
  rankingMetric: string
  totalCandidates: number
  items: DashboardCareerRankingTableItem[]
}

export interface DashboardCareerComparisonItem {
  careerId: string
  careerCode: string
  careerName: string
  successfulAccesses: number
  failedAccesses: number
  totalAccesses: number
  successRate: number
}

export interface DashboardCareerComparisonTableWidgetData {
  sortBy: string
  sortDirection: string
  totalCareers: number
  items: DashboardCareerComparisonItem[]
}

export type DashboardWidgetData =
  | DashboardSummaryWidgetData
  | DashboardAccessTrendWidgetData
  | DashboardTopStudentsWidgetData
  | DashboardTopCareersWidgetData
  | DashboardStudentAccessSummaryWidgetData
  | DashboardStudentActivityTableWidgetData
  | DashboardCareerKpiWidgetData
  | DashboardCareerResultBreakdownWidgetData
  | DashboardCareerStudentTableWidgetData
  | DashboardStudentRankingKpiWidgetData
  | DashboardStudentRankingTableWidgetData
  | DashboardStudentResultBreakdownWidgetData
  | DashboardCareerRankingKpiWidgetData
  | DashboardCareerRankingTableWidgetData
  | DashboardCareerComparisonTableWidgetData

export interface DashboardWidgetResponse {
  widgetId: string
  type: DashboardWidgetType
  title: string
  order: number
  config: DashboardWidgetConfig
  data: DashboardWidgetData
}

export interface DashboardAnalysisResponse {
  summary: DashboardFilterSummary
  layoutType: DashboardLayoutType
  widgets: DashboardWidgetResponse[]
}

export interface DashboardExportResult {
  blob: Blob
  filename: string
}

function extractFilenameFromContentDisposition(header: string | null, fallback: string) {
  if (!header) return fallback
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }
  const basicMatch = header.match(/filename="?([^"]+)"?/i)
  if (basicMatch?.[1]) {
    return basicMatch[1]
  }
  return fallback
}

export async function getDashboardAnalysisMetadata() {
  const response = await api.get<ApiEnvelope<DashboardAnalysisMetadataResponse>>('/dashboard/analysis/metadata')
  return response.data
}

export async function resolveDashboardAnalysisOptions(request: DashboardAnalysisOptionsRequest) {
  const response = await api.post<ApiEnvelope<DashboardAnalysisOptionsResponse>>(
    '/dashboard/analysis/options',
    request,
  )
  return response.data
}

export async function searchDashboardStudents(query: string, limit?: number) {
  const search = new URLSearchParams({ q: query })
  if (typeof limit === 'number') {
    search.set('limit', String(limit))
  }

  const response = await api.get<ApiEnvelope<DashboardAutocompleteResponse<DashboardStudentSearchItem>>>(
    `/dashboard/analysis/students/search?${search.toString()}`,
  )
  return response.data
}

export async function searchDashboardCareers(query: string, limit?: number) {
  const search = new URLSearchParams({ q: query })
  if (typeof limit === 'number') {
    search.set('limit', String(limit))
  }

  const response = await api.get<ApiEnvelope<DashboardAutocompleteResponse<DashboardCareerSearchItem>>>(
    `/dashboard/analysis/careers/search?${search.toString()}`,
  )
  return response.data
}

export async function analyzeDashboard(request: DashboardAnalysisRequest) {
  const response = await api.post<ApiEnvelope<DashboardAnalysisResponse>>('/dashboard/analysis', request)
  return response.data
}

export async function exportDashboardAnalysis(
  request: DashboardAnalysisExportRequest,
): Promise<DashboardExportResult> {
  const { blob, headers } = await api.download('/dashboard/analysis/export', {
    method: 'POST',
    body: JSON.stringify(request),
  })

  const extension = request.format === 'CSV' ? 'csv' : 'xlsx'
  const filename = extractFilenameFromContentDisposition(
    headers.get('Content-Disposition'),
    `dashboard-analysis.${extension}`,
  )

  return { blob, filename }
}
