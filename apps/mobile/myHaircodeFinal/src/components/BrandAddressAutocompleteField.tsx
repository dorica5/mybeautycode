import { primaryBlack, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (!apiKey) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runAutocomplete(value);
    }, 380);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, apiKey, runAutocomplete]);

  // True while we are programmatically applying a pick's formatted_address via
  // onChangeText, so the "user edited manually" effect below doesn't fire.
  const applyingPickRef = useRef(false);

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
        onChangeText(details.formattedAddress);
        onPlaceSelected?.(details);
      } else {
        applyingPickRef.current = true;
        onChangeText(p.description);
        onPlaceSelected?.(null);
      }
    } finally {
      setPicking(false);
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

  const clearBlurTimer = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  };

  const scheduleBlurClear = () => {
    clearBlurTimer();
    blurTimer.current = setTimeout(() => setPredictions([]), 220);
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
          onChangeText={onChangeText}
          placeholderTextColor={`${primaryBlack}99`}
          cursorColor={primaryBlack}
          selectionColor={primaryBlack}
          underlineColorAndroid="transparent"
          accessibilityLabel={label}
          textAlignVertical="center"
          returnKeyType="search"
          autoCorrect={false}
          onFocus={() => clearBlurTimer()}
          onBlur={scheduleBlurClear}
          style={[styles.input, Typography.bodyMedium, { color: primaryBlack }]}
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
                numberOfLines={3}
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
    maxWidth: 400,
    alignSelf: "center",
  },
  label: {
    color: primaryBlack,
    marginBottom: responsiveMargin(8),
    alignSelf: "flex-start",
  },
  fieldShell: {
    position: "relative",
    borderRadius: responsiveScale(999),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
    minHeight: responsiveScale(52, 46),
    justifyContent: "center",
  },
  input: {
    paddingVertical: responsivePadding(14),
    paddingHorizontal: responsivePadding(18),
    paddingRight: responsivePadding(44),
    minHeight: responsiveScale(52, 46),
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
  },
  hint: {
    ...Typography.bodySmall,
    color: primaryBlack,
    opacity: 0.65,
    marginTop: responsiveMargin(8),
  },
});
