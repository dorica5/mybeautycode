import { api } from "@/src/lib/apiClient";

export type ProductEventInput = {
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown> | null;
};

export async function recordProductEvent(input: ProductEventInput): Promise<void> {
  try {
    await api.post("/api/analytics/events", input);
  } catch {
    /* non-blocking */
  }
}
