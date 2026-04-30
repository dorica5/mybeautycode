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

const HAIRCODE_MEDIA_BUCKET = "haircode_images";

export type VisitMediaRow = {
  mediaUrl?: string;
  media_url?: string;
  mediaType?: string;
  media_type?: string;
};

/**
 * Resolve visit/carousel media URLs: already-public HTTP links stay as-is;
 * storage paths are signed in one batch (fast vs N sequential /signed-url calls).
 */
export async function signVisitMedia(
  rows: VisitMediaRow[]
): Promise<{ uri: string; type: string }[]> {
  type Slot =
    | { kind: "direct"; uri: string; type: string }
    | { kind: "sign"; path: string; type: string };

  const slots: Slot[] = [];
  for (const row of rows) {
    const path = row.mediaUrl ?? row.media_url;
    const typ = (row.mediaType ?? row.media_type ?? "image").toLowerCase();
    if (!path) continue;
    if (/^https?:\/\//i.test(String(path).trim())) {
      slots.push({ kind: "direct", uri: String(path).trim(), type: typ });
    } else {
      slots.push({ kind: "sign", path: String(path), type: typ });
    }
  }

  const toSign = slots.filter(
    (s): s is Extract<Slot, { kind: "sign" }> => s.kind === "sign"
  );
  if (toSign.length === 0) {
    return slots
      .filter((s): s is Extract<Slot, { kind: "direct" }> => s.kind === "direct")
      .map((s) => ({ uri: s.uri, type: s.type }));
  }

  const signed = await fetchSignedStorageUrls(
    toSign.map((s) => ({ bucket: HAIRCODE_MEDIA_BUCKET, path: s.path }))
  );

  let si = 0;
  const out: { uri: string; type: string }[] = [];
  for (const s of slots) {
    if (s.kind === "direct") {
      out.push({ uri: s.uri, type: s.type });
    } else {
      const u = signed[si++];
      if (u) out.push({ uri: u, type: s.type });
    }
  }
  return out;
}
