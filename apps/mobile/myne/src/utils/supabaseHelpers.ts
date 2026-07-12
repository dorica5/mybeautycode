import Constants from "expo-constants";

/**
 * Get the Supabase URL from environment variables
 * @returns Supabase project URL
 */
export const getSupabaseUrl = (): string => {
  return Constants?.expoConfig?.extra?.SUPABASE_URL || "";
};

/**
 * Get Supabase Image Transform URL with optional width/height
 * This uses Supabase's image transformation API to resize images on-the-fly
 * If no dimensions are provided, returns direct storage URL (original size, no transformation)
 *
 * @param bucket - Supabase storage bucket name (e.g., "avatars", "haircode_images")
 * @param path - File path within the bucket
 * @param width - Optional width in pixels
 * @param height - Optional height in pixels. If omitted with width, maintains aspect ratio
 * @returns Full URL to the transformed or original image
 *
 * @example
 * // Get avatar at 250x250
 * getImageTransformUrl("avatars", "user_123.jpg", 250, 250)
 *
 * @example
 * // Get image at 800px width, maintaining aspect ratio
 * getImageTransformUrl("haircode_images", "haircode_456.jpg", 800)
 *
 * @example
 * // Get original image (no transformation)
 * getImageTransformUrl("haircode_images", "haircode_456.jpg")
 */
export const getImageTransformUrl = (
  bucket: string,
  path: string,
  width?: number,
  height?: number
): string => {
  const supabaseUrl = getSupabaseUrl();

  // If no dimensions provided, return direct storage URL (original, more efficient)
  if (!width && !height) {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  }

  // Otherwise, use transform API with dimensions
  const url = new URL(
    `/storage/v1/render/image/public/${bucket}/${path}`,
    supabaseUrl
  );
  if (width) url.searchParams.set("width", String(width));
  if (height) url.searchParams.set("height", String(height));
  return url.toString();
};

/**
 * Get direct Supabase storage object URL (no transformation)
 * Use this when you need the original file without resizing
 *
 * @param bucket - Supabase storage bucket name
 * @param path - File path within the bucket
 * @returns Full URL to the storage object
 */
export const getStorageUrl = (bucket: string, path: string): string => {
  const supabaseUrl = getSupabaseUrl();
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
};
