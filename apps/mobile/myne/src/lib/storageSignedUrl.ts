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

type CacheEntry = { url: string; expiresAt: number };
const signedUrlCache = new Map<string, CacheEntry>();
const inFlightSigned = new Map<string, Promise<string | null>>();
/** Reuse signed URLs across list rows; refresh before typical 1h expiry. */
const SIGNED_URL_CACHE_MS = 50 * 60 * 1000;

function cacheKey(bucket: string, path: string): string {
  return `${bucket}:${path}`;
}

function readCachedSignedUrl(key: string): string | null {
  const hit = signedUrlCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    signedUrlCache.delete(key);
    return null;
  }
  return hit.url;
}

function writeCachedSignedUrl(key: string, url: string): void {
  signedUrlCache.set(key, {
    url,
    expiresAt: Date.now() + SIGNED_URL_CACHE_MS,
  });
}

export async function fetchSignedStorageUrl(
  bucket: string,
  path: string
): Promise<string | null> {
  const safe = normalizeStorageObjectPath(bucket, path);
  if (!safe) return null;
  const key = cacheKey(bucket, safe);
  const cached = readCachedSignedUrl(key);
  if (cached) return cached;

  const pending = inFlightSigned.get(key);
  if (pending) return pending;

  const run = (async () => {
    try {
      const q = new URLSearchParams({
        bucket,
        path: safe,
      });
      const data = await api.get<{ signedUrl?: string }>(
        `/api/storage/signed-url?${q.toString()}`
      );
      const url = data?.signedUrl ?? null;
      if (url) writeCachedSignedUrl(key, url);
      return url;
    } catch (e) {
      console.warn("fetchSignedStorageUrl:", bucket, e);
      return null;
    } finally {
      inFlightSigned.delete(key);
    }
  })();

  inFlightSigned.set(key, run);
  return run;
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

  const out: (string | null)[] = new Array(normalized.length).fill(null);
  const toFetch: { index: number; bucket: string; path: string }[] = [];

  normalized.forEach((item, index) => {
    if (!item.path) {
      out[index] = null;
      return;
    }
    const key = cacheKey(item.bucket, item.path);
    const cached = readCachedSignedUrl(key);
    if (cached) {
      out[index] = cached;
      return;
    }
    toFetch.push({ index, bucket: item.bucket, path: item.path });
  });

  for (let i = 0; i < toFetch.length; i += SIGN_BATCH_SIZE) {
    const chunk = toFetch.slice(i, i + SIGN_BATCH_SIZE);
    try {
      const data = await api.post<{ urls?: (string | null)[] }>(
        "/api/storage/sign-batch",
        {
          items: chunk.map((c) => ({ bucket: c.bucket, path: c.path })),
        }
      );
      const urls = data?.urls ?? chunk.map(() => null);
      chunk.forEach((c, j) => {
        const url = urls[j] ?? null;
        out[c.index] = url;
        if (url) writeCachedSignedUrl(cacheKey(c.bucket, c.path), url);
      });
    } catch (e) {
      console.warn("fetchSignedStorageUrls:", e);
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
