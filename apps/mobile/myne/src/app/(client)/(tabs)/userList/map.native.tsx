import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  StatusBar as RNStatusBar,
  useWindowDimensions,
  Animated,
  PanResponder,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  router,
  useLocalSearchParams,
} from "expo-router";
import { ClientProfessionalProfileScreen } from "@/src/components/discover/ClientProfessionalProfileScreen";
import { CaretRight, X } from "phosphor-react-native";
import { ProSubscriberStarBadge } from "@/src/components/ProSubscriberStarBadge";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { NavBackRow, navBackChromeStyles } from "@/src/components/NavBackRow";
import { StatusBar } from "expo-status-bar";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  Region,
  type MapPressEvent,
} from "react-native-maps";
import * as Location from "expo-location";
import { PermissionStatus } from "expo-location";
import Constants from "expo-constants";
import OrganicPattern from "../../../../../assets/images/Organic-pattern-5.svg";
import SearchInput from "@/src/components/SearchInput";
import { ClusterMapBubble } from "@/src/components/ClusterMapBubble";
import { Typography } from "@/src/constants/Typography";
import { SALON_MAP_DARK_STYLE } from "@/src/constants/mapDarkStyle";
import {
  useSalonsInBounds,
  useSalonProfessionals,
  toBackendProfessionCode,
  type DiscoveryMatchMode,
  type SalonDiscoveryFilter,
  type SalonPin,
  type SalonProfessional,
} from "@/src/api/salons";
import {
  AutocompletePrediction,
  fetchAutocomplete,
  fetchPlaceDetails,
  geocodeAddress,
  getGooglePlacesKey,
  type PlaceViewport,
  type ResolvedPlace,
} from "@/src/lib/googlePlaces";
import { useAuth } from "@/src/providers/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { checkRelationship, relationshipCheckQueryKey } from "@/src/api/relationships";
import { blockedIdListQueryKey, blockedIds } from "@/src/api/moderation";
import {
  clientProfileByIdQueryKey,
  fetchClientProfileById,
} from "@/src/api/profiles";
import { isUuid } from "@/src/utils/isUuid";
import {
  primaryBlack,
  primaryGreen,
  primaryWhite,
} from "@/src/constants/Colors";
import {
  responsiveScale,
  responsiveFontSize,
  responsivePadding,
  responsiveMargin,
} from "@/src/utils/responsive";
import {
  clusterSalonPins,
  regionToSplitSalonCluster,
  salonClusterTotalProfessionals,
  shouldClusterByZoomWithHysteresis,
  type SalonMapCluster,
} from "@/src/utils/mapClustering";
import { localizedDiscoveryOptionsForProfession } from "@/src/constants/profDiscoveryCategories";
import type { ProfessionChoiceCode } from "@/src/constants/professionCodes";
import { HorizontalScrollHintRow } from "@/src/components/HorizontalScrollHintRow";
import { useI18n } from "@/src/providers/LanguageProvider";
import { useScrollRevealBack } from "@/src/hooks/useScrollRevealBack";
import { useProductAnalytics } from "@/src/lib/productAnalytics";

const ROW_HEIGHT = 52;
/** Match `SearchInput` default white pill width (design dp) — same as Find professionals. */
const FIND_PROS_SEARCH_BAR_W = 343;
/** Black Search CTA under location field (design dp). */
const MAP_SEARCH_BTN_W = 114;
const MAP_SEARCH_BTN_H = 46;
const CHECK_LOCATION_BTN_W = 194;
const MAP_CARD_RADIUS = 28;
const SECTION_GAP = 46;

/** Pin bottom sheet — height grows with pro count up to a scroll cap. */
const PIN_SHEET_HEADER_DP = 92;
const PIN_SHEET_ROW_COMPACT_DP = 64;
const PIN_SHEET_ROW_WITH_BUSINESS_DP = 88;
const PIN_SHEET_SUMMARY_DP = 32;
/** Max list viewport before scrolling (~4 rows) */
const PIN_SHEET_LIST_MAX_DP = 300;
const PIN_SHEET_MAX_DP = 480;
const PIN_SHEET_COMPACT_BODY_DP = 48;

type PinSheetBodyState = "loading" | "error" | "empty" | "list";

type PinSheetProRow = { hasBusinessName: boolean };

function pinSheetRowHeight(hasBusinessName: boolean): number {
  return responsiveScale(
    hasBusinessName ? PIN_SHEET_ROW_WITH_BUSINESS_DP : PIN_SHEET_ROW_COMPACT_DP
  );
}

function pinSheetLayout(
  proRows: PinSheetProRow[],
  bodyState: PinSheetBodyState
): { bottomReserve: number; listHeight: number; listScrollable: boolean } {
  const header = responsiveScale(PIN_SHEET_HEADER_DP);
  const summary = responsiveScale(PIN_SHEET_SUMMARY_DP);
  const maxList = responsiveScale(PIN_SHEET_LIST_MAX_DP);
  const maxSheet = responsiveScale(PIN_SHEET_MAX_DP);
  const footer = responsiveMargin(22);
  const compactBody = responsiveScale(PIN_SHEET_COMPACT_BODY_DP);

  if (bodyState === "loading") {
    const bottomReserve = header + compactBody + footer;
    return { bottomReserve, listHeight: 0, listScrollable: false };
  }
  if (bodyState === "error" || bodyState === "empty") {
    const bottomReserve = header + compactBody + footer;
    return { bottomReserve, listHeight: 0, listScrollable: false };
  }

  const rawListHeight = proRows.reduce(
    (sum, row) => sum + pinSheetRowHeight(row.hasBusinessName),
    0
  );
  const listScrollable = rawListHeight > maxList;
  const listHeight = listScrollable ? maxList : rawListHeight;
  const bottomReserve = Math.min(
    maxSheet,
    header + summary + listHeight + footer
  );
  return { bottomReserve, listHeight, listScrollable };
}

/** Default map (Bergen) if location permission is denied or unavailable. */
const BERGEN_REGION: Region = {
  latitude: 60.3913,
  longitude: 5.3221,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

function iosGoogleMapsConfigured(): boolean {
  const ios = Constants.expoConfig?.ios as
    { config?: { googleMapsApiKey?: string } } | undefined;
  const extra = Constants.expoConfig?.extra as
    | { EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY?: string }
    | undefined;
  const key =
    ios?.config?.googleMapsApiKey?.trim() ||
    extra?.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY?.trim() ||
    "";
  return Platform.OS === "ios" && key.length > 0;
}

function androidGoogleMapsConfigured(): boolean {
  const android = Constants.expoConfig?.android as
    { config?: { googleMaps?: { apiKey?: string } } } | undefined;
  const extra = Constants.expoConfig?.extra as
    | { EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY?: string }
    | undefined;
  const key =
    android?.config?.googleMaps?.apiKey?.trim() ||
    extra?.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY?.trim() ||
    "";
  return Platform.OS === "android" && key.length > 0;
}

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

/** iOS uses Apple Maps (native). Android store/dev builds use Google via manifest. */
function useGoogleMapsProvider(): boolean {
  if (Platform.OS !== "android") return false;
  if (!isExpoGo()) return true;
  return androidGoogleMapsConfigured();
}

/**
 * Only block maps in Expo Go (no custom native key). Store + dev-client builds
 * always attempt the map — the key lives in AndroidManifest from EAS prebuild.
 */
function canOpenNativeMap(): boolean {
  if (Platform.OS === "ios") return true;
  if (Platform.OS === "android" && !isExpoGo()) return true;
  return androidGoogleMapsConfigured();
}

function mapProviderForPlatform(): typeof PROVIDER_GOOGLE | undefined {
  return useGoogleMapsProvider() ? PROVIDER_GOOGLE : undefined;
}

/**
 * Google helpers (key lookup + geocoding) live in `@/src/lib/googlePlaces`.
 * We import the shared versions so there's one implementation of each.
 */

/** Heading from filter step (`profession` query param). */
function mapScreenTitle(
  profession: string | undefined,
  t: (key: string) => string
): string {
  switch (profession) {
    case "hair":
      return t("discover.discoverHairdressers");
    case "nails":
      return t("discover.discoverNails");
    case "brows":
      return t("discover.discoverBrows");
    case "barber":
      return t("discover.discoverBarbers");
    default:
      return t("discover.discoverSalons");
  }
}

function normalizeProfessionParam(
  p: string | string[] | undefined
): string | undefined {
  if (typeof p === "string") return p;
  if (Array.isArray(p) && p.length > 0) return p[0];
  return undefined;
}

type MapProfession = "hair" | "nails" | "brows" | "barber";

function parseValidProfession(raw?: string): MapProfession | undefined {
  if (
    raw === "hair" ||
    raw === "nails" ||
    raw === "brows" ||
    raw === "barber"
  ) {
    return raw;
  }
  return undefined;
}

function mapProfessionKeyToChoiceCode(key: MapProfession): ProfessionChoiceCode {
  switch (key) {
    case "hair":
      return "hair";
    case "nails":
      return "nails";
    case "brows":
      return "brows_lashes";
    case "barber":
      return "barber";
  }
}

function professionPlural(
  profession: MapProfession,
  count: number,
  t: (key: string) => string
): string {
  const plural = count !== 1;
  switch (profession) {
    case "hair":
      return plural
        ? t("discover.roleHairdressers")
        : t("discover.roleHairdresser");
    case "nails":
      return plural
        ? t("discover.roleNailTechnicians")
        : t("discover.roleNailTechnician");
    case "brows":
      return plural
        ? t("discover.roleBrowStylists")
        : t("discover.roleBrowStylist");
    case "barber":
      return plural ? t("discover.roleBarbers") : t("discover.roleBarber");
  }
}

function salonSummaryLine(
  profession: MapProfession,
  count: number,
  t: (key: string, params?: Record<string, string>) => string
): string {
  return t("discover.prosAtLocation", {
    count: String(count),
    role: professionPlural(profession, count, t),
  });
}

/** Region (center + deltas) → backend bounds (NE + SW corners), padded so
 * nearby salons stay loaded while panning slightly. */
function regionToBounds(
  r: Region,
  pad = 0.5
): {
  neLat: number;
  neLng: number;
  swLat: number;
  swLng: number;
} {
  const latHalf = (r.latitudeDelta / 2) * (1 + pad);
  const lngHalf = (r.longitudeDelta / 2) * (1 + pad);
  return {
    neLat: r.latitude + latHalf,
    neLng: r.longitude + lngHalf,
    swLat: r.latitude - latHalf,
    swLng: r.longitude - lngHalf,
  };
}

/** Tight pad for which pins to mount — wide pads keep off-screen markers alive
 * until they blank permanently (RN maps). Fetch still uses wider `regionToBounds`. */
function regionToDisplayBounds(r: Region) {
  return regionToBounds(r, 0.12);
}

function salonInBounds(
  s: SalonPin,
  b: { neLat: number; neLng: number; swLat: number; swLng: number }
): boolean {
  return (
    s.latitude >= b.swLat &&
    s.latitude <= b.neLat &&
    s.longitude >= b.swLng &&
    s.longitude <= b.neLng
  );
}

/** Fallback delta when Google doesn't return a viewport for a place. */
const FALLBACK_REGION_DELTA = 0.01;
/** Lower bound so even an "exact building" result still shows some context. */
const MIN_REGION_DELTA = 0.003;
/** Upper bound so a country-level hit doesn't zoom the user out to space. */
const MAX_REGION_DELTA = 2.0;
/** Extra breathing room around the Google-recommended viewport. */
const VIEWPORT_PADDING = 1.3;

/**
 * Convert the picked place's `{latitude, longitude, viewport?}` into a map
 * Region so the zoom level matches the feature size:
 *   - Country / city → show the whole area
 *   - Street → show the whole street
 *   - Building → tight zoom with a bit of context
 *
 * When Google doesn't give us a viewport (rare), we fall back to a
 * reasonable default.
 */
function placeToRegion(
  latitude: number,
  longitude: number,
  viewport: PlaceViewport | null | undefined
): Region {
  if (viewport) {
    const latSpan = Math.abs(
      viewport.northeast.latitude - viewport.southwest.latitude
    );
    const lngSpan = Math.abs(
      viewport.northeast.longitude - viewport.southwest.longitude
    );
    const latDelta = clamp(
      latSpan * VIEWPORT_PADDING,
      MIN_REGION_DELTA,
      MAX_REGION_DELTA
    );
    const lngDelta = clamp(
      lngSpan * VIEWPORT_PADDING,
      MIN_REGION_DELTA,
      MAX_REGION_DELTA
    );
    return {
      latitude,
      longitude,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }
  return {
    latitude,
    longitude,
    latitudeDelta: FALLBACK_REGION_DELTA,
    longitudeDelta: FALLBACK_REGION_DELTA,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const EMPTY_SALON_PINS: SalonPin[] = [];

const IS_ANDROID = Platform.OS === "android";
/** Android needs a longer snapshot window before freezing custom marker bitmaps. */
const MARKER_SNAPSHOT_MS = IS_ANDROID ? 750 : 450;
/** Android fires more settle events — wait a bit longer before swapping clusters. */
const REGION_SETTLE_MS = IS_ANDROID ? 320 : 200;

/**
 * Snapshot custom marker views once on mount / when count|selected changes,
 * then freeze. On Android, `freezeTracking` forces freeze during pinch/pan
 * (tracking mid-gesture is the common Google Maps crash).
 *
 * Always use the text cluster bubble (no SVG) — SVG inside Marker is unstable
 * on Android.
 */
const DiscoveryMapMarker = React.memo(function DiscoveryMapMarker({
  latitude,
  longitude,
  count,
  selected,
  freezeTracking,
  accessibilityLabel,
  onPress,
}: {
  latitude: number;
  longitude: number;
  count: number;
  selected: boolean;
  freezeTracking: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    setTracksViewChanges(true);
    const t = setTimeout(() => setTracksViewChanges(false), MARKER_SNAPSHOT_MS);
    return () => clearTimeout(t);
  }, [count, selected]);

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={!freezeTracking && tracksViewChanges}
      stopPropagation
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
    >
      <View collapsable={false} pointerEvents="none">
        <ClusterMapBubble
          count={Math.max(count, 1)}
          selected={selected}
        />
      </View>
    </Marker>
  );
});

function regionMeaningfullyChanged(a: Region, b: Region): boolean {
  return (
    Math.abs(a.latitude - b.latitude) > 0.00008 ||
    Math.abs(a.longitude - b.longitude) > 0.00008 ||
    Math.abs(a.latitudeDelta - b.latitudeDelta) > 0.00025 ||
    Math.abs(a.longitudeDelta - b.longitudeDelta) > 0.00025
  );
}

const MapLocationScreen = () => {
  const { t } = useI18n();
  const trackProduct = useProductAnalytics();
  const insets = useSafeAreaInsets();
  const { backVisible: locationBackVisible, onScroll: onLocationScroll } =
    useScrollRevealBack();
  const { width: windowWidth } = useWindowDimensions();
  const patternWidth = windowWidth;
  const heroHeight = patternWidth / 1.77;
  const heroPatternVerticalNudge = heroHeight * 0.34;

  const predictionsCardWidth = responsiveScale(FIND_PROS_SEARCH_BAR_W);

  const { profession } = useLocalSearchParams<{
    profession?: string | string[];
  }>();

  const { profile, session } = useAuth();
  const clientId = session?.user?.id;
  const queryClient = useQueryClient();
  /**
   * The map is a global discovery surface, so we never restrict
   * autocomplete / geocoding to a single country. We only nudge the
   * response LANGUAGE toward the user's locale (street names come back
   * localized) via `preferredCountryCode` — no result filtering.
   */
  const placesOptions = useMemo(() => {
    const c = profile?.country?.trim();
    return {
      preferredCountryCode: c && c.length === 2 ? c : undefined,
    };
  }, [profile?.country]);

  const professionKey = parseValidProfession(
    normalizeProfessionParam(profession)
  );

  /** Get-discovered specialty filters — multi-select; default match is any (OR). */
  const [selectedDiscoveryCategories, setSelectedDiscoveryCategories] =
    useState<string[]>([]);
  const [discoveryMatchMode, setDiscoveryMatchMode] =
    useState<DiscoveryMatchMode>("any");

  useEffect(() => {
    setSelectedDiscoveryCategories([]);
    setDiscoveryMatchMode("any");
  }, [professionKey]);

  useEffect(() => {
    if (selectedDiscoveryCategories.length < 2) {
      setDiscoveryMatchMode("any");
    }
  }, [selectedDiscoveryCategories.length]);

  useEffect(() => {
    if (!professionKey) {
      router.replace("/(client)/(tabs)/userList/filter-before-map");
    }
  }, [professionKey]);

  const screenTitle = useMemo(
    () => mapScreenTitle(professionKey, t),
    [professionKey, t]
  );

  const [locationQuery, setLocationQuery] = useState("");
  const [mapModalVisible, setMapModalVisible] = useState(false);
  /** Pro profile opened from a pin sheet — rendered inside the map modal (no stack navigation). */
  const [mapProfileOverlayId, setMapProfileOverlayId] = useState<string | null>(
    null
  );
  const [mapLoading, setMapLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [showUserOnMap, setShowUserOnMap] = useState(false);
  /** Currently-open salon pin (shows a single bottom sheet listing pros at this place). */
  const [selectedSalon, setSelectedSalon] = useState<SalonPin | null>(null);
  /** Last committed region, used as the query key for /api/salons/nearby. */
  const [boundsRegion, setBoundsRegion] = useState<Region | null>(null);
  const [clusterMarkers, setClusterMarkers] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  /**
   * Android only: freeze marker bitmaps during pinch/pan. Ending freeze must
   * NOT re-arm tracksViewChanges on every pin (that crashes Google Maps).
   */
  const [androidGestureFreeze, setAndroidGestureFreeze] = useState(false);
  /** Remember salons we've already loaded so panning back doesn't wait on the API. */
  const [salonMemory, setSalonMemory] = useState<SalonPin[]>([]);
  /** Bump to remount MapView after the modal was hidden (e.g. pro profile) so pin snapshots repaint. */
  const [mapRemountKey, setMapRemountKey] = useState(0);
  /**
   * Remount epoch bumps when a pin re-enters the viewport so custom Marker
   * bitmaps paint again (RN maps blanks off-screen ones).
   */
  const [remountEpochById, setRemountEpochById] = useState<
    Record<string, number>
  >({});
  const visibleMarkerIdsRef = useRef<Set<string>>(new Set());
  const seenMarkerIdsRef = useRef<Set<string>>(new Set());
  const boundsRegionRef = useRef<Region | null>(null);

  const toggleDiscoveryCategory = useCallback((code: string) => {
    setSelectedDiscoveryCategories((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  }, []);
  const mapViewRef = useRef<MapView | null>(null);
  /** Debounce timer so pan/zoom settles before we re-query. */
  const regionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Skip bounds refetch while the user is pinching (markers stay mounted). */
  const isMapGesturingRef = useRef(false);
  const programmaticCameraRef = useRef(false);
  /** Places Autocomplete dropdown state (location search above the map). */
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  /**
   * When the user picks a prediction we set the text to its description
   * programmatically; we then suppress re-querying autocomplete until the
   * user actively edits the text again. Without this, the dropdown would
   * reappear immediately after a pick.
   */
  const [suppressPredictions, setSuppressPredictions] = useState(false);
  const predictionsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  /**
   * MapView `onPress` often fires together with Marker `onPress`. Without this,
   * the map handler clears selection right after the marker sets it (feels like
   * "nothing happens"). `nativeEvent.action === 'marker-press'` covers Android;
   * the ref covers iOS where `action` may be absent.
   */
  const markerPressConsumesMapPressRef = useRef(false);
  /** Cancels stale GPS recenter when the user searches another place. */
  const mapCameraIntentRef = useRef(0);
  const bumpMapCameraIntent = useCallback(() => {
    mapCameraIntentRef.current += 1;
    return mapCameraIntentRef.current;
  }, []);
  /** Saved pin-sheet scroll offset when opening a pro profile overlay from the map. */
  const restorePinSheetScrollRef = useRef(0);
  const pendingPinSheetScrollRestoreRef = useRef<number | null>(null);

  const useStyledGoogleMap = useGoogleMapsProvider();

  const closeMapModal = useCallback(() => {
    setMapProfileOverlayId(null);
    setSelectedSalon(null);
    setBoundsRegion(null);
    setClusterMarkers(false);
    setMapReady(false);
    setSalonMemory([]);
    setAndroidGestureFreeze(false);
    setMapModalVisible(false);
  }, []);

  const onCheckLocation = useCallback(async () => {
    if (!canOpenNativeMap()) {
      Alert.alert(
        t("discover.mapNotConfiguredTitle"),
        t("discover.mapNotConfiguredMessage")
      );
      return;
    }
    setSelectedSalon(null);
    setShowUserOnMap(false);
    // Show the map immediately; refine the camera when GPS returns (avoids ~multi‑second blank wait).
    setMapRegion(BERGEN_REGION);
    setBoundsRegion(BERGEN_REGION);
    setClusterMarkers(
      shouldClusterByZoomWithHysteresis(BERGEN_REGION.latitudeDelta, false)
    );
    setMapReady(false);
    setMapModalVisible(true);
    setMapLoading(false);
    trackProduct("map_opened", {
      source: "current_location",
      profession: professionKey ?? null,
    });

    const intentId = bumpMapCameraIntent();

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== PermissionStatus.GRANTED) {
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      if (intentId !== mapCameraIntentRef.current) {
        return;
      }
      const region: Region = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
      setMapRegion(region);
      setBoundsRegion(region);
      setClusterMarkers(
        shouldClusterByZoomWithHysteresis(region.latitudeDelta, false)
      );
      setShowUserOnMap(true);
      programmaticCameraRef.current = true;
      mapViewRef.current?.animateToRegion(region, 350);
      setTimeout(() => {
        programmaticCameraRef.current = false;
      }, 900);
    } catch {
      Alert.alert(
        t("discover.locationErrorTitle"),
        t("discover.locationErrorMessage")
      );
    }
  }, [t, bumpMapCameraIntent, trackProduct, professionKey]);

  /**
   * Recenter the map on a resolved place (from either a picked Places
   * prediction or a free-text geocode).
   *
   * We update `mapRegion` for the MapView's `initialRegion` on fresh mounts,
   * AND also imperatively call `animateToRegion` via the ref once the map
   * is actually mounted. Relying only on `initialRegion` was unreliable in
   * practice: RN sometimes keeps a previous MapView mount around even
   * across `key` changes, leaving the camera stuck on the previous region
   * (which looked like "every pick shows Bergen" after a "Check my
   * location" tap).
   */
  const flyToPlace = useCallback(
    (place: ResolvedPlace) => {
      bumpMapCameraIntent();
      programmaticCameraRef.current = true;
      const region = placeToRegion(
        place.latitude,
        place.longitude,
        place.viewport
      );
      setSelectedSalon(null);
      setShowUserOnMap(false);
      setClusterMarkers(
        shouldClusterByZoomWithHysteresis(region.latitudeDelta, false)
      );
      setMapRegion(region);
      setBoundsRegion(region);
      if (!mapModalVisible) {
        setMapReady(false);
        setMapModalVisible(true);
        trackProduct("map_opened", {
          source: "location_search",
          profession: professionKey ?? null,
        });
      } else {
        mapViewRef.current?.animateToRegion(region, 500);
      }
      trackProduct("map_location_searched", {
        profession: professionKey ?? null,
        placeId: place.placeId ?? null,
      });
      setTimeout(() => {
        programmaticCameraRef.current = false;
      }, 900);
    },
    [mapModalVisible, bumpMapCameraIntent, trackProduct, professionKey]
  );

  /**
   * When `mapRegion` changes while the modal is visible, animate the live
   * map to match. This is the failsafe that actually moves the camera when
   * the MapView didn't remount (e.g. RN reused a previous mount despite a
   * new `key`), so the user always sees the region they asked for.
   */
  useEffect(() => {
    if (!mapModalVisible || !mapRegion) return;
    if (programmaticCameraRef.current) return;
    if (isMapGesturingRef.current) return;
    const ref = mapViewRef.current;
    if (!ref) return;
    programmaticCameraRef.current = true;
    const handle = setTimeout(() => {
      ref.animateToRegion(mapRegion, 400);
      setTimeout(() => {
        programmaticCameraRef.current = false;
      }, 480);
    }, 50);
    return () => clearTimeout(handle);
  }, [mapRegion, mapModalVisible]);

  /** User edited the location text directly → un-suppress autocomplete. */
  const handleLocationQueryChange = useCallback((text: string) => {
    setLocationQuery(text);
    setSuppressPredictions(false);
  }, []);

  /** Tap a Places Autocomplete suggestion → resolve it and fly the map. */
  const onPickPrediction = useCallback(
    async (prediction: AutocompletePrediction) => {
      setSuppressPredictions(true);
      setLocationQuery(prediction.description);
      setPredictions([]);
      Keyboard.dismiss();
      setMapLoading(true);
      const details = await fetchPlaceDetails(
        prediction.place_id,
        getGooglePlacesKey(),
        placesOptions
      );
      setMapLoading(false);
      if (!details) {
        Alert.alert(
          t("common.search"),
          t("discover.couldNotOpenPlace", {
            place: prediction.description,
          })
        );
        return;
      }
      flyToPlace(details);
    },
    [placesOptions, flyToPlace, t]
  );

  /**
   * Fallback submit for the "Search" button / keyboard return. Uses
   * Geocoding (not Autocomplete) because it tolerates plain street
   * addresses that Places Autocomplete doesn't index, which was exactly
   * the failure mode the user hit with residential Norwegian addresses.
   */
  const onSearchLocation = useCallback(async () => {
    const q = locationQuery.trim();
    if (!q) {
      Alert.alert(t("common.search"), t("discover.enterPlaceToSearch"));
      return;
    }
    setSuppressPredictions(true);
    setPredictions([]);
    Keyboard.dismiss();
    setMapLoading(true);
    const result = await geocodeAddress(q, getGooglePlacesKey(), placesOptions);
    setMapLoading(false);
    if (!result) {
      Alert.alert(
        t("common.search"),
        t("discover.couldNotFindPlace", { query: q })
      );
      return;
    }
    flyToPlace(result);
  }, [locationQuery, placesOptions, flyToPlace, t]);

  /**
   * Debounced Places Autocomplete. We fire once the user pauses typing for
   * ~220 ms to avoid burning quota on every keystroke. `suppressPredictions`
   * short-circuits the effect after the user picks a suggestion so the
   * dropdown doesn't reopen on top of the picked value.
   */
  useEffect(() => {
    if (predictionsDebounceRef.current) {
      clearTimeout(predictionsDebounceRef.current);
    }
    const q = locationQuery.trim();
    if (suppressPredictions || q.length < 2) {
      setPredictions([]);
      setPredictionsLoading(false);
      return;
    }
    setPredictionsLoading(true);
    predictionsDebounceRef.current = setTimeout(async () => {
      const results = await fetchAutocomplete(q, getGooglePlacesKey(), placesOptions);
      setPredictions(results);
      setPredictionsLoading(false);
    }, 220);
    return () => {
      if (predictionsDebounceRef.current) {
        clearTimeout(predictionsDebounceRef.current);
      }
    };
  }, [locationQuery, suppressPredictions, placesOptions]);

  const backendProfessionCode = useMemo(
    () => toBackendProfessionCode(professionKey),
    [professionKey]
  );

  const discoveryChipOptions = useMemo(
    () =>
      professionKey
        ? localizedDiscoveryOptionsForProfession(
            mapProfessionKeyToChoiceCode(professionKey),
            t
          )
        : [],
    [professionKey, t]
  );

  const bounds = useMemo(
    () => (boundsRegion ? regionToBounds(boundsRegion) : null),
    [boundsRegion]
  );

  const salonDiscoveryFilter = useMemo((): SalonDiscoveryFilter | null => {
    if (selectedDiscoveryCategories.length === 0) return null;
    return {
      categories: selectedDiscoveryCategories,
      match: discoveryMatchMode,
    };
  }, [selectedDiscoveryCategories, discoveryMatchMode]);

  const {
    data: nearbySalons,
    isFetching: salonsFetching,
  } = useSalonsInBounds(bounds, backendProfessionCode, salonDiscoveryFilter);

  /** Keep previous pins visible while a new bounds fetch is in flight. */
  const salons = nearbySalons ?? EMPTY_SALON_PINS;
  /** True when this filter/viewport finished loading and the API returned no salons. */
  const confirmedNoSalons =
    !salonsFetching &&
    nearbySalons !== undefined &&
    nearbySalons.length === 0;

  const discoveryFilterKey = useMemo(
    () =>
      `${backendProfessionCode ?? "any"}:${
        salonDiscoveryFilter
          ? `${salonDiscoveryFilter.categories.slice().sort().join(",")}:${
              salonDiscoveryFilter.match
            }`
          : "all"
      }`,
    [backendProfessionCode, salonDiscoveryFilter]
  );

  // Specialty / profession filter changed — drop remembered pins from the old filter.
  useEffect(() => {
    setSalonMemory([]);
    visibleMarkerIdsRef.current = new Set();
    // Keep seenMarkerIdsRef so pan-back remount still works after filter toggles.
  }, [discoveryFilterKey]);

  useEffect(() => {
    if (confirmedNoSalons) {
      setSalonMemory([]);
      return;
    }
    if (salons.length === 0) return;
    setSalonMemory((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]));
      for (const s of salons) byId.set(s.id, s);
      return Array.from(byId.values());
    });
  }, [salons, confirmedNoSalons]);

  /**
   * Pins to show: memory ∩ current padded viewport, plus latest API hits in view.
   * Never mount off-screen remembered pins — RN maps blanks those custom markers,
   * so they stay invisible when you zoom/pan them back until a remount/merge.
   */
  const displaySalons = useMemo(() => {
    // Empty API result for this filter must win — don't keep a pin from a
    // previous specialty that briefly matched (e.g. add styling → remove it).
    if (confirmedNoSalons) return EMPTY_SALON_PINS;
    if (!boundsRegion) return salons;
    const b = regionToDisplayBounds(boundsRegion);
    const byId = new Map<string, SalonPin>();
    for (const s of salonMemory) {
      if (salonInBounds(s, b)) byId.set(s.id, s);
    }
    for (const s of salons) {
      if (salonInBounds(s, b)) byId.set(s.id, s);
    }
    // Fallback if memory hasn't caught up yet (first paint / empty area).
    if (byId.size === 0) {
      for (const s of salons) byId.set(s.id, s);
    }
    return Array.from(byId.values());
  }, [salonMemory, boundsRegion, salons, confirmedNoSalons]);

  /** Hide GPS when zoomed out so the blue dot doesn't cover cluster counts. */
  const showUserLocationDot = showUserOnMap && !clusterMarkers;

  /**
   * Always merge overlapping pins. Zoomed-out uses wider area merge;
   * zoomed-in only collapses stacked bubbles.
   */
  const salonClusters = useMemo(() => {
    if (!boundsRegion) return null;
    return clusterSalonPins(
      displaySalons,
      boundsRegion.latitudeDelta,
      boundsRegion.longitudeDelta,
      clusterMarkers
    );
  }, [boundsRegion, displaySalons, clusterMarkers]);

  /**
   * Hold last non-empty clusters only while a same-filter bounds refetch is in
   * flight. Never keep them after a confirmed empty result (filter mismatch).
   */
  const lastClustersRef = useRef<SalonMapCluster[]>([]);
  const lastClustersFilterKeyRef = useRef(discoveryFilterKey);
  if (lastClustersFilterKeyRef.current !== discoveryFilterKey) {
    lastClustersFilterKeyRef.current = discoveryFilterKey;
    lastClustersRef.current = [];
  }
  if (confirmedNoSalons) {
    lastClustersRef.current = [];
  } else if (salonClusters && salonClusters.length > 0) {
    lastClustersRef.current = salonClusters;
  }
  const targetClusters =
    salonClusters && salonClusters.length > 0
      ? salonClusters
      : salonsFetching && !confirmedNoSalons
        ? lastClustersRef.current
        : [];

  const targetClusterSig = targetClusters
    .map((c) => `${c.id}:${salonClusterTotalProfessionals(c.members)}`)
    .join("|");

  // Remount pins that left the viewport and came back (blank custom markers).
  useEffect(() => {
    const ids = new Set(targetClusters.map((c) => c.id));
    const reentered: string[] = [];
    for (const id of ids) {
      if (!visibleMarkerIdsRef.current.has(id)) {
        if (seenMarkerIdsRef.current.has(id)) {
          reentered.push(id);
        } else {
          seenMarkerIdsRef.current.add(id);
        }
      }
    }
    visibleMarkerIdsRef.current = ids;

    if (reentered.length > 0) {
      setRemountEpochById((prev) => {
        const next = { ...prev };
        for (const id of reentered) {
          next[id] = (next[id] ?? 0) + 1;
        }
        return next;
      });
    }
  }, [targetClusterSig, targetClusters]);

  boundsRegionRef.current = boundsRegion;

  const markersToRender = targetClusters;

  const {
    data: salonProfessionals = [],
    isPending: salonProsLoading,
    isError: salonProsError,
  } = useSalonProfessionals(
    selectedSalon?.id ?? null,
    backendProfessionCode,
    salonDiscoveryFilter
  );

  useEffect(() => {
    setSelectedSalon(null);
  }, [salonDiscoveryFilter]);

  const pinSheetBodyState = useMemo((): PinSheetBodyState => {
    if (salonProsError) return "error";
    if (salonProsLoading && salonProfessionals.length === 0) return "loading";
    if (salonProfessionals.length === 0) return "empty";
    return "list";
  }, [salonProsError, salonProsLoading, salonProfessionals.length]);

  const pinSheetProRows = useMemo(
    () =>
      salonProfessionals.map((pro) => ({
        hasBusinessName: Boolean(pro.business_name?.trim()),
      })),
    [salonProfessionals]
  );

  const pinSheetMetrics = useMemo(() => {
    if (!selectedSalon) {
      return { bottomReserve: 0, listHeight: 0, listScrollable: false };
    }
    return pinSheetLayout(pinSheetProRows, pinSheetBodyState);
  }, [selectedSalon, pinSheetProRows, pinSheetBodyState]);

  /** Fixed padding — tying this to the sheet height blanks/crashes custom markers. */
  const mapPadding = useMemo(
    () => ({
      top: responsiveScale(10),
      right: responsiveScale(14),
      bottom: responsiveScale(18),
      left: responsiveScale(14),
    }),
    []
  );

  const legalLabelInsets = useMemo(
    () => ({
      top: 0,
      right: responsiveScale(12),
      bottom: responsiveScale(14),
      left: responsiveScale(12),
    }),
    []
  );

  const clearPinSelection = useCallback(() => {
    setSelectedSalon(null);
  }, []);

  const pinSheetTranslateY = useRef(new Animated.Value(0)).current;
  const pinSheetScrollRef = useRef<ScrollView>(null);
  const pinSheetScrollOffsetRef = useRef(0);
  const pinSheetScrollAtTop = useRef(true);

  useEffect(() => {
    if (selectedSalon) {
      pinSheetTranslateY.setValue(0);
      pinSheetScrollAtTop.current = true;
      pinSheetScrollOffsetRef.current = 0;
    }
  }, [selectedSalon?.id, pinSheetTranslateY]);

  const animatePinSheetDismiss = useCallback(() => {
    const h = Dimensions.get("window").height;
    Animated.timing(pinSheetTranslateY, {
      toValue: h,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      pinSheetTranslateY.setValue(0);
      clearPinSelection();
    });
  }, [clearPinSelection, pinSheetTranslateY]);

  const onPinSheetPanRelease = useCallback(
    (dy: number, vy: number) => {
      if (dy > 90 || vy > 0.95) {
        animatePinSheetDismiss();
      } else {
        Animated.spring(pinSheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 12,
        }).start();
      }
    },
    [animatePinSheetDismiss, pinSheetTranslateY]
  );

  const pinSheetHandlePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => false,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          pinSheetTranslateY.extractOffset();
        },
        onPanResponderMove: (_, g) => {
          pinSheetTranslateY.setValue(Math.max(0, g.dy));
        },
        onPanResponderRelease: (_, g) => {
          pinSheetTranslateY.flattenOffset();
          onPinSheetPanRelease(Math.max(0, g.dy), g.vy);
        },
      }),
    [onPinSheetPanRelease, pinSheetTranslateY]
  );

  const pinSheetScrollPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => {
          const { dy, dx } = g;
          return (
            pinSheetScrollAtTop.current &&
            Math.abs(dy) > Math.abs(dx) &&
            Math.abs(dy) > 8 &&
            dy > 0
          );
        },
        onPanResponderGrant: () => {
          pinSheetTranslateY.extractOffset();
        },
        onPanResponderMove: (_, g) => {
          pinSheetTranslateY.setValue(Math.max(0, g.dy));
        },
        onPanResponderRelease: (_, g) => {
          pinSheetTranslateY.flattenOffset();
          onPinSheetPanRelease(Math.max(0, g.dy), g.vy);
        },
      }),
    [onPinSheetPanRelease, pinSheetTranslateY]
  );

  const handlePinSheetScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      pinSheetScrollOffsetRef.current = y;
      pinSheetScrollAtTop.current = y <= 0;
    },
    []
  );

  const restorePinSheetScroll = useCallback(() => {
    const scrollY = pendingPinSheetScrollRestoreRef.current;
    if (scrollY == null || scrollY <= 0) {
      pendingPinSheetScrollRestoreRef.current = null;
      return;
    }
    pendingPinSheetScrollRestoreRef.current = null;
    pinSheetScrollRef.current?.scrollTo({ y: scrollY, animated: false });
    pinSheetScrollAtTop.current = scrollY <= 0;
  }, []);

  const closeMapProfileOverlay = useCallback(() => {
    setMapProfileOverlayId(null);
    pendingPinSheetScrollRestoreRef.current = restorePinSheetScrollRef.current;
    requestAnimationFrame(() => {
      restorePinSheetScroll();
    });
  }, [restorePinSheetScroll]);

  const onMapModalShow = useCallback(() => {
    const scrollY = pendingPinSheetScrollRestoreRef.current;
    if (scrollY == null || scrollY <= 0) {
      pendingPinSheetScrollRestoreRef.current = null;
      return;
    }
    pendingPinSheetScrollRestoreRef.current = null;
    pinSheetScrollRef.current?.scrollTo({ y: scrollY, animated: false });
    pinSheetScrollAtTop.current = scrollY <= 0;
  }, []);

  useEffect(() => {
    if (!mapModalVisible) return;
    onMapModalShow();
  }, [mapModalVisible, onMapModalShow]);

  const handleMapPress = useCallback(
    (e: MapPressEvent) => {
      if (e.nativeEvent.action === "marker-press") {
        return;
      }
      if (markerPressConsumesMapPressRef.current) {
        return;
      }
      clearPinSelection();
    },
    [clearPinSelection]
  );

  const animateMapToRegion = useCallback((region: Region) => {
    programmaticCameraRef.current = true;
    setMapRegion(region);
    setBoundsRegion(region);
    setClusterMarkers((prev) =>
      shouldClusterByZoomWithHysteresis(region.latitudeDelta, prev)
    );
    mapViewRef.current?.animateToRegion(region, 400);
    setTimeout(() => {
      programmaticCameraRef.current = false;
    }, 480);
  }, []);

  const handleSalonMarkerPress = useCallback(
    (salon: SalonPin) => {
      markerPressConsumesMapPressRef.current = true;
      setSelectedSalon(salon);
      trackProduct("map_pin_opened", {
        salonId: salon.id,
        profession: professionKey ?? null,
      });
      // Keep the camera still — the pin is already on screen. Animating away
      // makes "back from pro profile" feel like the map jumped.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          markerPressConsumesMapPressRef.current = false;
        });
      });
    },
    [trackProduct, professionKey]
  );

  const handleMultiSalonClusterPress = useCallback(
    (cluster: SalonMapCluster) => {
      if (cluster.members.length <= 1) return;
      markerPressConsumesMapPressRef.current = true;
      setSelectedSalon(null);
      const region = regionToSplitSalonCluster(cluster, boundsRegion);
      animateMapToRegion(region);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          markerPressConsumesMapPressRef.current = false;
        });
      });
    },
    [animateMapToRegion, boundsRegion]
  );

  /** Debounce bounds/cluster until zoom stops — markers stay mounted during pinch. */
  const handleRegionChangeStart = useCallback(() => {
    if (!programmaticCameraRef.current) {
      isMapGesturingRef.current = true;
      if (IS_ANDROID) {
        setAndroidGestureFreeze(true);
      }
    }
  }, []);

  const handleRegionChangeComplete = useCallback((r: Region) => {
    if (programmaticCameraRef.current) {
      if (IS_ANDROID) setAndroidGestureFreeze(false);
      return;
    }
    isMapGesturingRef.current = false;
    const prev = boundsRegionRef.current;
    // Ignore tiny settle jitter so we don't keep resetting the debounce for seconds.
    if (prev && !regionMeaningfullyChanged(prev, r)) {
      if (IS_ANDROID) setAndroidGestureFreeze(false);
      return;
    }
    if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
    regionDebounceRef.current = setTimeout(() => {
      if (IS_ANDROID) {
        // Unfreeze first, then swap clusters on the next frame (idle + tracking safe).
        setAndroidGestureFreeze(false);
        requestAnimationFrame(() => {
          setBoundsRegion(r);
          setClusterMarkers((prevCluster) =>
            shouldClusterByZoomWithHysteresis(r.latitudeDelta, prevCluster)
          );
        });
        return;
      }
      setBoundsRegion(r);
      setClusterMarkers((prevCluster) =>
        shouldClusterByZoomWithHysteresis(r.latitudeDelta, prevCluster)
      );
    }, REGION_SETTLE_MS);
  }, []);

  const handleMapReady = useCallback(() => {
    setMapReady(true);
    if (mapRegion) {
      setBoundsRegion(mapRegion);
      setClusterMarkers((prev) =>
        shouldClusterByZoomWithHysteresis(mapRegion.latitudeDelta, prev)
      );
    }
  }, [mapRegion]);

  useEffect(
    () => () => {
      if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
    },
    []
  );

  const openProfessionalProfile = useCallback(
    (pro: SalonProfessional) => {
      const proId = pro.hairdresser_id;
      restorePinSheetScrollRef.current = pinSheetScrollOffsetRef.current;

      if (isUuid(proId)) {
        void queryClient.prefetchQuery({
          queryKey: clientProfileByIdQueryKey(proId),
          queryFn: () => fetchClientProfileById(proId),
          staleTime: 60_000,
        });
      }
      if (clientId) {
        void queryClient.prefetchQuery({
          queryKey: blockedIdListQueryKey(clientId),
          queryFn: () => blockedIds(clientId),
          staleTime: 120_000,
        });
      }
      if (clientId && proId) {
        void queryClient.prefetchQuery({
          queryKey: relationshipCheckQueryKey(
            clientId,
            proId,
            backendProfessionCode
          ),
          queryFn: () => checkRelationship(proId, clientId, backendProfessionCode),
          staleTime: 60_000,
        });
      }
      setMapProfileOverlayId(proId);
      trackProduct("map_pro_opened", {
        professionalId: proId,
        salonId: selectedSalon?.id ?? null,
        profession: backendProfessionCode ?? null,
      });
    },
    [backendProfessionCode, clientId, queryClient, trackProduct, selectedSalon?.id]
  );

  /** Modal is a separate window: SafeAreaView often mis-insets; pad explicitly like other screens. */
  const mapModalInsetTop =
    insets.top > 0
      ? insets.top
      : Platform.OS === "android"
        ? (RNStatusBar.currentHeight ?? 0)
        : 0;

  if (!professionKey) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      {mapModalVisible ? (
        <View
          style={[
            styles.mapModalSafe,
            {
              paddingTop: mapModalInsetTop,
              paddingBottom: insets.bottom,
              paddingLeft: insets.left,
              paddingRight: insets.right,
            },
          ]}
        >
          <StatusBar style="dark" />
          <View style={styles.mapModalBody}>
            <View
              style={[
                styles.mapModalChrome,
                mapProfileOverlayId ? styles.mapModalChromeHidden : null,
              ]}
              pointerEvents={mapProfileOverlayId ? "none" : "auto"}
              collapsable={false}
            >
            <View style={navBackChromeStyles.screenBar}>
              <NavBackRow onPress={closeMapModal} />
              <View style={styles.mapModalTitleGutter}>
                <Text
                  style={[Typography.agLabel16, styles.mapModalTitleBelowBack]}
                  numberOfLines={2}
                >
                  {screenTitle}
                </Text>
              </View>
            </View>

            {discoveryChipOptions.length > 0 ? (
              <View style={styles.mapDiscoveryChipsBar}>
                <HorizontalScrollHintRow
                  contentContainerStyle={styles.mapDiscoveryChipsScrollContent}
                >
                  <Pressable
                    onPress={() => setSelectedDiscoveryCategories([])}
                    style={({ pressed }) => [
                      styles.mapDiscoveryChip,
                      selectedDiscoveryCategories.length === 0 &&
                        styles.mapDiscoveryChipSelected,
                      pressed && styles.mapDiscoveryChipPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: selectedDiscoveryCategories.length === 0,
                    }}
                    accessibilityLabel={t("discover.allSpecialties")}
                  >
                    <Text
                      style={[
                        styles.mapDiscoveryChipLabel,
                        selectedDiscoveryCategories.length === 0 &&
                          styles.mapDiscoveryChipLabelSelected,
                      ]}
                    >
                      {t("common.all")}
                    </Text>
                  </Pressable>
                  {selectedDiscoveryCategories.length >= 2 ? (
                    <Pressable
                      onPress={() => {
                        setDiscoveryMatchMode((mode) =>
                          mode === "all" ? "any" : "all"
                        );
                        void queryClient.invalidateQueries({
                          queryKey: ["salons"],
                        });
                      }}
                      style={({ pressed }) => [
                        styles.mapDiscoveryChip,
                        styles.mapDiscoveryMatchChip,
                        discoveryMatchMode === "all" &&
                          styles.mapDiscoveryChipSelected,
                        pressed && styles.mapDiscoveryChipPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: discoveryMatchMode === "all",
                      }}
                      accessibilityLabel={t("discover.matchAllSelectedA11y")}
                    >
                      <Text
                        style={[
                          styles.mapDiscoveryChipLabel,
                          discoveryMatchMode === "all" &&
                            styles.mapDiscoveryChipLabelSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {t("discover.matchAllSelected")}
                      </Text>
                    </Pressable>
                  ) : null}
                  {discoveryChipOptions.map((opt) => {
                    const active = selectedDiscoveryCategories.includes(opt.code);
                    return (
                      <Pressable
                        key={opt.code}
                        onPress={() => toggleDiscoveryCategory(opt.code)}
                        style={({ pressed }) => [
                          styles.mapDiscoveryChip,
                          active && styles.mapDiscoveryChipSelected,
                          pressed && styles.mapDiscoveryChipPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={opt.label}
                      >
                        <Text
                          style={[
                            styles.mapDiscoveryChipLabel,
                            active && styles.mapDiscoveryChipLabelSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </HorizontalScrollHintRow>
              </View>
            ) : null}

            {mapLoading ? (
              <View style={styles.mapLoadingWrap}>
                <ActivityIndicator size="large" color={primaryBlack} />
              </View>
            ) : mapRegion && Platform.OS !== "web" ? (
              canOpenNativeMap() ? (
              <View style={styles.mapModalMapSection}>
                <View style={styles.mapCardStack}>
                  <MapView
                    key={`salon-discovery-map-${mapRemountKey}`}
                    ref={mapViewRef}
                    style={styles.mapView}
                    provider={mapProviderForPlatform()}
                    mapType="standard"
                    {...(Platform.OS === "android"
                      ? { googleRenderer: "LEGACY" as const }
                      : {})}
                    customMapStyle={
                      useStyledGoogleMap ? SALON_MAP_DARK_STYLE : undefined
                    }
                    initialRegion={mapRegion}
                    showsUserLocation={showUserLocationDot}
                    showsMyLocationButton={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    toolbarEnabled={false}
                    moveOnMarkerPress={false}
                    onPress={handleMapPress}
                    onMapReady={handleMapReady}
                    onRegionChangeStart={handleRegionChangeStart}
                    onRegionChangeComplete={handleRegionChangeComplete}
                    mapPadding={mapPadding}
                    legalLabelInsets={legalLabelInsets}
                  >
                    {mapReady && markersToRender.length > 0
                      ? markersToRender.map((c) => {
                          const totalPros =
                            salonClusterTotalProfessionals(c.members);
                          const single =
                            c.members.length === 1 ? c.members[0] : null;
                          const selected = single
                            ? selectedSalon?.id === single.id
                            : c.members.some(
                                (m) => m.id === selectedSalon?.id
                              );
                          return (
                            <DiscoveryMapMarker
                              key={`${c.id}:${remountEpochById[c.id] ?? 0}`}
                              latitude={c.latitude}
                              longitude={c.longitude}
                              count={totalPros}
                              selected={selected}
                              freezeTracking={androidGestureFreeze}
                              accessibilityLabel={
                                single?.formatted_address ??
                                `${c.members.length} salons`
                              }
                              onPress={() => {
                                if (single) {
                                  handleSalonMarkerPress(single);
                                } else {
                                  handleMultiSalonClusterPress(c);
                                }
                              }}
                            />
                          );
                        })
                      : null}
                  </MapView>
                  {selectedSalon ? (
                    <View
                      style={styles.pinDetailSheet}
                      pointerEvents="box-none"
                    >
                      <Animated.View
                        style={[
                          styles.pinDetailCard,
                          { transform: [{ translateY: pinSheetTranslateY }] },
                        ]}
                      >
                        <View
                          style={styles.pinDetailHandleWrap}
                          {...pinSheetHandlePan.panHandlers}
                          collapsable={false}
                          accessible
                          accessibilityLabel={t("discover.dragDownToClose")}
                        >
                          <View style={styles.pinDetailHandle} />
                        </View>
                        <Pressable
                          onPress={clearPinSelection}
                          style={styles.pinDetailClose}
                          accessibilityRole="button"
                          accessibilityLabel={t("common.close")}
                          hitSlop={12}
                        >
                          <X
                            size={responsiveScale(20)}
                            color={primaryBlack}
                            weight="bold"
                          />
                        </Pressable>
                        <Text style={styles.pinDetailLine}>
                          {selectedSalon.formatted_address}
                        </Text>
                        {salonProsError ? (
                          <Text style={styles.clusterRowAddress}>
                            {t("discover.couldNotLoadProsPin")}
                          </Text>
                        ) : salonProsLoading && salonProfessionals.length === 0 ? (
                          <ActivityIndicator color={primaryBlack} />
                        ) : salonProfessionals.length === 0 ? (
                          <Text style={styles.clusterRowAddress}>
                            {t("discover.noProsAtLocation")}
                          </Text>
                        ) : (
                          <>
                            <Text style={styles.clusterRowAddress}>
                              {salonSummaryLine(
                                professionKey,
                                salonProfessionals.length,
                                t
                              )}
                            </Text>
                            <ScrollView
                              ref={pinSheetScrollRef}
                              style={[
                                styles.clusterListScroll,
                                pinSheetMetrics.listHeight > 0 &&
                                  (pinSheetMetrics.listScrollable
                                    ? { height: pinSheetMetrics.listHeight }
                                    : { maxHeight: pinSheetMetrics.listHeight }),
                              ]}
                              scrollEnabled={pinSheetMetrics.listScrollable}
                              nestedScrollEnabled
                              keyboardShouldPersistTaps="handled"
                              showsVerticalScrollIndicator={
                                pinSheetMetrics.listScrollable
                              }
                              scrollEventThrottle={16}
                              onScroll={handlePinSheetScroll}
                              bounces={Platform.OS === "ios"}
                              {...pinSheetScrollPan.panHandlers}
                            >
                              {salonProfessionals.map((pro) => (
                                <Pressable
                                  key={pro.professional_profile_id}
                                  style={styles.clusterRow}
                                  onPress={() => openProfessionalProfile(pro)}
                                  accessibilityRole="button"
                                  accessibilityLabel={pro.full_name ?? t("common.professional")}
                                >
                                  <AvatarWithSpinner
                                    uri={pro.avatar_url}
                                    size={responsiveScale(48)}
                                    style={styles.clusterRowAvatar}
                                  />
                                  <View style={styles.clusterRowTextWrap}>
                                    <View style={styles.clusterRowNameLine}>
                                      {pro.has_active_subscription ? (
                                        <ProSubscriberStarBadge
                                          accessibilityLabel={t(
                                            "discover.subscriberStarA11y"
                                          )}
                                        />
                                      ) : null}
                                      <Text
                                        style={styles.clusterRowName}
                                        numberOfLines={1}
                                      >
                                        {pro.full_name ?? t("common.professional")}
                                      </Text>
                                    </View>
                                    {pro.business_name ? (
                                      <Text style={styles.clusterRowAddress}>
                                        {pro.business_name}
                                      </Text>
                                    ) : null}
                                  </View>
                                  <CaretRight
                                    size={responsiveScale(22)}
                                    color={primaryBlack}
                                    weight="bold"
                                  />
                                </Pressable>
                              ))}
                            </ScrollView>
                          </>
                        )}
                      </Animated.View>
                    </View>
                  ) : salonsFetching && displaySalons.length === 0 ? (
                    <View
                      style={styles.mapLoadingOverlay}
                      pointerEvents="none"
                    >
                      <ActivityIndicator color={primaryBlack} />
                    </View>
                  ) : null}
                </View>
              </View>
              ) : (
                <View style={styles.mapLoadingWrap}>
                  <Text style={styles.mapWebFallback}>
                    {t("discover.mapNotConfiguredMessage")}
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.mapLoadingWrap}>
                <Text style={styles.mapWebFallback}>
                  {t("discover.mapWebFallback")}
                </Text>
              </View>
            )}
          </View>
            {mapProfileOverlayId ? (
              <View style={styles.mapProfileOverlay} pointerEvents="auto">
                <ClientProfessionalProfileScreen
                  hairdresserId={mapProfileOverlayId}
                  routeProfessionRaw={backendProfessionCode}
                  onBack={closeMapProfileOverlay}
                  topInsetHandledExternally
                  discoverySource="map"
                />
              </View>
            ) : null}
          </View>
        </View>
      ) : (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
            <View
              style={[
                navBackChromeStyles.screenBar,
                !locationBackVisible && styles.locationBackHidden,
              ]}
              pointerEvents={locationBackVisible ? "auto" : "none"}
            >
              <NavBackRow onPress={() => router.back()} />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={onLocationScroll}
            >
              <View
                style={[
                  styles.heroBleed,
                  {
                    width: patternWidth,
                    marginLeft: -insets.left,
                    marginRight: -insets.right,
                    height: heroHeight,
                  },
                ]}
              >
                <View style={[styles.hero, { height: heroHeight }]}>
                  <OrganicPattern
                    width={patternWidth}
                    height={heroHeight}
                    preserveAspectRatio="xMidYMid slice"
                    style={{
                      transform: [{ translateY: -heroPatternVerticalNudge }],
                    }}
                  />
                </View>
              </View>

              <View style={styles.mapScrollBody}>
                <Text style={[Typography.h3, styles.title]}>{screenTitle}</Text>

                <Text style={styles.locationSectionLabel}>
                  {t("discover.useMyCurrentLocation")}
                </Text>
                <Pressable
                  onPress={onCheckLocation}
                  style={styles.outlineBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.outlineBtnLabel}>
                    {t("discover.checkLocation")}
                  </Text>
                </Pressable>

                <Text style={styles.fieldLabel}>
                  {t("discover.searchLocation")}
                </Text>
                <View style={styles.locationSearchSection}>
                  <View style={styles.locationSearchFieldWrap}>
                    <SearchInput
                      variant="whitePill"
                      value={locationQuery}
                      onSearch={handleLocationQueryChange}
                      initialQuery={locationQuery}
                      placeholder={t("common.searchPlaceholder")}
                      clearSearch={() => {
                        setLocationQuery("");
                        setPredictions([]);
                        setSuppressPredictions(false);
                      }}
                    />
                    {predictionsLoading || predictions.length > 0 ? (
                      <View
                        style={[
                          styles.predictionsCard,
                          { width: predictionsCardWidth },
                        ]}
                      >
                        {predictionsLoading && predictions.length === 0 ? (
                          <View style={styles.predictionsLoadingRow}>
                            <ActivityIndicator
                              size="small"
                              color={primaryBlack}
                            />
                          </View>
                        ) : (
                          predictions.map((p, idx) => (
                            <Pressable
                              key={p.place_id}
                              onPress={() => onPickPrediction(p)}
                              accessibilityRole="button"
                              accessibilityLabel={p.description}
                              style={({ pressed }) => [
                                styles.predictionRow,
                                idx === predictions.length - 1 &&
                                  styles.predictionRowLast,
                                pressed && styles.predictionRowPressed,
                              ]}
                            >
                              <Text
                                style={styles.predictionText}
                                numberOfLines={2}
                              >
                                {p.description}
                              </Text>
                            </Pressable>
                          ))
                        )}
                      </View>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={onSearchLocation}
                    style={styles.searchSubmitBtn}
                    accessibilityRole="button"
                  >
                    <Text style={styles.searchSubmitLabel}>
                      {t("common.search")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
      )}
    </>
  );
};

export default MapLocationScreen;

const styles = StyleSheet.create({
  mapModalSafe: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: primaryGreen,
    zIndex: 20,
  },
  mapModalChrome: {
    flex: 1,
    minHeight: 0,
  },
  mapModalBody: {
    flex: 1,
    minHeight: 0,
  },
  /** Keep map mounted (and camera stable) while the pro profile covers it. */
  mapModalChromeHidden: {
    opacity: 0,
  },
  mapProfileOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    backgroundColor: primaryGreen,
  },
  /** Same horizontal inset as `mapModalMapSection` so title lines up with map edges. */
  mapModalTitleGutter: {
    paddingHorizontal: responsivePadding(20),
  },
  mapModalTitleBelowBack: {
    textAlign: "left",
    marginTop: responsiveMargin(12),
    paddingBottom: 0,
  },
  mapLoadingWrap: {
    flex: 1,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsivePadding(24),
  },
  mapWebFallback: {
    ...Typography.bodyMedium,
    textAlign: "center",
    color: primaryBlack,
  },
  mapModalMapSection: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    paddingHorizontal: responsivePadding(20),
    paddingBottom: responsiveMargin(12),
  },
  mapCardStack: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    borderRadius: responsiveScale(MAP_CARD_RADIUS),
    overflow: "hidden",
    backgroundColor: "#1a2e35",
  },
  /** Filter chips below the map modal title. */
  mapDiscoveryChipsBar: {
    paddingHorizontal: responsivePadding(20),
    paddingTop: responsiveMargin(4),
    paddingBottom: responsiveMargin(10),
  },
  mapDiscoveryChipsScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveMargin(8),
    paddingRight: responsivePadding(8),
  },
  mapDiscoveryChip: {
    paddingVertical: responsivePadding(8),
    paddingHorizontal: responsivePadding(14),
    borderRadius: responsiveScale(999),
    backgroundColor: `${primaryWhite}E6`,
    borderWidth: 1,
    borderColor: `${primaryBlack}22`,
    maxWidth: responsiveScale(220),
  },
  mapDiscoveryChipSelected: {
    backgroundColor: primaryBlack,
    borderColor: primaryBlack,
  },
  /** Mode toggle — visually distinct from specialty chips when inactive. */
  mapDiscoveryMatchChip: {
    borderColor: primaryGreen,
    backgroundColor: `${primaryGreen}14`,
  },
  mapDiscoveryChipPressed: {
    opacity: 0.88,
  },
  mapDiscoveryChipLabel: {
    ...Typography.outfitRegular16,
    fontSize: responsiveFontSize(14, 14),
    color: primaryBlack,
  },
  mapDiscoveryChipLabelSelected: {
    color: primaryWhite,
  },
  pinDetailSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "box-none",
  },
  pinDetailCard: {
    position: "relative",
    backgroundColor: primaryGreen,
    borderTopLeftRadius: responsiveScale(26),
    borderTopRightRadius: responsiveScale(26),
    paddingTop: 0,
    paddingBottom: responsiveMargin(22),
    paddingHorizontal: responsivePadding(24),
    alignItems: "center",
  },
  pinDetailHandleWrap: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingTop: responsivePadding(12),
    paddingBottom: responsivePadding(8),
    minHeight: responsiveScale(44),
    justifyContent: "center",
  },
  pinDetailHandle: {
    width: responsiveScale(40),
    height: responsiveScale(4),
    borderRadius: responsiveScale(2),
    backgroundColor: `${primaryBlack}28`,
  },
  pinDetailClose: {
    position: "absolute",
    top: responsiveMargin(10),
    right: responsiveMargin(12),
    zIndex: 2,
    padding: responsivePadding(6),
    justifyContent: "center",
    alignItems: "center",
  },
  pinDetailLine: {
    ...Typography.outfitRegular16,
    textAlign: "center",
    color: primaryBlack,
    marginTop: responsiveMargin(6),
    marginBottom: responsiveMargin(22),
    lineHeight: responsiveScale(22),
    width: "100%",
    paddingRight: responsivePadding(32),
    paddingLeft: responsivePadding(8),
  },
  mapLoadingOverlay: {
    position: "absolute",
    top: responsiveScale(12),
    right: responsiveScale(12),
    backgroundColor: `${primaryWhite}CC`,
    paddingVertical: responsivePadding(6),
    paddingHorizontal: responsivePadding(10),
    borderRadius: responsiveScale(999),
  },
  pinDetailCta: {
    minWidth: responsiveScale(200),
    paddingVertical: responsivePadding(14),
    paddingHorizontal: responsivePadding(28),
    borderRadius: responsiveScale(999),
    backgroundColor: primaryBlack,
    justifyContent: "center",
    alignItems: "center",
  },
  pinDetailCtaLabel: {
    ...Typography.outfitRegular16,
    color: primaryWhite,
    textAlign: "center",
  },
  clusterListScroll: {
    width: "100%",
    alignSelf: "stretch",
  },
  clusterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: responsiveMargin(10),
    paddingVertical: responsivePadding(10),
    paddingHorizontal: responsivePadding(4),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${primaryBlack}28`,
  },
  clusterRowAvatar: {
    width: responsiveScale(48),
    height: responsiveScale(48),
    borderRadius: responsiveScale(24),
    flexShrink: 0,
  },
  clusterRowTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  clusterRowNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveMargin(8),
    minWidth: 0,
  },
  clusterRowName: {
    ...Typography.agLabel16,
    color: primaryBlack,
    flexShrink: 1,
  },
  clusterRowAddress: {
    ...Typography.outfitRegular16,
    marginTop: responsiveMargin(4),
    color: primaryBlack,
    opacity: 0.78,
  },
  mapView: {
    ...StyleSheet.absoluteFillObject,
  },
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  locationBackHidden: {
    opacity: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: responsiveMargin(32),
  },
  heroBleed: {
    marginTop: responsiveMargin(8),
    marginBottom: responsiveMargin(-30),
    overflow: "hidden",
    alignSelf: "center",
  },
  hero: {
    backgroundColor: primaryGreen,
    overflow: "hidden",
    width: "100%",
  },
  mapScrollBody: {
    paddingHorizontal: responsivePadding(16),
    alignItems: "center",
  },
  title: {
    textAlign: "center",
    alignSelf: "stretch",
    marginBottom: responsiveScale(SECTION_GAP),
  },
  locationSectionLabel: {
    ...Typography.agLabel16,
    textAlign: "center",
    width: "100%",
    marginBottom: responsiveMargin(10),
  },
  outlineBtn: {
    width: responsiveScale(CHECK_LOCATION_BTN_W),
    height: responsiveScale(ROW_HEIGHT),
    borderRadius: responsiveScale(ROW_HEIGHT / 2),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: responsiveScale(SECTION_GAP),
  },
  outlineBtnLabel: {
    ...Typography.outfitRegular16,
    textAlign: "center",
  },
  fieldLabel: {
    ...Typography.agLabel16,
    alignSelf: "flex-start",
    textAlign: "left",
    width: "100%",
    marginBottom: responsiveMargin(10),
  },
  locationSearchSection: {
    width: "100%",
    alignSelf: "stretch",
    alignItems: "center",
    gap: responsiveMargin(12),
    marginBottom: responsiveScale(46),
  },
  locationSearchFieldWrap: {
    width: "100%",
    alignItems: "center",
  },
  predictionsCard: {
    marginTop: responsiveMargin(8),
    borderRadius: responsiveScale(16),
    backgroundColor: primaryWhite,
    borderWidth: 1,
    borderColor: `${primaryBlack}22`,
    overflow: "hidden",
    zIndex: 20,
    elevation: 4,
    shadowColor: primaryBlack,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  predictionsLoadingRow: {
    paddingVertical: responsivePadding(14),
    alignItems: "center",
  },
  predictionRow: {
    paddingVertical: responsivePadding(12),
    paddingHorizontal: responsivePadding(16),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${primaryBlack}18`,
  },
  predictionRowLast: {
    borderBottomWidth: 0,
  },
  predictionRowPressed: {
    backgroundColor: `${primaryBlack}0A`,
  },
  predictionText: {
    ...Typography.outfitRegular16,
    color: primaryBlack,
  },
  searchSubmitBtn: {
    width: responsiveScale(MAP_SEARCH_BTN_W),
    height: responsiveScale(MAP_SEARCH_BTN_H),
    borderRadius: responsiveScale(MAP_SEARCH_BTN_H / 2),
    backgroundColor: primaryBlack,
    justifyContent: "center",
    alignItems: "center",
  },
  searchSubmitLabel: {
    fontFamily: "Outfit_300Light",
    fontSize: responsiveFontSize(16, 16),
    fontWeight: "400",
    letterSpacing: 0,
    color: primaryWhite,
    textAlign: "center",
  },
});
