import { api } from "@/src/lib/apiClient";

export async function sendSupportRequest(data: {
  subject?: string;
  message: string;
  status?: string;
  priority?: string;
}) {
  return api.post("/api/support", data);
}
