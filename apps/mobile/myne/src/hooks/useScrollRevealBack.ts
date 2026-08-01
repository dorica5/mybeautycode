import { useCallback, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/** Hide back while scrolling down; show again as soon as the user scrolls up. */
export function useScrollRevealBack(threshold = 20) {
  const [backVisible, setBackVisible] = useState(true);
  const lastScrollY = useRef(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      if (y <= threshold) {
        setBackVisible(true);
      } else if (y > lastScrollY.current + 6) {
        setBackVisible(false);
      } else if (y < lastScrollY.current - 6) {
        setBackVisible(true);
      }
      lastScrollY.current = y;
    },
    [threshold]
  );

  return { backVisible, onScroll };
}
