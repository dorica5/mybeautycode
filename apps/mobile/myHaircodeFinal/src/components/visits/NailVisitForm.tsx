import React, { useMemo, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  Keyboard,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, XCircle } from "phosphor-react-native";
import { ResizeMode, Video } from "expo-av";
import {
  Colors,
  primaryBlack,
  primaryWhite,
  secondaryGreen,
} from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { BrandOutlineField } from "@/src/components/BrandOutlineField";
import { PrimaryOutlineTextField } from "@/src/components/PrimaryOutlineTextField";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { BrandAnchoredMultiSelect } from "@/src/components/BrandAnchoredMultiSelect";
import {
  contentCardMaxWidth,
  isTablet,
  responsiveScale,
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
} from "@/src/utils/responsive";
import { router } from "expo-router";
import { NavBackRow } from "@/src/components/NavBackRow";
import CustomAlert from "@/src/components/CustomAlert";
import { InfoStroke16 } from "@/src/components/icons/GetDiscoveredStrokeIcons";
import {
  useI18n,
  useProfessionRoleLabel,
} from "@/src/providers/LanguageProvider";
import type { ProfessionChoiceCode } from "@/src/constants/professionCodes";
/** Description field limit for new/edit visit (spaces count). */
export const VISIT_DESCRIPTION_MAX_CHARS = 240;
/** Max photos (images) per visit when creating or editing. */
export const VISIT_MAX_PHOTOS = 10;

type MediaItem = {
  uri?: string;
  type?: string;
  media_url?: string;
  id?: string;
  isFromDB?: boolean;
};

export type NailVisitFormProps = {
  scrollRef: React.RefObject<ScrollView>;
  /** Primary full-width rows (same labels as discovery / profile categories). */
  servicePrimaryOptions: readonly string[];
  /** Optional modal multi-select; empty for e.g. nails (all primary). */
  serviceDropdownOptions: readonly string[];
  /** Called with the full set of labels selected inside “Other”; replaces dropdown slice only. */
  onChangeDropdownServices?: (nextDropdownLabels: string[]) => void;
  isEditing: boolean;
  selectedOptions: string[];
  onToggleService: (option: string) => void;
  newHaircode: string;
  onChangeDescription: (text: string) => void;
  durationMinutes: number;
  showTimePicker: boolean;
  onTimePickerOpen: () => void;
  onTimePickerDismiss: () => void;
  onNativeTimeChange: (event: { type?: string }, date?: Date) => void;
  formatDurationDisplay: (totalMinutes: number) => string;
  createDateFromMinutes: (totalMinutes: number) => Date;
  price: string;
  onChangePrice: (text: string) => void;
  /** Active pro lane — drives price visibility info copy. */
  professionCode?: ProfessionChoiceCode | null;
  capturedMedia: MediaItem[];
  pickImage: (index?: number) => void;
  removeMedia: (index: number) => void;
  /** Disable add while cropping or uploading. */
  pickImageDisabled?: boolean;
  isPending: boolean;
  isUploadingMedia: boolean;
  onSave: () => void;
  onPreviewPress: () => void;
};

export function NailVisitForm({
  scrollRef,
  servicePrimaryOptions,
  serviceDropdownOptions,
  onChangeDropdownServices,
  isEditing,
  selectedOptions,
  onToggleService,
  newHaircode,
  onChangeDescription,
  durationMinutes,
  showTimePicker,
  onTimePickerOpen,
  onTimePickerDismiss,
  onNativeTimeChange,
  formatDurationDisplay,
  createDateFromMinutes,
  price,
  onChangePrice,
  professionCode,
  capturedMedia,
  pickImage,
  removeMedia,
  pickImageDisabled = false,
  isPending,
  isUploadingMedia,
  onSave,
  onPreviewPress,
}: NailVisitFormProps) {
  const { t } = useI18n();
  const [priceInfoVisible, setPriceInfoVisible] = useState(false);
  const roleLabel = useProfessionRoleLabel(professionCode);
  const mediaAtLimit = capturedMedia.length >= VISIT_MAX_PHOTOS;
  const addMediaDisabled = pickImageDisabled || mediaAtLimit;
  const { width, height } = useWindowDimensions();
  const dropdownLabelSet = useMemo(
    () => new Set(serviceDropdownOptions),
    [serviceDropdownOptions]
  );
  const dropdownValue = useMemo(
    () => selectedOptions.filter((s) => dropdownLabelSet.has(s)),
    [selectedOptions, dropdownLabelSet]
  );

  const columnMax = useMemo(() => {
    const shortSide = Math.min(width, height);
    const pad = responsivePadding(20) * 2;
    if (!isTablet()) return 400;
    return Math.min(contentCardMaxWidth(shortSide), width - pad);
  }, [width, height]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    if (showTimePicker) {
      onTimePickerDismiss();
    }
  };

  return (
    <>
    <View style={styles.nailRoot}>
      <View style={styles.nailTopBar}>
        <NavBackRow
          layout="inlineBar"
          onPress={() => router.back()}
          accessibilityLabel={t("common.goBack")}
          hitSlop={12}
        />
        <Pressable
          onPress={onPreviewPress}
          style={styles.nailPreviewContainer}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("visits.previewVisit")}
        >
          <Text style={styles.nailPreviewText}>{t("visits.preview")}</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.nailScrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.nailScrollContent}
      >
        <Pressable onPress={dismissKeyboard}>
          <Text
            style={[Typography.h3, styles.nailScreenTitle]}
            accessibilityRole="header"
          >
            {isEditing ? t("visits.editVisit") : t("visits.newVisit")}
          </Text>

          <View style={[styles.nailFormAlignedColumn, { maxWidth: columnMax }]}>
            <Text style={[Typography.label, styles.nailSectionLabelFirst]}>
              {t("visits.whatKindOfService")}
            </Text>

            <View style={styles.nailServiceBlock}>
              {servicePrimaryOptions.map((opt) => (
                <Pressable
                  key={opt}
                  style={({ pressed }) => [
                    styles.nailServiceRow,
                    selectedOptions.includes(opt) &&
                      styles.nailServiceRowSelected,
                    pressed && styles.nailServiceRowPressed,
                  ]}
                  onPress={() => onToggleService(opt)}
                >
                  <Text
                    style={[
                      Typography.bodyMedium,
                      styles.nailServiceRowText,
                      selectedOptions.includes(opt) &&
                        styles.nailServiceRowTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>

            {serviceDropdownOptions.length > 0 &&
            onChangeDropdownServices ? (
              <BrandAnchoredMultiSelect
                label={t("visits.other")}
                options={serviceDropdownOptions}
                value={dropdownValue}
                onChange={onChangeDropdownServices}
                placeholder={t("visits.tapToAddServices")}
              />
            ) : null}

            <View style={styles.nailFieldBlock}>
              <PrimaryOutlineTextField
                label={t("visits.describeService")}
                value={newHaircode}
                onChangeText={onChangeDescription}
                multiline
                minInputHeight={responsiveScale(120)}
                placeholder={t("visits.describeService")}
                containerStyle={[
                  styles.nailDescribeOutlineContainer,
                  { maxWidth: columnMax },
                ]}
                maxLength={VISIT_DESCRIPTION_MAX_CHARS}
              />
              <Text style={styles.nailDescribeCharCount} accessibilityLiveRegion="polite">
                {`${newHaircode.length}/${VISIT_DESCRIPTION_MAX_CHARS}`}
              </Text>
            </View>

            <View style={[styles.nailTimeFieldWrap, { maxWidth: columnMax }]}>
              <Text
                style={[Typography.label, styles.nailTimeLabel]}
                accessibilityRole="text"
              >
                {t("visits.timeUsed")}
              </Text>
              <Pressable
                onPress={onTimePickerOpen}
                style={({ pressed }) => [
                  styles.nailTimePressable,
                  pressed && styles.nailTimePressablePressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t("visits.timeUsedOnTreatment")}
              >
                <Text
                  style={[
                    Typography.bodyMedium,
                    durationMinutes > 0
                      ? styles.nailTimeValueText
                      : styles.nailTimePlaceholderText,
                  ]}
                >
                  {durationMinutes > 0
                    ? formatDurationDisplay(durationMinutes)
                    : t("visits.timeUsedOnTreatment")}
                </Text>
              </Pressable>

              {showTimePicker ? (
                <View style={styles.nailTimePickerContainer}>
                  <DateTimePicker
                    value={createDateFromMinutes(durationMinutes)}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    is24Hour={true}
                    onChange={onNativeTimeChange}
                    textColor={primaryBlack}
                    style={styles.nailTimePicker}
                  />
                  {Platform.OS === "ios" ? (
                    <View style={styles.nailTimePickerButtons}>
                      <Pressable
                        onPress={onTimePickerDismiss}
                        style={styles.nailTimePickerDone}
                      >
                        <Text style={styles.nailTimePickerDoneText}>{t("visits.done")}</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={styles.nailFieldBlock}>
              <View style={styles.priceLabelRow}>
                <Text style={[Typography.label, styles.priceLabel]}>
                  {t("visits.price")}
                </Text>
                <Pressable
                  onPress={() => setPriceInfoVisible(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("visits.priceInfoA11y")}
                  style={styles.priceInfoBtn}
                >
                  <InfoStroke16 />
                </Pressable>
              </View>
              <BrandOutlineField
                value={price}
                onChangeText={onChangePrice}
                inputRestriction="decimal"
                singleLineShape="rounded"
                containerStyle={styles.priceFieldInner}
                accessibilityLabel={t("visits.price")}
              />
            </View>

            <Text style={[Typography.label, styles.nailSectionLabel]}>
              {t("visits.uploadImagesVideo")}
            </Text>

            <View style={styles.nailUploadSection}>
              {capturedMedia.length > 0 ? (
                <View style={styles.nailMediaGrid}>
                  {capturedMedia.map((item, index) => (
                    <View
                      key={item.id ?? `${item.uri ?? "media"}-${index}`}
                      style={styles.nailThumbCell}
                    >
                      <View style={styles.nailThumbInner}>
                        {item.uri && item.type !== "video" ? (
                          <Image
                            source={{ uri: item.uri }}
                            style={styles.nailThumb}
                            resizeMode="cover"
                          />
                        ) : item.uri && item.type === "video" ? (
                          <Video
                            source={{ uri: item.uri }}
                            style={styles.nailThumb}
                            useNativeControls={false}
                            resizeMode={ResizeMode.COVER}
                            isMuted
                          />
                        ) : null}
                        <Pressable
                          onPress={() => removeMedia(index)}
                          style={styles.nailThumbDelete}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={t("visits.removeMedia")}
                        >
                          <XCircle
                            size={responsiveScale(22)}
                            color={Colors.light.light}
                          />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              <Pressable
                onPress={() => pickImage()}
                disabled={addMediaDisabled}
                style={({ pressed }) => [
                  styles.nailUploadAddRow,
                  capturedMedia.length > 0 && styles.nailUploadAddRowBelowGrid,
                  pressed && !addMediaDisabled && styles.nailUploadAddRowPressed,
                  addMediaDisabled && styles.nailUploadAddRowDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  mediaAtLimit ? t("visits.maxPhotosReached") : t("visits.addImage")
                }
              >
                <Plus
                  size={responsiveScale(20)}
                  color={primaryBlack}
                  strokeWidth={1.5}
                />
                <Text style={[Typography.bodyMedium, styles.nailUploadAddText]}>
                  {mediaAtLimit
                    ? t("visits.maximumPhotos", { count: String(VISIT_MAX_PHOTOS) })
                    : t("visits.addImage")}
                </Text>
                <View style={styles.nailUploadAddRowEndSpacer} />
              </Pressable>
            </View>

            <PaddedLabelButton
              title={
                isPending || isUploadingMedia
                  ? t("common.saving")
                  : t("visits.saveVisit")
              }
              horizontalPadding={32}
              verticalPadding={16}
              disabled={isPending || isUploadingMedia}
              onPress={onSave}
              style={styles.nailSavePaddedButton}
              textStyle={styles.nailSavePaddedButtonLabel}
            />
          </View>
        </Pressable>
      </ScrollView>
    </View>
    <CustomAlert
      visible={priceInfoVisible}
      title={t("visits.price")}
      message={t("visits.priceInfoMessage", { role: roleLabel })}
      onClose={() => setPriceInfoVisible(false)}
      compact
    />
    </>
  );
}

const styles = StyleSheet.create({
  nailRoot: {
    flex: 1,
  },
  nailTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: responsivePadding(20),
    paddingTop: responsivePadding(4),
    paddingBottom: responsiveMargin(10),
  },
  nailPreviewContainer: {
    justifyContent: "center",
  },
  nailPreviewText: {
    fontSize: responsiveFontSize(14, 12),
    fontFamily: "Inter-SemiBold",
    color: "#ED1616",
  },
  nailScrollView: {
    flex: 1,
  },
  nailScreenTitle: {
    width: "100%",
    textAlign: "center",
    color: primaryBlack,
    marginTop: responsiveMargin(6),
    marginBottom: responsiveMargin(22),
    paddingHorizontal: responsivePadding(20),
  },
  nailScrollContent: {
    paddingHorizontal: responsivePadding(20),
    paddingTop: responsivePadding(4),
    paddingBottom: responsiveScale(96),
  },
  /** Same horizontal band as service cards: labels + inputs follow this width. */
  nailFormAlignedColumn: {
    width: "94%",
    alignSelf: "center",
  },
  nailSectionLabelFirst: {
    alignSelf: "flex-start",
    width: "100%",
    marginBottom: responsiveMargin(14),
    marginTop: responsiveMargin(4),
    color: primaryBlack,
  },
  nailSectionLabel: {
    alignSelf: "flex-start",
    width: "100%",
    marginBottom: responsiveMargin(14),
    marginTop: responsiveMargin(28),
    color: primaryBlack,
  },
  nailServiceBlock: {
    gap: responsiveMargin(5),
    marginBottom: responsiveMargin(10),
    width: "100%",
  },
  nailServiceRow: {
    width: "100%",
    paddingVertical: responsivePadding(16, 14),
    paddingHorizontal: responsivePadding(20, 16),
    borderRadius: responsiveScale(18),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
  },
  nailServiceRowSelected: {
    backgroundColor: primaryBlack,
    borderWidth: 1,
    borderColor: primaryBlack,
  },
  nailServiceRowPressed: {
    opacity: 0.92,
  },
  nailServiceRowText: {
    color: primaryBlack,
    textAlign: "center",
  },
  nailServiceRowTextSelected: {
    color: primaryWhite,
  },
  nailFieldBlock: {
    marginBottom: responsiveMargin(22),
  },
  priceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveMargin(6),
    marginBottom: responsiveMargin(8),
  },
  priceLabel: {
    color: primaryBlack,
  },
  priceInfoBtn: {
    padding: responsivePadding(2),
  },
  priceFieldInner: {
    marginBottom: 0,
  },
  nailDescribeOutlineContainer: {
    marginBottom: responsiveMargin(6),
    width: "100%",
    alignSelf: "center",
  },
  nailDescribeCharCount: {
    alignSelf: "flex-end",
    fontSize: responsiveFontSize(12, 11),
    fontFamily: "Inter-Regular",
    color: `${primaryBlack}99`,
    marginTop: responsiveMargin(2),
  },
  nailTimeFieldWrap: {
    width: "100%",
    alignSelf: "center",
    marginBottom: responsiveMargin(22),
  },
  nailTimeLabel: {
    color: primaryBlack,
    marginBottom: responsiveMargin(8),
    alignSelf: "flex-start",
  },
  nailTimePressable: {
    borderRadius: responsiveScale(18),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
    paddingVertical: responsivePadding(14),
    paddingHorizontal: responsivePadding(18),
    overflow: "hidden",
  },
  nailTimePressablePressed: {
    opacity: 0.92,
  },
  nailTimeValueText: {
    color: primaryBlack,
  },
  nailTimePlaceholderText: {
    color: `${primaryBlack}99`,
  },
  nailTimePickerContainer: {
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(20),
    borderWidth: 1,
    borderColor: primaryBlack,
    marginTop: responsiveMargin(10),
    paddingVertical: responsiveScale(10),
  },
  nailTimePicker: {
    height: responsiveScale(120),
  },
  nailTimePickerButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: responsiveScale(20),
    paddingBottom: responsiveScale(10),
  },
  nailTimePickerDone: {
    paddingHorizontal: responsiveScale(20),
    paddingVertical: responsiveScale(8),
    backgroundColor: secondaryGreen,
    borderRadius: responsiveScale(10),
    borderWidth: 1,
    borderColor: primaryBlack,
  },
  nailTimePickerDoneText: {
    ...Typography.label,
    color: primaryBlack,
  },
  nailUploadSection: {
    width: "100%",
    marginBottom: responsiveMargin(4),
  },
  nailUploadAddRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingVertical: responsivePadding(16, 14),
    paddingHorizontal: responsivePadding(18),
    borderRadius: responsiveScale(18),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
    marginTop: responsiveMargin(4),
  },
  nailUploadAddRowBelowGrid: {
    marginTop: responsiveMargin(6),
  },
  nailUploadAddRowEndSpacer: {
    width: responsiveScale(20),
  },
  nailUploadAddRowPressed: {
    opacity: 0.88,
  },
  nailUploadAddRowDisabled: {
    opacity: 0.45,
  },
  nailUploadAddText: {
    flex: 1,
    color: primaryBlack,
    textAlign: "center",
  },
  nailMediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -responsiveMargin(6),
    width: "100%",
  },
  nailThumbCell: {
    width: "50%",
    paddingHorizontal: responsiveMargin(6),
    marginBottom: responsiveMargin(12),
  },
  nailThumbInner: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
  },
  nailThumb: {
    width: "100%",
    height: "100%",
    borderRadius: responsiveScale(20),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
    overflow: "hidden",
  },
  nailThumbDelete: {
    position: "absolute",
    top: responsiveScale(4),
    right: responsiveMargin(8),
    zIndex: 10,
  },
  nailSavePaddedButton: {
    alignSelf: "center",
    marginTop: responsiveMargin(36),
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
  },
  nailSavePaddedButtonLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
});
