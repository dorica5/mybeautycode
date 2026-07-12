import { primaryBlack, primaryWhite } from "@/src/constants/Colors";
import { authFieldInputStyle } from "@/src/constants/authFieldInputStyle";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
  View,
  ViewStyle,
} from "react-native";
import { BrandOutlineField } from "@/src/components/BrandOutlineField";
import {
  AutocompletePrediction,
  ResolvedPlace,
  fetchAutocomplete,
  fetchPlaceDetails,
  getGooglePlacesKey,
} from "@/src/lib/googlePlaces";

type Prediction = AutocompletePrediction;

/** Back-compat alias — callers imported this before the helpers moved. */
export type PlaceDetails = ResolvedPlace;

/** One line + vertical padding — matches single-line brand fields when empty. */
const ADDRESS_INPUT_MIN = responsiveScale(52, 48);
const ADDRESS_INPUT_MAX = responsiveScale(280);
const INPUT_LINE_HEIGHT = authFieldInputStyle.lineHeight as number;
const SINGLE_LINE_PAD = Math.max(
  0,
  Math.floor((ADDRESS_INPUT_MIN - INPUT_LINE_HEIGHT) / 2)
);
/** Switch to multiline before the line wraps (single-line inputs don't wrap). */
const MULTILINE_CHAR_THRESHOLD = 44;

export type BrandAddressAutocompleteFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /**
   * Called when the user picks a prediction and we resolve full place details.
   * Use this to capture `placeId` + lat/lng alongside the formatted address
   * (e.g. to send `business_place_id` on the profile PUT). Receives `null` when
   * the user manually edits the text after picking (so stale coords aren't saved).
   */
  onPlaceSelected?: (details: PlaceDetails | null) => void;
  /** ISO 3166-1 alpha-2 (e.g. profile.country) to bias autocomplete */
  countryCode?: string;
  containerStyle?: ViewStyle;
};

/**
 * Address entry with Google Places Autocomplete when `extra.googlePlacesApiKey` is set
 * (see `app.config.js` / `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`). Falls back to a plain multiline field otherwise.
 */
export function BrandAddressAutocompleteField({
  label,
  value,
  onChangeText,
  onPlaceSelected,
  countryCode,
  containerStyle,
}: BrandAddressAutocompleteFieldProps) {
  const apiKey = getGooglePlacesKey();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState(false);
  /** User tapped into the field (don't autocomplete prefilled text until they edit). */
  const [fieldFocused, setFieldFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True after the user changes text this focus session; reset on focus / blur; stays false when applying a pick. */
  const editedSinceFocusRef = useRef(false);

  const runAutocomplete = useCallback(
    async (q: string) => {
      if (!apiKey || q.trim().length < 2) {
        setPredictions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const next = await fetchAutocomplete(q, apiKey, { countryCode });
        setPredictions(next.slice(0, 6));
      } catch {
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    },
    [apiKey, countryCode]
  );

  // True while we are programmatically applying a pick's formatted_address via
  // onChangeText, so the "user edited manually" effect below doesn't fire.
  const applyingPickRef = useRef(false);

  const emitChangeText = useCallback(
    (text: string) => {
      if (!applyingPickRef.current) {
        editedSinceFocusRef.current = true;
      }
      onChangeText(text);
    },
    [onChangeText]
  );

  /**
   * Autocomplete only while focused AND the user has edited since focusing —
   * avoids suggestions for the saved address on open and chained variants right after picking one.
   */
  useEffect(() => {
    if (!apiKey) return;
    if (!fieldFocused || !editedSinceFocusRef.current) {
      setPredictions([]);
      setLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runAutocomplete(value);
    }, 380);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, apiKey, fieldFocused, runAutocomplete]);

  const onPick = async (p: Prediction) => {
    if (!apiKey) return;
    setPicking(true);
    setPredictions([]);
    try {
      const details = await fetchPlaceDetails(p.place_id, apiKey, {
        countryCode,
      });
      if (details) {
        applyingPickRef.current = true;
        editedSinceFocusRef.current = false;
        emitChangeText(details.formattedAddress);
        onPlaceSelected?.(details);
      } else {
        applyingPickRef.current = true;
        editedSinceFocusRef.current = false;
        emitChangeText(p.description);
        onPlaceSelected?.(null);
      }
    } finally {
      setPicking(false);
      Keyboard.dismiss();
      // Release on the next tick so the effect tied to `value` sees the flag.
      requestAnimationFrame(() => {
        applyingPickRef.current = false;
      });
    }
  };

  // If the user types after having picked, clear the cached coords (the
  // formatted address no longer matches the place).
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (prevValueRef.current !== value) {
      if (!applyingPickRef.current) {
        onPlaceSelected?.(null);
      }
      prevValueRef.current = value;
    }
  }, [value, onPlaceSelected]);

  /** Only toggles scroll at max height — avoids height state fighting contentSize. */
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);

  useEffect(() => {
    if (!value.trim()) {
      setIsWrapped(false);
    }
  }, [value]);

  const onInputContentSizeChange = (
    e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>
  ) => {
    const contentH = Math.ceil(e.nativeEvent.contentSize.height);
    setScrollEnabled(contentH >= ADDRESS_INPUT_MAX - 4);
    if (contentH > INPUT_LINE_HEIGHT + 8) {
      setIsWrapped(true);
    } else if (!value.includes("\n") && contentH <= INPUT_LINE_HEIGHT + 2) {
      setIsWrapped(false);
    }
  };

  const isExpanded =
    value.includes("\n") ||
    value.length > MULTILINE_CHAR_THRESHOLD ||
    isWrapped;

  const clearBlurTimer = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  };

  const scheduleBlurClear = () => {
    clearBlurTimer();
    blurTimer.current = setTimeout(() => {
      setPredictions([]);
      setFieldFocused(false);
      Keyboard.dismiss();
    }, 220);
  };

  if (!apiKey) {
    return (
      <View style={containerStyle}>
        <BrandOutlineField
          label={label}
          value={value}
          onChangeText={onChangeText}
        />
        <Text style={styles.hint}>
          Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY (or enable Places API on your
          Maps key) for address search. You can still type your full address
          below.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.outer, containerStyle]}>
      <Text style={[Typography.label, styles.label]} accessibilityRole="text">
        {label}
      </Text>
      <View style={styles.fieldShell}>
        <TextInput
          value={value}
          onChangeText={emitChangeText}
          placeholderTextColor={`${primaryBlack}99`}
          cursorColor={primaryBlack}
          selectionColor={primaryBlack}
          underlineColorAndroid="transparent"
          accessibilityLabel={label}
          textAlignVertical={isExpanded ? "top" : "center"}
          multiline={isExpanded}
          scrollEnabled={scrollEnabled}
          returnKeyType="default"
          autoCorrect={false}
          {...(Platform.OS === "android" ? { includeFontPadding: false } : {})}
          onContentSizeChange={onInputContentSizeChange}
          onFocus={() => {
            clearBlurTimer();
            editedSinceFocusRef.current = false;
            setFieldFocused(true);
          }}
          onBlur={scheduleBlurClear}
          style={[
            styles.input,
            Typography.bodyMedium,
            isExpanded ? authFieldInputStyle : styles.singleLineInput,
            {
              color: primaryBlack,
              minHeight: ADDRESS_INPUT_MIN,
              maxHeight: ADDRESS_INPUT_MAX,
            },
          ]}
        />
        {loading || picking ? (
          <View style={styles.loader}>
            <ActivityIndicator color={primaryBlack} />
          </View>
        ) : null}
      </View>
      {predictions.length > 0 ? (
        <View style={styles.suggestions} pointerEvents="box-none">
          {predictions.map((p) => (
            <Pressable
              key={p.place_id}
              accessibilityRole="button"
              accessibilityLabel={p.description}
              onPressIn={() => clearBlurTimer()}
              onPress={() => onPick(p)}
              style={({ pressed }) => [
                styles.suggestionRow,
                pressed && styles.suggestionRowPressed,
              ]}
            >
              <Text
                style={[Typography.bodySmall, styles.suggestionText]}
              >
                {p.description}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  label: {
    color: primaryBlack,
    marginBottom: responsiveMargin(8),
    alignSelf: "flex-start",
  },
  fieldShell: {
    position: "relative",
    borderRadius: responsiveScale(20),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
    justifyContent: "flex-start",
  },
  input: {
    paddingHorizontal: responsivePadding(18),
    paddingRight: responsivePadding(44),
    width: "100%",
    margin: 0,
  },
  singleLineInput: {
    paddingTop: SINGLE_LINE_PAD,
    paddingBottom: SINGLE_LINE_PAD,
    lineHeight: INPUT_LINE_HEIGHT,
  },
  loader: {
    position: "absolute",
    right: responsivePadding(12),
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  suggestions: {
    marginTop: responsiveMargin(6),
    borderRadius: responsiveScale(14),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
    overflow: "hidden",
    zIndex: 20,
    elevation: 6,
  },
  suggestionRow: {
    paddingVertical: responsivePadding(12),
    paddingHorizontal: responsivePadding(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${primaryBlack}33`,
  },
  suggestionRowPressed: {
    backgroundColor: `${primaryBlack}0D`,
  },
  suggestionText: {
    color: primaryBlack,
    flexShrink: 1,
  },
  hint: {
    ...Typography.bodySmall,
    color: primaryBlack,
    opacity: 0.65,
    marginTop: responsiveMargin(8),
  },
});
