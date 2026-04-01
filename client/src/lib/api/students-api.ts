import { api } from '@//lib/api/api-client';
import type { ApiEnvelope, StudentSex, StudentStatus } from '@//types/api';

type PageEnvelope<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type StudentBackendStatus = Extract<StudentStatus, 'ACTIVE' | 'INACTIVE'>;
export type StudentBackendSex = Extract<
  StudentSex,
  'FEMALE' | 'MALE' | 'NON_BINARY' | 'NOT_SPECIFIED'
>;

export type StudentListParams = {
  query?: string;
  career?: string;
  status?: StudentBackendStatus;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

export type StudentResponseDto = {
  id: string;
  enrollmentNumber: string;
  name: string;
  lastNamePaternal: string;
  lastNameMaternal: string | null;
  sex: StudentBackendSex;
  quarter: number;
  institutionalEmail: string;
  career: string;
  status: StudentBackendStatus;
  lastLoginAt: string | null;
  deactivatedAt: string | null;
  deactivationReason: string | null;
  reactivatedAt: string | null;
  reactivationReason: string | null;
  createdByAdminId: string | null;
  updatedByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateStudentInput = {
  enrollmentNumber: string;
  name: string;
  lastNamePaternal: string;
  lastNameMaternal?: string | null;
  sex: StudentBackendSex;
  quarter: number;
  institutionalEmail: string;
  career: string;
};

export type UpdateStudentInput = CreateStudentInput;

export type StudentStatusChangeInput = {
  reason: string;
};

export type StudentImportResultResponse = {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
};

function buildStudentListQuery(params: StudentListParams) {
  const searchParams = new URLSearchParams();

  if (params.query) searchParams.set('q', params.query);
  if (params.career) searchParams.set('career', params.career);
  if (params.status) searchParams.set('status', params.status);
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.size !== undefined) searchParams.set('size', String(params.size));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDir) searchParams.set('sortDir', params.sortDir);

  return searchParams.toString();
}

export async function listStudents(params: StudentListParams = {}) {
  const query = buildStudentListQuery(params);
  const response = await api.get<ApiEnvelope<PageEnvelope<StudentResponseDto>>>(
    `/students${query ? `?${query}` : ''}`,
  );
  return response.data;
}

export async function createStudent(input: CreateStudentInput) {
  const response = await api.post<ApiEnvelope<StudentResponseDto>>('/students', input);
  return response.data;
}

export async function updateStudent(studentId: string, input: UpdateStudentInput) {
  const response = await api.put<ApiEnvelope<StudentResponseDto>>(
    `/students/${studentId}`,
    input,
  );
  return response.data;
}

export async function getStudentById(studentId: string) {
  const response = await api.get<ApiEnvelope<StudentResponseDto>>(`/students/${studentId}`);
  return response.data;
}

export async function deactivateStudent(studentId: string, input: StudentStatusChangeInput) {
  const response = await api.patch<ApiEnvelope<StudentResponseDto>>(
    `/students/${studentId}/deactivate`,
    input,
  );
  return response.data;
}

export async function reactivateStudent(studentId: string, input: StudentStatusChangeInput) {
  const response = await api.patch<ApiEnvelope<StudentResponseDto>>(
    `/students/${studentId}/reactivate`,
    input,
  );
  return response.data;
}

export async function deleteStudent(studentId: string) {
  await api.delete<ApiEnvelope<null>>(`/students/${studentId}`);
}

export async function importStudentsCsv(file: File) {
  const form = new FormData();
  form.append('file', file);
  const response = await api.post<ApiEnvelope<StudentImportResultResponse>>(
    '/students/import',
    form,
    { headers: {} },
  );
  return response.data;
}
