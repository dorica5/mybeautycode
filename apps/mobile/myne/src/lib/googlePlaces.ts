import Constants from "expo-constants";
import { api } from "@/src/lib/apiClient";

/**
 * Shared helpers for Google Maps Platform REST calls from the mobile client.
 *
 * Production builds call `/api/places/*` on your backend so the Google key
 * stays server-side (Android/iOS app-restricted Maps keys block direct REST
 * calls from JavaScript). Falls back to a client key for local dev when set.
 */

export function getGooglePlacesKey(): string {
  const extra = Constants.expoConfig?.extra as
    | { googlePlacesApiKey?: string }
    | undefined;
  return (extra?.googlePlacesApiKey ?? "").trim();
}

/** True when autocomplete can run via backend and/or a client Places key. */
export function placesSearchAvailable(): boolean {
  return hasBackendApi() || !!getGooglePlacesKey();
}

function hasBackendApi(): boolean {
  const raw =
    Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ??
    process.env.EXPO_PUBLIC_API_URL ??
    "";
  return String(raw).trim().length > 0;
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

function placesQueryParams(opts?: PlacesLookupOptions): URLSearchParams {
  const params = new URLSearchParams();
  if (opts?.countryCode && opts.countryCode.length === 2) {
    params.set("countryCode", opts.countryCode);
  }
  if (opts?.preferredCountryCode && opts.preferredCountryCode.length === 2) {
    params.set("preferredCountryCode", opts.preferredCountryCode);
  }
  return params;
}

/**
 * Place Details: resolve a Google place id into the canonical formatted
 * address + coordinates + suggested viewport. Returns `null` on any error
 * or unexpected shape.
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

async function fetchAutocompleteViaBackend(
  input: string,
  opts?: PlacesLookupOptions
): Promise<AutocompletePrediction[] | null> {
  if (!hasBackendApi()) return null;
  try {
    const params = placesQueryParams(opts);
    params.set("input", input.trim());
    const data = await api.get<{ predictions?: AutocompletePrediction[] }>(
      `/api/places/autocomplete?${params.toString()}`
    );
    return data.predictions ?? [];
  } catch (e) {
    if (__DEV__) {
      console.warn("[Places Autocomplete via API]", e);
    }
    return null;
  }
}

async function fetchPlaceDetailsViaBackend(
  placeId: string,
  opts?: PlacesLookupOptions
): Promise<ResolvedPlace | null | undefined> {
  if (!hasBackendApi()) return undefined;
  try {
    const params = placesQueryParams(opts);
    params.set("placeId", placeId);
    const data = await api.get<{ place?: ResolvedPlace }>(
      `/api/places/details?${params.toString()}`
    );
    return data.place ?? null;
  } catch (e) {
    if (__DEV__) {
      console.warn("[Place Details via API]", e);
    }
    return null;
  }
}

async function geocodeAddressViaBackend(
  query: string,
  opts?: PlacesLookupOptions
): Promise<ResolvedPlace | null | undefined> {
  if (!hasBackendApi()) return undefined;
  try {
    const params = placesQueryParams(opts);
    params.set("address", query.trim());
    const data = await api.get<{ place?: ResolvedPlace }>(
      `/api/places/geocode?${params.toString()}`
    );
    return data.place ?? null;
  } catch (e) {
    if (__DEV__) {
      console.warn("[Geocoding via API]", e);
    }
    return null;
  }
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
  if (!q || q.length < 2) return [];

  const viaBackend = await fetchAutocompleteViaBackend(q, opts);
  if (viaBackend !== null) return viaBackend;

  if (!apiKey) return [];
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

export async function fetchPlaceDetails(
  placeId: string,
  apiKey: string,
  opts?: PlacesLookupOptions
): Promise<ResolvedPlace | null> {
  if (!placeId) return null;

  const viaBackend = await fetchPlaceDetailsViaBackend(placeId, opts);
  if (viaBackend !== undefined) return viaBackend;

  if (!apiKey) return null;
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
 */
export async function geocodeAddress(
  query: string,
  apiKey: string,
  opts?: PlacesLookupOptions
): Promise<ResolvedPlace | null> {
  const q = query.trim();
  if (!q) return null;

  const viaBackend = await geocodeAddressViaBackend(q, opts);
  if (viaBackend !== undefined) return viaBackend;

  if (!apiKey) return null;
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
