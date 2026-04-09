import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUPABASE_URL = process.env.SUPABASE_URL;

/** Buckets clients may request signed URLs for (private bucket safe-read via API). */
export const SIGNABLE_BUCKETS = new Set([
  "avatars",
  "inspirations",
  "public_profile_work",
  "haircode_images",
  "shared_inspiration_images",
]);

export function assertSignableBucket(bucket: string) {
  if (!SIGNABLE_BUCKETS.has(bucket)) {
    throw Object.assign(new Error("Bucket not allowed for signed URL."), {
      statusCode: 403,
    });
  }
}

export function sanitizeStoragePath(path: string): string | null {
  const p = path.trim();
  if (!p || p.length > 2048 || p.includes("..") || p.startsWith("/")) {
    return null;
  }
  return p;
}

export const storageService = {
  async upload(
    bucket: string,
    path: string,
    file: Buffer,
    contentType?: string
  ): Promise<{ path: string }> {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: contentType ?? "image/jpeg",
        upsert: true,
      });
    if (error) throw error;
    return { path };
  },

  /** Time-limited read URL for private buckets (use from authenticated API only). */
  async createSignedUrl(
    bucket: string,
    path: string,
    expiresInSeconds = 3600
  ): Promise<string> {
    assertSignableBucket(bucket);
    const safe = sanitizeStoragePath(path);
    if (!safe) {
      throw Object.assign(new Error("Invalid storage path."), {
        statusCode: 400,
      });
    }
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(safe, expiresInSeconds);
    if (error) throw error;
    if (!data?.signedUrl) {
      throw new Error("Signed URL not returned");
    }
    return data.signedUrl;
  },

  getTransformUrl(bucket: string, path: string, width?: number, height?: number): string {
    if (!SUPABASE_URL) return "";
    if (!width && !height) {
      return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
    }
    const url = new URL(
      `/storage/v1/render/image/public/${bucket}/${path}`,
      SUPABASE_URL
    );
    if (width) url.searchParams.set("width", String(width));
    if (height) url.searchParams.set("height", String(height));
    return url.toString();
  },
};
