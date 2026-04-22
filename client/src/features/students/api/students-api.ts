import { api } from '@/shared/lib/http/api-client';
import type { ApiEnvelope, StudentSex, StudentStatus } from '@/shared/types/api';

type PageEnvelope<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type StudentBackendStatus = StudentStatus;
export type StudentBackendSex = StudentSex;

export type StudentListParams = {
  query?: string;
  enrollmentId?: string;
  lastNamePaternal?: string;
  lastNameMaternal?: string;
  institutionalEmail?: string;
  careerCode?: string;
  sex?: StudentBackendSex;
  quarter?: number;
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
  totalAccesses: number;
  successfulAccesses: number;
  failedAccesses: number;
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
  careerId: string;
};

export type UpdateStudentInput = CreateStudentInput;

export type StudentStatusChangeInput = {
  reason: string;
};

export type StudentImportResultResponse = {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    enrollmentId: string;
    errorCode: string;
    detail: string;
  }>;
  emailJobs: Array<{
    id: string;
    jobType: 'ADMIN_TEMPORARY_PASSWORD' | 'ADMIN_PASSWORD_RESET' | 'STUDENT_ONBOARDING_PASSWORD' | 'STUDENT_PASSWORD_RESET';
    status: 'PENDING' | 'SENT' | 'FAILED' | 'PERMANENT_FAILURE';
    recipientEmail: string;
    referenceType: string;
    referenceId: string;
    attempts: number;
    maxAttempts: number;
    nextAttemptAt: string | null;
    sentAt: string | null;
    permanentlyFailedAt: string | null;
    createdAt: string;
  }>;
};

export type StudentExportFormat = 'csv' | 'xlsx';

export type StudentExportParams = {
  query?: string;
  enrollmentId?: string;
  lastNamePaternal?: string;
  lastNameMaternal?: string;
  institutionalEmail?: string;
  careerCode?: string;
  sex?: StudentBackendSex;
  quarter?: number;
  status?: StudentBackendStatus;
  format?: StudentExportFormat;
};

export type StudentExportResult = {
  blob: Blob;
  filename: string;
};

export type StudentImportTemplateResult = {
  blob: Blob;
  filename: string;
};

export type StudentMetricsPointDto = {
  date: string;
  total: number;
};

export type StudentCareerDistributionPointDto = {
  careerCode: string;
  total: number;
};

export type StudentMetricsResponseDto = {
  totalStudents: number;
  activeStudents: number;
  disabledStudents: number;
  totalAccesses: number;
  successfulAccesses: number;
  failedAccesses: number;
  successRate: number;
  activityByDate: StudentMetricsPointDto[];
  careerDistribution: StudentCareerDistributionPointDto[];
};

function buildStudentListQuery(params: StudentListParams) {
  const searchParams = new URLSearchParams();

  if (params.query) searchParams.set('q', params.query);
  if (params.enrollmentId) searchParams.set('enrollmentId', params.enrollmentId);
  if (params.lastNamePaternal) searchParams.set('lastNamePaternal', params.lastNamePaternal);
  if (params.lastNameMaternal) searchParams.set('lastNameMaternal', params.lastNameMaternal);
  if (params.institutionalEmail) searchParams.set('institutionalEmail', params.institutionalEmail);
  if (params.careerCode) searchParams.set('careerCode', params.careerCode);
  if (params.sex) searchParams.set('sex', params.sex);
  if (params.quarter !== undefined) searchParams.set('quarter', String(params.quarter));
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

export async function getStudentMetrics(params: { dateFrom?: string; dateTo?: string } = {}) {
  const query = new URLSearchParams();
  if (params.dateFrom?.trim()) query.set('dateFrom', params.dateFrom.trim());
  if (params.dateTo?.trim()) query.set('dateTo', params.dateTo.trim());

  const response = await api.get<ApiEnvelope<StudentMetricsResponseDto>>(
    `/students/metrics${query.toString() ? `?${query.toString()}` : ''}`,
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

export async function resendStudentOnboardingEmail(studentId: string) {
  const response = await api.post<ApiEnvelope<StudentResponseDto>>(
    `/students/${studentId}/resend-onboarding`,
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
  const query = new URLSearchParams();
  const format = params.format ?? 'csv';

  if (params.query) query.set('q', params.query);
  if (params.enrollmentId) query.set('enrollmentId', params.enrollmentId);
  if (params.lastNamePaternal) query.set('lastNamePaternal', params.lastNamePaternal);
  if (params.lastNameMaternal) query.set('lastNameMaternal', params.lastNameMaternal);
  if (params.institutionalEmail) query.set('institutionalEmail', params.institutionalEmail);
  if (params.careerCode) query.set('careerCode', params.careerCode);
  if (params.sex) query.set('sex', params.sex);
  if (params.quarter !== undefined) query.set('quarter', String(params.quarter));
  if (params.status) query.set('status', params.status);
  query.set('format', format);

  const { blob, headers } = await api.download(`/reports/students/export?${query.toString()}`);
  const filename = extractFilenameFromContentDisposition(
    headers.get('Content-Disposition'),
    `students-export.${format}`,
  );

  return { blob, filename };
}

export async function downloadStudentsImportTemplate(
  format: StudentExportFormat = 'xlsx',
): Promise<StudentImportTemplateResult> {
  const { blob, headers } = await api.download(`/students/import-template?format=${format}`);
  const filename = extractFilenameFromContentDisposition(
    headers.get('Content-Disposition'),
    format === 'xlsx'
      ? 'plantilla-importacion-estudiantes.xlsx'
      : 'plantilla-importacion-estudiantes.csv',
  );

  return { blob, filename };
}
