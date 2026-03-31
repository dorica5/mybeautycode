import { api } from "@/src/lib/apiClient";

/** Strip legacy public URL to object path, or return path if already relative. */
export function normalizeStorageObjectPath(
  bucket: string,
  urlOrPath: string | null | undefined
): string | null {
  if (urlOrPath == null || urlOrPath === "") return null;
  const s = String(urlOrPath).trim();
  if (!s) return null;
  if (s.startsWith("http")) {
    const pub = `/object/public/${bucket}/`;
    const sign = `/object/sign/${bucket}/`;
    let i = s.indexOf(pub);
    if (i >= 0) {
      return decodeURIComponent(s.slice(i + pub.length).split("?")[0] ?? "") || null;
    }
    i = s.indexOf(sign);
    if (i >= 0) {
      return decodeURIComponent(s.slice(i + sign.length).split("?")[0] ?? "") || null;
    }
    return null;
  }
  return s;
}

export async function fetchSignedStorageUrl(
  bucket: string,
  path: string
): Promise<string | null> {
  const safe = normalizeStorageObjectPath(bucket, path);
  if (!safe) return null;
  try {
    const q = new URLSearchParams({
      bucket,
      path: safe,
    });
    const data = await api.get<{ signedUrl?: string }>(
      `/api/storage/signed-url?${q.toString()}`
    );
    return data?.signedUrl ?? null;
  } catch (e) {
    console.warn("fetchSignedStorageUrl:", bucket, e);
    return null;
  }
}

/** Max items per request — must stay within backend /sign-batch limit. */
const SIGN_BATCH_SIZE = 60;

export async function fetchSignedStorageUrls(
  items: { bucket: string; path: string }[]
): Promise<(string | null)[]> {
  if (items.length === 0) return [];
  const normalized = items.map(({ bucket, path }) => ({
    bucket,
    path: normalizeStorageObjectPath(bucket, path) ?? "",
  }));
  const out: (string | null)[] = [];
  for (let i = 0; i < normalized.length; i += SIGN_BATCH_SIZE) {
    const chunk = normalized.slice(i, i + SIGN_BATCH_SIZE);
    try {
      const data = await api.post<{ urls?: (string | null)[] }>(
        "/api/storage/sign-batch",
        { items: chunk }
      );
      const urls = data?.urls ?? chunk.map(() => null);
      out.push(...urls);
    } catch (e) {
      console.warn("fetchSignedStorageUrls:", e);
      out.push(...chunk.map(() => null));
    }
  }
  return out;
}
