import Constants from "expo-constants";

/**
 * Shared helpers for Google Maps Platform REST calls from the mobile client.
 * The key comes from `app.config.js` → `expoConfig.extra.googlePlacesApiKey`
 * (backed by `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`).
 *
 * Every screen that does address autocomplete / geocoding / place detail
 * lookups imports from here so there's one place to change URLs, quotas,
 * or migrate to Places API (New).
 */

export function getGooglePlacesKey(): string {
  const extra = Constants.expoConfig?.extra as
    | { googlePlacesApiKey?: string }
    | undefined;
  return (extra?.googlePlacesApiKey ?? "").trim();
}

/** Bias place-result language (street names, etc.) toward the user's region. */
export function placesLanguageForCountry(countryCode?: string): string {
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

export type AutocompletePrediction = {
  description: string;
  place_id: string;
};

/**
 * Options for autocomplete / geocoding / place-details calls. `countryCode`
 * acts as a HARD filter for the Places API (it rejects everything outside
 * the country), so we only pass it when the caller actually wants to
 * restrict results (e.g. a country-specific signup). For the discovery
 * map we leave it unset so users can search places anywhere in the world.
 *
 * `preferredCountryCode` on its own only influences `language` — it never
 * restricts the result set.
 */
export type PlacesLookupOptions = {
  /** Hard filter: only return results in this ISO-3166 country code. */
  countryCode?: string;
  /** Soft bias for response language only (no filtering). */
  preferredCountryCode?: string;
};

function resolveLanguage(opts?: PlacesLookupOptions): string {
  return placesLanguageForCountry(
    opts?.preferredCountryCode ?? opts?.countryCode
  );
}

/**
 * Places Autocomplete (classic). Returns up to Google's default list of
 * predictions. We intentionally do NOT pass `types=address` — that filter
 * excludes partial street / area queries and worsens coverage for
 * Scandinavian residential addresses.
 */
export async function fetchAutocomplete(
  input: string,
  apiKey: string,
  opts?: PlacesLookupOptions
): Promise<AutocompletePrediction[]> {
  const q = input.trim();
  if (!q || q.length < 2 || !apiKey) return [];
  const params = new URLSearchParams({
    input: q,
    key: apiKey,
    language: resolveLanguage(opts),
  });
  if (opts?.countryCode && opts.countryCode.length === 2) {
    params.append("components", `country:${opts.countryCode.toLowerCase()}`);
  }
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
  try {
    const res = await fetch(url);
    const json = (await res.json()) as {
      predictions?: AutocompletePrediction[];
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
  } catch {
    return [];
  }
}

/**
 * Lat/lng bounding box as returned by Google (`geometry.viewport`). Use
 * this to size the map region so a street shows the whole street, a city
 * shows the whole city, and a POI shows its immediate block.
 */
export type PlaceViewport = {
  northeast: { latitude: number; longitude: number };
  southwest: { latitude: number; longitude: number };
};

export type ResolvedPlace = {
  /** Google place id when available; may be empty for free-text geocoding without a matching place. */
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  /** Recommended map viewport for this place, when Google returned one. */
  viewport: PlaceViewport | null;
};

type RawViewport = {
  northeast?: { lat?: number; lng?: number };
  southwest?: { lat?: number; lng?: number };
};

function parseViewport(raw?: RawViewport | null): PlaceViewport | null {
  const neLat = raw?.northeast?.lat;
  const neLng = raw?.northeast?.lng;
  const swLat = raw?.southwest?.lat;
  const swLng = raw?.southwest?.lng;
  if (
    typeof neLat !== "number" ||
    typeof neLng !== "number" ||
    typeof swLat !== "number" ||
    typeof swLng !== "number"
  ) {
    return null;
  }
  return {
    northeast: { latitude: neLat, longitude: neLng },
    southwest: { latitude: swLat, longitude: swLng },
  };
}

/**
 * Place Details: resolve a Google place id into the canonical formatted
 * address + coordinates + suggested viewport. Returns `null` on any error
 * or unexpected shape.
 */
export async function fetchPlaceDetails(
  placeId: string,
  apiKey: string,
  opts?: PlacesLookupOptions
): Promise<ResolvedPlace | null> {
  if (!placeId || !apiKey) return null;
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "place_id,formatted_address,geometry",
    key: apiKey,
    language: resolveLanguage(opts),
  });
  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
  try {
    const res = await fetch(url);
    const json = (await res.json()) as {
      result?: {
        place_id?: string;
        formatted_address?: string;
        geometry?: {
          location?: { lat?: number; lng?: number };
          viewport?: RawViewport;
        };
      };
      status: string;
      error_message?: string;
    };
    const result = json.result;
    const formatted = result?.formatted_address;
    const loc = result?.geometry?.location;
    const lat = loc?.lat;
    const lng = loc?.lng;
    if (
      json.status !== "OK" ||
      !formatted ||
      typeof lat !== "number" ||
      typeof lng !== "number"
    ) {
      if (__DEV__ && json.error_message) {
        console.warn("[Place Details]", json.status, json.error_message);
      }
      return null;
    }
    return {
      placeId: result?.place_id ?? placeId,
      formattedAddress: formatted,
      latitude: lat,
      longitude: lng,
      viewport: parseViewport(result?.geometry?.viewport),
    };
  } catch {
    return null;
  }
}

/**
 * Geocode a free-text address into a canonical place.
 *
 * Covers the common case where a professional types a real address that
 * Places Autocomplete doesn't surface as a suggestion (Scandinavian
 * residential street numbers are a classic gap — Autocomplete leans on the
 * POI index). Geocoding is much more forgiving because it matches on the
 * address string directly.
 *
 * Returns `null` on no-match / network error so callers can decide whether
 * to block save, fall back to saving text-only, or prompt the user.
 */
export async function geocodeAddress(
  query: string,
  apiKey: string,
  opts?: PlacesLookupOptions
): Promise<ResolvedPlace | null> {
  const q = query.trim();
  if (!q || !apiKey) return null;
  const params = new URLSearchParams({
    address: q,
    key: apiKey,
    language: resolveLanguage(opts),
  });
  if (opts?.countryCode && opts.countryCode.length === 2) {
    params.append("components", `country:${opts.countryCode.toUpperCase()}`);
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
  try {
    const res = await fetch(url);
    const json = (await res.json()) as {
      status: string;
      error_message?: string;
      results?: Array<{
        place_id?: string;
        formatted_address?: string;
        geometry?: {
          location?: { lat?: number; lng?: number };
          viewport?: RawViewport;
        };
      }>;
    };
    if (json.status !== "OK" || !json.results?.length) {
      if (__DEV__ && json.error_message) {
        console.warn("[Geocoding]", json.status, json.error_message);
      }
      return null;
    }
    const top = json.results[0];
    const loc = top.geometry?.location;
    const formatted = top.formatted_address;
    const lat = loc?.lat;
    const lng = loc?.lng;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      typeof formatted !== "string"
    ) {
      return null;
    }
    return {
      placeId: top.place_id ?? "",
      formattedAddress: formatted,
      latitude: lat,
      longitude: lng,
      viewport: parseViewport(top.geometry?.viewport),
    };
  } catch {
    return null;
  }
}
