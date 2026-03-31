import { countryItems } from "@/assets/data/items";
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
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FlatList as FlatListType } from "react-native";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PANEL_RADIUS = responsiveScale(12);
const ANCHOR_GAP = responsiveMargin(4);

/** Match `styles.row` outer height for `getItemLayout` / `scrollToOffset`. */
function listRowHeight(): number {
  return responsiveScale(48) + StyleSheet.hairlineWidth;
}

type CountryItem = (typeof countryItems)[number];

type AnchorRect = { x: number; y: number; width: number; height: number };

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export type BrandCountryDropdownProps = {
  label: string;
  value: string | null;
  onChange: (countryCode: string | null) => void;
  placeholder?: string;
  error?: boolean;
  containerStyle?: ViewStyle;
};

/**
 * Country field styled like `BrandOutlineField`. The list opens as a panel
 * anchored under the pill (page-integrated). A light invisible-touch layer
 * catches taps outside so the list closes without using a centered modal sheet.
 */
export function BrandCountryDropdown({
  label,
  value,
  onChange,
  placeholder = "Select a country",
  error,
  containerStyle,
}: BrandCountryDropdownProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const triggerRef = useRef<View>(null);
  const listRef = useRef<FlatListType<CountryItem>>(null);
  const rowHeight = useMemo(() => listRowHeight(), []);

  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const [query, setQuery] = useState("");

  const maxPanelHeight = useMemo(
    () => Math.min(responsiveScale(300), Math.round(windowHeight * 0.42)),
    [windowHeight]
  );

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    return countryItems.find((i) => i.value === value)?.label ?? null;
  }, [value]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return countryItems;
    return countryItems.filter(
      (i) =>
        normalize(i.label).includes(q) ||
        normalize(String(i.value)).includes(q)
    );
  }, [query]);

  const selectedIndex = useMemo(() => {
    if (value == null || value === "") return -1;
    return filtered.findIndex((i) => String(i.value) === String(value));
  }, [filtered, value]);

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

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const onSelect = useCallback(
    (code: string) => {
      onChange(code);
      setOpen(false);
    },
    [onChange]
  );

  const openMenu = useCallback(() => setOpen(true), []);

  const panelLayout = useMemo(() => {
    if (!anchor) return null;
    const sidePad = responsiveMargin(12);
    const bottomPad = Math.max(insets.bottom, responsiveMargin(12)) + sidePad;
    const topPad = insets.top + sidePad;

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
      spaceBelow >= Math.min(maxPanelHeight, responsiveScale(200)) ||
      spaceBelow >= spaceAbove;

    let top: number;
    if (openDown) {
      top = belowTop;
      const maxTop = windowHeight - bottomPad - maxPanelHeight;
      if (top > maxTop) {
        top = Math.max(topPad, maxTop);
      }
    } else {
      top = anchor.y - maxPanelHeight - ANCHOR_GAP;
      if (top < topPad) {
        top = topPad;
      }
    }

    return { left, top, width, height: maxPanelHeight };
  }, [anchor, windowHeight, windowWidth, insets, maxPanelHeight]);

  const getItemLayout = useCallback(
    (_data: ArrayLike<CountryItem> | null | undefined, index: number) => ({
      length: rowHeight,
      offset: rowHeight * index,
      index,
    }),
    [rowHeight]
  );

  useLayoutEffect(() => {
    if (!open || !panelLayout || selectedIndex < 0) return;
    const id = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: false,
        viewPosition: 0.5,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [open, panelLayout, selectedIndex, filtered.length]);

  return (
    <View style={[styles.wrap, containerStyle]} pointerEvents="box-none">
      <Text style={[Typography.label, styles.label]} accessibilityRole="text">
        {label}
      </Text>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          onPress={openMenu}
          style={({ pressed }) => [
            styles.trigger,
            error ? { borderColor: "#B00020" } : null,
            pressed && { opacity: 0.92 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint="Opens country list"
        >
          <Text
            style={[Typography.bodySmall, styles.triggerLabel]}
            numberOfLines={1}
          >
            {selectedLabel ?? placeholder}
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
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={styles.backdrop}
            onPress={close}
            accessibilityLabel="Close country list"
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
                <View style={styles.searchContainer}>
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search…"
                    placeholderTextColor={`${primaryBlack}88`}
                    style={styles.searchInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    {...(Platform.OS === "ios"
                      ? ({ clearButtonMode: "while-editing" } as const)
                      : {})}
                  />
                </View>
                <FlatList
                  ref={listRef}
                  data={filtered}
                  keyExtractor={(item) => String(item.value)}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                  style={styles.countryList}
                  getItemLayout={getItemLayout}
                  initialNumToRender={24}
                  maxToRenderPerBatch={32}
                  windowSize={10}
                  extraData={`${value ?? ""}:${filtered.length}`}
                  onScrollToIndexFailed={({ index }) => {
                    listRef.current?.scrollToOffset({
                      offset: rowHeight * index,
                      animated: false,
                    });
                  }}
                  renderItem={({ item }) => {
                    const selected =
                      value != null && String(item.value) === String(value);
                    return (
                      <Pressable
                        onPress={() => onSelect(String(item.value))}
                        style={[styles.row, selected && styles.rowSelected]}
                      >
                        <Text
                          style={[
                            Typography.bodySmall,
                            styles.rowLabel,
                            selected && styles.rowLabelSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  }}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No matches</Text>
                  }
                />
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    marginBottom: responsiveMargin(18),
    zIndex: 1,
  },
  label: {
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
  searchContainer: {
    paddingHorizontal: responsivePadding(14),
    paddingVertical: responsivePadding(10),
    backgroundColor: secondaryGreen,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${primaryBlack}22`,
  },
  searchInput: {
    ...Typography.bodySmall,
    color: primaryBlack,
    backgroundColor: primaryWhite,
    borderColor: primaryBlack,
    borderWidth: 1,
    borderRadius: responsiveScale(999),
    paddingHorizontal: responsivePadding(14),
    paddingVertical: responsivePadding(10),
  },
  countryList: {
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
  emptyText: {
    ...Typography.bodySmall,
    color: `${primaryBlack}AA`,
    textAlign: "center",
    paddingVertical: responsivePadding(24),
  },
});
