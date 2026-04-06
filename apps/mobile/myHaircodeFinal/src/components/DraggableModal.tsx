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
import { Colors } from "../constants/Colors";

const screenHeight = Dimensions.get("window").height;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const [visible, setVisible] = useState(isVisible);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (isVisible) {
      setVisible(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [isVisible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => {
        const isVertical = Math.abs(g.dy) > Math.abs(g.dx) && Math.abs(g.dy) > 5;
        const atTop = lastScrollY.current <= 0;
        return isVertical && (atTop || g.dy > 0);
      },
      onPanResponderGrant: () => {
        translateY.extractOffset();
      },
      onPanResponderMove: (_, g) => {
        if (g.dy >= 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        translateY.flattenOffset();
        if (g.dy > 100) {
          Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setVisible(false);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
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
            styles.modalContent,
            {
              height: modalHeight,
              backgroundColor: sheetBackgroundColor,
              transform: [{ translateY }],
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
            onScroll={(e) => {
              lastScrollY.current = e.nativeEvent.contentOffset.y;
            }}
            bounces={Platform.OS !== "android" || true}
          >
            {renderContent}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
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
