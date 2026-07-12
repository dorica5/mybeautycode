import { Image, ImageProps } from "expo-image";
import React, { useState, useEffect, useMemo } from "react";
import { PixelRatio } from "react-native";
import { fetchSignedStorageUrl } from "../lib/storageSignedUrl";

export type ImageSizePreset =
  | "thumbnail"
  | "avatar-small"
  | "avatar-medium"
  | "inspiration-grid"
  | "carousel"
  | "fullscreen"
  | "fullscreen-hq"
  | "preview"
  | "original";

/** Logical pixel widths used as decode hints (× PixelRatio for sharpness / memory). */
const PRESET_DECODE_WIDTH: Record<Exclude<ImageSizePreset, "original">, number> = {
  thumbnail: 120,
  "avatar-small": 100,
  "avatar-medium": 280,
  "inspiration-grid": 720,
  carousel: 960,
  fullscreen: 1200,
  "fullscreen-hq": 1600,
  preview: 1200,
};

type OptimizedImageProps = {
  path?: string | null;
  bucket?: string;
  directUrl?: string | null;

  sizePreset?: ImageSizePreset;
  width?: number;
  height?: number;

  /**
   * Shown via expo-image `placeholder` while the main `source` loads/decodes
   * (e.g. thumbnail while full-res `directUrl` or signed `path` is fetched).
   */
  placeholderUri?: string | null;

  enableProgressiveLoading?: boolean;
  twoStageLoading?: boolean;

  fallback?: string;
} & Omit<ImageProps, "source" | "placeholder">;

function decodeWidthPx(
  sizePreset?: ImageSizePreset,
  customWidth?: number
): number | undefined {
  if (customWidth != null) {
    return Math.max(1, Math.round(customWidth * PixelRatio.get()));
  }
  if (sizePreset == null || sizePreset === "original") return undefined;
  const logical =
    PRESET_DECODE_WIDTH[sizePreset as Exclude<ImageSizePreset, "original">];
  return Math.max(1, Math.round(logical * PixelRatio.get()));
}

const OptimizedImage = ({
  path,
  bucket = "inspirations",
  directUrl,
  sizePreset,
  width: customWidth,
  height: _customHeight,
  placeholderUri,
  enableProgressiveLoading: _enableProgressiveLoading = true,
  twoStageLoading: _twoStageLoading = false,
  fallback,
  style,
  contentFit = "cover",
  transition = 200,
  priority = "normal",
  ...imageProps
}: OptimizedImageProps) => {
  const [resolvedPathUrl, setResolvedPathUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (directUrl) {
      setResolvedPathUrl(null);
      return () => {
        cancelled = true;
      };
    }

    setResolvedPathUrl(null);

    if (!path) {
      return () => {
        cancelled = true;
      };
    }

    if (path.startsWith("http")) {
      setResolvedPathUrl(path);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const signed = await fetchSignedStorageUrl(bucket, path);
      if (!cancelled) {
        setResolvedPathUrl(signed ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [path, bucket, directUrl]);

  const mainUri = directUrl ?? resolvedPathUrl;
  const decodeW = useMemo(
    () => decodeWidthPx(sizePreset, customWidth),
    [sizePreset, customWidth]
  );

  const source = useMemo(() => {
    if (mainUri) {
      return decodeW != null
        ? [{ uri: mainUri, width: decodeW }]
        : { uri: mainUri };
    }
    if (placeholderUri) {
      return { uri: placeholderUri };
    }
    if (fallback) {
      return { uri: fallback };
    }
    return null;
  }, [mainUri, decodeW, placeholderUri, fallback]);

  const expoPlaceholder = useMemo(() => {
    if (placeholderUri && mainUri && placeholderUri !== mainUri) {
      return { uri: placeholderUri };
    }
    return undefined;
  }, [placeholderUri, mainUri]);

  if (!source) {
    return null;
  }

  return (
    <Image
      source={source}
      placeholder={expoPlaceholder}
      style={style}
      contentFit={contentFit}
      transition={transition}
      priority={priority}
      cachePolicy="memory-disk"
      {...imageProps}
    />
  );
};

export default OptimizedImage;
