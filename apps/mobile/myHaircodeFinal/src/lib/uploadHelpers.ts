import { api } from "./apiClient";

export async function uploadToStorage(
  uri: string,
  bucket: string,
  fileName?: string,
  contentType = "image/png"
): Promise<string | null> {
  try {
    const ext = contentType.includes("jpeg") ? "jpg" : "png";
    const formData = new FormData();
    formData.append("file", {
      uri,
      type: contentType,
      name: fileName ?? `${Date.now()}.${ext}`,
    } as unknown as Blob);
    formData.append("bucket", bucket);

    const result = await api.upload<{ path: string }>("/api/storage/upload", formData);
    return result?.path ?? null;
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
}
