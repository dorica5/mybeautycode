import React, { useRef, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Modal,
  Dimensions,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { X } from "phosphor-react-native";
import {
  Colors,
  primaryBlack,
  primaryGreen,
} from "@/src/constants/Colors";

const screenHeight = Dimensions.get("window").height;

function resolveModalHeight(modalHeight: number | string): number | string {
  if (typeof modalHeight === "string" && modalHeight.endsWith("%")) {
    const n = parseFloat(modalHeight);
    if (!Number.isNaN(n)) {
      return Math.round((screenHeight * n) / 100);
    }
  }
  return modalHeight;
}

interface SmallDraggableModalProps {
  isVisible: boolean;
  onClose: () => void;
  onModalHide?: () => void;
  modalHeight: number | string;
  renderContent: React.ReactNode;
  preview?: boolean;
  done?: boolean;
  /** Mint-brand sheet (moderation, safety). Default: neutral gray. */
  sheetVariant?: "default" | "brand";
}

const SmallDraggableModal: React.FC<SmallDraggableModalProps> = ({
  isVisible,
  onClose,
  onModalHide,
  modalHeight,
  renderContent,
  preview = true,
  done: _done = true,
  sheetVariant = "default",
}) => {
  const pan = useRef(new Animated.Value(screenHeight)).current;
  const [visible, setVisible] = useState(isVisible);
  const isScrollAtTop = useRef(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const lastGestureValue = useRef(screenHeight * 0.1);

  const heightResolved = resolveModalHeight(modalHeight);

  const isBrand = sheetVariant === "brand";
  const sheetSurface = isBrand ? primaryGreen : Colors.light.light;
  const closeIconColor = isBrand ? primaryBlack : Colors.dark.dark;
  const handleColor = isBrand ? `${primaryBlack}28` : `${primaryBlack}18`;

  useEffect(() => {
    if (isVisible) {
      setVisible(true);
      Animated.timing(pan, {
        toValue: screenHeight * 0.1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      lastGestureValue.current = screenHeight * 0.1;
    } else {
      Animated.timing(pan, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        if (onModalHide) onModalHide();
      });
      lastGestureValue.current = screenHeight;
    }
  }, [isVisible]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    isScrollAtTop.current = event.nativeEvent.contentOffset.y <= 0;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dy, dx } = gestureState;
        return (
          isScrollAtTop.current &&
          Math.abs(dy) > Math.abs(dx) &&
          dy > 0
        );
      },
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        const newY = lastGestureValue.current + gestureState.dy;
        if (newY >= screenHeight * 0.1) {
          pan.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        if (gestureState.dy > 150) {
          Animated.timing(pan, {
            toValue: screenHeight,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setVisible(false);
            onClose();
            if (onModalHide) onModalHide();
          });
          lastGestureValue.current = screenHeight;
        } else {
          Animated.spring(pan, {
            toValue: screenHeight * 0.1,
            useNativeDriver: true,
            tension: 100,
            friction: 12,
          }).start();
          lastGestureValue.current = screenHeight * 0.1;
        }
      },
    })
  ).current;

  const topRadius = isBrand ? 24 : 20;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.modalBackground} pointerEvents="box-none">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close dialog"
        />
        <Animated.View
          style={[
            styles.modalContent,
            {
              height: heightResolved,
              backgroundColor: sheetSurface,
              borderTopLeftRadius: topRadius,
              borderTopRightRadius: topRadius,
              transform: [{ translateY: pan }],
            },
          ]}
        >
          {isBrand ? (
            <View style={styles.sheetHandleWrap}>
              <View
                style={[styles.sheetHandle, { backgroundColor: handleColor }]}
              />
            </View>
          ) : null}
          <View style={[styles.header, { backgroundColor: sheetSurface }]}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={28} color={closeIconColor} weight="bold" />
            </Pressable>
          </View>

          <ScrollView
            ref={scrollViewRef}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            {...(preview ? panResponder.panHandlers : {})}
          >
            <View
              style={[
                styles.contentContainer,
                isBrand && styles.contentContainerBrand,
              ]}
            >
              {renderContent}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    overflow: "hidden",
  },
  sheetHandleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 8,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  contentContainerBrand: {
    paddingTop: 4,
  },
});

export default SmallDraggableModal;
