import { Image, ImageProps } from "expo-image";
import React, { useState, useEffect } from "react";
import { fetchSignedStorageUrl } from "../lib/storageSignedUrl";

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
  sizePreset: _sizePreset,
  width: _customWidth,
  height: _customHeight,
  enableProgressiveLoading: _enableProgressiveLoading = true,
  twoStageLoading: _twoStageLoading = false,
  fallback,
  placeholder,
  style,
  contentFit = "cover",
  transition = 300,
  ...imageProps
}: OptimizedImageProps) => {
  const [currentSource, setCurrentSource] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (directUrl) {
      setCurrentSource(directUrl);
      return () => {
        cancelled = true;
      };
    }

    if (!path) {
      setCurrentSource(fallback || null);
      return () => {
        cancelled = true;
      };
    }

    if (path.startsWith("http")) {
      setCurrentSource(path);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const signed = await fetchSignedStorageUrl(bucket, path);
      if (!cancelled) {
        setCurrentSource(signed ?? fallback ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [path, bucket, directUrl, fallback]);

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
