// src/components/AvatarWithSpinner.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from "react-native";
import { UserCircle } from "phosphor-react-native";
import OptimizedImage from "@/src/components/OptimizedImage";
import { Colors } from "@/src/constants/Colors";
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
  const [loading, setLoading] = useState<boolean>(!!uri);

  // Reset spinner whenever uri changes
  useEffect(() => {
    if (uri) {
      setLoading(true);
    }
  }, [uri]);

  // Determine if uri is a full URL or a path
  const isFullUrl = uri?.startsWith("http");

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
        style,
        circleStyles,
      ]}
    >
      {uri ? (
        <>
          <OptimizedImage
            {...(isFullUrl
              ? { directUrl: uri }
              : { path: uri, bucket }
            )}
            width={Math.round(dimension * 2)}
            height={Math.round(dimension * 2)}
            enableProgressiveLoading={false}
            style={{ width: dimension, height: dimension, borderRadius: dimension / 2 }}
            contentFit="cover"
            onLoadStart={() => setLoading(true)}
            onLoad={() => {
              setLoading(false);
              // failsafe: stop spinner after 1s even if onLoad misbehaves
              setTimeout(() => setLoading(false), 1000);
            }}
          />
          {loading && (
            <View style={styles.spinnerOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </>
      ) : (
        <UserCircle size={size * 0.6} color={Colors.dark.dark} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.yellowish,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden", // keeps image inside circle
  },
  spinnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
});
