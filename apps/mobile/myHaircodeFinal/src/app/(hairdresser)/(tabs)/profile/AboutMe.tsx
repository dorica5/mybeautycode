import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { randomUUID } from "expo-crypto";
import { CaretLeft, Palette, XCircle } from "phosphor-react-native";
import { BrandOutlineField } from "@/src/components/BrandOutlineField";
import {
  MintProfileScreenShell,
  mintProfileScrollContent,
} from "@/src/components/MintProfileScreenShell";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import CustomAlert from "@/src/components/CustomAlert";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { Colors, primaryBlack, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveBorderRadius,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import {
  PlusStroke24,
  InfoStroke16,
  PencilStroke16,
  SocialStrokeIcon20,
  GlobeStroke20,
} from "@/src/components/icons/GetDiscoveredStrokeIcons";
import { inferSocialFromUrl } from "@/src/lib/inferSocialFromUrl";
import {
  parseColorBrands,
  serializeColorBrands,
} from "@/src/lib/colorBrandStorage";
import {
  parseSocialLinks,
  serializeSocialLinks,
  socialLinkRowLabel,
} from "@/src/lib/socialMediaStorage";
import {
  coerceProfessionCode,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import type { ProfessionDetailApi } from "@/src/constants/types";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import OptimizedImage from "@/src/components/OptimizedImage";
import { uploadToStorage } from "@/src/lib/uploadHelpers";
import {
  addPublicProfileWork,
  deletePublicProfileWork,
  listPublicProfileWork,
  type PublicProfileWorkRow,
} from "@/src/api/publicProfileWork";

/**
 * Get discovered — professional-only editor (public-facing bio, links, hair color brands, portfolio).
 * Routed only from `(hairdresser)/(tabs)/profile/`. Client accounts use
 * `(client)/(tabs)/profile/AboutMe` for their own “about” / hair-baseline flow, not this file.
 */
const NUM_WORK_COLS = 2;
/** Must match `styles.section.maxWidth` — grid cells were sized to full screen while this caps row width, so two columns didn’t fit. */
const WORK_SECTION_MAX_WIDTH = 400;
const MAX_WORK_IMAGES = 6;
const MAX_COLOR_BRANDS = 6;

function bookingRowLabel(url: string): string {
  const t = url.trim();
  if (!t) return "";
  try {
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    return new URL(withProto).hostname.replace(/^www\./i, "");
  } catch {
    return t.length > 24 ? `${t.slice(0, 24)}…` : t;
  }
}

function normalizeLinksForCompare(raw: string | null): string {
  return JSON.stringify(parseSocialLinks(raw ?? ""));
}

function chunkIntoRows<T>(items: T[], rowSize: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += rowSize) {
    rows.push(items.slice(i, i + rowSize));
  }
  return rows;
}

type DraftWorkSaved = PublicProfileWorkRow & { draftKind: "saved" };
type DraftWorkPending = {
  draftKind: "pending";
  localId: string;
  lowResUri: string;
  highResUri: string;
};
type DraftWorkItem = DraftWorkSaved | DraftWorkPending;

const AboutMe = () => {
  const { profile } = useAuth();
  const { storedProfessionReady, activeProfessionCode } =
    useActiveProfessionState(profile);

  const detailForActive = useMemo((): ProfessionDetailApi | null => {
    if (!activeProfessionCode || !profile.professions_detail?.length) {
      return null;
    }
    return (
      profile.professions_detail.find(
        (d: ProfessionDetailApi) =>
          coerceProfessionCode(d.profession_code) === activeProfessionCode
      ) ?? null
    );
  }, [profile.professions_detail, activeProfessionCode]);

  const baselineAboutMe = useMemo(
    () => detailForActive?.about_me ?? profile.about_me ?? "",
    [detailForActive, profile.about_me]
  );
  const baselineSocialMedia = useMemo(
    () => detailForActive?.social_media ?? profile.social_media,
    [detailForActive, profile.social_media]
  );
  const baselineBookingSite = useMemo(
    () => detailForActive?.booking_site ?? profile.booking_site ?? "",
    [detailForActive, profile.booking_site]
  );
  const originalColorBrand = profile.color_brand ?? "";
  const id = profile.id;

  const [about_me, setAboutMe] = useState(() => baselineAboutMe);
  const [socialLinks, setSocialLinks] = useState<string[]>(() =>
    parseSocialLinks(baselineSocialMedia)
  );
  const [booking_site, setBookingSite] = useState(baselineBookingSite);
  const [colorBrands, setColorBrands] = useState<string[]>(() =>
    parseColorBrands(originalColorBrand)
  );

  const professionApi = useMemo((): ProfessionChoiceCode | null => {
    if (!storedProfessionReady || activeProfessionCode == null) return null;
    return activeProfessionCode;
  }, [storedProfessionReady, activeProfessionCode]);

  useEffect(() => {
    if (professionApi == null) return;
    const d = profile.professions_detail?.find(
      (x: ProfessionDetailApi) =>
        coerceProfessionCode(x.profession_code) === professionApi
    );
    setAboutMe(d?.about_me ?? profile.about_me ?? "");
    setSocialLinks(parseSocialLinks(d?.social_media ?? profile.social_media));
    setBookingSite(d?.booking_site ?? profile.booking_site ?? "");
  }, [
    professionApi,
    profile.id,
    profile.professions_detail,
    profile.about_me,
    profile.social_media,
    profile.booking_site,
  ]);

  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const superPowerRef = useRef<TextInput>(null);

  /** Last loaded from API — used to compute deletes on Save. */
  const [serverWorkRows, setServerWorkRows] = useState<PublicProfileWorkRow[]>(
    []
  );
  /** Local edits: saved rows mirror server until Save; pending = picked images not yet uploaded. */
  const [draftWorkItems, setDraftWorkItems] = useState<DraftWorkItem[]>([]);
  const [preparingWorkImages, setPreparingWorkImages] = useState(false);

  /** Color brands apply only while editing the hair professional surface. */
  const hasHairSurface = activeProfessionCode === "hair";

  useEffect(() => {
    if (!hasHairSurface) {
      setColorBrandModal(null);
      setAlertVisible(false);
    }
  }, [hasHairSurface]);

  const refreshWorkFromServer = useCallback(async () => {
    if (!id || professionApi == null) return;
    try {
      const rows = await listPublicProfileWork(id, professionApi);
      const capped = rows.slice(0, MAX_WORK_IMAGES);
      setServerWorkRows(capped);
      setDraftWorkItems(
        capped.map((r) => ({ draftKind: "saved" as const, ...r }))
      );
    } catch (e) {
      console.warn("AboutMe refreshWorkFromServer:", e);
      setServerWorkRows([]);
      setDraftWorkItems([]);
    }
  }, [id, professionApi]);

  useEffect(() => {
    void refreshWorkFromServer();
  }, [refreshWorkFromServer]);

  const workDirty = useMemo(() => {
    if (draftWorkItems.some((x) => x.draftKind === "pending")) return true;
    const serverIds = new Set(serverWorkRows.map((r) => r.id));
    const draftSavedIds = new Set(
      draftWorkItems
        .filter((x): x is DraftWorkSaved => x.draftKind === "saved")
        .map((x) => x.id)
    );
    if (serverIds.size !== draftSavedIds.size) return true;
    for (const sid of serverIds) {
      if (!draftSavedIds.has(sid)) return true;
    }
    for (const did of draftSavedIds) {
      if (!serverIds.has(did)) return true;
    }
    return false;
  }, [serverWorkRows, draftWorkItems]);

  const [socialUrlModal, setSocialUrlModal] = useState<{
    draft: string;
    editIndex?: number;
  } | null>(null);

  const [bookingUrlModal, setBookingUrlModal] = useState<{
    draft: string;
  } | null>(null);

  const [colorBrandModal, setColorBrandModal] = useState<{
    draft: string;
    editIndex?: number;
  } | null>(null);

  const { mutateAsync: updateProfileAsync } = useUpdateSupabaseProfile();

  const width = Dimensions.get("window").width;
  const scrollPad = responsivePadding(24);
  const workGap = responsiveScale(12);
  const workRowInner = Math.min(
    WORK_SECTION_MAX_WIDTH,
    width - scrollPad * 2
  );
  const workCell =
    (workRowInner - workGap * (NUM_WORK_COLS - 1)) / NUM_WORK_COLS;

  const serializedSocial = useMemo(
    () => serializeSocialLinks(socialLinks),
    [socialLinks]
  );

  const workRows = useMemo(
    () => chunkIntoRows(draftWorkItems, NUM_WORK_COLS),
    [draftWorkItems]
  );

  const addPublicWorkFromLibrary = async () => {
    if (
      !id ||
      draftWorkItems.length >= MAX_WORK_IMAGES ||
      preparingWorkImages ||
      loading
    ) {
      return;
    }
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera roll access is required");
        return;
      }
      const remaining = MAX_WORK_IMAGES - draftWorkItems.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsMultipleSelection: true,
        quality: 1,
      });
      if (result.canceled || !result.assets?.length) {
        return;
      }
      const assets = result.assets.slice(0, remaining);
      if (result.assets.length > remaining) {
        Alert.alert(
          "Image limit",
          `You can add up to ${MAX_WORK_IMAGES} public portfolio images.`
        );
      }
      setPreparingWorkImages(true);
      for (const asset of assets) {
        const [lowRes, highRes] = await Promise.all([
          ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 540 } }],
            {
              compress: 0.72,
              format: ImageManipulator.SaveFormat.JPEG,
            }
          ),
          ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 1200 } }],
            {
              compress: 0.85,
              format: ImageManipulator.SaveFormat.JPEG,
            }
          ),
        ]);
        setDraftWorkItems((prev) => {
          if (prev.length >= MAX_WORK_IMAGES) return prev;
          return [
            ...prev,
            {
              draftKind: "pending" as const,
              localId: randomUUID(),
              lowResUri: lowRes.uri,
              highResUri: highRes.uri,
            },
          ];
        });
      }
    } catch (e) {
      console.error("addPublicWorkFromLibrary:", e);
      Alert.alert("Error", "Failed to add images.");
    } finally {
      setPreparingWorkImages(false);
    }
  };

  const confirmDeleteWorkImage = (savedIdOrLocalId: string) => {
    Alert.alert(
      "Remove image",
      "Remove this photo from your public profile?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setDraftWorkItems((prev) =>
              prev.filter((item) =>
                item.draftKind === "saved"
                  ? item.id !== savedIdOrLocalId
                  : item.localId !== savedIdOrLocalId
              )
            );
          },
        },
      ]
    );
  };

  const updateUserProfile = async () => {
    if (!id) {
      Alert.alert("User not found");
      return;
    }
    if (professionApi == null) {
      Alert.alert("Loading", "Please wait a moment and try again.");
      return;
    }
    setLoading(true);
    try {
      const draftSavedIds = new Set(
        draftWorkItems
          .filter((x): x is DraftWorkSaved => x.draftKind === "saved")
          .map((x) => x.id)
      );
      const toDelete = serverWorkRows
        .filter((r) => !draftSavedIds.has(r.id))
        .map((r) => r.id);
      for (const imageId of toDelete) {
        await deletePublicProfileWork(id, imageId);
      }
      const pending = draftWorkItems.filter(
        (x): x is DraftWorkPending => x.draftKind === "pending"
      );
      for (const p of pending) {
        const lowPath = await uploadToStorage(
          p.lowResUri,
          "public_profile_work",
          undefined,
          "image/jpeg"
        );
        const highPath = await uploadToStorage(
          p.highResUri,
          "public_profile_work",
          undefined,
          "image/jpeg"
        );
        if (!lowPath || !highPath) {
          throw new Error("Could not upload portfolio image.");
        }
        await addPublicProfileWork(id, {
          profession_code: professionApi,
          image_url: highPath,
          low_res_image_url: lowPath,
        });
      }

      await updateProfileAsync({
        id,
        profession_code: professionApi,
        about_me: about_me.trim() || null,
        social_media: serializedSocial || null,
        booking_site: booking_site.trim() || null,
        ...(hasHairSurface
          ? { color_brand: serializeColorBrands(colorBrands) }
          : {}),
      });

      await refreshWorkFromServer();
      setChanged(false);
      Keyboard.dismiss();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      Alert.alert("Failed to save", message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setChanged(
      about_me !== baselineAboutMe ||
        normalizeLinksForCompare(serializedSocial) !==
          normalizeLinksForCompare(baselineSocialMedia ?? "") ||
        booking_site !== baselineBookingSite ||
        workDirty ||
        (hasHairSurface &&
          serializeColorBrands(colorBrands) !==
            serializeColorBrands(parseColorBrands(originalColorBrand)))
    );
  }, [
    about_me,
    baselineAboutMe,
    serializedSocial,
    baselineSocialMedia,
    booking_site,
    baselineBookingSite,
    colorBrands,
    originalColorBrand,
    workDirty,
    hasHairSurface,
  ]);

  const scrollToInput = (y: number) => {
    scrollViewRef.current?.scrollTo({ y, animated: true });
  };

  const commitSocialUrl = () => {
    if (!socialUrlModal) return;
    let u = socialUrlModal.draft.trim();
    if (!u) {
      setSocialUrlModal(null);
      return;
    }
    if (!/^https?:\/\//i.test(u)) {
      u = `https://${u}`;
    }
    try {
      void new URL(u);
    } catch {
      Alert.alert("Invalid link", "Enter a valid URL.");
      return;
    }
    setSocialLinks((prev) => {
      const next = [...prev];
      const idx = socialUrlModal.editIndex;
      if (idx !== undefined && idx >= 0 && idx < next.length) {
        next[idx] = u;
      } else {
        next.push(u);
      }
      return next;
    });
    setSocialUrlModal(null);
  };

  const commitBookingUrl = () => {
    if (!bookingUrlModal) return;
    let u = bookingUrlModal.draft.trim();
    if (!u) {
      setBookingSite("");
      setBookingUrlModal(null);
      return;
    }
    if (!/^https?:\/\//i.test(u)) {
      u = `https://${u}`;
    }
    try {
      void new URL(u);
    } catch {
      Alert.alert("Invalid link", "Enter a valid website URL.");
      return;
    }
    setBookingSite(u);
    setBookingUrlModal(null);
  };

  const openAddSocial = () => {
    setSocialUrlModal({ draft: "" });
  };

  const openEditSocial = (index: number) => {
    setSocialUrlModal({ draft: socialLinks[index] ?? "", editIndex: index });
  };

  const openBookingEdit = () => {
    setBookingUrlModal({ draft: booking_site });
  };

  const commitColorBrandModal = () => {
    if (!colorBrandModal) return;
    const t = colorBrandModal.draft.trim();
    const idx = colorBrandModal.editIndex;
    if (!t) {
      if (idx !== undefined && idx >= 0) {
        setColorBrands((prev) => prev.filter((_, i) => i !== idx));
      }
      setColorBrandModal(null);
      return;
    }
    setColorBrands((prev) => {
      const next = [...prev];
      if (idx !== undefined && idx >= 0 && idx < next.length) {
        next[idx] = t;
        return next;
      }
      if (next.length >= MAX_COLOR_BRANDS) return next;
      next.push(t);
      return next;
    });
    setColorBrandModal(null);
  };

  const openAddColorBrand = () => {
    if (colorBrands.length >= MAX_COLOR_BRANDS) return;
    setColorBrandModal({ draft: "" });
  };

  const openEditColorBrand = (index: number) => {
    setColorBrandModal({
      draft: colorBrands[index] ?? "",
      editIndex: index,
    });
  };

  return (
    <MintProfileScreenShell>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={mintProfileScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backRow}
            hitSlop={12}
          >
            <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
            <Text style={[Typography.bodyMedium, styles.backText]}>Back</Text>
          </Pressable>

          <Text style={[Typography.h3, styles.heroTitle]} accessibilityRole="header">
            Get discovered
          </Text>
          <View style={styles.heroSubWrap}>
            <Text style={[Typography.bodyLarge, styles.heroSubLine]}>
              Write and add anything
            </Text>
            <Text style={[Typography.bodyLarge, styles.heroSubLine]}>
              you would like your client
            </Text>
            <Text style={[Typography.bodyLarge, styles.heroSubLine]}>
              to know or see.
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={[Typography.label, styles.labelFlex]}>
                What&apos;s your superpower?
              </Text>
              {about_me.trim().length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit superpower"
                  onPress={() => superPowerRef.current?.focus()}
                  style={styles.editCtrl}
                  hitSlop={8}
                >
                  <Text style={[Typography.outfitRegular16, styles.editLabel]}>
                    Edit
                  </Text>
                  <PencilStroke16 />
                </Pressable>
              ) : null}
            </View>
            <BrandOutlineField
              label=""
              accessibilityLabel="What's your superpower?"
              placeholder="Tell your clients about your skills"
              value={about_me}
              inputRef={superPowerRef}
              onChangeText={(text) => {
                const lines = text.split("\n");
                if (lines.length < 5) {
                  setAboutMe(text);
                } else {
                  setAboutMe(lines.slice(0, 4).join("\n"));
                }
              }}
              multiline
              minInputHeight={responsiveScale(130)}
              onFocus={() => scrollToInput(0)}
              containerStyle={styles.fieldTightBottom}
            />
          </View>

          <View style={[styles.section, styles.sectionLinkBlock]}>
            <Text style={[Typography.label, styles.sectionLabel]}>
              Link to social media
            </Text>
            {socialLinks.map((url, index) => {
              const kind = inferSocialFromUrl(url).kind;
              return (
                <View key={`${url}-${index}`} style={styles.summaryCard}>
                  <SocialStrokeIcon20 kind={kind} />
                  <Text
                    style={[Typography.outfitRegular16, styles.summaryTitle]}
                    numberOfLines={1}
                  >
                    {socialLinkRowLabel(url)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${socialLinkRowLabel(url)}`}
                    onPress={() => openEditSocial(index)}
                    style={styles.editCtrl}
                    hitSlop={8}
                  >
                    <Text style={[Typography.outfitRegular16, styles.editLabel]}>
                      Edit
                    </Text>
                    <PencilStroke16 />
                  </Pressable>
                </View>
              );
            })}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add media"
              onPress={openAddSocial}
              style={styles.addPill}
            >
              <PlusStroke24 />
              <Text style={[Typography.label, styles.addPillLabel]}>Add media</Text>
            </Pressable>
          </View>

          <View style={[styles.section, styles.sectionLinkBlock]}>
            <Text style={[Typography.label, styles.sectionLabel]}>
              Link to booking site
            </Text>
            {booking_site.trim().length > 0 ? (
              <View style={styles.summaryCard}>
                <GlobeStroke20 />
                <Text
                  style={[Typography.outfitRegular16, styles.summaryTitle]}
                  numberOfLines={1}
                >
                  {bookingRowLabel(booking_site)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit booking site"
                  onPress={openBookingEdit}
                  style={styles.editCtrl}
                  hitSlop={8}
                >
                  <Text style={[Typography.outfitRegular16, styles.editLabel]}>
                    Edit
                  </Text>
                  <PencilStroke16 />
                </Pressable>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add website"
              onPress={() => setBookingUrlModal({ draft: booking_site })}
              style={styles.addPill}
            >
              <PlusStroke24 />
              <Text style={[Typography.label, styles.addPillLabel]}>Add website</Text>
            </Pressable>
          </View>

          {hasHairSurface ? (
            <>
              <View
                style={[
                  styles.section,
                  styles.sectionAfterLinks,
                  styles.sectionLinkBlock,
                ]}
              >
                <View style={styles.labelRow}>
                  <Text style={[Typography.label, styles.labelFlex]}>
                    What color brand does your salon use?
                  </Text>
                  <Pressable
                    onPress={() => setAlertVisible(true)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="About color brand"
                  >
                    <InfoStroke16 />
                  </Pressable>
                </View>
                {colorBrands.map((brand, index) => (
                  <View
                    key={`${brand}-${index}`}
                    style={styles.summaryCard}
                  >
                    <Palette
                      size={responsiveScale(20)}
                      color={primaryBlack}
                      weight="regular"
                    />
                    <Text
                      style={[Typography.outfitRegular16, styles.summaryTitle]}
                      numberOfLines={3}
                    >
                      {brand}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit color brand ${brand}`}
                      onPress={() => openEditColorBrand(index)}
                      style={styles.editCtrl}
                      hitSlop={8}
                    >
                      <Text
                        style={[Typography.outfitRegular16, styles.editLabel]}
                      >
                        Edit
                      </Text>
                      <PencilStroke16 />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add color brand"
                  onPress={openAddColorBrand}
                  disabled={colorBrands.length >= MAX_COLOR_BRANDS}
                  style={[
                    styles.addPill,
                    styles.addPillColorBrand,
                    colorBrands.length >= MAX_COLOR_BRANDS &&
                      styles.addPillDisabled,
                  ]}
                >
                  <Text style={[Typography.label, styles.addPillLabel]}>
                    {colorBrands.length >= MAX_COLOR_BRANDS
                      ? "Maximum 6 brands"
                      : "Add color brand"}
                  </Text>
                </Pressable>
              </View>

              <CustomAlert
                visible={alertVisible}
                title="Color brand"
                message="Color brand will only be visible to other hairdressers"
                onClose={() => setAlertVisible(false)}
              />
            </>
          ) : null}

          <View style={styles.section}>
            <Text style={[Typography.label, styles.sectionLabel]}>My work</Text>
            {draftWorkItems.length > 0 ? (
              <View style={styles.workGrid}>
                {workRows.map((row, rowIndex) => (
                  <View
                    key={`work-row-${rowIndex}-${
                      row[0]?.draftKind === "saved"
                        ? row[0].id
                        : row[0]?.localId ?? ""
                    }`}
                    style={[
                      styles.workRow,
                      rowIndex < workRows.length - 1 && {
                        marginBottom: workGap,
                      },
                    ]}
                  >
                    {row.map((cell, colIndex) => {
                      const wrapStyle = [
                        styles.workThumbWrap,
                        {
                          width: workCell,
                          height: workCell,
                          marginRight:
                            colIndex === 0 && row.length > 1 ? workGap : 0,
                        },
                      ];
                      if (cell.draftKind === "pending") {
                        return (
                          <View key={cell.localId} style={wrapStyle}>
                            <Image
                              source={{ uri: cell.lowResUri }}
                              style={[
                                styles.workThumb,
                                { width: workCell, height: workCell },
                              ]}
                              resizeMode="cover"
                            />
                            <Pressable
                              onPress={() =>
                                confirmDeleteWorkImage(cell.localId)
                              }
                              style={styles.workThumbDelete}
                              hitSlop={8}
                              accessibilityRole="button"
                              accessibilityLabel="Remove portfolio photo"
                            >
                              <XCircle
                                size={responsiveScale(22)}
                                color={Colors.light.light}
                              />
                            </Pressable>
                          </View>
                        );
                      }
                      const path =
                        (cell.lowResImageUrl?.trim() &&
                        cell.lowResImageUrl.length > 0
                          ? cell.lowResImageUrl
                          : cell.imageUrl) ?? "";
                      return (
                        <View key={cell.id} style={wrapStyle}>
                          <OptimizedImage
                            path={path}
                            bucket="public_profile_work"
                            sizePreset="inspiration-grid"
                            width={Math.ceil(workCell)}
                            recyclingKey={cell.id}
                            style={[
                              styles.workThumb,
                              {
                                width: workCell,
                                height: workCell,
                              },
                            ]}
                            contentFit="cover"
                            priority="low"
                          />
                          <Pressable
                            onPress={() => confirmDeleteWorkImage(cell.id)}
                            style={styles.workThumbDelete}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Remove portfolio photo"
                          >
                            <XCircle
                              size={responsiveScale(22)}
                              color={Colors.light.light}
                            />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add portfolio images"
              onPress={addPublicWorkFromLibrary}
              disabled={
                preparingWorkImages ||
                loading ||
                draftWorkItems.length >= MAX_WORK_IMAGES
              }
              style={[
                styles.addPill,
                (preparingWorkImages ||
                  loading ||
                  draftWorkItems.length >= MAX_WORK_IMAGES) &&
                  styles.addPillDisabled,
              ]}
            >
              {preparingWorkImages ? (
                <ActivityIndicator color={primaryBlack} />
              ) : (
                <PlusStroke24 />
              )}
              <Text style={[Typography.label, styles.addPillLabel]}>
                {draftWorkItems.length >= MAX_WORK_IMAGES
                  ? "Maximum 6 photos"
                  : "Add images"}
              </Text>
            </Pressable>
          </View>

          <PaddedLabelButton
            title={loading ? "Saving…" : "Save"}
            horizontalPadding={32}
            verticalPadding={16}
            onPress={updateUserProfile}
            disabled={loading || !changed}
            style={styles.save}
            textStyle={styles.saveLabel}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={socialUrlModal != null}
        transparent
        animationType="fade"
        onRequestClose={() => setSocialUrlModal(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSocialUrlModal(null)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={[Typography.label, styles.modalTitle]}>
              {socialUrlModal?.editIndex !== undefined
                ? "Edit social link"
                : "Add social link"}
            </Text>
            <TextInput
              value={socialUrlModal?.draft ?? ""}
              onChangeText={(t) =>
                setSocialUrlModal((m) => (m ? { ...m, draft: t } : m))
              }
              placeholder="https://"
              placeholderTextColor={`${primaryBlack}99`}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setSocialUrlModal(null)}
                style={styles.modalSecondary}
              >
                <Text style={Typography.label}>Cancel</Text>
              </Pressable>
              <Pressable onPress={commitSocialUrl} style={styles.modalPrimary}>
                <Text style={[Typography.label, styles.saveLabel]}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={bookingUrlModal != null}
        transparent
        animationType="fade"
        onRequestClose={() => setBookingUrlModal(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setBookingUrlModal(null)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={[Typography.label, styles.modalTitle]}>
              Booking site
            </Text>
            <TextInput
              value={bookingUrlModal?.draft ?? ""}
              onChangeText={(t) =>
                setBookingUrlModal((m) => (m ? { draft: t } : m))
              }
              placeholder="https://"
              placeholderTextColor={`${primaryBlack}99`}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setBookingUrlModal(null)}
                style={styles.modalSecondary}
              >
                <Text style={Typography.label}>Cancel</Text>
              </Pressable>
              <Pressable onPress={commitBookingUrl} style={styles.modalPrimary}>
                <Text style={[Typography.label, styles.saveLabel]}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {hasHairSurface ? (
        <Modal
          visible={colorBrandModal != null}
          transparent
          animationType="fade"
          onRequestClose={() => setColorBrandModal(null)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setColorBrandModal(null)}
          >
            <Pressable
              style={styles.modalCard}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[Typography.label, styles.modalTitle]}>
                {colorBrandModal?.editIndex !== undefined
                  ? "Edit color brand"
                  : "Add color brand"}
              </Text>
              <TextInput
                value={colorBrandModal?.draft ?? ""}
                onChangeText={(t) =>
                  setColorBrandModal((m) => (m ? { draft: t } : m))
                }
                placeholder="e.g. Wella, Redken"
                placeholderTextColor={`${primaryBlack}99`}
                autoCapitalize="words"
                style={styles.modalInput}
              />
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setColorBrandModal(null)}
                  style={styles.modalSecondary}
                >
                  <Text style={Typography.label}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={commitColorBrandModal}
                  style={styles.modalPrimary}
                >
                  <Text style={[Typography.label, styles.saveLabel]}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </MintProfileScreenShell>
  );
};

export default AboutMe;

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsivePadding(8),
    paddingVertical: responsiveMargin(8),
    gap: responsiveMargin(4),
    alignSelf: "flex-start",
  },
  backText: { color: primaryBlack },
  heroTitle: {
    color: primaryBlack,
    textAlign: "center",
    width: "100%",
    marginTop: responsiveMargin(8),
  },
  heroSubWrap: {
    width: "100%",
    paddingHorizontal: responsivePadding(8),
    marginTop: responsiveMargin(20),
    marginBottom: responsiveMargin(32),
    alignItems: "center",
    gap: responsiveMargin(6),
  },
  heroSubLine: {
    color: primaryBlack,
    textAlign: "center",
    width: "100%",
  },
  section: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    marginBottom: responsiveMargin(8),
  },
  /** Extra space below social / booking so the link blocks breathe before the next heading. */
  sectionLinkBlock: {
    marginBottom: responsiveMargin(22),
  },
  /** Extra air before color brand + My work (the block after booking). */
  sectionAfterLinks: {
    marginTop: responsiveMargin(6),
  },
  sectionLabel: {
    color: primaryBlack,
    marginBottom: responsiveMargin(10),
    alignSelf: "flex-start",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: responsiveMargin(10),
    gap: responsiveMargin(8),
  },
  labelFlex: { color: primaryBlack, flex: 1 },
  fieldTightBottom: { marginBottom: responsiveMargin(12) },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: primaryWhite,
    borderWidth: 1,
    borderColor: primaryBlack,
    borderRadius: responsiveBorderRadius(20),
    paddingVertical: responsivePadding(14),
    paddingHorizontal: responsivePadding(16),
    marginBottom: responsiveMargin(12),
    gap: responsiveMargin(12),
  },
  summaryTitle: {
    color: primaryBlack,
    flex: 1,
  },
  editCtrl: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveMargin(6),
  },
  editLabel: {
    color: primaryBlack,
    textDecorationLine: "underline",
    textDecorationColor: primaryBlack,
  },
  addPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: responsiveMargin(10),
    alignSelf: "flex-start",
    paddingVertical: responsivePadding(12),
    paddingHorizontal: responsivePadding(22),
    borderRadius: responsiveBorderRadius(999),
    borderWidth: 1,
    borderColor: primaryBlack,
    marginBottom: responsiveMargin(18),
  },
  /** Color-brand add control is text-only (no leading plus icon). */
  addPillColorBrand: {
    gap: 0,
    paddingHorizontal: responsivePadding(22),
  },
  addPillLabel: { color: primaryBlack },
  addPillDisabled: {
    opacity: 0.45,
  },
  workGrid: {
    width: "100%",
    marginBottom: responsiveMargin(12),
  },
  workRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
  },
  workThumbWrap: {
    position: "relative",
    borderRadius: responsiveBorderRadius(18),
    overflow: "hidden",
  },
  /** Same corner X as add-visit media (`NailVisitForm` nailThumbDelete). */
  workThumbDelete: {
    position: "absolute",
    top: responsiveScale(4),
    right: responsiveMargin(8),
    zIndex: 10,
  },
  workThumb: {
    width: "100%",
    height: "100%",
    borderRadius: responsiveBorderRadius(18),
  },
  save: {
    alignSelf: "center",
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
    overflow: "hidden",
    marginTop: responsiveMargin(12),
    marginBottom: responsiveMargin(24),
  },
  saveLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(33,36,39,0.35)",
    justifyContent: "center",
    paddingHorizontal: responsivePadding(24),
  },
  modalCard: {
    backgroundColor: primaryWhite,
    borderRadius: responsiveBorderRadius(20),
    padding: responsivePadding(20),
    borderWidth: 1,
    borderColor: primaryBlack,
  },
  modalTitle: { marginBottom: responsiveMargin(12), color: primaryBlack },
  modalInput: {
    ...Typography.bodyMedium,
    borderWidth: 1,
    borderColor: primaryBlack,
    borderRadius: responsiveBorderRadius(16),
    paddingHorizontal: responsivePadding(14),
    paddingVertical: responsivePadding(12),
    color: primaryBlack,
    marginBottom: responsiveMargin(16),
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: responsiveMargin(12),
  },
  modalSecondary: {
    paddingVertical: responsivePadding(10),
    paddingHorizontal: responsivePadding(16),
  },
  modalPrimary: {
    paddingVertical: responsivePadding(10),
    paddingHorizontal: responsivePadding(20),
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
  },
});
