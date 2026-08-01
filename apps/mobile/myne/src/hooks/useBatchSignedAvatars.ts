import { useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
import {
  fetchSignedStorageUrls,
  normalizeStorageObjectPath,
  peekSignedStorageUrl,
} from "@/src/lib/storageSignedUrl";

export function avatarStorageKey(
  avatarUrl: string | null | undefined
): string | null {
  const raw = avatarUrl?.trim();
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  const path = normalizeStorageObjectPath("avatars", raw);
  return path ? `avatars:${path}` : null;
}

function signatureFromRows(
  rows: ReadonlyArray<{ avatar_url?: string | null }> | undefined
): string {
  if (!rows?.length) return "";
  const keys = new Set<string>();
  for (const row of rows) {
    const key = avatarStorageKey(row.avatar_url);
    if (key && !key.startsWith("http")) keys.add(key);
  }
  return [...keys].sort().join("|");
}

/** Batch-sign avatar storage paths for list rows (search, map, etc.). */
export function useBatchSignedAvatars(
  rows: ReadonlyArray<{ avatar_url?: string | null }> | undefined
): Record<string, string> {
  const rowAvatarKey =
    rows?.map((r) => r.avatar_url ?? "").join("\0") ?? "";
  const signature = useMemo(
    () => signatureFromRows(rows),
    [rows?.length ?? 0, rowAvatarKey]
  );

  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!signature) {
      setMap((prev) =>
        Object.keys(prev).length === 0 ? prev : {}
      );
      return;
    }

    let cancelled = false;
    const pending = signature.split("|").filter(Boolean).map((key) => ({
      bucket: "avatars" as const,
      path: key.slice("avatars:".length),
      key,
    }));

    if (pending.length === 0) return;

    void fetchSignedStorageUrls(
      pending.map(({ bucket, path }) => ({ bucket, path }))
    ).then((urls) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      pending.forEach((item, index) => {
        const url = urls[index];
        if (url) {
          next[item.key] = url;
          void Image.prefetch(url);
        }
      });
      setMap((prev) => {
        const same =
          Object.keys(next).length === Object.keys(prev).length &&
          Object.entries(next).every(([k, v]) => prev[k] === v);
        return same ? prev : next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [signature]);

  return map;
}

export function resolveSignedAvatarUrl(
  avatarUrl: string | null | undefined,
  signedMap: Record<string, string>
): string | null | undefined {
  if (!avatarUrl?.trim()) return avatarUrl;
  if (avatarUrl.startsWith("http")) return avatarUrl;
  const key = avatarStorageKey(avatarUrl);
  if (!key || key.startsWith("http")) return avatarUrl;
  return (
    signedMap[key] ??
    peekSignedStorageUrl("avatars", avatarUrl) ??
    avatarUrl
  );
}
