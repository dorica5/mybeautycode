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
  Modal,
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
  useFocusEffect,
  useLocalSearchParams,
  usePathname,
} from "expo-router";
import { CaretRight, X } from "phosphor-react-native";
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
import { ProfessionalMapPinBubble } from "@/src/components/ProfessionalMapPinBubble";
import { ClusterMapBubble } from "@/src/components/ClusterMapBubble";
import { Typography } from "@/src/constants/Typography";
import { SALON_MAP_DARK_STYLE } from "@/src/constants/mapDarkStyle";
import {
  useSalonsInBounds,
  useSalonProfessionals,
  toBackendProfessionCode,
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
  contentCardMaxWidth,
  isTablet,
} from "@/src/utils/responsive";
import {
  clusterSalonPins,
  salonClusterTotalProfessionals,
  shouldClusterByZoom,
  type SalonMapCluster,
} from "@/src/utils/mapClustering";

const ROW_HEIGHT = 52;
/** Location search pill on map (design dp). */
const LOCATION_SEARCH_FIELD_W = 342;
const LOCATION_SEARCH_FIELD_H = 46;
/** Black Search CTA under location field (design dp). */
const MAP_SEARCH_BTN_W = 114;
const MAP_SEARCH_BTN_H = 46;
const CHECK_LOCATION_BTN_W = 194;
const MAP_CARD_RADIUS = 28;
const SECTION_GAP = 46;

/** Default map (Bergen) if location permission is denied or unavailable. */
const BERGEN_REGION: Region = {
  latitude: 60.3913,
  longitude: 5.3221,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

function iosGoogleMapsConfigured(): boolean {
  const ios = Constants.expoConfig?.ios as
    | { config?: { googleMapsApiKey?: string } }
    | undefined;
  const key = ios?.config?.googleMapsApiKey;
  return Platform.OS === "ios" && typeof key === "string" && key.length > 0;
}

/**
 * Google helpers (key lookup + geocoding) live in `@/src/lib/googlePlaces`.
 * We import the shared versions so there's one implementation of each.
 */

/** Heading from filter step (`profession` query param). */
function mapScreenTitle(profession?: string): string {
  switch (profession) {
    case "hair":
      return "Discover hairdressers";
    case "nails":
      return "Discover nail technicians";
    case "brows":
      return "Discover brow stylists";
    default:
      return "Discover salons";
  }
}

function normalizeProfessionParam(
  p: string | string[] | undefined
): string | undefined {
  if (typeof p === "string") return p;
  if (Array.isArray(p) && p.length > 0) return p[0];
  return undefined;
}

type MapProfession = "hair" | "nails" | "brows";

function parseValidProfession(raw?: string): MapProfession | undefined {
  if (raw === "hair" || raw === "nails" || raw === "brows") return raw;
  return undefined;
}

function professionPlural(profession: MapProfession, count: number): string {
  const plural = count !== 1;
  switch (profession) {
    case "hair":
      return plural ? "hairdressers" : "hairdresser";
    case "nails":
      return plural ? "nail technicians" : "nail technician";
    case "brows":
      return plural ? "brow stylists" : "brow stylist";
  }
}

function salonSummaryLine(
  profession: MapProfession,
  count: number,
  salonLabel: string
): string {
  return `${count} ${professionPlural(profession, count)} at ${salonLabel}`;
}

/** Region (center + deltas) → backend bounds (NE + SW corners). */
function regionToBounds(r: Region): {
  neLat: number;
  neLng: number;
  swLat: number;
  swLng: number;
} {
  return {
    neLat: r.latitude + r.latitudeDelta / 2,
    neLng: r.longitude + r.longitudeDelta / 2,
    swLat: r.latitude - r.latitudeDelta / 2,
    swLng: r.longitude - r.longitudeDelta / 2,
  };
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

/**
 * Stable native marker identity (key stays `salon.id`) plus a short
 * `tracksViewChanges` pulse when selection changes so the pin bitmap updates
 * without remounting — remounting was hiding pins until the next map interaction.
 */
const SalonMapMarker = React.memo(function SalonMapMarker({
  salon,
  selected,
  onSalonPress,
}: {
  salon: SalonPin;
  selected: boolean;
  onSalonPress: (salon: SalonPin) => void;
}) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  useEffect(() => {
    setTracksViewChanges(true);
    const t = setTimeout(() => setTracksViewChanges(false), 450);
    return () => clearTimeout(t);
  }, [selected]);

  const accessibility = salon.name
    ? `${salon.name}, ${salon.formatted_address}`
    : salon.formatted_address;

  return (
    <Marker
      coordinate={{
        latitude: salon.latitude,
        longitude: salon.longitude,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      stopPropagation
      accessibilityLabel={accessibility}
      onPress={() => onSalonPress(salon)}
    >
      {salon.professional_count >= 1 ? (
        <ClusterMapBubble
          count={salon.professional_count}
          selected={selected}
        />
      ) : (
        <ProfessionalMapPinBubble selected={selected} />
      )}
    </Marker>
  );
});

/**
 * When zoomed out, merges nearby salons; bubble shows sum of `professional_count`.
 * Multi-salon cluster tap zooms in; single-salon cluster behaves like a normal pin.
 */
const SalonClusterMapMarker = React.memo(function SalonClusterMapMarker({
  cluster,
  selectedSalonId,
  onSalonPress,
  onMultiSalonClusterPress,
}: {
  cluster: SalonMapCluster;
  selectedSalonId: string | null;
  onSalonPress: (salon: SalonPin) => void;
  onMultiSalonClusterPress: (cluster: SalonMapCluster) => void;
}) {
  const totalPros = salonClusterTotalProfessionals(cluster.members);
  const singleMember = cluster.members.length === 1 ? cluster.members[0] : null;
  const selected = singleMember
    ? selectedSalonId === singleMember.id
    : cluster.members.some((m) => m.id === selectedSalonId);

  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  useEffect(() => {
    setTracksViewChanges(true);
    const t = setTimeout(() => setTracksViewChanges(false), 450);
    return () => clearTimeout(t);
  }, [selected, totalPros, cluster.members.length]);

  const accessibility = singleMember
    ? singleMember.name
      ? `${singleMember.name}, ${singleMember.formatted_address}`
      : singleMember.formatted_address
    : `${cluster.members.length} salons, ${totalPros} ${totalPros === 1 ? "professional" : "professionals"}`;

  return (
    <Marker
      coordinate={{
        latitude: cluster.latitude,
        longitude: cluster.longitude,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      stopPropagation
      accessibilityLabel={accessibility}
      onPress={() => {
        if (singleMember) {
          onSalonPress(singleMember);
        } else {
          onMultiSalonClusterPress(cluster);
        }
      }}
    >
      {totalPros >= 1 ? (
        <ClusterMapBubble count={totalPros} selected={selected} />
      ) : (
        <ProfessionalMapPinBubble selected={selected} />
      )}
    </Marker>
  );
});

const MapLocationScreen = () => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const patternWidth = windowWidth;
  const heroHeight = patternWidth / 1.77;
  const heroPatternVerticalNudge = heroHeight * 0.34;

  const locationSearchPillWidth = useMemo(() => {
    const shortSide = Math.min(windowWidth, windowHeight);
    if (!isTablet()) {
      return responsiveScale(LOCATION_SEARCH_FIELD_W);
    }
    return Math.min(
      contentCardMaxWidth(shortSide),
      windowWidth - responsivePadding(40)
    );
  }, [windowWidth, windowHeight]);

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

  useEffect(() => {
    if (!professionKey) {
      router.replace("/(client)/(tabs)/userList/filter-before-map");
    }
  }, [professionKey]);

  /** After returning from professional profile, pathname is the map route again — show location UI. */
  useEffect(() => {
    const onMap =
      pathname?.includes("/userList/map") ||
      pathname?.includes("userList/map");
    if (
      onMap &&
      !pathname?.includes("professionalProfile")
    ) {
      setMaskMapLocationShell(false);
    }
  }, [pathname]);

  const screenTitle = useMemo(
    () => mapScreenTitle(professionKey),
    [professionKey]
  );

  const [locationQuery, setLocationQuery] = useState("");
  const [mapModalVisible, setMapModalVisible] = useState(false);
  /**
   * Hide the address / Organic-pattern shell immediately when opening a pro profile (same tick as
   * router.push), before pathname updates — avoids flashing that screen under the closing modal.
   */
  const [maskMapLocationShell, setMaskMapLocationShell] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [showUserOnMap, setShowUserOnMap] = useState(false);
  /** Currently-open salon pin (shows a single bottom sheet listing pros at this place). */
  const [selectedSalon, setSelectedSalon] = useState<SalonPin | null>(null);
  /** Last committed region, used as the query key for /api/salons/nearby. */
  const [boundsRegion, setBoundsRegion] = useState<Region | null>(null);
  const mapViewRef = useRef<MapView | null>(null);
  /** Debounce timer so pan/zoom settles before we re-query. */
  const regionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  /** After opening a pro profile from the map, reopen the map modal on back (keep pins / camera). */
  const restoreMapModalAfterProfileRef = useRef(false);

  const useStyledGoogleMap =
    Platform.OS === "android" || iosGoogleMapsConfigured();

  const closeMapModal = useCallback(() => {
    restoreMapModalAfterProfileRef.current = false;
    setSelectedSalon(null);
    setBoundsRegion(null);
    setMapModalVisible(false);
  }, []);

  const onCheckLocation = useCallback(async () => {
    setSelectedSalon(null);
    setShowUserOnMap(false);
    // Show the map immediately; refine the camera when GPS returns (avoids ~multi‑second blank wait).
    setMapRegion(BERGEN_REGION);
    setBoundsRegion(BERGEN_REGION);
    setMapModalVisible(true);
    setMapLoading(false);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === PermissionStatus.GRANTED) {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
        const region: Region = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        };
        setMapRegion(region);
        setBoundsRegion(region);
        setShowUserOnMap(true);
        mapViewRef.current?.animateToRegion(region, 350);
      }
    } catch {
      Alert.alert(
        "Location",
        "Could not read your position. Showing the map around Bergen."
      );
    }
  }, []);

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
      const region = placeToRegion(
        place.latitude,
        place.longitude,
        place.viewport
      );
      setSelectedSalon(null);
      setShowUserOnMap(false);
      setMapRegion(region);
      setBoundsRegion(region);
      if (!mapModalVisible) {
        setMapModalVisible(true);
      } else {
        mapViewRef.current?.animateToRegion(region, 500);
      }
    },
    [mapModalVisible]
  );

  /**
   * When `mapRegion` changes while the modal is visible, animate the live
   * map to match. This is the failsafe that actually moves the camera when
   * the MapView didn't remount (e.g. RN reused a previous mount despite a
   * new `key`), so the user always sees the region they asked for.
   */
  useEffect(() => {
    if (!mapModalVisible || !mapRegion) return;
    const ref = mapViewRef.current;
    if (!ref) return;
    // One tick after commit so the native map is ready for camera moves
    // (required for a just-mounted MapView on Android).
    const handle = setTimeout(() => {
      ref.animateToRegion(mapRegion, 400);
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
      const apiKey = getGooglePlacesKey();
      if (!apiKey) return;
      setSuppressPredictions(true);
      setLocationQuery(prediction.description);
      setPredictions([]);
      Keyboard.dismiss();
      setMapLoading(true);
      const details = await fetchPlaceDetails(
        prediction.place_id,
        apiKey,
        placesOptions
      );
      setMapLoading(false);
      if (!details) {
        Alert.alert("Search", `Could not open "${prediction.description}".`);
        return;
      }
      flyToPlace(details);
    },
    [placesOptions, flyToPlace]
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
      Alert.alert("Search", "Enter a place or address to search.");
      return;
    }
    const apiKey = getGooglePlacesKey();
    if (!apiKey) {
      Alert.alert(
        "Search",
        "Address search is not configured yet. Please try again later."
      );
      return;
    }
    setSuppressPredictions(true);
    setPredictions([]);
    Keyboard.dismiss();
    setMapLoading(true);
    const result = await geocodeAddress(q, apiKey, placesOptions);
    setMapLoading(false);
    if (!result) {
      Alert.alert("Search", `Could not find "${q}".`);
      return;
    }
    flyToPlace(result);
  }, [locationQuery, placesOptions, flyToPlace]);

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
    const apiKey = getGooglePlacesKey();
    if (!apiKey) {
      setPredictions([]);
      return;
    }
    setPredictionsLoading(true);
    predictionsDebounceRef.current = setTimeout(async () => {
      const results = await fetchAutocomplete(q, apiKey, placesOptions);
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

  const bounds = useMemo(
    () => (boundsRegion ? regionToBounds(boundsRegion) : null),
    [boundsRegion]
  );

  const { data: salons = [], isFetching: salonsFetching } = useSalonsInBounds(
    bounds,
    backendProfessionCode
  );

  const showAggregatedSalonPins = Boolean(
    boundsRegion && shouldClusterByZoom(boundsRegion.latitudeDelta)
  );

  const salonClusters = useMemo(() => {
    if (!boundsRegion || !showAggregatedSalonPins) return null;
    return clusterSalonPins(
      salons,
      boundsRegion.latitudeDelta,
      boundsRegion.longitudeDelta
    );
  }, [boundsRegion, showAggregatedSalonPins, salons]);

  const {
    data: salonProfessionals = [],
    isPending: salonProsLoading,
    isError: salonProsError,
  } = useSalonProfessionals(selectedSalon?.id ?? null, backendProfessionCode);

  const sheetBottomReserve = useMemo(() => {
    if (!selectedSalon) return 0;
    const header = responsiveScale(92);
    const row = responsiveScale(56);
    const footer = responsiveScale(36);
    const rows = Math.max(1, salonProfessionals.length);
    return Math.min(
      responsiveScale(420),
      header + rows * row + footer
    );
  }, [selectedSalon, salonProfessionals.length]);

  /** Keep Google legal / logo above the mint bottom sheet when a pin is selected. */
  const mapChromeBottomPad = useMemo(() => {
    const base = responsiveScale(18);
    return base + sheetBottomReserve;
  }, [sheetBottomReserve]);

  const mapLegalBottomPad = useMemo(() => {
    const base = responsiveScale(14);
    return base + sheetBottomReserve;
  }, [sheetBottomReserve]);

  const clearPinSelection = useCallback(() => {
    setSelectedSalon(null);
  }, []);

  const pinSheetTranslateY = useRef(new Animated.Value(0)).current;
  const pinSheetScrollAtTop = useRef(true);

  useEffect(() => {
    if (selectedSalon) {
      pinSheetTranslateY.setValue(0);
      pinSheetScrollAtTop.current = true;
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
      pinSheetScrollAtTop.current = e.nativeEvent.contentOffset.y <= 0;
    },
    []
  );

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

  const handleSalonMarkerPress = useCallback(
    (salon: SalonPin) => {
      markerPressConsumesMapPressRef.current = true;
      setSelectedSalon(salon);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          markerPressConsumesMapPressRef.current = false;
        });
      });
    },
    []
  );

  const handleMultiSalonClusterPress = useCallback(
    (cluster: SalonMapCluster) => {
      if (cluster.members.length <= 1) return;
      const br = boundsRegion;
      if (!br) return;
      markerPressConsumesMapPressRef.current = true;
      setSelectedSalon(null);
      const latD = Math.max(br.latitudeDelta * 0.42, 0.005);
      const lngD = Math.max(br.longitudeDelta * 0.42, 0.005);
      const region: Region = {
        latitude: cluster.latitude,
        longitude: cluster.longitude,
        latitudeDelta: latD,
        longitudeDelta: lngD,
      };
      setMapRegion(region);
      setBoundsRegion(region);
      mapViewRef.current?.animateToRegion(region, 450);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          markerPressConsumesMapPressRef.current = false;
        });
      });
    },
    [boundsRegion]
  );

  /** Debounce `onRegionChangeComplete`: wait until the user stops panning/zooming. */
  const handleRegionChangeComplete = useCallback((r: Region) => {
    if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
    regionDebounceRef.current = setTimeout(() => {
      setBoundsRegion(r);
    }, 160);
  }, []);

  useEffect(
    () => () => {
      if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
    },
    []
  );

  const openProfessionalProfile = useCallback(
    async (pro: SalonProfessional) => {
      /**
       * The map runs inside a React Native `Modal`, so we must hide it before
       * or after `router.push` carefully. Do **not** clear `boundsRegion` /
       * `mapRegion` — when the user taps back we reopen the modal (see `useFocusEffect`).
       */
      const proId = pro.hairdresser_id;
      restoreMapModalAfterProfileRef.current = true;
      /** Same tick as navigation intent — blanks the location form under the modal. */
      setMaskMapLocationShell(true);
      setSelectedSalon(null);
      /** Warm cache so `[id]` can paint without waiting blocked-list queries. Cap wait so tap still feels responsive. */
      if (isUuid(proId)) {
        try {
          await Promise.race([
            queryClient.fetchQuery({
              queryKey: clientProfileByIdQueryKey(proId),
              queryFn: () => fetchClientProfileById(proId),
              staleTime: 60_000,
            }),
            new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 400)),
          ]);
        } catch {
          /* profile screen retries */
        }
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
      const href = {
        pathname: "/(client)/(tabs)/userList/professionalProfile/[id]" as const,
        params: {
          id: proId,
          ...(backendProfessionCode ? { profession: backendProfessionCode } : {}),
        },
      };
      router.push(href);
      requestAnimationFrame(() => {
        setMapModalVisible(false);
      });
    },
    [backendProfessionCode, clientId, queryClient]
  );

  useFocusEffect(
    useCallback(() => {
      if (!restoreMapModalAfterProfileRef.current) return;
      restoreMapModalAfterProfileRef.current = false;
      setMapModalVisible(true);
    }, [])
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

  const hideMapLocationUI =
    maskMapLocationShell ||
    Boolean(pathname?.includes("professionalProfile"));

  return (
    <>
      <StatusBar style="dark" />
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeMapModal}
      >
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
          <View style={styles.mapModalChrome}>
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

            {mapLoading ? (
              <View style={styles.mapLoadingWrap}>
                <ActivityIndicator size="large" color={primaryBlack} />
              </View>
            ) : mapRegion && Platform.OS !== "web" ? (
              <View style={styles.mapModalMapSection}>
                <View style={styles.mapCardStack}>
                  <MapView
                    ref={mapViewRef}
                    style={styles.mapView}
                    provider={
                      useStyledGoogleMap ? PROVIDER_GOOGLE : undefined
                    }
                    customMapStyle={
                      useStyledGoogleMap ? SALON_MAP_DARK_STYLE : undefined
                    }
                    initialRegion={mapRegion}
                    showsUserLocation={showUserOnMap}
                    showsMyLocationButton={false}
                    rotateEnabled
                    pitchEnabled={false}
                    toolbarEnabled={false}
                    onPress={handleMapPress}
                    onRegionChangeComplete={handleRegionChangeComplete}
                    mapPadding={{
                      top: responsiveScale(10),
                      right: responsiveScale(14),
                      bottom: mapChromeBottomPad,
                      left: responsiveScale(14),
                    }}
                    legalLabelInsets={{
                      top: 0,
                      right: responsiveScale(12),
                      bottom: mapLegalBottomPad,
                      left: responsiveScale(12),
                    }}
                  >
                    {showAggregatedSalonPins && salonClusters
                      ? salonClusters.map((c) => (
                          <SalonClusterMapMarker
                            key={c.id}
                            cluster={c}
                            selectedSalonId={selectedSalon?.id ?? null}
                            onSalonPress={handleSalonMarkerPress}
                            onMultiSalonClusterPress={handleMultiSalonClusterPress}
                          />
                        ))
                      : salons.map((salon) => (
                          <SalonMapMarker
                            key={salon.id}
                            salon={salon}
                            selected={selectedSalon?.id === salon.id}
                            onSalonPress={handleSalonMarkerPress}
                          />
                        ))}
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
                          accessibilityLabel="Drag down to close"
                        >
                          <View style={styles.pinDetailHandle} />
                        </View>
                        <Pressable
                          onPress={clearPinSelection}
                          style={styles.pinDetailClose}
                          accessibilityRole="button"
                          accessibilityLabel="Lukk"
                          hitSlop={12}
                        >
                          <X
                            size={responsiveScale(20)}
                            color={primaryBlack}
                            weight="bold"
                          />
                        </Pressable>
                        <Text style={styles.pinDetailLine}>
                          {selectedSalon.name ?? selectedSalon.formatted_address}
                          {selectedSalon.name ? (
                            <>
                              {"\n"}
                              <Text style={styles.pinDetailLineSub}>
                                {selectedSalon.formatted_address}
                              </Text>
                            </>
                          ) : null}
                        </Text>
                        {salonProsError ? (
                          <Text style={styles.clusterRowAddress}>
                            Couldn&apos;t load professionals. Check your connection
                            and try the pin again.
                          </Text>
                        ) : salonProsLoading && salonProfessionals.length === 0 ? (
                          <ActivityIndicator color={primaryBlack} />
                        ) : salonProfessionals.length === 0 ? (
                          <Text style={styles.clusterRowAddress}>
                            No professionals at this salon yet.
                          </Text>
                        ) : (
                          <>
                            <Text style={styles.clusterRowAddress}>
                              {salonSummaryLine(
                                professionKey,
                                salonProfessionals.length,
                                selectedSalon.name ?? "this salon"
                              )}
                            </Text>
                            <ScrollView
                              style={styles.clusterListScroll}
                              keyboardShouldPersistTaps="handled"
                              showsVerticalScrollIndicator={false}
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
                                  accessibilityLabel={pro.full_name ?? "Professional"}
                                >
                                  <View style={styles.clusterRowTextWrap}>
                                    <Text style={styles.clusterRowName}>
                                      {pro.full_name ?? "Professional"}
                                    </Text>
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
                  ) : salonsFetching && salons.length === 0 ? (
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
                  Kartet er tilgjengelig i appen på iOS og Android.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
            <View style={navBackChromeStyles.screenBar}>
              <NavBackRow onPress={() => router.back()} />
            </View>
            {hideMapLocationUI ? (
              <View style={styles.mapShellPlaceholder} />
            ) : (
              <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
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
                  Use my current location
                </Text>
                <Pressable
                  onPress={onCheckLocation}
                  style={styles.outlineBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.outlineBtnLabel}>Check my location</Text>
                </Pressable>

                <Text style={styles.locationSectionLabel}>
                  Or search for location
                </Text>
                <View style={styles.locationSearchBlock}>
                  <View style={styles.locationSearchFieldWrap}>
                    <SearchInput
                      variant="whitePill"
                      whitePillWidth={locationSearchPillWidth}
                      whitePillHeight={LOCATION_SEARCH_FIELD_H}
                      /**
                       * Controlled: parent owns the text. This short-circuits the
                       * uncontrolled effect chain in SearchInput (which clears on
                       * route focus + writes back via onSearch) that otherwise
                       * interacts with TextInput's layout effect on this screen
                       * and trips the "Maximum update depth" guard.
                       */
                      value={locationQuery}
                      onSearch={handleLocationQueryChange}
                      initialQuery={locationQuery}
                      placeholder=""
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
                          { width: locationSearchPillWidth },
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
                    <Text style={styles.searchSubmitLabel}>Search</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </>
  );
};

export default MapLocationScreen;

const styles = StyleSheet.create({
  mapModalSafe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  mapModalChrome: {
    flex: 1,
    minHeight: 0,
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
  pinDetailLineSub: {
    ...Typography.outfitRegular16,
    color: primaryBlack,
    opacity: 0.7,
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
    maxHeight: responsiveScale(220),
    width: "100%",
    alignSelf: "stretch",
  },
  clusterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: responsiveMargin(10),
    paddingVertical: responsivePadding(12),
    paddingHorizontal: responsivePadding(4),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${primaryBlack}28`,
  },
  clusterRowTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  clusterRowName: {
    ...Typography.agLabel16,
    color: primaryBlack,
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
  mapShellPlaceholder: {
    flex: 1,
    backgroundColor: primaryGreen,
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
    paddingHorizontal: responsivePadding(20),
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
  locationSearchBlock: {
    width: "100%",
    alignItems: "center",
    gap: responsiveMargin(14),
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
