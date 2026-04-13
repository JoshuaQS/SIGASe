import { api } from '@/shared/lib/http/api-client';
import type {
  AccessLogActorType,
  AccessLogResult,
  AccessLogScope,
  ApiEnvelope,
  UnifiedAccessLogRecord,
} from '@/shared/types/api';

type PageEnvelope<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AccessLogExportFormat = 'csv' | 'xlsx';

export type AccessLogSortField = 'occurredAt' | 'actorType' | 'scope' | 'result';
export type AccessLogSortDir = 'asc' | 'desc';

export type AccessLogQueryParams = {
  actorType?: AccessLogActorType;
  scope?: AccessLogScope;
  result?: AccessLogResult | '';
  dateFrom?: string;
  dateTo?: string;
  studentId?: string;
  adminId?: string;
  careerId?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: `${AccessLogSortField},${AccessLogSortDir}`;
};

export type AccessLogPage = PageEnvelope<UnifiedAccessLogRecord>;

export type AccessLogDailyCountDto = {
  day: string;
  accesses: number;
};

export type AccessLogCareerDistributionDto = {
  careerCode: string;
  careerName: string;
  total: number;
};

export type AccessLogMetricsDto = {
  dailyAccesses: AccessLogDailyCountDto[];
  careerDistribution: AccessLogCareerDistributionDto[];
  hourlyVolumeToday: Array<{
    t: string;
    total: number;
    successful: number;
    failed: number;
  }>;
};

function clean(value?: string | null) {
  const next = value?.trim();
  return next ? next : undefined;
}

function buildQuery(params: AccessLogQueryParams, includePaging: boolean) {
  const qs = new URLSearchParams();
  if (params.actorType && params.actorType !== 'ALL') qs.set('actorType', params.actorType);
  if (params.scope && params.scope !== 'ALL') qs.set('scope', params.scope);
  if (clean(params.result)) qs.set('result', clean(params.result)!);
  if (clean(params.dateFrom)) qs.set('dateFrom', clean(params.dateFrom)!);
  if (clean(params.dateTo)) qs.set('dateTo', clean(params.dateTo)!);
  if (clean(params.studentId)) qs.set('studentId', clean(params.studentId)!);
  if (clean(params.adminId)) qs.set('adminId', clean(params.adminId)!);
  if (clean(params.careerId)) qs.set('careerId', clean(params.careerId)!);
  if (clean(params.search)) qs.set('search', clean(params.search)!);
  if (clean(params.sort)) qs.set('sort', clean(params.sort)!);
  if (includePaging) {
    if (params.page !== undefined) qs.set('page', String(params.page));
    if (params.size !== undefined) qs.set('size', String(params.size));
  }
  return qs.toString() ? `?${qs.toString()}` : '';
}

export async function getAccessLogs(params: AccessLogQueryParams = {}) {
  const query = buildQuery(params, true);
  const response = await api.get<ApiEnvelope<AccessLogPage>>(`/access-logs${query}`);
  return response.data;
}

export async function getAccessLogMetrics(
  params: AccessLogQueryParams = {},
  windowDays = 7,
) {
  const query = buildQuery(params, false);
  const qs = new URLSearchParams(query.replace(/^\?/, ''));
  qs.set('windowDays', String(windowDays));
  const response = await api.get<ApiEnvelope<AccessLogMetricsDto>>(`/access-logs/metrics?${qs.toString()}`);
  return response.data;
}

function extractFilenameFromContentDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const basicMatch = header.match(/filename="?([^"]+)"?/i);
  if (basicMatch?.[1]) return basicMatch[1];
  return fallback;
}

export async function exportAccessLogsReport(
  params: AccessLogQueryParams = {},
  format: AccessLogExportFormat = 'csv',
) {
  const query = new URLSearchParams(buildQuery(params, false).replace(/^\?/, ''));
  query.set('format', format);

  const { blob, headers } = await api.download(`/reports/access-logs/export?${query.toString()}`);
  const filename = extractFilenameFromContentDisposition(
    headers.get('Content-Disposition'),
    `access-logs-export.${format}`,
  );
  return { blob, filename };
}
