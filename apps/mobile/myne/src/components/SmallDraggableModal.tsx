import React, { useRef, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Modal,
  Dimensions,
  Pressable,
} from "react-native";
import { X } from "phosphor-react-native";
import {
  GestureHandlerRootView,
  ScrollView,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Colors,
  primaryBlack,
  primaryGreen,
} from "@/src/constants/Colors";
import { responsiveMargin, responsivePadding } from "@/src/utils/responsive";
import { useI18n } from "@/src/providers/LanguageProvider";

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

type PanRefs = {
  pan: Animated.Value;
  lastGestureValue: React.MutableRefObject<number>;
  setVisible: (v: boolean) => void;
  onClose: () => void;
  onModalHide?: () => void;
};

/**
 * Handle / top chrome — drag the pill to dismiss (scroll lives in RNGH ScrollView).
 */
function createChromePanResponder({
  pan,
  lastGestureValue,
  setVisible,
  onClose,
  onModalHide,
}: PanRefs) {
  return PanResponder.create({
    /**
     * Claim the gesture as soon as the touch lands on the handle strip. If we
     * wait for onMoveShould*, ScrollView often wins the responder first (visit
     * record modals), so the pill drag never activates.
     */
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => false,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      pan.extractOffset();
    },
    onPanResponderMove: (_, gestureState) => {
      const minSnap = screenHeight * 0.1;
      const newY = lastGestureValue.current + gestureState.dy;
      const maxPullUp = 56;
      if (newY >= minSnap - maxPullUp && newY <= screenHeight) {
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
  });
}

const SmallDraggableModal: React.FC<SmallDraggableModalProps> = ({
  isVisible,
  onClose,
  onModalHide,
  modalHeight,
  renderContent,
  preview: _preview = true,
  done: _done = true,
  sheetVariant = "default",
}) => {
  const { t } = useI18n();
  const pan = useRef(new Animated.Value(screenHeight)).current;
  const [visible, setVisible] = useState(isVisible);
  const lastGestureValue = useRef(screenHeight * 0.1);
  const insets = useSafeAreaInsets();

  const heightResolved = resolveModalHeight(modalHeight);

  const isBrand = sheetVariant === "brand";
  const sheetSurface = isBrand ? primaryGreen : Colors.light.light;
  const closeIconColor = isBrand ? primaryBlack : Colors.dark.dark;
  const handleColor = isBrand ? `${primaryBlack}28` : `${primaryBlack}18`;

  const chromePanResponder = useRef(
    createChromePanResponder({
      pan,
      lastGestureValue,
      setVisible,
      onClose,
      onModalHide,
    })
  ).current;

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

  const topRadius = isBrand ? 24 : 20;
  /** Last row margins inside ScrollView are often omitted from content size on iOS — pad generously. */
  const scrollBottomInset =
    Math.max(insets.bottom, responsivePadding(16)) + responsiveMargin(40, 52);

  return (
    <Modal visible={visible} transparent animationType="none">
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.modalBackground} pointerEvents="box-none">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("common.closeDialogA11y")}
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
          <View style={styles.sheetTopChrome} pointerEvents="box-none">
            {isBrand ? (
              <View
                style={styles.sheetHandleWrap}
                {...chromePanResponder.panHandlers}
                collapsable={false}
              >
                <View
                  style={[styles.sheetHandle, { backgroundColor: handleColor }]}
                />
              </View>
            ) : (
              <View
                style={styles.sheetDragChromeDefault}
                {...chromePanResponder.panHandlers}
                collapsable={false}
              />
            )}
            <View style={[styles.header, { backgroundColor: sheetSurface }]}>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t("common.close")}
              >
                <X size={28} color={closeIconColor} weight="bold" />
              </Pressable>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: scrollBottomInset },
            ]}
          >
            <View
              style={[
                styles.contentContainer,
                isBrand && styles.contentContainerBrand,
              ]}
              collapsable={false}
            >
              {renderContent}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    overflow: "hidden",
    flexDirection: "column",
    justifyContent: "flex-start",
  },
  /** Keeps handle/header above ScrollView so pan handlers receive touches (later siblings stack on top). */
  sheetTopChrome: {
    zIndex: 2,
    elevation: 4,
  },
  sheetHandleWrap: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  sheetDragChromeDefault: {
    height: 16,
    width: "100%",
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
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
  },
  /**
   * Fill the scroll viewport when content is short (flexGrow: 1) but pin rows to
   * the top (justifyContent: flex-start) so the last action is not spaced to the
   * bottom or clipped on small screens.
   */
  scrollContent: {
    alignItems: "stretch",
  },
  contentContainer: {
    width: "100%",
    paddingHorizontal: 16,
  },
  contentContainerBrand: {
    paddingTop: 4,
  },
});

export default SmallDraggableModal;
