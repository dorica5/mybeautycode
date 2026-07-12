import {
  ActivityIndicator,
  Alert,
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
  useWindowDimensions,
  View,
} from "react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { randomUUID } from "expo-crypto";
import { Palette, XCircle } from "phosphor-react-native";
import { BrandOutlineField } from "@/src/components/BrandOutlineField";
import { BrandAnchoredMultiSelect } from "@/src/components/BrandAnchoredMultiSelect";
import {
  MintProfileScreenShell,
  mintProfileScrollContent,
} from "@/src/components/MintProfileScreenShell";
import { NavBackRow, navBackChromeStyles } from "@/src/components/NavBackRow";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import CustomAlert from "@/src/components/CustomAlert";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { Colors, primaryBlack, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  contentCardMaxWidth,
  isTablet,
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
import { validateExternalUrl } from "@/src/lib/safeExternalUrl";
import {
  coerceProfessionCode,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import {
  discoverySectionTitleForProfession,
  localizedDiscoveryOptionsForProfession,
  normalizeDiscoveryCategoriesFromApi,
  sanitizeDiscoveryCategoriesForProfession,
} from "@/src/constants/profDiscoveryCategories";
import type { ProfessionDetailApi } from "@/src/constants/types";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import OptimizedImage from "@/src/components/OptimizedImage";
import { uploadToStorage } from "@/src/lib/uploadHelpers";
import {
  addMyPublicProfileWork,
  deleteMyPublicProfileWork,
  listMyPublicProfileWork,
  type PublicProfileWorkRow,
} from "@/src/api/publicProfileWork";
import { resolveLaneAboutMe } from "@/src/lib/clientAboutMe";
import {
  laneScopedNullableField,
  laneScopedTextField,
} from "@/src/lib/professionLaneFields";

/**
 * Get discovered — professional-only editor (public-facing bio, links, hair color brands, portfolio).
 * Routed only from `(professional)/(tabs)/profile/`. Client accounts use
 * `(client)/(tabs)/profile/AboutMe` for their own “about” / hair-baseline flow, not this file.
 */
const NUM_WORK_COLS = 2;
/** Phone: 400; tablet: same short-side ratio as primary mint cards (see `sectionContentMax`). */
const MAX_WORK_IMAGES = 6;
const MAX_COLOR_BRANDS = 6;

function sameDiscoverySelection(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((x, i) => x === sb[i]);
}

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

function chunkIntoRows<T>(items: readonly T[], rowSize: number): T[][] {
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

import { useI18n } from "@/src/providers/LanguageProvider";

const AboutMe = () => {
  const { t } = useI18n();
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
    () => resolveLaneAboutMe(detailForActive?.about_me),
    [detailForActive?.about_me]
  );
  const baselineSocialMedia = useMemo(
    () =>
      laneScopedNullableField(
        detailForActive,
        activeProfessionCode,
        detailForActive?.social_media,
        profile.social_media
      ),
    [detailForActive, activeProfessionCode, profile.social_media]
  );
  const baselineBookingSite = useMemo(
    () =>
      laneScopedTextField(
        detailForActive,
        activeProfessionCode,
        detailForActive?.booking_site,
        profile.booking_site
      ),
    [detailForActive, activeProfessionCode, profile.booking_site]
  );
  const baselineDiscoveryCategories = useMemo(
    () =>
      sanitizeDiscoveryCategoriesForProfession(
        normalizeDiscoveryCategoriesFromApi(detailForActive?.discovery_categories),
        activeProfessionCode
      ),
    [detailForActive, activeProfessionCode]
  );
  const originalColorBrand = profile.color_brand ?? "";
  const id = profile.id;

  const [about_me, setAboutMe] = useState(() => baselineAboutMe);
  const [socialLinks, setSocialLinks] = useState<string[]>(() =>
    parseSocialLinks(baselineSocialMedia)
  );
  const [booking_site, setBookingSite] = useState(baselineBookingSite);
  const [discoveryCategories, setDiscoveryCategories] = useState<string[]>(() =>
    sanitizeDiscoveryCategoriesForProfession(
      normalizeDiscoveryCategoriesFromApi(detailForActive?.discovery_categories),
      activeProfessionCode
    )
  );
  const [colorBrands, setColorBrands] = useState<string[]>(() =>
    parseColorBrands(originalColorBrand)
  );

  const professionApi = useMemo((): ProfessionChoiceCode | null => {
    if (!storedProfessionReady || activeProfessionCode == null) return null;
    return activeProfessionCode;
  }, [storedProfessionReady, activeProfessionCode]);

  const discoveryCategoryOptions = useMemo(
    () => localizedDiscoveryOptionsForProfession(professionApi ?? null, t),
    [professionApi, t]
  );
  const showDiscoveryCategoryPicker = discoveryCategoryOptions.length > 0;

  useEffect(() => {
    if (professionApi == null) return;
    const d = profile.professions_detail?.find(
      (x: ProfessionDetailApi) =>
        coerceProfessionCode(x.profession_code) === professionApi
    );
    setAboutMe(resolveLaneAboutMe(d?.about_me));
    setSocialLinks(
      parseSocialLinks(
        laneScopedNullableField(
          d ?? null,
          professionApi,
          d?.social_media,
          profile.social_media
        )
      )
    );
    setBookingSite(
      laneScopedTextField(
        d ?? null,
        professionApi,
        d?.booking_site,
        profile.booking_site
      )
    );
    setDiscoveryCategories(
      sanitizeDiscoveryCategoriesForProfession(
        normalizeDiscoveryCategoriesFromApi(d?.discovery_categories),
        professionApi
      )
    );
    setColorBrands(
      professionApi === "hair" ? parseColorBrands(profile.color_brand ?? "") : []
    );
  }, [
    professionApi,
    profile.id,
    profile.professions_detail,
    profile.social_media,
    profile.booking_site,
    profile.color_brand,
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
      const rows = await listMyPublicProfileWork(professionApi);
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

  const { width: winW, height: winH } = useWindowDimensions();
  const scrollPad = responsivePadding(24);
  const sectionContentMax = useMemo(() => {
    const shortSide = Math.min(winW, winH);
    return isTablet()
      ? Math.min(contentCardMaxWidth(shortSide), winW - scrollPad * 2)
      : 400;
  }, [winW, winH, scrollPad]);

  const sectionMaxStyle = useMemo(
    () => ({ maxWidth: sectionContentMax }),
    [sectionContentMax]
  );

  const workGap = responsiveScale(12);
  const workRowInner = Math.min(sectionContentMax, winW - scrollPad * 2);
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
        Alert.alert(t("common.permissionNeeded"), t("aboutMePro.cameraRollRequired"));
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
          t("aboutMePro.imageLimitTitle"),
          t("aboutMePro.imageLimitMessage", { count: MAX_WORK_IMAGES })
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
      Alert.alert(t("common.error"), t("aboutMePro.failedAddImages"));
    } finally {
      setPreparingWorkImages(false);
    }
  };

  const confirmDeleteWorkImage = (savedIdOrLocalId: string) => {
    Alert.alert(
      t("aboutMePro.removeImageTitle"),
      t("aboutMePro.removeImageMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("profile.remove"),
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
      Alert.alert(t("profile.userNotFound"));
      return;
    }
    if (professionApi == null) {
      Alert.alert(t("common.loading"), t("profile.pleaseWaitTryAgain"));
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
        await deleteMyPublicProfileWork(imageId);
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
          throw new Error(t("aboutMePro.couldNotUploadPortfolio"));
        }
        await addMyPublicProfileWork({
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
        ...(showDiscoveryCategoryPicker
          ? {
              discovery_categories: sanitizeDiscoveryCategoriesForProfession(
                discoveryCategories,
                professionApi
              ),
            }
          : {}),
        ...(hasHairSurface
          ? { color_brand: serializeColorBrands(colorBrands) }
          : {}),
      });

      await refreshWorkFromServer();
      setChanged(false);
      Keyboard.dismiss();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : t("visits.somethingWentWrong");
      Alert.alert(t("profile.failedToSave"), message);
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
        (showDiscoveryCategoryPicker &&
          !sameDiscoverySelection(
            discoveryCategories,
            baselineDiscoveryCategories
          )) ||
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
    discoveryCategories,
    baselineDiscoveryCategories,
    colorBrands,
    originalColorBrand,
    workDirty,
    hasHairSurface,
    showDiscoveryCategoryPicker,
  ]);

  const scrollToInput = (y: number) => {
    scrollViewRef.current?.scrollTo({ y, animated: true });
  };

  const commitDiscoveryCategories = useCallback((next: string[]) => {
    setDiscoveryCategories([...next].sort());
  }, []);

  const commitSocialUrl = () => {
    if (!socialUrlModal) return;
    const draft = socialUrlModal.draft.trim();
    if (!draft) {
      setSocialUrlModal(null);
      return;
    }
    const result = validateExternalUrl(draft);
    if (!result.ok) {
      Alert.alert(
        t("profile.invalidLink"),
        result.blocked
          ? t("profile.blockedLink")
          : t("profile.enterValidUrl")
      );
      return;
    }
    const u = result.normalized;
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
    const draft = bookingUrlModal.draft.trim();
    if (!draft) {
      setBookingSite("");
      setBookingUrlModal(null);
      return;
    }
    const result = validateExternalUrl(draft);
    if (!result.ok) {
      Alert.alert(
        t("profile.invalidLink"),
        result.blocked
          ? t("profile.blockedLink")
          : t("profile.enterValidWebsiteUrl")
      );
      return;
    }
    setBookingSite(result.normalized);
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
    const brandDraft = colorBrandModal.draft.trim();
    const idx = colorBrandModal.editIndex;
    if (!brandDraft) {
      if (idx !== undefined && idx >= 0) {
        setColorBrands((prev) => prev.filter((_, i) => i !== idx));
      }
      setColorBrandModal(null);
      return;
    }
    setColorBrands((prev) => {
      const next = [...prev];
      if (idx !== undefined && idx >= 0 && idx < next.length) {
        next[idx] = brandDraft;
        return next;
      }
      if (next.length >= MAX_COLOR_BRANDS) return next;
      next.push(brandDraft);
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
        <View style={navBackChromeStyles.screenBar}>
          <NavBackRow
            accessibilityLabel={t("common.goBack")}
            onPress={() => router.back()}
            layout="inlineBar"
            hitSlop={12}
          />
        </View>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={styles.aboutScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Text style={[Typography.h3, styles.heroTitle]} accessibilityRole="header">
            {t("aboutMePro.getDiscovered")}
          </Text>

          {showDiscoveryCategoryPicker && professionApi ? (
            <View
              style={[
                styles.section,
                sectionMaxStyle,
                styles.discoverySection,
              ]}
            >
              <Text style={[Typography.label, styles.sectionLabel]}>
                {professionApi
                  ? discoverySectionTitleForProfession(professionApi, t)
                  : t("aboutMePro.categories")}
              </Text>
              <Text style={[Typography.outfitRegular16, styles.focusHint]}>
                {t("aboutMePro.discoveryHint")}
              </Text>
              <BrandAnchoredMultiSelect
                label={
                  professionApi
                    ? discoverySectionTitleForProfession(professionApi, t)
                    : t("aboutMePro.categories")
                }
                hideLabel
                items={discoveryCategoryOptions.map((opt) => ({
                  value: opt.code,
                  label: opt.label,
                }))}
                value={discoveryCategories}
                onChange={commitDiscoveryCategories}
                placeholder={t("aboutMePro.selectCategories")}
                containerStyle={styles.discoveryDropdown}
              />
            </View>
          ) : null}

          <View style={[styles.section, sectionMaxStyle]}>
            <View style={styles.labelRow}>
              <Text style={[Typography.label, styles.labelFlex]}>
                {t("aboutMePro.superpowerLabel")}
              </Text>
              {about_me.trim().length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("aboutMePro.editSuperpowerA11y")}
                  onPress={() => superPowerRef.current?.focus()}
                  style={styles.editCtrl}
                  hitSlop={8}
                >
                  <Text style={[Typography.outfitRegular16, styles.editLabel]}>
                    {t("profile.edit")}
                  </Text>
                  <PencilStroke16 />
                </Pressable>
              ) : null}
            </View>
            <BrandOutlineField
              label=""
              accessibilityLabel={t("aboutMePro.superpowerA11y")}
              placeholder={t("publicProfile.superpowerPlaceholder")}
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

          <View style={[styles.section, sectionMaxStyle, styles.sectionLinkBlock]}>
            <Text style={[Typography.label, styles.sectionLabel]}>
              {t("publicProfile.linkToSocialMedia")}
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
                    accessibilityLabel={t("aboutMePro.editSocialA11y", {
                      label: socialLinkRowLabel(url),
                    })}
                    onPress={() => openEditSocial(index)}
                    style={styles.editCtrl}
                    hitSlop={8}
                  >
                    <Text style={[Typography.outfitRegular16, styles.editLabel]}>
                      {t("profile.edit")}
                    </Text>
                    <PencilStroke16 />
                  </Pressable>
                </View>
              );
            })}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("aboutMePro.addMediaA11y")}
              onPress={openAddSocial}
              style={styles.addPill}
            >
              <PlusStroke24 />
              <Text style={[Typography.label, styles.addPillLabel]}>{t("aboutMePro.addMedia")}</Text>
            </Pressable>
          </View>

          <View style={[styles.section, sectionMaxStyle, styles.sectionLinkBlock]}>
            <Text style={[Typography.label, styles.sectionLabel]}>
              {t("publicProfile.linkToBookingSite")}
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
                  accessibilityLabel={t("aboutMePro.editBookingSiteA11y")}
                  onPress={openBookingEdit}
                  style={styles.editCtrl}
                  hitSlop={8}
                >
                  <Text style={[Typography.outfitRegular16, styles.editLabel]}>
                    {t("profile.edit")}
                  </Text>
                  <PencilStroke16 />
                </Pressable>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("aboutMePro.addWebsiteA11y")}
              onPress={() => setBookingUrlModal({ draft: booking_site })}
              style={styles.addPill}
            >
              <PlusStroke24 />
              <Text style={[Typography.label, styles.addPillLabel]}>{t("aboutMePro.addWebsite")}</Text>
            </Pressable>
          </View>

          {hasHairSurface ? (
            <>
              <View
                style={[
                  styles.section,
                  sectionMaxStyle,
                  styles.sectionAfterLinks,
                  styles.sectionLinkBlock,
                ]}
              >
                <View style={styles.labelRow}>
                  <Text style={[Typography.label, styles.labelFlex]}>
                    {t("aboutMePro.colorBrandSalonQuestion")}
                  </Text>
                  <Pressable
                    onPress={() => setAlertVisible(true)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t("aboutMePro.aboutColorBrandA11y")}
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
                      accessibilityLabel={t("aboutMePro.editColorBrandA11y", {
                        brand,
                      })}
                      onPress={() => openEditColorBrand(index)}
                      style={styles.editCtrl}
                      hitSlop={8}
                    >
                      <Text
                        style={[Typography.outfitRegular16, styles.editLabel]}
                      >
                        {t("profile.edit")}
                      </Text>
                      <PencilStroke16 />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("aboutMePro.addColorBrand")}
                  onPress={openAddColorBrand}
                  disabled={colorBrands.length >= MAX_COLOR_BRANDS}
                  style={[
                    styles.addPill,
                    colorBrands.length >= MAX_COLOR_BRANDS &&
                      styles.addPillDisabled,
                  ]}
                >
                  <PlusStroke24 />
                  <Text style={[Typography.label, styles.addPillLabel]}>
                    {colorBrands.length >= MAX_COLOR_BRANDS
                      ? t("aboutMePro.maxBrands")
                      : t("aboutMePro.addColorBrand")}
                  </Text>
                </Pressable>
              </View>

              <CustomAlert
                visible={alertVisible}
                title={t("aboutMePro.colorBrandTitle")}
                message={t("aboutMePro.colorBrandMessage")}
                onClose={() => setAlertVisible(false)}
              />
            </>
          ) : null}

          <View style={[styles.section, sectionMaxStyle]}>
            <Text style={[Typography.label, styles.sectionLabel]}>{t("aboutMePro.myWork")}</Text>
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
                              accessibilityLabel={t("aboutMePro.removePortfolioPhotoA11y")}
                            >
                              <XCircle
                                size={responsiveScale(22)}
                                color={primaryWhite}
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
                            accessibilityLabel={t("aboutMePro.removePortfolioPhotoA11y")}
                          >
                            <XCircle
                              size={responsiveScale(22)}
                              color={primaryWhite}
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
              accessibilityLabel={t("aboutMePro.addPortfolioImagesA11y")}
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
                  ? t("aboutMePro.maxPhotos")
                  : t("aboutMePro.addImages")}
              </Text>
            </Pressable>
          </View>

          <PaddedLabelButton
            title={loading ? t("common.saving") : t("common.save")}
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
                ? t("aboutMePro.editSocialLink")
                : t("aboutMePro.addSocialLink")}
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
                <Text style={Typography.label}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable onPress={commitSocialUrl} style={styles.modalPrimary}>
                <Text style={[Typography.label, styles.saveLabel]}>{t("common.save")}</Text>
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
              {t("aboutMePro.bookingSite")}
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
                <Text style={Typography.label}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable onPress={commitBookingUrl} style={styles.modalPrimary}>
                <Text style={[Typography.label, styles.saveLabel]}>{t("common.save")}</Text>
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
                  ? t("aboutMePro.editColorBrand")
                  : t("aboutMePro.addColorBrand")}
              </Text>
              <TextInput
                value={colorBrandModal?.draft ?? ""}
                onChangeText={(t) =>
                  setColorBrandModal((m) => (m ? { draft: t } : m))
                }
                placeholder={t("aboutMePro.colorBrandPlaceholder")}
                placeholderTextColor={`${primaryBlack}99`}
                autoCapitalize="words"
                style={styles.modalInput}
              />
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setColorBrandModal(null)}
                  style={styles.modalSecondary}
                >
                  <Text style={Typography.label}>{t("common.cancel")}</Text>
                </Pressable>
                <Pressable
                  onPress={commitColorBrandModal}
                  style={styles.modalPrimary}
                >
                  <Text style={[Typography.label, styles.saveLabel]}>{t("common.save")}</Text>
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
  /** Same horizontal rhythm as `mintProfileScrollContent`; back sits in `navBackChromeStyles.screenBar` above. */
  aboutScrollContent: {
    ...mintProfileScrollContent,
    paddingTop: responsiveMargin(12),
  },
  heroTitle: {
    color: primaryBlack,
    textAlign: "center",
    width: "100%",
    marginTop: responsiveMargin(4),
    marginBottom: responsiveMargin(22),
  },
  section: {
    width: "100%",
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
  /** Tighter rhythm than generic sections so the chips read as one block. */
  discoverySection: {
    marginBottom: responsiveMargin(16),
  },
  sectionLabel: {
    color: primaryBlack,
    marginBottom: responsiveMargin(8),
    alignSelf: "flex-start",
  },
  focusHint: {
    color: primaryBlack,
    opacity: 0.88,
    marginBottom: responsiveMargin(12),
    alignSelf: "flex-start",
  },
  discoveryDropdown: {
    marginBottom: 0,
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
    backgroundColor: primaryWhite,
    borderWidth: 1,
    borderColor: primaryBlack,
    borderRadius: responsiveScale(999),
  },
  modalPrimary: {
    paddingVertical: responsivePadding(10),
    paddingHorizontal: responsivePadding(20),
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
  },
});
