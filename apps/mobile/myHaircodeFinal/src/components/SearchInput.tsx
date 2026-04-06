import { Alert, StyleSheet, TextInput, View, Pressable } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { useIsFocused } from "@react-navigation/native";
import { MagnifyingGlass, XCircle } from "phosphor-react-native";
import { Colors, primaryBlack } from "../constants/Colors";
import Delete2Streamline from "../../assets/icons/delete_2_streamline.svg";
import {
  responsiveScale,
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
  responsiveBorderRadius,
  scalePercent,
} from "../utils/responsive";

/** Mint off-white fill for brand search bar (matches design). */
const SEARCH_BAR_FILL = "#F1F8F5";
/** Icon / border grey — thin, minimalist line weight. */
const SEARCH_BAR_STROKE = "#333333";
/** Design size (dp @ base) — width × height capsule. */
const SEARCH_BAR_WIDTH = 343;
const SEARCH_BAR_HEIGHT = 46;

type SearchInputProps = {
  initialQuery: string;
  onSearch: (query: string) => void;
  placeholder: string;
  style?: any;
  clearSearch?: () => void;
  /**
   * Controlled value. When set, the parent owns the text: navigation-focus clearing
   * and `initialQuery` syncing are skipped (use for pro client directory + blur reset).
   */
  value?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  /** When set, search field uses white pill styling (e.g. client find-professionals screen). */
  variant?: "default" | "whitePill";
  /** Override whitePill width (base dp). Default 343. Ignored when stretch is true. */
  whitePillWidth?: number;
  /** Override whitePill height (base dp). Default 46. */
  whitePillHeight?: number;
  /** Mint off-white default; set to `#fff` for solid white pill. */
  whitePillFill?: string;
  /** Alias for `whitePillFill` (cecilie branch). */
  pillBackgroundColor?: string;
  /** Use full width of parent (e.g. inside a card). */
  whitePillStretch?: boolean;
  /** Alias for `whitePillStretch` (cecilie branch). */
  stretchWhitePill?: boolean;
};

const SearchInput = ({
  initialQuery,
  onSearch,
  placeholder,
  style,
  clearSearch,
  value: valueProp,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  variant = "default",
  whitePillWidth,
  whitePillHeight,
  whitePillFill,
  pillBackgroundColor,
  whitePillStretch,
  stretchWhitePill,
}: SearchInputProps) => {
  const [internalQuery, setInternalQuery] = useState(initialQuery ?? "");
  const isControlled = valueProp !== undefined;
  const query = isControlled ? valueProp : internalQuery;
  const routeFocused = useIsFocused();

  const pillW = whitePillWidth ?? SEARCH_BAR_WIDTH;
  const pillH = whitePillHeight ?? SEARCH_BAR_HEIGHT;
  const effectiveFill = whitePillFill ?? pillBackgroundColor;
  const effectiveStretch = whitePillStretch ?? stretchWhitePill;

  useEffect(() => {
    if (!isControlled) {
      onSearch(internalQuery);
    }
  }, [internalQuery, onSearch, isControlled]);

  useEffect(() => {
    if (!isControlled && routeFocused) {
      setInternalQuery("");
    }
  }, [routeFocused, isControlled]);

  const handleSearch = () => {
    if (!query) {
      return Alert.alert(
        "Missing query",
        "Please input something to search results across database"
      );
    }
    onSearch(query);
  };

  const clearQuery = useCallback(() => {
    if (isControlled) {
      onSearch("");
    } else {
      setInternalQuery("");
    }
    clearSearch?.();
  }, [clearSearch, isControlled, onSearch]);

  useEffect(() => {
    if (!isControlled) {
      setInternalQuery(initialQuery);
    }
  }, [initialQuery, isControlled]);

  return (
    <View
      style={[
        styles.container,
        variant === "whitePill" && [
          styles.containerWhitePill,
          {
            width: effectiveStretch ? ("100%" as const) : responsiveScale(pillW),
            alignSelf: effectiveStretch ? ("stretch" as const) : "center",
            height: responsiveScale(pillH),
            minHeight: responsiveScale(pillH),
            borderRadius: responsiveScale(pillH / 2),
            backgroundColor: effectiveFill ?? SEARCH_BAR_FILL,
          },
        ],
        style,
      ]}
    >
      <MagnifyingGlass
        size={variant === "whitePill" ? responsiveScale(18) : responsiveScale(25)}
        color={variant === "whitePill" ? SEARCH_BAR_STROKE : "#687076"}
        weight={variant === "whitePill" ? "regular" : "regular"}
        style={variant === "whitePill" ? styles.searchIconWhitePill : styles.searchIcon}
      />
      <TextInput
        value={query}
        style={[
          styles.input,
          variant === "whitePill" && [
            styles.inputWhitePill,
            {
              height: responsiveScale(pillH),
              minHeight: responsiveScale(pillH),
              maxHeight: responsiveScale(pillH),
            },
          ],
        ]}
        placeholder={placeholder}
        placeholderTextColor={variant === "whitePill" ? `${SEARCH_BAR_STROKE}99` : "#687076"}
        onChangeText={(e) => {
          if (isControlled) {
            onSearch(e);
          } else {
            setInternalQuery(e);
          }
        }}
        onFocus={onFocusProp}
        onBlur={onBlurProp}
        onSubmitEditing={handleSearch}
      />

      {query !== "" && (
        <Pressable
          onPress={clearQuery}
          style={variant === "whitePill" ? styles.clearIconWhitePill : styles.clearIcon}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          {variant === "whitePill" ? (
            <Delete2Streamline
              width={responsiveScale(18)}
              height={responsiveScale(18)}
              color={SEARCH_BAR_STROKE}
            />
          ) : (
            <XCircle size={responsiveScale(24)} color="#687076" />
          )}
        </Pressable>
      )}
    </View>
  );
};

export default SearchInput;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.light.yellowish,
    marginHorizontal: responsivePadding(16),
    marginVertical: responsiveMargin(20),
    borderRadius: responsiveBorderRadius(30),
    alignItems: "center",
    paddingHorizontal: responsivePadding(10),
    width: scalePercent(93),
    alignSelf: "center",
  },
  input: {
    flex: 1,
    height: responsiveScale(45),
    minHeight: responsiveScale(40),
    paddingLeft: responsivePadding(10),
    paddingVertical: responsivePadding(10, 6),
    color: "#000",
    fontSize: responsiveFontSize(18, 14),
    fontFamily: "Inter-Regular",
  },
  searchIcon: {
    marginLeft: responsivePadding(10),
  },
  clearIcon: {
    marginRight: responsivePadding(10),
  },
  clearIconWhitePill: {
    marginRight: responsivePadding(12),
    paddingVertical: responsivePadding(6),
    paddingHorizontal: responsivePadding(4),
    justifyContent: "center",
    alignItems: "center",
  },
  /** Brand capsule: mint fill, dark stroke — width/height/radius set in component. */
  containerWhitePill: {
    marginHorizontal: 0,
    marginVertical: 0,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: SEARCH_BAR_STROKE,
    paddingVertical: 0,
    paddingHorizontal: responsivePadding(12),
    overflow: "hidden",
  },
  searchIconWhitePill: {
    marginLeft: responsivePadding(2),
    marginRight: responsivePadding(4),
  },
  inputWhitePill: {
    flex: 1,
    paddingLeft: responsivePadding(6),
    paddingRight: responsivePadding(6),
    paddingVertical: 0,
    fontSize: responsiveFontSize(16, 14),
    color: primaryBlack,
  },
});
