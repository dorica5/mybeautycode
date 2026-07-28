// src/components/AvatarWithSpinner.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from "react-native";
import OptimizedImage from "@/src/components/OptimizedImage";
import { DefaultAvatarMark } from "@/src/components/DefaultAvatarMark";
import { primaryWhite, secondaryGreen } from "@/src/constants/Colors";
import { scale } from "@/src/utils/responsive";

interface AvatarWithSpinnerProps {
  uri?: string | null;            // image URL or path
  size?: number;                  // circle size (default 70)
  style?: StyleProp<ViewStyle>;   // extra styles for wrapper
  bucket?: string;                // Supabase bucket (default: "avatars")
}

export const AvatarWithSpinner: React.FC<AvatarWithSpinnerProps> = ({
  uri,
  size = scale(70),
  style,
  bucket = "avatars",
}) => {
  const displayUri = uri?.trim() || null;
  const [loading, setLoading] = useState(false);
  const loadFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoadFallback = () => {
    if (loadFallbackRef.current) {
      clearTimeout(loadFallbackRef.current);
      loadFallbackRef.current = null;
    }
  };

  const finishLoading = () => {
    clearLoadFallback();
    setLoading(false);
  };

  const startLoading = () => {
    clearLoadFallback();
    setLoading(true);
    // Cached/prefetched images may never fire onLoad after a uri swap.
    loadFallbackRef.current = setTimeout(finishLoading, 800);
  };

  useEffect(() => () => clearLoadFallback(), []);

  // Determine if uri is a full URL or a path
  const isFullUrl = displayUri?.startsWith("http");

  // Ensure circle: if style overrides width/height, use same value for both to avoid oval
  const flattenedStyle = (style && StyleSheet.flatten(style)) || {};
  const styleWidth = typeof flattenedStyle.width === "number" ? flattenedStyle.width : undefined;
  const styleHeight = typeof flattenedStyle.height === "number" ? flattenedStyle.height : undefined;
  const dimension = styleWidth ?? styleHeight ?? size;
  const circleStyles = { width: dimension, height: dimension, borderRadius: dimension / 2 };

  return (
    <View
      style={[
        styles.container,
        !displayUri && styles.containerPlaceholder,
        style,
        circleStyles,
      ]}
    >
      {displayUri ? (
        <>
          <OptimizedImage
            key={displayUri}
            {...(isFullUrl
              ? { directUrl: displayUri }
              : { path: displayUri, bucket }
            )}
            sizePreset="avatar-small"
            width={Math.round(dimension)}
            height={Math.round(dimension)}
            enableProgressiveLoading={false}
            transition={0}
            priority="high"
            style={{ width: dimension, height: dimension, borderRadius: dimension / 2 }}
            contentFit="cover"
            onLoadStart={startLoading}
            onLoad={finishLoading}
            onError={finishLoading}
          />
          {loading && (
            <View style={styles.spinnerOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </>
      ) : (
        <DefaultAvatarMark size={dimension} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: secondaryGreen,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden", // keeps image inside circle
  },
  containerPlaceholder: {
    backgroundColor: primaryWhite,
  },
  spinnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
});
