import { api } from '@/shared/lib/http/api-client';
import type {
  ApiEnvelope,
  ElibroConfigStatus,
  ElibroValidationStatus,
} from '@/shared/types/api';

export type ElibroOverviewState = 'configured' | 'incomplete' | 'invalid' | 'pending';
export type ElibroRecentActivityType = 'success' | 'warning' | 'info' | 'error';

export type ElibroOverviewConfig = {
  id: string;
  name: string;
  channelName: string;
  channelIdMasked: string | null;
  hasAuthToken: boolean;
  hasChannelSecret: boolean;
  hasChannelId: boolean;
  createdByName: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
  nextUrl: string | null;
  status: ElibroConfigStatus;
};

export type ElibroOverviewStatus = {
  state: ElibroOverviewState;
  provider: string;
  lastValidationAt: string | null;
  lastValidationMessage: string | null;
  updatedAt: string | null;
  updatedByName: string | null;
};

export type ElibroOverviewChecklist = {
  hasAuthToken: boolean;
  hasChannelId: boolean;
  hasChannelSecret: boolean;
  validEndpoint: boolean;
  buildableChannel: boolean;
};

export type ElibroOverviewKpis = {
  integrationStateLabel: string;
  uptimeWeeklyPct: number | null;
  avgLatency24hMs: number | null;
  validations7dTotal: number;
};

export type ElibroOverviewCharts = {
  latency24h: Array<{ hour: string; avgLatencyMs: number | null }>;
  validations7d: Array<{ day: string; ok: number; err: number }>;
  uptimeWeekly: { pct: number | null; statusLabel: string };
};

export type ElibroOverviewRecentActivity = {
  action: string;
  actorName: string | null;
  occurredAt: string | null;
  type: ElibroRecentActivityType;
};

export type ElibroOverviewInsight = {
  label: string;
  value: string;
  tone: string;
};

export type ElibroConfigResponse = {
  id: string;
  name: string;
  channelName: string;
  channelIdMasked: string | null;
  hasAuthToken: boolean;
  hasChannelSecret: boolean;
  hasChannelId: boolean;
  nextUrl: string | null;
  status: ElibroConfigStatus;
  validationStatus: ElibroValidationStatus;
  validationMessage: string | null;
  lastValidatedAt: string | null;
  createdByAdminId: string | null;
  createdByName: string | null;
  updatedByAdminId: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertElibroConfigRequest = {
  name?: string;
  authToken: string;
  channelId: string;
  channelSecret: string;
  channelName: string;
  nextUrl?: string;
  status?: 'ACTIVE' | 'INACTIVE';
};

export type PatchElibroConfigRequest = {
  name?: string;
  authToken?: string;
  channelId?: string;
  channelSecret?: string;
  channelName?: string;
  nextUrl?: string;
  status?: 'ACTIVE' | 'INACTIVE';
};

export type ElibroConfigOverviewResponse = {
  config: ElibroOverviewConfig;
  status: ElibroOverviewStatus;
  checklist: ElibroOverviewChecklist;
  kpis: ElibroOverviewKpis;
  charts: ElibroOverviewCharts;
  recentActivity: ElibroOverviewRecentActivity[];
  insights: ElibroOverviewInsight[];
};

export type ElibroConfigValidationResponse = {
  id: string;
  validationStatus: ElibroValidationStatus;
  validationMessage: string | null;
  latencyMs: number | null;
  errorCode: string | null;
  requestId: string | null;
  correlationId: string | null;
  lastValidatedAt: string | null;
};

export type ElibroControlledValidationRequest = {
  testUser: string;
  nextUrl?: string;
};

export type ElibroControlledValidationResponse = {
  id: string;
  testUser: string;
  nextUrl: string | null;
  redirectUrl: string | null;
  validationStatus: ElibroValidationStatus;
  validationMessage: string | null;
  latencyMs: number | null;
  errorCode: string | null;
  requestId: string | null;
  correlationId: string | null;
  lastValidatedAt: string | null;
};

export async function getElibroActiveOverview() {
  const response = await api.get<ApiEnvelope<ElibroConfigOverviewResponse>>('/elibro/config/active/overview');
  return response.data;
}

export async function getElibroActiveConfig() {
  const response = await api.get<ApiEnvelope<ElibroConfigResponse>>('/elibro/config/active');
  return response.data;
}

export async function getElibroConfigs() {
  const response = await api.get<ApiEnvelope<ElibroConfigResponse[]>>('/elibro/config');
  return response.data;
}

export async function createElibroConfig(payload: UpsertElibroConfigRequest) {
  const response = await api.post<ApiEnvelope<ElibroConfigResponse>>('/elibro/config', payload);
  return response.data;
}

export async function updateElibroConfig(configId: string, payload: PatchElibroConfigRequest) {
  const response = await api.patch<ApiEnvelope<ElibroConfigResponse>>(`/elibro/config/${configId}`, payload);
  return response.data;
}

export async function validateElibroConfig(configId: string) {
  const response = await api.post<ApiEnvelope<ElibroConfigValidationResponse>>(`/elibro/config/${configId}/validate`);
  return response.data;
}

export async function validateElibroConfigControlled(configId: string, payload: ElibroControlledValidationRequest) {
  const response = await api.post<ApiEnvelope<ElibroControlledValidationResponse>>(`/elibro/config/${configId}/validate-controlled`, payload);
  return response.data;
}

export async function deleteElibroConfig(configId: string) {
  const response = await api.delete<ApiEnvelope<null>>(`/elibro/config/${configId}`);
  return response.message;
}
