import { api } from '@//lib/api/api-client';
import { authSession } from '@//auth/auth-session-store';
import type {
  ApiEnvelope,
  DashboardAccessTrendsResponse,
  DashboardTopCareersResponse,
  DashboardSummaryResponse,
  DashboardTopStudentsResponse,
} from '@//types/api';

export type DashboardAnalysisType = 'students_individual' | 'students_all' | 'careers';
export type DashboardAccessStatus = 'ALL' | 'SUCCESS' | 'FAILED';

export type DashboardQueryParams = {
  analysisType?: DashboardAnalysisType;
  studentId?: string;
  careerCodes?: string[];
  status?: DashboardAccessStatus;
  dateFrom?: string;
  dateTo?: string;
  studentStatus?: 'ACTIVE' | 'INACTIVE';
  sortDir?: 'asc' | 'desc';
  topEnabled?: boolean;
  topN?: number;
};

export type DashboardExportFormat = 'csv' | 'xlsx';

export type DashboardExportResult = {
  blob: Blob;
  filename: string;
};

function toQuery(params: DashboardQueryParams) {
  const search = new URLSearchParams();

  if (params.analysisType) search.set('analysisType', params.analysisType);
  if (params.studentId) search.set('studentId', params.studentId);
  if (params.status) search.set('status', params.status);
  if (params.dateFrom?.trim()) search.set('dateFrom', params.dateFrom.trim());
  if (params.dateTo?.trim()) search.set('dateTo', params.dateTo.trim());
  if (params.studentStatus) search.set('studentStatus', params.studentStatus);
  if (params.sortDir) search.set('sortDir', params.sortDir);
  if (typeof params.topEnabled === 'boolean') search.set('topEnabled', String(params.topEnabled));
  if (typeof params.topN === 'number') {
    const safeTopN = Math.min(50, Math.max(1, Math.trunc(params.topN)));
    search.set('topN', String(safeTopN));
  }

  if (Array.isArray(params.careerCodes)) {
    const cleaned = [...new Set(params.careerCodes.map((code) => code.trim()).filter(Boolean))];
    for (const code of cleaned) {
      search.append('careerCodes', code);
    }
  }

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

export async function getDashboardTopCareers(params: DashboardQueryParams = {}) {
  const response = await api.get<ApiEnvelope<DashboardTopCareersResponse>>(`/dashboard/top-careers${toQuery(params)}`);
  return response.data;
}

function extractFilenameFromContentDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const basicMatch = header.match(/filename="?([^"]+)"?/i);
  if (basicMatch?.[1]) {
    return basicMatch[1];
  }
  return fallback;
}

export async function exportDashboardMonitoring(
  params: DashboardQueryParams,
  format: DashboardExportFormat,
): Promise<DashboardExportResult> {
  const token = authSession.getSnapshot().user?.token;
  const query = new URLSearchParams(toQuery(params).replace(/^\?/, ''));
  query.set('format', format);

  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const baseUrl = viteEnv?.VITE_API_URL || 'http://localhost:8080/api/v1';

  const response = await fetch(`${baseUrl}/dashboard/export?${query.toString()}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    let message = 'No se pudo exportar el monitoreo.';
    try {
      const errorPayload = await response.json() as { message?: string };
      if (errorPayload.message) {
        message = errorPayload.message;
      }
    } catch {
      const fallback = await response.text();
      if (fallback) message = fallback;
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const filename = extractFilenameFromContentDisposition(
    response.headers.get('Content-Disposition'),
    `dashboard-monitoring.${format}`,
  );

  return { blob, filename };
}
