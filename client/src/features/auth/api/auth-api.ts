import { api } from '@/shared/lib/http/api-client';
import type { AdminRole } from '@/features/auth/types/auth-user';
import type { StudentSex, StudentStatus } from '@/shared/types/api';

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
  hasChangedTemporaryPassword: boolean;
  temporaryPasswordGeneratedAt: string | null;
  temporaryPasswordNotifiedAt: string | null;
  passwordChangedAt: string | null;
};

type StudentLoginResponse = {
  token: string;
  mustChangePassword: boolean;
};

type StudentMeResponse = {
  id: string;
  enrollmentId: string;
  name: string;
  lastNamePaternal: string;
  lastNameMaternal: string | null;
  sex: StudentSex;
  quarter: number;
  institutionalEmail: string;
  career: {
    id: string;
    code: string;
    name: string;
  } | null;
  status: StudentStatus;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
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

export async function changeAdminPassword(currentPassword: string, newPassword: string) {
  await api.post<ApiEnvelope<null>>('/auth/admin/change-password', {
    currentPassword,
    newPassword,
    confirmNewPassword: newPassword,
  });
}

export async function requestAdminPasswordReset(email: string) {
  await api.post<ApiEnvelope<null>>('/auth/admin/reset-password/request', { email });
}

export async function confirmAdminPasswordReset(token: string, newPassword: string) {
  await api.post<ApiEnvelope<null>>('/auth/admin/reset-password/confirm', {
    token,
    newPassword,
    confirmNewPassword: newPassword,
  });
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

export async function changeStudentPassword(newPassword: string, currentPassword?: string) {
  await api.post<null>('/auth/student/change-password', {
    currentPassword,
    newPassword,
    confirmNewPassword: newPassword,
  });
}

export async function logoutStudent() {
  await api.post<null>('/auth/student/logout');
}

export async function requestStudentPasswordReset(email: string) {
  await api.post<null>('/auth/student/reset-password/request', { email });
}

export async function confirmStudentPasswordReset(token: string, newPassword: string) {
  await api.post<null>('/auth/student/reset-password/confirm', {
    token,
    newPassword,
    confirmNewPassword: newPassword,
  });
}
