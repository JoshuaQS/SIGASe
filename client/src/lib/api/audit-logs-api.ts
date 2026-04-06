import { api } from '@//lib/api/api-client';
import type { ApiEnvelope } from '@//types/api';

type PageEnvelope<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AuditActorType = 'ADMIN' | 'STUDENT' | 'SYSTEM' | 'INTEGRATION';
export type AuditOutcome = 'SUCCESS' | 'FAILURE';
export type AuditSeverity = 'INFO' | 'WARN' | 'CRITICAL';

export type AuditLogDto = {
  id: string;
  actorType: AuditActorType | null;
  actorAdminId: string | null;
  actorAdminEmail: string | null;
  actorReference: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  outcome: AuditOutcome | null;
  severity: AuditSeverity | null;
  metadataJson: string | null;
  requestId: string | null;
  correlationId: string | null;
  ipAddressMasked: string | null;
  ipAddressHash: string | null;
  userAgentSanitized: string | null;
  occurredAt: string;
};

export type AuditLogParams = {
  dateFrom?: string;
  dateTo?: string;
  actorType?: AuditActorType;
  actorEmail?: string;
  action?:
  | 'ADMIN_CREATE'
  | 'ADMIN_UPDATE'
  | 'ADMIN_ACTIVATE'
  | 'ADMIN_DEACTIVATE'
  | 'ADMIN_RESET_PASSWORD'
  | 'STUDENT_CREATE'
  | 'STUDENT_UPDATE'
  | 'STUDENT_DEACTIVATE'
  | 'STUDENT_REACTIVATE'
  | 'ELIBRO_CONFIG_CREATE'
  | 'ELIBRO_CONFIG_UPDATE'
  | 'ELIBRO_CONFIG_ACTIVATE'
  | 'ELIBRO_CONFIG_DEACTIVATE'
  | 'ELIBRO_CONFIG_VALIDATE'
  | 'STUDENT_IMPORT';
  entityType?: 'ADMIN' | 'STUDENT' | 'ELIBRO_CONFIG' | 'STUDENT_IMPORT';
  outcome?: AuditOutcome;
  requestId?: string;
  correlationId?: string;
  severity?: AuditSeverity;
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

function buildQuery(params: AuditLogParams) {
  const qs = new URLSearchParams();
  if (clean(params.dateFrom)) qs.set('dateFrom', clean(params.dateFrom)!);
  if (clean(params.dateTo)) qs.set('dateTo', clean(params.dateTo)!);
  if (params.actorType) qs.set('actorType', params.actorType);
  if (clean(params.actorEmail)) qs.set('actorEmail', clean(params.actorEmail)!);
  if (params.action) qs.set('action', params.action);
  if (params.entityType) qs.set('entityType', params.entityType);
  if (params.outcome) qs.set('outcome', params.outcome);
  if (clean(params.requestId)) qs.set('requestId', clean(params.requestId)!);
  if (clean(params.correlationId)) qs.set('correlationId', clean(params.correlationId)!);
  if (params.severity) qs.set('severity', params.severity);
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.size !== undefined) qs.set('size', String(params.size));
  if (params.sortBy && AUDIT_ALLOWED_SORT_BY.has(params.sortBy)) qs.set('sortBy', params.sortBy);
  if (params.sortDir) qs.set('sortDir', params.sortDir);
  return qs.toString() ? `?${qs.toString()}` : '';
}

export async function getAuditLogs(params: AuditLogParams = {}) {
  const query = buildQuery(params);
  const response = await api.get<ApiEnvelope<PageEnvelope<AuditLogDto>>>(`/audit-logs${query}`);
  return response.data;
}
