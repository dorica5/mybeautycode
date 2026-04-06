import { Alert, StyleSheet, TextInput, View, Pressable } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { useIsFocused } from "@react-navigation/native";
import { MagnifyingGlass, XCircle } from "phosphor-react-native";
import { Colors, primaryBlack } from "../constants/Colors";
import Delete2Streamline from "../../assets/icons/delete_2_streamline.svg";

/** Mint off-white fill for brand search bar (matches design). */
const SEARCH_BAR_FILL = "#F1F8F5";
/** Icon / border grey — thin, minimalist line weight. */
const SEARCH_BAR_STROKE = "#333333";
/** Design size (dp @ base) — width × height capsule. */
const SEARCH_BAR_WIDTH = 343;
const SEARCH_BAR_HEIGHT = 46;
import { 
  responsiveScale, 
  responsivePadding, 
  responsiveMargin,
  responsiveFontSize,
  responsiveBorderRadius,
  scalePercent 
} from "../utils/responsive";

type SearchInputProps = {
  initialQuery: string;
  onSearch: (query: string) => void;
  placeholder: string;
  style?: any;
  clearSearch?: () => void;
  /** When set, search field uses white pill styling (e.g. client find-professionals screen). */
  variant?: "default" | "whitePill";
  /** Override whitePill width (base dp). Default 343. */
  whitePillWidth?: number;
  /** Override whitePill height (base dp). Default 46. */
  whitePillHeight?: number;
  /** Override pill fill (default mint off-white {@link SEARCH_BAR_FILL}). */
  pillBackgroundColor?: string;
  /** Use full width of parent instead of fixed {@link whitePillWidth}. */
  stretchWhitePill?: boolean;
};

const SearchInput = ({
  initialQuery,
  onSearch,
  placeholder,
  style,
  clearSearch,
  variant = "default",
  whitePillWidth,
  whitePillHeight,
  pillBackgroundColor,
  stretchWhitePill,
}: SearchInputProps) => {
  const [query, setQuery] = useState("");
  const isFocused = useIsFocused();

  const pillW = whitePillWidth ?? SEARCH_BAR_WIDTH;
  const pillH = whitePillHeight ?? SEARCH_BAR_HEIGHT;

  useEffect(() => {
    onSearch(query);
  }, [query, onSearch]);

  useEffect(() => {
    if (isFocused) {
      setQuery("");
    }
  }, [isFocused]);

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
    setQuery("");
    clearSearch?.();
  }, [clearSearch]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  return (
    <View
      style={[
        styles.container,
        variant === "whitePill" && [
          styles.containerWhitePill,
          pillBackgroundColor
            ? { backgroundColor: pillBackgroundColor }
            : null,
          {
            height: responsiveScale(pillH),
            minHeight: responsiveScale(pillH),
            borderRadius: responsiveScale(pillH / 2),
            ...(stretchWhitePill
              ? { width: "100%" as const, alignSelf: "stretch" as const }
              : { width: responsiveScale(pillW) }),
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
        onChangeText={(e) => setQuery(e)}
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
    alignSelf: 'center',
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
    backgroundColor: SEARCH_BAR_FILL,
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