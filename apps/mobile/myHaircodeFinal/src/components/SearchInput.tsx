import { Alert, StyleSheet, TextInput, View, Pressable } from "react-native";
import React, { useState, useEffect, useCallback, useRef } from "react";
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
  /**
   * Controlled value. When set, the parent owns the text: navigation-focus clearing
   * and `initialQuery` syncing are skipped (use for pro client directory + blur reset).
   */
  value?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  /** When set, search field uses white pill styling (e.g. client find-professionals screen). */
  variant?: "default" | "whitePill";
  /** Override whitePill width (base dp). Default 343. Ignored when `whitePillStretch`. */
  whitePillWidth?: number;
  /** Override whitePill height (base dp). Default 46. */
  whitePillHeight?: number;
  /** Mint off-white default; set to `#fff` for solid white pill. */
  whitePillFill?: string;
  /** Use full width of parent (e.g. inside a card). */
  whitePillStretch?: boolean;
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
  whitePillStretch,
}: SearchInputProps) => {
  const [internalQuery, setInternalQuery] = useState(initialQuery ?? "");
  const isControlled = valueProp !== undefined;
  const query = isControlled ? valueProp : internalQuery;
  const routeFocused = useIsFocused();

  const pillW = whitePillWidth ?? SEARCH_BAR_WIDTH;
  const pillH = whitePillHeight ?? SEARCH_BAR_HEIGHT;

  /**
   * Keep the latest `onSearch` in a ref so downstream callbacks/effects don't
   * take it as a dependency. A fresh function identity on every parent render
   * used to churn this component's effects, which in turn flipped the
   * `value` prop on the native `TextInput` mid-commit and tripped React's
   * "Maximum update depth" guard during `useLayoutEffect`.
   */
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  /**
   * Clear internal text on tab/route focus (original behavior for
   * uncontrolled consumers like the pro client directory). We also notify
   * the parent once via `onSearch("")` so its derived state resets too.
   * This effect only reacts to navigation focus, never to `onSearch`
   * identity, so it can't become a feedback loop.
   */
  useEffect(() => {
    if (!isControlled && routeFocused) {
      setInternalQuery("");
      onSearchRef.current("");
    }
  }, [routeFocused, isControlled]);

  const handleSearch = () => {
    if (!query) {
      return Alert.alert(
        "Missing query",
        "Please input something to search results across database"
      );
    }
    onSearchRef.current(query);
  };

  const clearQuery = useCallback(() => {
    if (isControlled) {
      onSearchRef.current("");
    } else {
      setInternalQuery("");
      onSearchRef.current("");
    }
    clearSearch?.();
  }, [clearSearch, isControlled]);

  return (
    <View
      style={[
        styles.container,
        variant === "whitePill" && [
          styles.containerWhitePill,
          {
            width: whitePillStretch ? ("100%" as const) : responsiveScale(pillW),
            alignSelf: whitePillStretch ? ("stretch" as const) : "center",
            height: responsiveScale(pillH),
            minHeight: responsiveScale(pillH),
            borderRadius: responsiveScale(pillH / 2),
            backgroundColor: whitePillFill ?? SEARCH_BAR_FILL,
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
          /**
           * Call `onSearch` directly from here instead of via a useEffect
           * on `internalQuery`. Forwarding through an effect with
           * `onSearch` in its deps used to re-fire on every parent render
           * (unstable callback identity) and interact badly with
           * TextInput's native-sync layout effect.
           */
          if (isControlled) {
            onSearchRef.current(e);
          } else {
            setInternalQuery(e);
            onSearchRef.current(e);
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