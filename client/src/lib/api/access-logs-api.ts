import { api } from '@//lib/api/api-client';
import type { ApiEnvelope } from '@//types/api';

type PageEnvelope<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AccessResult =
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

export type AccessLogDto = {
  id: string;
  studentId: string | null;
  attemptedEmail: string | null;
  normalizedEmail: string | null;
  result: AccessResult;
  errorCode: string | null;
  errorDetail: string | null;
  latencyMs: number | null;
  requestId: string | null;
  correlationId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  providerName: string | null;
  nextUrl: string | null;
  redirectUrl: string | null;
  occurredAt: string;
};

export type AccessLogParams = {
  dateFrom?: string;
  dateTo?: string;
  result?: AccessResult;
  normalizedEmail?: string;
  attemptedEmail?: string;
  studentId?: string;
  ipAddress?: string;
  requestId?: string;
  correlationId?: string;
  providerName?: string;
  page?: number;
  size?: number;
  sortBy?:
  | 'occurredAt'
  | 'result'
  | 'latencyMs'
  | 'normalizedEmail'
  | 'attemptedEmail'
  | 'ipAddress'
  | 'requestId'
  | 'correlationId'
  | 'providerName';
  sortDir?: 'asc' | 'desc';
};

const ACCESS_ALLOWED_SORT_BY = new Set([
  'occurredAt',
  'result',
  'latencyMs',
  'normalizedEmail',
  'attemptedEmail',
  'ipAddress',
  'requestId',
  'correlationId',
  'providerName',
] as const);

function clean(value?: string | null) {
  const next = value?.trim();
  return next ? next : undefined;
}

function buildQuery(params: AccessLogParams) {
  const qs = new URLSearchParams();
  if (clean(params.dateFrom)) qs.set('dateFrom', clean(params.dateFrom)!);
  if (clean(params.dateTo)) qs.set('dateTo', clean(params.dateTo)!);
  if (params.result) qs.set('result', params.result);
  if (clean(params.normalizedEmail)) qs.set('normalizedEmail', clean(params.normalizedEmail)!);
  if (clean(params.attemptedEmail)) qs.set('attemptedEmail', clean(params.attemptedEmail)!);
  if (clean(params.studentId)) qs.set('studentId', clean(params.studentId)!);
  if (clean(params.ipAddress)) qs.set('ipAddress', clean(params.ipAddress)!);
  if (clean(params.requestId)) qs.set('requestId', clean(params.requestId)!);
  if (clean(params.correlationId)) qs.set('correlationId', clean(params.correlationId)!);
  if (clean(params.providerName)) qs.set('providerName', clean(params.providerName)!);
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.size !== undefined) qs.set('size', String(params.size));
  if (params.sortBy && ACCESS_ALLOWED_SORT_BY.has(params.sortBy)) qs.set('sortBy', params.sortBy);
  if (params.sortDir) qs.set('sortDir', params.sortDir);
  return qs.toString() ? `?${qs.toString()}` : '';
}

export async function getAccessLogs(params: AccessLogParams = {}) {
  const query = buildQuery(params);
  const response = await api.get<ApiEnvelope<PageEnvelope<AccessLogDto>>>(`/access-logs${query}`);
  return response.data;
}
