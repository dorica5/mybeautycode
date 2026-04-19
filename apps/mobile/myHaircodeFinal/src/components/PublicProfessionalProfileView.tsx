import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaretLeft } from "phosphor-react-native";
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
}: PublicProfessionalProfileViewProps) {
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
    void openExternalUrl(normalizeWebUrl(u));
  }, [bookingSite]);

  const avatarSize = scalePercent(38);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={onBack}
            style={styles.backPress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
            <Text style={[Typography.bodyMedium, styles.backText]}>Back</Text>
          </Pressable>
          {headerRight ? (
            <View style={styles.headerRightWrap}>{headerRight}</View>
          ) : null}
        </View>

        <View style={styles.hero}>
          <AvatarWithSpinner
            uri={avatarUrl}
            size={avatarSize}
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
            <Text style={[Typography.anton20, styles.businessName]}>
              {businessName}
            </Text>
          ) : null}
        </View>

        {mode === "client" && showRelationshipCta ? (
          <View style={styles.ctaWrap}>
            {!isRelated ? (
              <PaddedLabelButton
                title="Add hairdresser"
                horizontalPadding={32}
                verticalPadding={16}
                onPress={onAddHairdresser}
                disabled={addLoading}
                style={styles.addHairdresserBtn}
                textStyle={styles.addHairdresserBtnLabel}
              />
            ) : (
              <View style={[styles.addHairdresserBtn, styles.addedGhost]}>
                <Text style={[Typography.label, styles.addedGhostLabel]}>
                  Hairdresser added
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
                      onPress={() => openExternalUrl(normalizeWebUrl(url))}
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

          <View style={styles.sectionBlock}>
            <Text style={[Typography.label, styles.sectionTitle]}>
              {first}&apos;s work
            </Text>
            <PublicProfileWorkGrid
              profileUserId={profileUserId}
              showTitle={false}
              professionCode={activeProfessionCode ?? undefined}
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
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: responsivePadding(8),
    paddingVertical: responsiveMargin(8),
  },
  backPress: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveMargin(4),
  },
  backText: { color: primaryBlack },
  headerRightWrap: {
    minWidth: responsiveScale(40),
    alignItems: "flex-end",
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: responsivePadding(16),
    marginTop: responsiveMargin(4),
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
    marginBottom: responsiveMargin(28),
  },
  businessName: {
    color: primaryBlack,
    textAlign: "center",
  },
  ctaWrap: {
    paddingHorizontal: responsivePadding(20),
    marginTop: responsiveMargin(20),
    marginBottom: responsiveMargin(8),
    alignItems: "center",
  },
  addHairdresserBtn: {
    alignSelf: "stretch",
    maxWidth: 400,
    width: "100%",
    backgroundColor: primaryBlack,
    borderRadius: responsiveBorderRadius(999),
    alignItems: "center",
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
    paddingHorizontal: responsivePadding(20),
    marginTop: responsiveMargin(24),
    maxWidth: 480,
    alignSelf: "center",
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