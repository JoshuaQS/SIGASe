import { api } from '@//lib/api/api-client';
import type { ApiEnvelope } from '@//types/api';

type PageEnvelope<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AdminBackendRole = 'ADMIN_TI' | 'ADMIN_BIBLIOTECA';

export type AdminListParams = {
  query?: string;
  role?: AdminBackendRole;
  active?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

export type AdminResponseDto = {
  id: string;
  email: string;
  name: string;
  lastNamePaternal: string;
  lastNameMaternal: string | null;
  role: AdminBackendRole;
  active: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateAdminInput = {
  email: string;
  name: string;
  lastNamePaternal: string;
  lastNameMaternal?: string | null;
  password: string;
  role: AdminBackendRole;
  active: boolean;
};

export type UpdateAdminInput = {
  email: string;
  name: string;
  lastNamePaternal: string;
  lastNameMaternal?: string | null;
  role: AdminBackendRole;
};

export type AdminStatusChangeInput = {
  reason: string;
};

export type ResetAdminPasswordInput = {
  newPassword: string;
};

function buildAdminListQuery(params: AdminListParams) {
  const searchParams = new URLSearchParams();

  if (params.query) searchParams.set('q', params.query);
  if (params.role) searchParams.set('role', params.role);
  if (params.active !== undefined) searchParams.set('active', String(params.active));
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.size !== undefined) searchParams.set('size', String(params.size));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDir) searchParams.set('sortDir', params.sortDir);

  return searchParams.toString();
}

export async function listAdmins(params: AdminListParams = {}) {
  const query = buildAdminListQuery(params);
  const response = await api.get<ApiEnvelope<PageEnvelope<AdminResponseDto>>>(
    `/admins${query ? `?${query}` : ''}`,
  );
  return response.data;
}

export async function createAdmin(input: CreateAdminInput) {
  const response = await api.post<ApiEnvelope<AdminResponseDto>>('/admins', input);
  return response.data;
}

export async function updateAdmin(adminId: string, input: UpdateAdminInput) {
  const response = await api.put<ApiEnvelope<AdminResponseDto>>(`/admins/${adminId}`, input);
  return response.data;
}

export async function getAdminById(adminId: string) {
  const response = await api.get<ApiEnvelope<AdminResponseDto>>(`/admins/${adminId}`);
  return response.data;
}

export async function activateAdmin(adminId: string, input: AdminStatusChangeInput) {
  const response = await api.patch<ApiEnvelope<AdminResponseDto>>(
    `/admins/${adminId}/activate`,
    input,
  );
  return response.data;
}

export async function deactivateAdmin(adminId: string, input: AdminStatusChangeInput) {
  const response = await api.patch<ApiEnvelope<AdminResponseDto>>(
    `/admins/${adminId}/deactivate`,
    input,
  );
  return response.data;
}

export async function resetAdminPassword(adminId: string, input: ResetAdminPasswordInput) {
  await api.post<ApiEnvelope<null>>(`/admins/${adminId}/reset-password`, input);
}
