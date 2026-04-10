import { api } from '@/shared/lib/http/api-client';
import type {
  ApiEnvelope,
  AuditActorType,
  AuditLog,
  AuditOutcome,
  AuditSeverity,
} from '@/shared/types/api';

type PageEnvelope<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type {
  AuditActorType,
  AuditOutcome,
  AuditSeverity,
  AuditSourceModule,
} from '@/shared/types/api';
export type AuditLogExportFormat = 'csv' | 'xlsx';

export type AuditLogDto = AuditLog;

export type AuditLogPage = PageEnvelope<AuditLogDto>;

export type AuditLogParams = {
  dateFrom?: string;
  dateTo?: string;
  actorType?: AuditActorType;
  actorEmail?: string;
  action?: string;
  entityType?: string;
  result?: AuditOutcome;
  outcome?: AuditOutcome;
  requestId?: string;
  correlationId?: string;
  severity?: AuditSeverity;
  search?: string;
  page?: number;
  size?: number;
  sortBy?:
  | 'occurredAt'
  | 'actorType'
  | 'action'
  | 'entityType'
  | 'outcome'
  | 'severity'
  | 'requestId'
  | 'correlationId';
  sortDir?: 'asc' | 'desc';
};

const AUDIT_ALLOWED_SORT_BY = new Set([
  'occurredAt',
  'actorType',
  'action',
  'entityType',
  'outcome',
  'severity',
  'requestId',
  'correlationId',
] as const);

function clean(value?: string | null) {
  const next = value?.trim();
  return next ? next : undefined;
}

function resolveAuditResult(params: AuditLogParams) {
  return params.result ?? params.outcome;
}

function buildQuery(params: AuditLogParams) {
  const qs = new URLSearchParams();
  if (clean(params.dateFrom)) qs.set('dateFrom', clean(params.dateFrom)!);
  if (clean(params.dateTo)) qs.set('dateTo', clean(params.dateTo)!);
  if (params.actorType) qs.set('actorType', params.actorType);
  if (clean(params.actorEmail)) qs.set('actorEmail', clean(params.actorEmail)!);
  if (params.action) qs.set('action', params.action);
  if (params.entityType) qs.set('entityType', params.entityType);
  if (resolveAuditResult(params)) qs.set('result', resolveAuditResult(params)!);
  if (clean(params.requestId)) qs.set('requestId', clean(params.requestId)!);
  if (clean(params.correlationId)) qs.set('correlationId', clean(params.correlationId)!);
  if (params.severity) qs.set('severity', params.severity);
  if (clean(params.search)) qs.set('search', clean(params.search)!);
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.size !== undefined) qs.set('size', String(params.size));
  if (params.sortBy && AUDIT_ALLOWED_SORT_BY.has(params.sortBy)) qs.set('sortBy', params.sortBy);
  if (params.sortDir) qs.set('sortDir', params.sortDir);
  return qs.toString() ? `?${qs.toString()}` : '';
}

export async function getAuditLogs(params: AuditLogParams = {}) {
  const query = buildQuery(params);
  const response = await api.get<ApiEnvelope<AuditLogPage>>(`/audit-logs${query}`);
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

export async function exportAuditLogsReport(
  params: AuditLogParams = {},
  format: AuditLogExportFormat = 'csv',
) {
  const payload = {
    dateFrom: clean(params.dateFrom),
    dateTo: clean(params.dateTo),
    actorType: params.actorType,
    actorEmail: clean(params.actorEmail),
    action: clean(params.action),
    entityType: clean(params.entityType),
    result: resolveAuditResult(params),
    requestId: clean(params.requestId),
    correlationId: clean(params.correlationId),
    severity: params.severity,
    search: clean(params.search),
    page: params.page,
    size: params.size,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  };

  const { blob, headers } = await api.download(`/audit-logs/export?format=${format}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const filename = extractFilenameFromContentDisposition(
    headers.get('Content-Disposition'),
    `audit-logs-export.${format}`,
  );

  return { blob, filename };
}
