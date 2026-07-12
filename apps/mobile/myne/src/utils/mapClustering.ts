import type { SalonPin } from "@/src/api/salons";
import type { MapProfessionalPin } from "@/src/data/demoMapProfessionals";

export type MapCluster = {
  id: string;
  latitude: number;
  longitude: number;
  members: MapProfessionalPin[];
};

/** Zoomed-out map: one marker per merged area; {@link SalonPin.professional_count} summed. */
export type SalonMapCluster = {
  id: string;
  latitude: number;
  longitude: number;
  members: SalonPin[];
};

/** Above this `latitudeDelta`, show cluster bubbles (numbers / grouped). */
export const ZOOM_CLUSTER_LATITUDE_DELTA = 0.026;

/**
 * True when the map is zoomed out enough to prefer clusters over individual pins.
 */
export function shouldClusterByZoom(latitudeDelta: number): boolean {
  return latitudeDelta > ZOOM_CLUSTER_LATITUDE_DELTA;
}

function expandCluster(
  seed: MapProfessionalPin,
  pool: MapProfessionalPin[],
  thrLat: number,
  thrLng: number
): MapProfessionalPin[] {
  const members: MapProfessionalPin[] = [seed];
  const inCluster = new Set<string>([seed.id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const candidate of pool) {
      if (inCluster.has(candidate.id)) continue;
      const near = members.some(
        (m) =>
          Math.abs(candidate.latitude - m.latitude) < thrLat &&
          Math.abs(candidate.longitude - m.longitude) < thrLng
      );
      if (near) {
        members.push(candidate);
        inCluster.add(candidate.id);
        grew = true;
      }
    }
  }
  return members;
}

/**
 * Group professionals who sit within a threshold (fraction of visible span).
 * Uses transitive closure so A–B and B–C merge into one cluster.
 */
export function clusterProfessionals(
  professionals: MapProfessionalPin[],
  latitudeDelta: number,
  longitudeDelta: number
): MapCluster[] {
  if (professionals.length === 0) return [];

  const thrLat = Math.max(latitudeDelta * 0.13, 0.0006);
  const thrLng = Math.max(longitudeDelta * 0.13, 0.0006);

  const clusters: MapCluster[] = [];
  const assigned = new Set<string>();

  for (const pro of professionals) {
    if (assigned.has(pro.id)) continue;
    const members = expandCluster(pro, professionals, thrLat, thrLng);
    for (const m of members) assigned.add(m.id);

    const lat =
      members.reduce((s, p) => s + p.latitude, 0) / members.length;
    const lng =
      members.reduce((s, p) => s + p.longitude, 0) / members.length;
    clusters.push({
      id: [...members].map((m) => m.id).sort().join("|"),
      latitude: lat,
      longitude: lng,
      members,
    });
  }

  return clusters;
}

function expandSalonCluster(seed: SalonPin, pool: SalonPin[], thrLat: number, thrLng: number): SalonPin[] {
  const members: SalonPin[] = [seed];
  const inCluster = new Set<string>([seed.id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const candidate of pool) {
      if (inCluster.has(candidate.id)) continue;
      const near = members.some(
        (m) =>
          Math.abs(candidate.latitude - m.latitude) < thrLat &&
          Math.abs(candidate.longitude - m.longitude) < thrLng
      );
      if (near) {
        members.push(candidate);
        inCluster.add(candidate.id);
        grew = true;
      }
    }
  }
  return members;
}

/**
 * Merge nearby salon pins when zoomed out so the bubble shows total professionals
 * in the area, not a single stacked pin with count 1.
 */
export function clusterSalonPins(
  salons: SalonPin[],
  latitudeDelta: number,
  longitudeDelta: number
): SalonMapCluster[] {
  if (salons.length === 0) return [];

  const thrLat = Math.max(latitudeDelta * 0.13, 0.0006);
  const thrLng = Math.max(longitudeDelta * 0.13, 0.0006);

  const clusters: SalonMapCluster[] = [];
  const assigned = new Set<string>();

  for (const salon of salons) {
    if (assigned.has(salon.id)) continue;
    const members = expandSalonCluster(salon, salons, thrLat, thrLng);
    for (const m of members) assigned.add(m.id);
    const lat = members.reduce((s, p) => s + p.latitude, 0) / members.length;
    const lng = members.reduce((s, p) => s + p.longitude, 0) / members.length;
    clusters.push({
      id: [...members].map((m) => m.id).sort().join("|"),
      latitude: lat,
      longitude: lng,
      members,
    });
  }

  return clusters;
}

export function salonClusterTotalProfessionals(members: SalonPin[]): number {
  return members.reduce((sum, s) => sum + (s.professional_count ?? 0), 0);
}

const COLOC_ROUND = 6;
const DISPLAY_OFFSET = 0.00022;

/**
 * Slight offsets so individual pins don't sit on identical pixels when zoomed in.
 */
export function withDisplayOffsets(
  professionals: MapProfessionalPin[]
): (MapProfessionalPin & {
  displayLatitude: number;
  displayLongitude: number;
})[] {
  const buckets = new Map<string, MapProfessionalPin[]>();
  for (const p of professionals) {
    const key = `${p.latitude.toFixed(COLOC_ROUND)},${p.longitude.toFixed(COLOC_ROUND)}`;
    const arr = buckets.get(key);
    if (arr) arr.push(p);
    else buckets.set(key, [p]);
  }

  const result: (MapProfessionalPin & {
    displayLatitude: number;
    displayLongitude: number;
  })[] = [];

  for (const group of buckets.values()) {
    if (group.length === 1) {
      const p = group[0];
      result.push({
        ...p,
        displayLatitude: p.latitude,
        displayLongitude: p.longitude,
      });
      continue;
    }
    const n = group.length;
    group.forEach((p, i) => {
      const angle = (2 * Math.PI * i) / n;
      const r = DISPLAY_OFFSET * (0.6 + n * 0.15);
      result.push({
        ...p,
        displayLatitude: p.latitude + Math.sin(angle) * r,
        displayLongitude: p.longitude + Math.cos(angle) * r,
      });
    });
  }

  return result;
}

export function sameAddressForAll(members: MapProfessionalPin[]): boolean {
  if (members.length <= 1) return true;
  const a = members[0].address.trim().toLowerCase();
  return members.every((m) => m.address.trim().toLowerCase() === a);
}

export function sameProfessionalSets(
  a: MapProfessionalPin[] | null | undefined,
  b: MapProfessionalPin[]
): boolean {
  if (!a || a.length !== b.length) return false;
  const setA = new Set(a.map((m) => m.id));
  const setB = new Set(b.map((m) => m.id));
  if (setA.size !== setB.size) return false;
  for (const id of setA) {
    if (!setB.has(id)) return false;
  }
  return true;
}
