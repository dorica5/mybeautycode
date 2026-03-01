import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUPABASE_URL = process.env.SUPABASE_URL;

export const storageService = {
  async upload(
    bucket: string,
    path: string,
    file: Buffer,
    contentType?: string
  ): Promise<string> {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: contentType ?? "image/jpeg",
        upsert: true,
      });
    if (error) throw error;
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
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
