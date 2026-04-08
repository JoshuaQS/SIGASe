import { api } from "@/shared/lib/http/api-client";
import type { ApiEnvelope } from "@/shared/types/api";

export type CareerDto = {
  id: string;
  code: string;
  name: string;
};

export async function listActiveCareers() {
  const response = await api.get<ApiEnvelope<CareerDto[]>>("/careers");
  return response.data;
}
