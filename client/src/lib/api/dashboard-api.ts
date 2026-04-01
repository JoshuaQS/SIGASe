import { api } from '@//lib/api/api-client';
import type {
  ApiEnvelope,
  DashboardAccessTrendsResponse,
  DashboardSummaryResponse,
  DashboardTopStudentsResponse,
} from '@//types/api';

export type DashboardQueryParams = {
  dateFrom?: string;
  dateTo?: string;
  career?: string;
  studentStatus?: 'ACTIVE' | 'INACTIVE';
  result?:
  | 'SUCCESS'
  | 'FAILED_INVALID_GOOGLE_TOKEN'
  | 'FAILED_GOOGLE_SUBJECT_MISMATCH'
  | 'FAILED_INSTITUTIONAL_DOMAIN'
  | 'FAILED_STUDENT_NOT_FOUND'
  | 'FAILED_STUDENT_INACTIVE'
  | 'FAILED_ACCOUNT_LOCKED'
  | 'FAILED_NEXT_URL_VALIDATION'
  | 'FAILED_ELIBRO_CONFIG'
  | 'FAILED_ELIBRO_API'
  | 'FAILED_INTERNAL_ERROR';
  limit?: number;
  sortDir?: 'asc' | 'desc';
};

function toQuery(params: DashboardQueryParams) {
  const search = new URLSearchParams();
  const safeCareer = params.career?.trim();
  const safeDateFrom = params.dateFrom?.trim();
  const safeDateTo = params.dateTo?.trim();
  const safeLimit =
    typeof params.limit === 'number'
      ? Math.min(50, Math.max(1, Math.trunc(params.limit)))
      : undefined;

  if (safeDateFrom) search.set('dateFrom', safeDateFrom);
  if (safeDateTo) search.set('dateTo', safeDateTo);
  if (safeCareer) search.set('career', safeCareer);
  if (params.studentStatus) search.set('studentStatus', params.studentStatus);
  if (params.result) search.set('result', params.result);
  if (typeof safeLimit === 'number') search.set('limit', String(safeLimit));
  if (params.sortDir) search.set('sortDir', params.sortDir);

  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function getDashboardSummary(params: DashboardQueryParams = {}) {
  const response = await api.get<ApiEnvelope<DashboardSummaryResponse>>(`/dashboard/summary${toQuery(params)}`);
  return response.data;
}

export async function getDashboardAccessTrends(params: DashboardQueryParams = {}) {
  const response = await api.get<ApiEnvelope<DashboardAccessTrendsResponse>>(`/dashboard/access-trends${toQuery(params)}`);
  return response.data;
}

export async function getDashboardTopStudents(params: DashboardQueryParams = {}) {
  const response = await api.get<ApiEnvelope<DashboardTopStudentsResponse>>(`/dashboard/top-students${toQuery(params)}`);
  return response.data;
}
