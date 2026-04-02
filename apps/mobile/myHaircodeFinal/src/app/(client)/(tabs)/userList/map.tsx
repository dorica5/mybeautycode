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
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { CaretLeft, X } from "phosphor-react-native";
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
import { Typography } from "@/src/constants/Typography";
import { SALON_MAP_DARK_STYLE } from "@/src/constants/mapDarkStyle";
import {
  DEMO_MAP_PROFESSIONALS,
  type MapProfessionalPin,
} from "@/src/data/demoMapProfessionals";
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

const ORGANIC_LOGO_VIEWBOX_W = 390;
const ORGANIC_LOGO_VIEWBOX_H = 226;
const SECTION_GAP = 46;
const ROW_HEIGHT = 52;
/** Location search pill on map (design dp). */
const LOCATION_SEARCH_FIELD_W = 342;
const LOCATION_SEARCH_FIELD_H = 46;
/** Black Search CTA under location field (design dp). */
const MAP_SEARCH_BTN_W = 114;
const MAP_SEARCH_BTN_H = 46;
const CHECK_LOCATION_BTN_W = 194;
const MAP_CARD_RADIUS = 28;

/**
 * Demo markers on the map — set `false` when you load real professionals from the API.
 * Typical flow: fetch by bounds (`onRegionChangeComplete`) or by city + profession filter.
 */
const SHOW_DEMO_PROFESSIONAL_MARKERS = true;

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

/** Heading from filter step (`profession` query param). */
function mapScreenTitle(profession?: string): string {
  switch (profession) {
    case "hair":
      return "Select hairdresser";
    case "nails":
      return "Select nail technician";
    case "brows":
      return "Select brow stylist";
    default:
      return "Select salon";
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

const MapLocationScreen = () => {
  const insets = useSafeAreaInsets();

  const { profession } = useLocalSearchParams<{
    profession?: string | string[];
  }>();

  const professionKey = parseValidProfession(
    normalizeProfessionParam(profession)
  );

  useEffect(() => {
    if (!professionKey) {
      router.replace("/(client)/(tabs)/userList/filter-before-map");
    }
  }, [professionKey]);

  const screenTitle = useMemo(
    () => mapScreenTitle(professionKey),
    [professionKey]
  );

  const [locationQuery, setLocationQuery] = useState("");
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [showUserOnMap, setShowUserOnMap] = useState(false);
  const [selectedMapProfessional, setSelectedMapProfessional] =
    useState<MapProfessionalPin | null>(null);

  /**
   * MapView `onPress` often fires together with Marker `onPress`. Without this,
   * the map handler clears selection right after the marker sets it (feels like
   * "nothing happens"). `nativeEvent.action === 'marker-press'` covers Android;
   * the ref covers iOS where `action` may be absent.
   */
  const markerPressConsumesMapPressRef = useRef(false);

  const useStyledGoogleMap =
    Platform.OS === "android" || iosGoogleMapsConfigured();

  const closeMapModal = useCallback(() => {
    setSelectedMapProfessional(null);
    setMapModalVisible(false);
  }, []);

  const onCheckLocation = useCallback(async () => {
    setMapModalVisible(true);
    setMapLoading(true);
    setMapRegion(null);
    setShowUserOnMap(false);
    setSelectedMapProfessional(null);

    let region: Region = BERGEN_REGION;
    let showUser = false;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === PermissionStatus.GRANTED) {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        region = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        };
        showUser = true;
      }
    } catch {
      Alert.alert(
        "Location",
        "Could not read your position. Showing the map around Bergen."
      );
    } finally {
      setMapRegion(region);
      setShowUserOnMap(showUser);
      setMapLoading(false);
    }
  }, []);

  const onSearchLocation = useCallback(() => {
    const q = locationQuery.trim();
    if (!q) {
      Alert.alert("Search", "Enter a place or address to search.");
      return;
    }
    Alert.alert("Search", `Would search for: ${q}`);
  }, [locationQuery]);

  /** Keep Google legal / logo above the mint bottom sheet when a pin is selected. */
  const mapChromeBottomPad = useMemo(() => {
    const base = responsiveScale(18);
    const sheetReserve = responsiveScale(168);
    return selectedMapProfessional ? base + sheetReserve : base;
  }, [selectedMapProfessional]);

  const mapLegalBottomPad = useMemo(() => {
    const base = responsiveScale(14);
    const sheetReserve = responsiveScale(168);
    return selectedMapProfessional ? base + sheetReserve : base;
  }, [selectedMapProfessional]);

  const clearPinSelection = useCallback(() => {
    setSelectedMapProfessional(null);
  }, []);

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

  const handleMarkerPress = useCallback((pro: MapProfessionalPin) => {
    markerPressConsumesMapPressRef.current = true;
    setSelectedMapProfessional((current) =>
      current?.id === pro.id ? null : pro
    );
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        markerPressConsumesMapPressRef.current = false;
      });
    });
  }, []);

  const spiralWidth = responsiveScale(200);
  const spiralHeight =
    spiralWidth * (ORGANIC_LOGO_VIEWBOX_H / ORGANIC_LOGO_VIEWBOX_W);

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
            <View style={styles.mapModalHeaderBlock}>
              <Pressable
                onPress={closeMapModal}
                style={styles.backRow}
                accessibilityRole="button"
                accessibilityLabel="Tilbake"
              >
                <CaretLeft size={responsiveScale(24)} color={primaryBlack} />
                <Text style={styles.backLabel}>Tilbake</Text>
              </Pressable>
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
                    key={`${mapRegion.latitude}-${mapRegion.longitude}`}
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
                    {SHOW_DEMO_PROFESSIONAL_MARKERS &&
                      DEMO_MAP_PROFESSIONALS.map((pro) => {
                        const selected =
                          selectedMapProfessional?.id === pro.id;
                        return (
                          <Marker
                            key={`${pro.id}-${selectedMapProfessional?.id ?? "none"}`}
                            coordinate={{
                              latitude: pro.latitude,
                              longitude: pro.longitude,
                            }}
                            anchor={{ x: 0.5, y: 0.5 }}
                            tracksViewChanges={false}
                            stopPropagation
                            accessibilityLabel={`${pro.displayName}, ${pro.address}`}
                            onPress={() => handleMarkerPress(pro)}
                          >
                            <ProfessionalMapPinBubble selected={selected} />
                          </Marker>
                        );
                      })}
                  </MapView>
                  {selectedMapProfessional ? (
                    <View
                      style={styles.pinDetailSheet}
                      pointerEvents="box-none"
                    >
                      <View style={styles.pinDetailCard}>
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
                          You have selected{"\n"}
                          {selectedMapProfessional.displayName},{" "}
                          {selectedMapProfessional.address}
                        </Text>
                        <Pressable
                          style={styles.pinDetailCta}
                          accessibilityRole="button"
                          accessibilityLabel="View profile"
                          onPress={() =>
                            Alert.alert(
                              selectedMapProfessional.displayName,
                              "Profile and booking will open here when connected to the API."
                            )
                          }
                        >
                          <Text style={styles.pinDetailCtaLabel}>
                            View profile
                          </Text>
                        </Pressable>
                      </View>
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
            <Pressable
              onPress={() => router.back()}
              style={styles.backRow}
              accessibilityRole="button"
              accessibilityLabel="Tilbake"
            >
              <CaretLeft size={responsiveScale(24)} color={primaryBlack} />
              <Text style={styles.backLabel}>Tilbake</Text>
            </Pressable>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.logoWrap}>
                <OrganicPattern width={spiralWidth} height={spiralHeight} />
              </View>

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
                <SearchInput
                  variant="whitePill"
                  whitePillWidth={LOCATION_SEARCH_FIELD_W}
                  whitePillHeight={LOCATION_SEARCH_FIELD_H}
                  onSearch={setLocationQuery}
                  initialQuery={locationQuery}
                  placeholder=""
                  clearSearch={() => setLocationQuery("")}
                />
                <Pressable
                  onPress={onSearchLocation}
                  style={styles.searchSubmitBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.searchSubmitLabel}>Search</Text>
                </Pressable>
              </View>
            </ScrollView>
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
  mapModalHeaderBlock: {
    paddingBottom: responsiveMargin(4),
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
    paddingTop: responsiveMargin(28),
    paddingBottom: responsiveMargin(22),
    paddingHorizontal: responsivePadding(24),
    alignItems: "center",
  },
  pinDetailClose: {
    position: "absolute",
    top: responsiveMargin(12),
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
    marginBottom: responsiveMargin(22),
    lineHeight: responsiveScale(22),
    width: "100%",
    paddingRight: responsivePadding(32),
    paddingLeft: responsivePadding(8),
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
  mapView: {
    ...StyleSheet.absoluteFillObject,
  },
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsivePadding(8),
    paddingVertical: responsivePadding(8),
    alignSelf: "flex-start",
  },
  backLabel: {
    ...Typography.bodyMedium,
    marginLeft: responsivePadding(4),
  },
  scrollContent: {
    paddingHorizontal: responsivePadding(20),
    paddingBottom: responsiveMargin(32),
    alignItems: "center",
  },
  logoWrap: {
    marginTop: responsiveMargin(4),
    marginBottom: responsiveMargin(16),
    alignItems: "center",
  },
  title: {
    textAlign: "center",
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
