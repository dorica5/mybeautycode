import React, { useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { recordProfessionalAnalyticsEvent } from "@/src/api/professionalAnalytics";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  Alert,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NavBackRow, navBackChromeStyles } from "@/src/components/NavBackRow";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { PublicProfileWorkGrid } from "@/src/components/PublicProfileWorkGrid";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { SocialStrokeIcon20 } from "@/src/components/icons/GetDiscoveredStrokeIcons";
import { inferSocialFromUrl } from "@/src/lib/inferSocialFromUrl";
import {
  parseSocialLinks,
  socialLinkRowLabel,
} from "@/src/lib/socialMediaStorage";
import { parseColorBrands } from "@/src/lib/colorBrandStorage";
import {
  profileHasHairProfession,
  coerceProfessionCode,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveBorderRadius,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
  scalePercent,
  isTablet,
  contentCardMaxWidth,
} from "@/src/utils/responsive";

function displayFirstName(
  first: string | null | undefined,
  full: string | null | undefined
): string {
  const t = first?.trim();
  if (t) return t;
  const f = full?.trim();
  if (!f) return "Your";
  const sp = f.indexOf(" ");
  return sp === -1 ? f : f.slice(0, sp);
}

function normalizeWebUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

async function openExternalUrl(url: string) {
  const u = url.trim();
  if (!u) return;
  try {
    const ok = await Linking.canOpenURL(u);
    if (ok) await Linking.openURL(u);
    else Alert.alert("Cannot open link");
  } catch {
    Alert.alert("Cannot open link");
  }
}

/** Local copy — avoids Metro occasionally resolving a stale `professionCodes` bundle without this export. */
function relationshipCtaLabelsForLane(
  code: ProfessionChoiceCode | null | undefined
): { addTitle: string; addedTitle: string } {
  if (!code) {
    return {
      addTitle: "Add professional",
      addedTitle: "Professional added",
    };
  }
  switch (code) {
    case "hair":
      return { addTitle: "Add hairdresser", addedTitle: "Hairdresser added" };
    case "nails":
      return {
        addTitle: "Add nail technician",
        addedTitle: "Nail technician added",
      };
    case "brows_lashes":
      return {
        addTitle: "Add brow stylist",
        addedTitle: "Brow stylist added",
      };
    case "esthetician":
      return {
        addTitle: "Add esthetician",
        addedTitle: "Esthetician added",
      };
    default:
      return {
        addTitle: "Add professional",
        addedTitle: "Professional added",
      };
  }
}

export type PublicProfessionalProfileViewProps = {
  mode: "self" | "client";
  profileUserId: string;
  fullName: string | null;
  username?: string | null;
  firstName?: string | null;
  avatarUrl?: string | null;
  salonName?: string | null;
  businessAddress?: string | null;
  aboutMe?: string | null;
  salonPhone?: string | null;
  bookingSite?: string | null;
  socialMediaRaw?: string | null;
  colorBrandRaw?: string | null;
  professionCodes?: string[] | null;
  /** When set (e.g. self-view with a chosen role), scopes color-brand + work grid to that profession. */
  activeProfessionCode?: ProfessionChoiceCode | null;
  onBack: () => void;
  /** Client: show Add hairdresser / added state under header */
  showRelationshipCta?: boolean;
  isRelated?: boolean;
  addLoading?: boolean;
  onAddHairdresser?: () => void;
  headerRight?: React.ReactNode;
  /**
   * When set (client viewing another pro), records profile views and outbound
   * booking/social taps per profession lane for pro insights.
   */
  analyticsProfessionCode?: string | null;
};

export function PublicProfessionalProfileView({
  mode,
  profileUserId,
  fullName,
  username,
  firstName,
  avatarUrl,
  salonName,
  businessAddress: _businessAddress,
  aboutMe,
  salonPhone,
  bookingSite,
  socialMediaRaw,
  colorBrandRaw,
  professionCodes,
  activeProfessionCode,
  onBack,
  showRelationshipCta,
  isRelated,
  addLoading,
  onAddHairdresser,
  headerRight,
  analyticsProfessionCode,
}: PublicProfessionalProfileViewProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const layout = useMemo(() => {
    const tablet = isTablet();
    const shellPad = responsivePadding(16, 28);
    const shortSide = Math.min(windowWidth, windowHeight);

    /** One centered column — tablet width matches phone card ratio on short side. */
    let maxShellW: number;
    if (tablet) {
      maxShellW = Math.min(
        windowWidth - shellPad * 2,
        contentCardMaxWidth(shortSide)
      );
    } else {
      maxShellW = Math.min(windowWidth - responsivePadding(36), 520);
    }

    /** `scalePercent(38)` on tablet uses portrait min(width,height) → ~292pt avatar; cap for same balance as phones */
    const phoneAvatar = Math.round(scalePercent(38));
    const avatarSize = tablet ? responsiveScale(152, 200) : phoneAvatar;

    const workGridMaxWidth = Math.floor(maxShellW - shellPad * 2);

    return { tablet, maxShellW, avatarSize, workGridMaxWidth };
  }, [windowWidth, windowHeight]);

  const lane = analyticsProfessionCode?.trim() || null;

  const relationshipLaneForCta: ProfessionChoiceCode | null =
    activeProfessionCode ??
    coerceProfessionCode(lane ?? undefined);
  const relationshipCta = relationshipCtaLabelsForLane(
    relationshipLaneForCta
  );

  useFocusEffect(
    useCallback(() => {
      if (mode !== "client" || !lane || !profileUserId) return;
      void recordProfessionalAnalyticsEvent({
        subjectProfileId: profileUserId,
        professionCode: lane,
        event: "profile_view",
      });
    }, [mode, lane, profileUserId])
  );

  const first = displayFirstName(firstName, fullName);
  const businessName = salonName?.trim() ?? "";
  const socialUrls = parseSocialLinks(socialMediaRaw ?? "");
  const colorBrands = parseColorBrands(colorBrandRaw ?? "");
  const hairInThisView =
    activeProfessionCode != null
      ? activeProfessionCode === "hair"
      : profileHasHairProfession({ profession_codes: professionCodes });
  const showColorBrands = hairInThisView && colorBrands.length > 0;

  const handleCall = useCallback(() => {
    const p = salonPhone?.trim();
    if (!p) return;
    void openExternalUrl(p.startsWith("tel:") ? p : `tel:${p}`);
  }, [salonPhone]);

  const handleBooking = useCallback(() => {
    const u = bookingSite?.trim();
    if (!u) return;
    if (mode === "client" && lane && profileUserId) {
      void recordProfessionalAnalyticsEvent({
        subjectProfileId: profileUserId,
        professionCode: lane,
        event: "booking_click",
      });
    }
    void openExternalUrl(normalizeWebUrl(u));
  }, [bookingSite, mode, lane, profileUserId]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          layout.tablet && styles.scrollContentTablet,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/** Shared inset with visit headers / Find pros — see NavBackRow.navBackChromeStyles */}
        <View style={navBackChromeStyles.screenBar}>
          <View style={navBackChromeStyles.row}>
            <NavBackRow onPress={onBack} hitSlop={12} layout="inlineBar" />
            {headerRight ? (
              <View style={styles.headerRightWrap}>{headerRight}</View>
            ) : (
              <View style={styles.headerRightPlaceholder} />
            )}
          </View>
        </View>

        <View
          style={[
            styles.columnShell,
            {
              maxWidth: layout.maxShellW,
              paddingHorizontal: responsivePadding(16, 28),
            },
          ]}
        >
        <View style={styles.hero}>
          <AvatarWithSpinner
            uri={avatarUrl}
            size={layout.avatarSize}
            style={styles.avatar}
          />
          {fullName?.trim() ? (
            <Text style={[Typography.h3, styles.name]}>{fullName.trim()}</Text>
          ) : null}
          {username?.trim() ? (
            <Text style={[Typography.anton24, styles.username]}>
              {username.trim().replace(/^@/, "")}
            </Text>
          ) : null}
          {businessName ? (
            <Text
              style={[
                Typography.anton20,
                styles.businessName,
                layout.tablet && styles.businessNameTablet,
              ]}
            >
              {businessName}
            </Text>
          ) : null}
        </View>

        {mode === "client" && showRelationshipCta ? (
          <View style={styles.ctaWrap}>
            {!isRelated ? (
              <PaddedLabelButton
                title={relationshipCta.addTitle}
                horizontalPadding={32}
                verticalPadding={16}
                onPress={onAddHairdresser}
                disabled={addLoading}
                accessibilityLabel={relationshipCta.addTitle}
                style={[
                  styles.addHairdresserBtnBase,
                  layout.tablet
                    ? styles.addHairdresserBtnTablet
                    : styles.addHairdresserBtnPhone,
                ]}
                textStyle={styles.addHairdresserBtnLabel}
              />
            ) : (
              <View
                style={[
                  styles.addHairdresserBtnBase,
                  layout.tablet
                    ? styles.addHairdresserBtnTablet
                    : styles.addHairdresserBtnPhone,
                  styles.addedGhost,
                ]}
              >
                <Text style={[Typography.label, styles.addedGhostLabel]}>
                  {relationshipCta.addedTitle}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.sections}>
          {showColorBrands ? (
            <View style={styles.sectionBlock}>
              <Text style={[Typography.label, styles.sectionTitle]}>
                Color brand in salon
              </Text>
              <View style={styles.pillRow}>
                {colorBrands.map((b, i) => (
                  <View key={`${b}-${i}`} style={styles.pill}>
                    <Text style={[Typography.outfitRegular16, styles.pillText]}>
                      {b}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {salonPhone?.trim() ? (
            <View style={styles.sectionBlock}>
              <Text style={[Typography.label, styles.sectionTitle]}>
                Call salon
              </Text>
              <Pressable
                onPress={handleCall}
                style={styles.pill}
                accessibilityRole="button"
              >
                <Text style={[Typography.outfitRegular16, styles.pillText]}>
                  {salonPhone.trim()}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {bookingSite?.trim() ? (
            <View style={styles.sectionBlock}>
              <Text style={[Typography.label, styles.sectionTitle]}>
                Link to booking site
              </Text>
              <Pressable
                onPress={handleBooking}
                style={styles.pill}
                accessibilityRole="link"
              >
                <Text style={[Typography.outfitRegular16, styles.pillText]}>
                  {bookingSite.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {socialUrls.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={[Typography.label, styles.sectionTitle]}>
                Link to social media
              </Text>
              <View style={styles.pillRow}>
                {socialUrls.map((url, index) => {
                  const kind = inferSocialFromUrl(url).kind;
                  const label = socialLinkRowLabel(url);
                  return (
                    <Pressable
                      key={`${url}-${index}`}
                      style={styles.pillWithIcon}
                      onPress={() => {
                        if (mode === "client" && lane && profileUserId) {
                          void recordProfessionalAnalyticsEvent({
                            subjectProfileId: profileUserId,
                            professionCode: lane,
                            event: "social_click",
                            socialPlatform: kind,
                          });
                        }
                        void openExternalUrl(normalizeWebUrl(url));
                      }}
                      accessibilityRole="link"
                      accessibilityLabel={label}
                    >
                      <SocialStrokeIcon20 kind={kind} />
                      <Text
                        style={[Typography.outfitRegular16, styles.pillText]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {mode === "self" || aboutMe?.trim() ? (
            <View style={styles.sectionBlock}>
              <Text style={[Typography.label, styles.sectionTitle]}>
                {first}&apos;s superpower
              </Text>
              <View
                style={[
                  styles.superpowerBox,
                  !aboutMe?.trim() && styles.superpowerBoxPlaceholderShell,
                ]}
              >
                <Text
                  style={[
                    Typography.outfitRegular16,
                    aboutMe?.trim()
                      ? styles.superpowerText
                      : styles.superpowerPlaceholder,
                  ]}
                >
                  {aboutMe?.trim()
                    ? aboutMe.trim()
                    : "Tell your clients about your skills"}
                </Text>
              </View>
            </View>
          ) : null}

          <PublicProfileWorkGrid
            profileUserId={profileUserId}
            showTitle={false}
            sectionHeading={`${first}'s work`}
            professionCode={activeProfessionCode ?? undefined}
            contentMaxWidth={layout.workGridMaxWidth}
          />
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: responsivePadding(48),
    width: "100%",
  },
  scrollContentTablet: {
    alignItems: "center",
  },
  columnShell: {
    alignSelf: "center",
    width: "100%",
  },
  headerRightWrap: {
    minWidth: responsiveScale(40),
    alignItems: "flex-end",
  },
  /** Keeps Back aligned when no menu — mirrors VisitRecordScreenHeader trail placeholder. */
  headerRightPlaceholder: {
    minWidth: responsiveScale(40),
  },
  hero: {
    alignItems: "center",
    marginTop: responsiveMargin(4),
    paddingBottom: responsivePadding(6),
  },
  avatar: {
    backgroundColor: primaryWhite,
    marginBottom: responsiveMargin(16),
  },
  name: {
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(4),
  },
  username: {
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(20),
  },
  /** Do not override `Typography.anton20` lineHeight — a fixed responsiveScale (28)
   * mismatches scaled font on tablets and clips Anton caps for the salon line. */
  businessName: {
    color: primaryBlack,
    textAlign: "center",
    marginTop: 0,
  },
  /** Extra vertical room so the salon line clears the username block on large tiles. */
  businessNameTablet: {
    marginTop: responsiveMargin(4),
    paddingVertical: responsivePadding(4),
  },
  ctaWrap: {
    marginTop: responsiveMargin(20),
    marginBottom: responsiveMargin(8),
    alignItems: "center",
  },
  addHairdresserBtnBase: {
    backgroundColor: primaryBlack,
    borderRadius: responsiveBorderRadius(999),
    alignItems: "center",
  },
  /** Full-width bar on phone (max readable width). */
  addHairdresserBtnPhone: {
    alignSelf: "stretch",
    maxWidth: 400,
    width: "100%",
  },
  /** Fills `columnShell`, which already applies the tablet content max width. */
  addHairdresserBtnTablet: {
    alignSelf: "stretch",
    width: "100%",
  },
  addHairdresserBtnLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
  addedGhost: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: primaryBlack,
    opacity: 0.55,
    paddingVertical: responsivePadding(16),
    paddingHorizontal: responsivePadding(32),
  },
  addedGhostLabel: {
    color: primaryBlack,
    textAlign: "center",
  },
  sections: {
    marginTop: responsiveMargin(24),
    width: "100%",
  },
  sectionBlock: {
    marginBottom: responsiveMargin(36),
    width: "100%",
  },
  sectionTitle: {
    color: primaryBlack,
    marginBottom: responsiveMargin(10),
    alignSelf: "flex-start",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: responsiveMargin(10),
  },
  pill: {
    alignSelf: "flex-start",
    paddingVertical: responsivePadding(12),
    paddingHorizontal: responsivePadding(18),
    borderRadius: responsiveBorderRadius(999),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: "transparent",
  },
  pillWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveMargin(10),
    paddingVertical: responsivePadding(12),
    paddingHorizontal: responsivePadding(18),
    borderRadius: responsiveBorderRadius(999),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: "transparent",
  },
  pillText: {
    color: primaryBlack,
  },
  superpowerBox: {
    backgroundColor: primaryWhite,
    borderRadius: responsiveBorderRadius(20),
    borderWidth: 1,
    borderColor: primaryBlack,
    padding: responsivePadding(16),
  },
  /** Empty / placeholder: modest minimum so the prompt still feels like a field. */
  superpowerBoxPlaceholderShell: {
    minHeight: responsiveScale(88),
  },
  superpowerText: {
    color: primaryBlack,
  },
  superpowerPlaceholder: {
    color: "rgba(33, 36, 39, 0.55)",
  },
});