import { primaryBlack, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import Constants from "expo-constants";
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

type Prediction = { description: string; place_id: string };

function getPlacesApiKey(): string {
  const extra = Constants.expoConfig?.extra as
    | { googlePlacesApiKey?: string }
    | undefined;
  return (extra?.googlePlacesApiKey ?? "").trim();
}

/** Bias place-result language (street names, etc.) toward the user’s region. */
function placesLanguageForCountry(countryCode?: string): string {
  const c = countryCode?.toUpperCase() ?? "";
  const map: Record<string, string> = {
    NO: "no",
    SE: "sv",
    DK: "da",
    FI: "fi",
    IS: "is",
    DE: "de",
    NL: "nl",
    FR: "fr",
    ES: "es",
    IT: "it",
    PT: "pt",
    PL: "pl",
    GB: "en",
    US: "en",
  };
  return map[c] ?? "en";
}

/**
 * Same class of results as the Maps search box: do not restrict to `types=address`
 * (that misses many partial street / area queries). Optional country filter only.
 */
async function fetchAutocomplete(
  input: string,
  apiKey: string,
  countryCode?: string
): Promise<Prediction[]> {
  const q = input.trim();
  if (!q || q.length < 2) return [];
  const params = new URLSearchParams({
    input: q,
    key: apiKey,
    language: placesLanguageForCountry(countryCode),
  });
  if (countryCode && countryCode.length === 2) {
    params.append("components", `country:${countryCode.toLowerCase()}`);
  }
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
  const res = await fetch(url);
  const json = (await res.json()) as {
    predictions?: Prediction[];
    status: string;
    error_message?: string;
  };
  if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
    if (__DEV__ && json.error_message) {
      console.warn("[Places Autocomplete]", json.status, json.error_message);
    }
    return [];
  }
  return json.predictions ?? [];
}

async function fetchFormattedAddress(
  placeId: string,
  apiKey: string,
  countryCode?: string
): Promise<string | null> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "formatted_address",
    key: apiKey,
    language: placesLanguageForCountry(countryCode),
  });
  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
  const res = await fetch(url);
  const json = (await res.json()) as {
    result?: { formatted_address?: string };
    status: string;
  };
  if (json.status !== "OK" || !json.result?.formatted_address) return null;
  return json.result.formatted_address;
}

export type BrandAddressAutocompleteFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
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
  countryCode,
  containerStyle,
}: BrandAddressAutocompleteFieldProps) {
  const apiKey = getPlacesApiKey();
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
        const next = await fetchAutocomplete(q, apiKey, countryCode);
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

  const onPick = async (p: Prediction) => {
    if (!apiKey) return;
    setPicking(true);
    setPredictions([]);
    try {
      const formatted = await fetchFormattedAddress(
        p.place_id,
        apiKey,
        countryCode
      );
      onChangeText(formatted ?? p.description);
    } finally {
      setPicking(false);
    }
  };

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
