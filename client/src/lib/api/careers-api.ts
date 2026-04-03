import { api } from "@//lib/api/api-client";
import type { ApiEnvelope } from "@//types/api";

export type CareerDto = {
  id: string;
  code: string;
  name: string;
};

export async function listActiveCareers() {
  const response = await api.get<ApiEnvelope<CareerDto[]>>("/careers");
  return response.data;
}
