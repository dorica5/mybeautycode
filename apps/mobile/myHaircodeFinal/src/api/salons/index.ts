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
 */
export function toBackendProfessionCode(
  tile: "hair" | "nails" | "brows" | null | undefined
): string | null {
  if (tile === "hair") return "hair";
  if (tile === "nails") return "nails";
  if (tile === "brows") return "brows_lashes";
  return null;
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

export const useSalonsInBounds = (
  bounds: SalonBounds | null,
  professionCode: string | null | undefined
) => {
  const rounded = bounds ? roundBounds(bounds) : null;
  const code = professionCode?.trim() || null;
  return useQuery<SalonPin[]>({
    queryKey: [
      "salons",
      "nearby",
      rounded?.neLat,
      rounded?.neLng,
      rounded?.swLat,
      rounded?.swLng,
      code ?? "any",
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        neLat: String(rounded!.neLat),
        neLng: String(rounded!.neLng),
        swLat: String(rounded!.swLat),
        swLng: String(rounded!.swLng),
      });
      if (code) params.set("profession_code", code);
      return api.get<SalonPin[]>(`/api/salons/nearby?${params.toString()}`);
    },
    enabled: !!rounded,
    staleTime: 15_000,
  });
};

export const useSalonProfessionals = (
  salonId: string | null,
  professionCode: string | null | undefined
) => {
  const code = professionCode?.trim() || null;
  return useQuery<SalonProfessional[]>({
    queryKey: ["salons", "professionals", salonId, code ?? "any"],
    queryFn: () => {
      const params = new URLSearchParams();
      if (code) params.set("profession_code", code);
      const qs = params.toString();
      return api.get<SalonProfessional[]>(
        `/api/salons/${salonId}/professionals${qs ? `?${qs}` : ""}`
      );
    },
    enabled: !!salonId,
  });
};
