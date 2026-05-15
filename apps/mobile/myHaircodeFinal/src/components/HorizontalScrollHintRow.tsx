import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type HorizontalScrollHintRowProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * Horizontal chip row — scroll indicator when content overflows (native bar).
 */
export function HorizontalScrollHintRow({
  children,
  style,
  contentContainerStyle,
}: HorizontalScrollHintRowProps) {
  const [viewportW, setViewportW] = useState(0);
  const [contentW, setContentW] = useState(0);

  const hasOverflow = contentW > viewportW + 2;

  return (
    <View
      style={[styles.wrap, style]}
      accessibilityLabel={
        hasOverflow ? "Filters, swipe sideways for more" : "Filters"
      }
    >
      <View
        style={styles.scrollViewport}
        onLayout={(e) => setViewportW(e.nativeEvent.layout.width)}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={hasOverflow}
          indicatorStyle="black"
          onContentSizeChange={(w) => setContentW(w)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={contentContainerStyle}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  scrollViewport: {
    width: "100%",
  },
});
