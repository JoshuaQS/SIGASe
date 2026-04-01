import { api } from '@//lib/api/api-client';
import type {
  ApiEnvelope,
  ElibroConfigResponse,
  ElibroConfigValidationResponse,
} from '@//types/api';

export type UpsertElibroConfigInput = {
  authToken: string;
  channelId: string;
  channelSecret: string;
  channelName: string;
  authEndpoint: string;
  active: boolean;
};

export type PartialElibroConfigUpdateInput = Partial<UpsertElibroConfigInput>;

export type ElibroConfigStatusChangeInput = {
  reason: string;
};

export async function getActiveElibroConfig() {
  const response = await api.get<ApiEnvelope<ElibroConfigResponse>>('/elibro/config/active');
  return response.data;
}

export async function createElibroConfig(input: UpsertElibroConfigInput) {
  const response = await api.post<ApiEnvelope<ElibroConfigResponse>>('/elibro/config', input);
  return response.data;
}

export async function updateElibroConfig(configId: string, input: PartialElibroConfigUpdateInput) {
  const response = await api.put<ApiEnvelope<ElibroConfigResponse>>(`/elibro/config/${configId}`, input);
  return response.data;
}

export async function validateElibroConfig(configId: string) {
  const response = await api.post<ApiEnvelope<ElibroConfigValidationResponse>>(`/elibro/config/${configId}/validate`);
  return response.data;
}

export async function activateElibroConfig(configId: string, input: ElibroConfigStatusChangeInput) {
  const response = await api.patch<ApiEnvelope<ElibroConfigResponse>>(`/elibro/config/${configId}/activate`, input);
  return response.data;
}

export async function deactivateElibroConfig(configId: string, input: ElibroConfigStatusChangeInput) {
  const response = await api.patch<ApiEnvelope<ElibroConfigResponse>>(`/elibro/config/${configId}/deactivate`, input);
  return response.data;
}
