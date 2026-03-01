import { Image, ImageProps } from "expo-image";
import React, { useState, useEffect } from "react";
import { getImageTransformUrl } from "../utils/supabaseHelpers";

// Image size presets for common use cases
export type ImageSizePreset =
  | "thumbnail"      // 100x100 - tiny blur placeholder
  | "avatar-small"   // 75x75 - avatars in lists
  | "avatar-medium"  // 250x250 - avatars in profiles
  | "inspiration-grid" // 300x300 - inspiration thumbnails (cropped)
  | "carousel"       // 800px width - haircode carousel (maintain ratio)
  | "fullscreen"     // 1200px width - fullscreen view (maintain ratio)
  | "fullscreen-hq"  // 1600px width - high quality fullscreen (maintain ratio)
  | "preview"        // 1600px width - quick preview before original
  | "original";      // Original full resolution - no resizing

// Thumbnail width for progressive loading (maintains aspect ratio)
const PROGRESSIVE_THUMBNAIL_WIDTH = 400;

// Map presets to actual dimensions
const SIZE_MAP: Record<ImageSizePreset, { width?: number; height?: number }> = {
  "thumbnail": { width: 100, height: 100 },
  "avatar-small": { width: 75, height: 75 },
  "avatar-medium": { width: 250, height: 250 },
  "inspiration-grid": { width: 300, height: 300 },
  "carousel": { width: 800 }, // No height = maintain aspect ratio
  "fullscreen": { width: 1200 }, // No height = maintain aspect ratio
  "fullscreen-hq": { width: 1600 }, // High quality fullscreen
  "preview": { width: 1600 }, // Quick preview size
  "original": {}, // No dimensions = original size
};

type OptimizedImageProps = {
  // Image source options
  path?: string | null;           // Path in Supabase storage
  bucket?: string;                // Supabase bucket name (default: "inspirations")
  directUrl?: string | null;      // Direct URL (bypasses Supabase transform)

  // Size options
  sizePreset?: ImageSizePreset;   // Use predefined size
  width?: number;                 // Custom width
  height?: number;                // Custom height

  // Progressive loading
  enableProgressiveLoading?: boolean; // Load thumbnail first (default: true)
  twoStageLoading?: boolean;          // Load preview → original (for detail views)

  // Fallback
  fallback?: string;              // Fallback image URL
  placeholder?: string;           // Blurhash placeholder
} & Omit<ImageProps, "source" | "placeholder">;

/**
 * OptimizedImage Component
 *
 * Replacement for RemoteImage with:
 * - Progressive loading (thumbnail → full size)
 * - Dimension-optimized images via Supabase Transform API
 * - expo-image with built-in caching
 * - Blurhash placeholder support
 *
 * Usage:
 * ```tsx
 * // With size preset
 * <OptimizedImage
 *   path="user_avatar.jpg"
 *   bucket="avatars"
 *   sizePreset="avatar-medium"
 * />
 *
 * // With custom dimensions
 * <OptimizedImage
 *   path="haircode_123.jpg"
 *   bucket="haircode_images"
 *   width={800}
 * />
 *
 * // With direct URL (legacy support)
 * <OptimizedImage directUrl="https://..." />
 * ```
 */
const OptimizedImage = ({
  path,
  bucket = "inspirations",
  directUrl,
  sizePreset,
  width: customWidth,
  height: customHeight,
  enableProgressiveLoading = true,
  twoStageLoading = false,
  fallback,
  placeholder,
  style,
  contentFit = "cover",
  transition = 300,
  ...imageProps
}: OptimizedImageProps) => {
  const [currentSource, setCurrentSource] = useState<string | null>(null);
  const [isLoadingHigh, setIsLoadingHigh] = useState(false);

  useEffect(() => {
    // Handle direct URL (legacy support)
    if (directUrl) {
      setCurrentSource(directUrl);
      return;
    }

    // Path is required if no direct URL
    if (!path) {
      setCurrentSource(fallback || null);
      return;
    }

    // Handle absolute URLs passed as path
    if (path.startsWith("http")) {
      setCurrentSource(path);
      return;
    }

    // Determine dimensions from preset or custom values
    let targetWidth = customWidth;
    let targetHeight = customHeight;

    if (sizePreset && !customWidth && !customHeight) {
      const preset = SIZE_MAP[sizePreset];
      targetWidth = preset.width;
      targetHeight = preset.height;
    }

    // Two-stage loading: preview (1600px) → original (full res)
    if (twoStageLoading) {
      // Step 1: Load preview size (1600px) for fast initial display
      const previewUrl = getImageTransformUrl(bucket, path, 1600);
      setCurrentSource(previewUrl);
      setIsLoadingHigh(true);

      // Step 2: Upgrade to original full resolution after delay
      const timer = setTimeout(() => {
        const originalUrl = getImageTransformUrl(bucket, path);
        setCurrentSource(originalUrl);
        setIsLoadingHigh(false);
      }, 800); // Longer delay for two-stage

      return () => clearTimeout(timer);
    }
    // Progressive loading: thumbnail → optimized size
    else if (enableProgressiveLoading && (targetWidth || targetHeight)) {
      // Step 1: Load thumbnail (width only to preserve aspect ratio)
      const thumbnailUrl = getImageTransformUrl(bucket, path, PROGRESSIVE_THUMBNAIL_WIDTH);
      setCurrentSource(thumbnailUrl);
      setIsLoadingHigh(true);

      // Step 2: Load optimized size after short delay
      const timer = setTimeout(() => {
        const optimizedUrl = getImageTransformUrl(
          bucket,
          path,
          targetWidth,
          targetHeight
        );
        setCurrentSource(optimizedUrl);
        setIsLoadingHigh(false);
      }, 150);

      return () => clearTimeout(timer);
    } else {
      // No progressive loading - load directly
      const imageUrl = getImageTransformUrl(
        bucket,
        path,
        targetWidth,
        targetHeight
      );
      setCurrentSource(imageUrl);
    }
  }, [
    path,
    bucket,
    directUrl,
    sizePreset,
    customWidth,
    customHeight,
    enableProgressiveLoading,
    twoStageLoading,
    fallback,
  ]);

  if (!currentSource && !fallback && !placeholder) {
    return null;
  }

  return (
    <Image
      source={{ uri: currentSource || fallback }}
      placeholder={placeholder}
      style={style}
      contentFit={contentFit}
      transition={transition}
      cachePolicy="memory-disk" // Enable disk caching
      {...imageProps}
    />
  );
};

export default OptimizedImage;
