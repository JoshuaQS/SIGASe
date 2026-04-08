import { api } from '@/shared/lib/http/api-client';
import type { StudentStatus } from '@/shared/types/api';

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  status: number;
};

export type StudentPortalSummaryResponse = {
  personalInfo: {
    name: string;
    enrollmentId: string;
    career: string | null;
    status: StudentStatus;
  };
  accountStatus: {
    status: StudentStatus;
    message: string | null;
  };
  accessMetrics: {
    accesosUltimos7Dias: number;
    intentosFallidos7Dias: number;
    ultimaFechaAcceso: string | null;
    rachaDiasConAcceso: number;
  };
  cta: {
    enabled: boolean;
    reason: string | null;
  };
};

type StudentElibroAccessResponse = {
  redirectUrl: string;
};

export async function getStudentPortalSummary() {
  const response = await api.get<ApiEnvelope<StudentPortalSummaryResponse>>('/student/portal/summary');
  return response.data;
}

export async function requestStudentElibroAccess(next?: string) {
  const payload = next ? { next } : undefined;
  const response = await api.post<ApiEnvelope<StudentElibroAccessResponse>>('/student/portal/elibro-access', payload);
  return response.data;
}
