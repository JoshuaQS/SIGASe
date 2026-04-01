import { api } from '@//lib/api/api-client';
import type { AdminRole } from '@//auth/auth-user';

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  status: number;
};

type AdminLoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  role: AdminRole;
};

type AdminMeResponse = {
  id: string;
  email: string;
  name: string;
  lastNamePaternal: string;
  lastNameMaternal: string | null;
  role: AdminRole;
};

type StudentLoginResponse = {
  token: string;
  mustChangePassword: boolean;
};

type StudentMeResponse = {
  id: string;
  enrollmentNumber: string;
  name: string;
  lastNamePaternal: string;
  lastNameMaternal: string | null;
  institutionalEmail: string;
};

export async function loginAdmin(email: string, password: string) {
  const response = await api.post<ApiEnvelope<AdminLoginResponse>>('/auth/admin/login', {
    email,
    password,
  });
  return response.data;
}

export async function getAdminMe() {
  const response = await api.get<ApiEnvelope<AdminMeResponse>>('/auth/admin/me');
  return response.data;
}

export async function logoutAdmin() {
  await api.post('/auth/admin/logout');
}

export async function requestAdminPasswordReset(email: string) {
  await api.post<ApiEnvelope<null>>('/auth/admin/reset-password/request', { email });
}

export async function confirmAdminPasswordReset(token: string, newPassword: string) {
  await api.post<ApiEnvelope<null>>('/auth/admin/reset-password/confirm', { token, newPassword });
}

export async function loginStudent(email: string, password: string) {
  const response = await api.post<ApiEnvelope<StudentLoginResponse>>('/auth/student/login', {
    email,
    password,
  });
  return response.data;
}

export async function loginStudentWithGoogle(idToken: string) {
  const response = await api.post<ApiEnvelope<StudentLoginResponse>>('/auth/student/google', {
    idToken,
  });
  return response.data;
}

export async function getStudentMe() {
  const response = await api.get<ApiEnvelope<StudentMeResponse>>('/auth/student/me');
  return response.data;
}

export async function changeStudentPassword(currentPassword: string, newPassword: string) {
  await api.post<null>('/auth/student/change-password', { currentPassword, newPassword });
}

export async function logoutStudent() {
  await api.post<null>('/auth/student/logout');
}

export async function requestStudentPasswordReset(email: string) {
  await api.post<null>('/auth/student/reset-password/request', { email });
}

export async function confirmStudentPasswordReset(token: string, newPassword: string) {
  await api.post<null>('/auth/student/reset-password/confirm', { token, newPassword });
}
