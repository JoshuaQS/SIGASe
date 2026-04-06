import { api } from '@//lib/api/api-client';
import { authSession } from '@//auth/auth-session-store';
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
  'FEMALE' | 'MALE' | 'NON_BINARY'
>;

export type StudentListParams = {
  query?: string;
  careerCode?: string;
  status?: StudentBackendStatus;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

export type StudentResponseDto = {
  id: string;
  enrollmentId: string;
  name: string;
  lastNamePaternal: string;
  lastNameMaternal: string | null;
  sex: StudentBackendSex;
  quarter: number;
  institutionalEmail: string;
  career: {
    id: string;
    code: string;
    name: string;
  } | null;
  status: StudentBackendStatus;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdByAdminId: string | null;
  updatedByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateStudentInput = {
  enrollmentId: string;
  name: string;
  lastNamePaternal: string;
  lastNameMaternal?: string | null;
  sex: StudentBackendSex;
  quarter: number;
  institutionalEmail: string;
  careerId?: string;
  careerCode?: string;
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

export type StudentExportFormat = 'csv' | 'xlsx';

export type StudentExportParams = {
  query?: string;
  careerCode?: string;
  status?: StudentBackendStatus;
  format?: StudentExportFormat;
};

export type StudentExportResult = {
  blob: Blob;
  filename: string;
};

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const BASE_URL = viteEnv?.VITE_API_URL || 'http://localhost:8080/api/v1';

function buildStudentListQuery(params: StudentListParams) {
  const searchParams = new URLSearchParams();

  if (params.query) searchParams.set('q', params.query);
  if (params.careerCode) searchParams.set('careerCode', params.careerCode);
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

export async function exportStudentsReport(params: StudentExportParams = {}): Promise<StudentExportResult> {
  const token = authSession.getSnapshot().user?.token;
  const query = new URLSearchParams();
  const format = params.format ?? 'csv';

  if (params.query) query.set('q', params.query);
  if (params.careerCode) query.set('careerCode', params.careerCode);
  if (params.status) query.set('status', params.status);
  query.set('format', format);

  const response = await fetch(`${BASE_URL}/reports/students/export?${query.toString()}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    let message = 'No se pudo exportar el reporte de estudiantes.';
    try {
      const errorPayload = await response.json() as { message?: string };
      if (errorPayload.message) {
        message = errorPayload.message;
      }
    } catch {
      const fallback = await response.text();
      if (fallback) {
        message = fallback;
      }
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const filename = extractFilenameFromContentDisposition(
    response.headers.get('Content-Disposition'),
    `students-export.${format}`,
  );

  return { blob, filename };
}
