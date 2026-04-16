import { api } from '@/shared/lib/http/api-client';
import type { ApiEnvelope } from '@/shared/types/api';

type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type NotificationType = 'AUDIT' | 'ACCESS';
export type NotificationSeverity = 'INFO' | 'NOTICE' | 'WARNING' | 'SECURITY' | 'CRITICAL';
export type NotificationReferenceType = 'AUDIT_LOG' | 'ACCESS_LOG';

export type NotificationResponseDto = {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  severity: NotificationSeverity;
  read: boolean;
  dismissed: boolean;
  createdAt: string;
  referenceType: NotificationReferenceType;
  referenceId: string;
};

export type NotificationPreferenceResponseDto = {
  notifyCritical: boolean;
  notifySecurity: boolean;
  notifyAccessFailures: boolean;
  notifyStudentChanges: boolean;
  notifyConfigChanges: boolean;
  notifyAdminChanges: boolean;
};

export type UpdateNotificationPreferenceInput = NotificationPreferenceResponseDto;

export type UnreadCountResponseDto = {
  unreadCount: number;
};

export type NotificationPageParams = {
  page?: number;
  size?: number;
};

export type NotificationPageResponseDto = PageResponse<NotificationResponseDto>;

function buildQuery(params: NotificationPageParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.size !== undefined) searchParams.set('size', String(params.size));

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function listNotifications(params: NotificationPageParams = {}) {
  const response = await api.get<ApiEnvelope<NotificationPageResponseDto>>(
    `/notifications${buildQuery(params)}`,
  );

  return response.data;
}

export async function getUnreadNotificationCount() {
  const response = await api.get<ApiEnvelope<UnreadCountResponseDto>>('/notifications/unread-count');
  return response.data;
}

export async function markNotificationAsRead(notificationId: number) {
  await api.patch<ApiEnvelope<null>>(`/notifications/${notificationId}/read`);
}

export async function markAllNotificationsAsRead() {
  await api.patch<ApiEnvelope<null>>('/notifications/read-all');
}

export async function dismissNotification(notificationId: number) {
  await api.delete<ApiEnvelope<null>>(`/notifications/${notificationId}`);
}

export async function dismissAllNotifications() {
  await api.delete<ApiEnvelope<null>>('/notifications');
}

export async function getNotificationPreferences() {
  const response = await api.get<ApiEnvelope<NotificationPreferenceResponseDto>>(
    '/notifications/preferences',
  );

  return response.data;
}

export async function updateNotificationPreferences(input: UpdateNotificationPreferenceInput) {
  const response = await api.put<ApiEnvelope<NotificationPreferenceResponseDto>>(
    '/notifications/preferences',
    input,
  );

  return response.data;
}
