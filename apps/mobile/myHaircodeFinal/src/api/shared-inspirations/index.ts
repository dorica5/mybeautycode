import { api } from "@/src/lib/apiClient";

export async function fetchSharedInspirationsByBatch(batchId: string): Promise<string[]> {
  const res = await api.get<string[]>(
    `/api/shared-inspirations?batch_id=${encodeURIComponent(batchId)}`
  );
  return Array.isArray(res) ? res : [];
}

export async function acceptSharedInspirations(
  batchId: string,
  imageUrls: string[]
): Promise<{ success: boolean; accepted: number }> {
  return api.post("/api/shared-inspirations/accept", {
    batch_id: batchId,
    image_urls: imageUrls,
  });
}

export async function acceptSharedInspiration(
  batchId: string,
  imageUrl: string
): Promise<{ success: boolean; accepted: number }> {
  return api.post("/api/shared-inspirations/accept", {
    batch_id: batchId,
    image_url: imageUrl,
  });
}

export async function rejectSharedInspiration(
  imageUrl: string
): Promise<{ success: boolean }> {
  return api.delete("/api/shared-inspirations", { image_url: imageUrl });
}

export async function rejectSharedInspirations(
  imageUrls: string[]
): Promise<{ success: boolean }> {
  return api.delete("/api/shared-inspirations", { image_urls: imageUrls });
}
