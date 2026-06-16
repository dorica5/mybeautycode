import { api } from "@/src/lib/apiClient";
import { useQuery } from "@tanstack/react-query";

/** One salon pin = one Google Place with ≥1 matching pro listing it as a business address. */
export type SalonPin = {
  id: string;
  google_place_id: string;
  name: string | null;
  formatted_address: string;
  latitude: number;
  longitude: number;
  professional_count: number;
};

export type SalonProfessional = {
  professional_profile_id: string;
  profile_id: string;
  hairdresser_id: string;
  full_name: string | null;
  avatar_url: string | null;
  has_relationship: boolean;
  link_pending: boolean;
  business_name: string | null;
};

export type SalonBounds = {
  neLat: number;
  neLng: number;
  swLat: number;
  swLng: number;
};

/**
 * Filter tile code (from filter-before-map.tsx) → backend profession code.
 * The "brows" tile maps to the merged `brows_lashes` profession lane.
 * Barber is its own lane (NOT mapped to hair) — keeps the discovery surface
 * isolated from hairdressers.
 */
export function toBackendProfessionCode(
  tile: "hair" | "nails" | "brows" | "barber" | null | undefined
): string | null {
  if (tile === "hair") return "hair";
  if (tile === "nails") return "nails";
  if (tile === "brows") return "brows_lashes";
  if (tile === "barber") return "barber";
  return null;
}

/** Stable cache/API key fragment for discovery filter list (sorted unique codes). */
export function discoveryCategoriesQueryKeyPart(
  cats: readonly string[] | null | undefined
): string {
  if (!cats?.length) return "all";
  return [...new Set(cats.map((c) => c.trim().toLowerCase()).filter(Boolean))]
    .sort()
    .join(",");
}

/** Round bounds to avoid spamming the cache/network with tiny pan deltas. */
function roundBounds(b: SalonBounds): SalonBounds {
  const r = (n: number) => Math.round(n * 1e4) / 1e4;
  return {
    neLat: r(b.neLat),
    neLng: r(b.neLng),
    swLat: r(b.swLat),
    swLng: r(b.swLng),
  };
}

export function salonProfessionalsQueryKey(
  salonId: string,
  professionCode: string | null | undefined,
  discoveryCategories: readonly string[] | null | undefined
) {
  const code = professionCode?.trim() || null;
  const discKey = discoveryCategoriesQueryKeyPart(discoveryCategories ?? null);
  return ["salons", "professionals", salonId, code ?? "any", discKey] as const;
}

export async function fetchSalonProfessionals(
  salonId: string,
  professionCode: string | null | undefined,
  discoveryCategories?: readonly string[] | null
): Promise<SalonProfessional[]> {
  const code = professionCode?.trim() || null;
  const discStr = discoveryCategoriesQueryKeyPart(discoveryCategories ?? null);
  const params = new URLSearchParams();
  if (code) params.set("profession_code", code);
  if (discStr !== "all") {
    params.set("discovery_categories", discStr);
  }
  const qs = params.toString();
  return api.get<SalonProfessional[]>(
    `/api/salons/${salonId}/professionals${qs ? `?${qs}` : ""}`
  );
}

export const useSalonsInBounds = (
  bounds: SalonBounds | null,
  professionCode: string | null | undefined,
  discoveryCategories?: readonly string[] | null
) => {
  const rounded = bounds ? roundBounds(bounds) : null;
  const code = professionCode?.trim() || null;
  const discKey = discoveryCategoriesQueryKeyPart(discoveryCategories ?? null);
  const profKey = code ?? "any";
  return useQuery<SalonPin[]>({
    queryKey: [
      "salons",
      "nearby",
      rounded?.neLat,
      rounded?.neLng,
      rounded?.swLat,
      rounded?.swLng,
      profKey,
      discKey,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        neLat: String(rounded!.neLat),
        neLng: String(rounded!.neLng),
        swLat: String(rounded!.swLat),
        swLng: String(rounded!.swLng),
      });
      if (code) params.set("profession_code", code);
      if (discKey !== "all") {
        params.set("discovery_categories", discKey);
      }
      return api.get<SalonPin[]>(`/api/salons/nearby?${params.toString()}`);
    },
    enabled: !!rounded,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: (previousData, previousQuery) => {
      if (!previousQuery?.queryKey) return undefined;
      const pk = previousQuery.queryKey;
      const prevProf = pk[6];
      const prevDisc = pk[7];
      if (prevProf !== profKey || prevDisc !== discKey) return undefined;
      return previousData;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

export const useSalonProfessionals = (
  salonId: string | null,
  professionCode: string | null | undefined,
  discoveryCategories?: readonly string[] | null
) => {
  return useQuery<SalonProfessional[]>({
    queryKey: salonId
      ? salonProfessionalsQueryKey(salonId, professionCode, discoveryCategories)
      : ["salons", "professionals", null, "any", "all"],
    queryFn: () =>
      fetchSalonProfessionals(salonId!, professionCode, discoveryCategories),
    enabled: !!salonId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};
