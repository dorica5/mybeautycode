/** Server-side Google Places / Geocoding REST helpers (key stays on backend). */

export function getGooglePlacesApiKey(): string {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() ?? "";
}

export type AutocompletePrediction = {
  description: string;
  place_id: string;
};

export type PlaceViewport = {
  northeast: { latitude: number; longitude: number };
  southwest: { latitude: number; longitude: number };
};

export type ResolvedPlace = {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  viewport: PlaceViewport | null;
};

export type PlacesLookupOptions = {
  countryCode?: string;
  preferredCountryCode?: string;
};

function placesLanguage(opts?: PlacesLookupOptions): string {
  const c = (opts?.preferredCountryCode ?? opts?.countryCode ?? "").toUpperCase();
  const map: Record<string, string> = {
    NO: "no",
    SE: "sv",
    DK: "da",
    FI: "fi",
    GB: "en",
    US: "en",
  };
  return map[c] ?? "en";
}

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
    language: placesLanguage(opts),
  });
  if (opts?.countryCode && opts.countryCode.length === 2) {
    params.append("components", `country:${opts.countryCode.toLowerCase()}`);
  }
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
  const res = await fetch(url);
  const json = (await res.json()) as {
    predictions?: AutocompletePrediction[];
    status: string;
    error_message?: string;
  };
  if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
    throw new Error(json.error_message ?? json.status);
  }
  return json.predictions ?? [];
}

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
    language: placesLanguage(opts),
  });
  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
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
    if (json.error_message) throw new Error(json.error_message);
    return null;
  }
  return {
    placeId: result?.place_id ?? placeId,
    formattedAddress: formatted,
    latitude: lat,
    longitude: lng,
    viewport: parseViewport(result?.geometry?.viewport),
  };
}

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
    language: placesLanguage(opts),
  });
  if (opts?.countryCode && opts.countryCode.length === 2) {
    params.append("components", `country:${opts.countryCode.toUpperCase()}`);
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
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
    if (json.error_message) throw new Error(json.error_message);
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
}
