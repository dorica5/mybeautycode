import React, { useRef, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Modal,
  Dimensions,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";

const screenHeight = Dimensions.get("window").height;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
/** Handle strip + padding — keep draggable area below status bar / notch. */
const HANDLE_HIT_HEIGHT = 52;

interface DraggableModalProps {
  isVisible: boolean;
  onClose: () => void;
  modalHeight: number;
  renderContent: React.ReactNode;
  /** Fill handle + scroll area (short content still shows this color). */
  sheetBackgroundColor?: string;
}

const DraggableModal: React.FC<DraggableModalProps> = ({
  isVisible,
  onClose,
  modalHeight,
  renderContent,
  sheetBackgroundColor = Colors.light.light,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const sheetExpand = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(isVisible);
  const expandRef = useRef(0);
  const panStartExpand = useRef(0);
  const maxExpandRef = useRef(0);

  const topInset = Math.max(insets.top, Platform.OS === "android" ? 12 : 0);
  const maxExpandedHeight = screenHeight - topInset - HANDLE_HIT_HEIGHT;
  maxExpandRef.current = Math.max(0, maxExpandedHeight - modalHeight);
  const sheetHeight = Animated.add(modalHeight, sheetExpand);

  useEffect(() => {
    if (isVisible) {
      setVisible(true);
      expandRef.current = 0;
      sheetExpand.setValue(0);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      expandRef.current = 0;
      sheetExpand.setValue(0);
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [isVisible, modalHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => {
        const isVertical = Math.abs(g.dy) > Math.abs(g.dx) && Math.abs(g.dy) > 5;
        return isVertical;
      },
      onPanResponderGrant: () => {
        panStartExpand.current = expandRef.current;
        translateY.extractOffset();
      },
      onPanResponderMove: (_, g) => {
        const maxExpand = maxExpandRef.current;

        if (g.dy < 0 && maxExpand > 0) {
          const nextExpand = Math.min(
            maxExpand,
            Math.max(0, panStartExpand.current - g.dy)
          );
          expandRef.current = nextExpand;
          sheetExpand.setValue(nextExpand);
          translateY.setValue(0);
          return;
        }

        if (g.dy > 0) {
          const startExpand = panStartExpand.current;
          if (startExpand > 0) {
            if (g.dy <= startExpand) {
              const nextExpand = startExpand - g.dy;
              expandRef.current = nextExpand;
              sheetExpand.setValue(nextExpand);
              translateY.setValue(0);
            } else {
              expandRef.current = 0;
              sheetExpand.setValue(0);
              translateY.setValue(g.dy - startExpand);
            }
          } else {
            translateY.setValue(g.dy);
          }
        }
      },
      onPanResponderRelease: (_, g) => {
        translateY.flattenOffset();
        const expand = expandRef.current;
        const maxExpand = maxExpandRef.current;

        if (g.dy > 100 && expand <= 0) {
          Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setVisible(false);
            onClose();
          });
          return;
        }

        expandRef.current = 0;
        Animated.parallel([
          Animated.spring(sheetExpand, {
            toValue: 0,
            useNativeDriver: false,
            tension: 80,
            friction: 12,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }),
        ]).start();
      },
    })
  ).current;

  const backdropColor = translateY.interpolate({
    inputRange: [0, screenHeight],
    outputRange: ["rgba(0,0,0,0.6)", "rgba(0,0,0,0)"],
    extrapolate: "clamp",
  });

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <AnimatedPressable style={[styles.backdrop, { backgroundColor: backdropColor }]} onPress={onClose} />

        <Animated.View
          style={[
            styles.modalShell,
            { transform: [{ translateY }] },
          ]}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                height: sheetHeight,
                backgroundColor: sheetBackgroundColor,
              },
            ]}
          >
            <View
              {...panResponder.panHandlers}
              style={[
                styles.handleContainer,
                { backgroundColor: sheetBackgroundColor },
              ]}
            >
              <View style={styles.handle} />
            </View>

            <ScrollView
              style={[styles.scroll, { backgroundColor: sheetBackgroundColor }]}
              contentContainerStyle={[
                styles.scrollContent,
                {
                  flexGrow: 1,
                  backgroundColor: sheetBackgroundColor,
                  justifyContent: "flex-start",
                },
              ]}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={16}
              nestedScrollEnabled
              bounces={Platform.OS !== "android" || true}
            >
              {renderContent}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalShell: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    flexDirection: "column",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  handleContainer: {
    paddingVertical: 16,
    alignItems: "center",
    zIndex: 1,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
});

export default DraggableModal;
