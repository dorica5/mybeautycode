import { primaryBlack, primaryWhite, secondaryGreen } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { CaretDown } from "phosphor-react-native";
import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PANEL_RADIUS = responsiveScale(12);
const ANCHOR_GAP = responsiveMargin(4);

function listRowHeight(): number {
  return responsiveScale(48) + StyleSheet.hairlineWidth;
}

export type BrandAnchoredMultiSelectProps = {
  /** Section label above the trigger (e.g. “Other”). */
  label: string;
  /** Options shown in the anchored panel (labels = values). */
  options: readonly string[];
  /** Selected option labels. */
  value: readonly string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
};

/**
 * Multi-select anchored under a pill trigger — same interaction model as
 * {@link BrandCountryDropdown}: light backdrop, floating panel, brand rows.
 */
export function BrandAnchoredMultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Tap to add",
  containerStyle,
}: BrandAnchoredMultiSelectProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const triggerRef = useRef<View>(null);
  const rowHeight = useMemo(() => listRowHeight(), []);

  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const maxPanelHeight = useMemo(
    () => Math.min(responsiveScale(300), Math.round(windowHeight * 0.42)),
    [windowHeight]
  );

  const triggerSummary = useMemo(() => {
    if (value.length === 0) {
      return null;
    }
    if (value.length === 1) {
      return value[0];
    }
    if (value.length === 2) {
      return `${value[0]}, ${value[1]}`;
    }
    return `${value.length} services selected`;
  }, [value]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setAnchor(null);
      return;
    }
    const id = requestAnimationFrame(() => {
      triggerRef.current?.measureInWindow((x, y, w, h) => {
        setAnchor({ x, y, width: w, height: h });
      });
    });
    return () => cancelAnimationFrame(id);
  }, [open, windowHeight, windowWidth]);

  const toggle = useCallback(
    (opt: string) => {
      const next = new Set(selectedSet);
      if (next.has(opt)) {
        next.delete(opt);
      } else {
        next.add(opt);
      }
      onChange(Array.from(next));
    },
    [onChange, selectedSet]
  );

  const panelLayout = useMemo(() => {
    if (!anchor) return null;
    const sidePad = responsiveMargin(12);
    const bottomPad = Math.max(insets.bottom, responsiveMargin(12)) + sidePad;
    const topPad = insets.top + sidePad;

    const listContentHeight = options.length * rowHeight;
    const panelHeight = Math.min(
      maxPanelHeight,
      Math.max(listContentHeight, rowHeight)
    );

    let width = Math.min(anchor.width, windowWidth - sidePad * 2);
    let left = anchor.x;
    if (left + width > windowWidth - sidePad) {
      left = windowWidth - sidePad - width;
    }
    if (left < sidePad) left = sidePad;

    const belowTop = anchor.y + anchor.height + ANCHOR_GAP;
    const spaceBelow = windowHeight - belowTop - bottomPad;
    const spaceAbove = anchor.y - topPad;
    const openDown =
      spaceBelow >= Math.min(panelHeight, responsiveScale(200)) ||
      spaceBelow >= spaceAbove;

    let top: number;
    if (openDown) {
      top = belowTop;
      const maxTop = windowHeight - bottomPad - panelHeight;
      if (top > maxTop) {
        top = Math.max(topPad, maxTop);
      }
    } else {
      top = anchor.y - panelHeight - ANCHOR_GAP;
      if (top < topPad) {
        top = topPad;
      }
    }

    return { left, top, width, height: panelHeight };
  }, [
    anchor,
    windowHeight,
    windowWidth,
    insets,
    maxPanelHeight,
    options.length,
    rowHeight,
  ]);

  const getItemLayout = useCallback(
    (_data: ArrayLike<string> | null | undefined, index: number) => ({
      length: rowHeight,
      offset: rowHeight * index,
      index,
    }),
    [rowHeight]
  );

  return (
    <View style={[styles.wrap, containerStyle]} pointerEvents="box-none">
      <Text style={[Typography.label, styles.fieldLabel]} accessibilityRole="text">
        {label}
      </Text>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            setOpen(true);
          }}
          style={({ pressed }) => [
            styles.trigger,
            pressed && { opacity: 0.92 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint="Opens list to add or remove selections"
        >
          <Text
            style={[Typography.bodySmall, styles.triggerLabel]}
            numberOfLines={2}
          >
            {triggerSummary ?? placeholder}
          </Text>
          <CaretDown size={responsiveScale(20)} color={primaryBlack} />
        </Pressable>
      </View>

      <Modal
        visible={open}
        animationType="none"
        transparent
        onRequestClose={close}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={close}
            accessibilityLabel="Close list"
            accessibilityRole="button"
          />
          {panelLayout && (
            <View
              style={[
                styles.anchorPanel,
                {
                  left: panelLayout.left,
                  top: panelLayout.top,
                  width: panelLayout.width,
                  height: panelLayout.height,
                },
              ]}
              pointerEvents="box-none"
            >
              <View style={styles.panelCard} accessibilityViewIsModal>
                <FlatList
                  data={[...options]}
                  keyExtractor={(item) => item}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                  style={styles.optionList}
                  getItemLayout={getItemLayout}
                  initialNumToRender={16}
                  extraData={value.join("\u0001")}
                  renderItem={({ item, index }) => {
                    const selected = selectedSet.has(item);
                    const isLast = index === options.length - 1;
                    return (
                      <Pressable
                        onPress={() => toggle(item)}
                        style={[
                          styles.row,
                          isLast && styles.rowLast,
                          selected && styles.rowSelected,
                        ]}
                      >
                        <Text
                          style={[
                            Typography.bodySmall,
                            styles.rowLabel,
                            selected && styles.rowLabelSelected,
                          ]}
                          numberOfLines={2}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    );
                  }}
                />
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignSelf: "stretch",
    marginBottom: responsiveMargin(28),
    zIndex: 1,
  },
  fieldLabel: {
    color: primaryBlack,
    marginBottom: responsiveMargin(8),
    alignSelf: "flex-start",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(999),
    borderWidth: 1,
    borderColor: primaryBlack,
    minHeight: responsiveScale(50),
    paddingHorizontal: responsivePadding(18),
  },
  triggerLabel: {
    flex: 1,
    marginRight: responsivePadding(8),
    color: primaryBlack,
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(33, 36, 39, 0.12)",
  },
  anchorPanel: {
    position: "absolute",
  },
  panelCard: {
    flex: 1,
    backgroundColor: primaryWhite,
    borderRadius: PANEL_RADIUS,
    borderWidth: 1,
    borderColor: primaryBlack,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: primaryBlack,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  optionList: {
    flex: 1,
  },
  row: {
    paddingVertical: responsivePadding(14),
    paddingHorizontal: responsivePadding(16),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${primaryBlack}18`,
    minHeight: responsiveScale(48),
    justifyContent: "center",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowSelected: {
    backgroundColor: secondaryGreen,
  },
  rowLabel: {
    color: primaryBlack,
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: "center" as const,
      },
      default: {},
    }),
  },
  rowLabelSelected: {
    fontFamily: Typography.label.fontFamily,
  },
});
