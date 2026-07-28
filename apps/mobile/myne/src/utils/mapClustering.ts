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
/** Hysteresis band so cluster ↔ pin mode does not flip rapidly while pinching. */
export const CLUSTER_ZOOM_IN_LATITUDE_DELTA = 0.032;
export const CLUSTER_ZOOM_OUT_LATITUDE_DELTA = 0.022;

/**
 * True when the map is zoomed out enough to prefer clusters over individual pins.
 */
export function shouldClusterByZoom(latitudeDelta: number): boolean {
  return latitudeDelta > ZOOM_CLUSTER_LATITUDE_DELTA;
}

/**
 * Cluster mode with hysteresis — pass previous `clustering` state from the screen.
 */
export function shouldClusterByZoomWithHysteresis(
  latitudeDelta: number,
  clustering: boolean
): boolean {
  if (clustering) {
    return latitudeDelta > CLUSTER_ZOOM_OUT_LATITUDE_DELTA;
  }
  return latitudeDelta > CLUSTER_ZOOM_IN_LATITUDE_DELTA;
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

/** Map camera region — matches `react-native-maps` `Region` without importing it here. */
export type ClusterViewport = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type MapPin = { latitude: number; longitude: number };

const MIN_SPLIT_VIEW_LAT_DELTA = 0.0009;
const MIN_SPLIT_VIEW_LNG_DELTA = 0.0009;
const SINGLE_PIN_CONTEXT_DELTA = 0.009;

function pinBoundingBox(pins: MapPin[]) {
  let minLat = pins[0].latitude;
  let maxLat = pins[0].latitude;
  let minLng = pins[0].longitude;
  let maxLng = pins[0].longitude;
  for (const pin of pins) {
    minLat = Math.min(minLat, pin.latitude);
    maxLat = Math.max(maxLat, pin.latitude);
    minLng = Math.min(minLng, pin.longitude);
    maxLng = Math.max(maxLng, pin.longitude);
  }
  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Fit the camera to a set of pins with padding. Never zooms out past `maxRegion`.
 */
export function boundingBoxRegionForPins(
  pins: MapPin[],
  paddingFactor: number,
  maxRegion?: ClusterViewport | null
): ClusterViewport {
  if (pins.length === 0) {
    return (
      maxRegion ?? {
        latitude: 60.3913,
        longitude: 5.3221,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      }
    );
  }

  const { minLat, maxLat, minLng, maxLng } = pinBoundingBox(pins);
  const latSpan = Math.max(maxLat - minLat, 0.00025);
  const lngSpan = Math.max(maxLng - minLng, 0.00025);

  let latitudeDelta = Math.max(latSpan * paddingFactor, MIN_SPLIT_VIEW_LAT_DELTA);
  let longitudeDelta = Math.max(lngSpan * paddingFactor, MIN_SPLIT_VIEW_LNG_DELTA);

  if (maxRegion) {
    latitudeDelta = Math.min(latitudeDelta, maxRegion.latitudeDelta * 0.9);
    longitudeDelta = Math.min(longitudeDelta, maxRegion.longitudeDelta * 0.9);
  }

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}

/**
 * Zoom a cluster just enough that its members split into smaller visible groups,
 * keeping every resulting pin/cluster on screen (based on real coordinates).
 */
export function regionToSplitSalonCluster(
  cluster: SalonMapCluster,
  currentRegion: ClusterViewport | null
): ClusterViewport {
  const members = cluster.members;
  if (members.length <= 1) {
    const pin = members[0];
    if (!pin) {
      return boundingBoxRegionForPins([], paddingFactorForSingle(), currentRegion);
    }
    return regionForSalonPinFocus(pin, currentRegion) ?? {
      latitude: pin.latitude,
      longitude: pin.longitude,
      latitudeDelta: SINGLE_PIN_CONTEXT_DELTA,
      longitudeDelta: SINGLE_PIN_CONTEXT_DELTA,
    };
  }

  let region = boundingBoxRegionForPins(members, 1.6, currentRegion);
  let subclusters = clusterSalonPins(
    members,
    region.latitudeDelta,
    region.longitudeDelta
  );

  let guard = 0;
  while (subclusters.length <= 1 && guard < 12) {
    const nextLat = region.latitudeDelta * 0.72;
    const nextLng = region.longitudeDelta * 0.72;
    if (
      nextLat <= MIN_SPLIT_VIEW_LAT_DELTA * 1.05 &&
      nextLng <= MIN_SPLIT_VIEW_LNG_DELTA * 1.05
    ) {
      break;
    }
    region = {
      latitude: region.latitude,
      longitude: region.longitude,
      latitudeDelta: nextLat,
      longitudeDelta: nextLng,
    };
    subclusters = clusterSalonPins(
      members,
      region.latitudeDelta,
      region.longitudeDelta
    );
    guard += 1;
  }

  const { minLat, maxLat, minLng, maxLng } = pinBoundingBox(members);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: region.latitudeDelta,
    longitudeDelta: region.longitudeDelta,
  };
}

function paddingFactorForSingle(): number {
  return 2.2;
}

/** Gentle focus on one salon; returns null when the map is already close enough. */
export function regionForSalonPinFocus(
  salon: SalonPin,
  currentRegion: ClusterViewport | null
): ClusterViewport | null {
  if (!currentRegion) {
    return boundingBoxRegionForPins([salon], paddingFactorForSingle(), null);
  }

  const latInside =
    Math.abs(salon.latitude - currentRegion.latitude) <=
    currentRegion.latitudeDelta * 0.35;
  const lngInside =
    Math.abs(salon.longitude - currentRegion.longitude) <=
    currentRegion.longitudeDelta * 0.35;
  const closeEnough = currentRegion.latitudeDelta <= 0.014;

  if (latInside && lngInside && closeEnough) {
    return null;
  }

  return boundingBoxRegionForPins([salon], paddingFactorForSingle(), currentRegion);
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
