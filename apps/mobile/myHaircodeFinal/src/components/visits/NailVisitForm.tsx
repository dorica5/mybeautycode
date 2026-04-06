import React from "react";
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
} from "react-native";
import { CaretLeft, Plus, XCircle } from "phosphor-react-native";
import { ResizeMode, Video } from "expo-av";
import { primaryBlack, primaryWhite, secondaryGreen } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { BrandOutlineField } from "@/src/components/BrandOutlineField";
import { PrimaryOutlineTextField } from "@/src/components/PrimaryOutlineTextField";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import {
  responsiveScale,
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
} from "@/src/utils/responsive";
import { router } from "expo-router";
import { Colors } from "@/src/constants/Colors";

export const NAIL_SERVICE_OPTIONS = [
  "Manicure/Pedicure",
  "Nail enhancements",
  "Nail Art",
  "Other",
] as const;

type MediaItem = {
  uri?: string;
  type?: string;
  media_url?: string;
  id?: string;
  isFromDB?: boolean;
};

export type NailVisitFormProps = {
  scrollRef: React.RefObject<ScrollView>;
  /** Profession-specific labels (e.g. nail vs hair vs brow). */
  serviceOptions: readonly string[];
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
  capturedMedia: MediaItem[];
  pickImage: (index?: number) => void;
  removeMedia: (index: number) => void;
  isPending: boolean;
  isUploadingMedia: boolean;
  onSave: () => void;
  onPreviewPress: () => void;
};

export function NailVisitForm({
  scrollRef,
  serviceOptions,
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
  capturedMedia,
  pickImage,
  removeMedia,
  isPending,
  isUploadingMedia,
  onSave,
  onPreviewPress,
}: NailVisitFormProps) {
  const dismissKeyboard = () => {
    Keyboard.dismiss();
    if (showTimePicker) {
      onTimePickerDismiss();
    }
  };

  return (
    <View style={styles.nailRoot}>
      <View style={styles.nailTopBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.nailBackRow}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
          <Text style={[Typography.bodyMedium, styles.nailBackLabel]}>Back</Text>
        </Pressable>
        <Pressable
          onPress={onPreviewPress}
          style={styles.nailPreviewContainer}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Preview visit"
        >
          <Text style={styles.nailPreviewText}>Preview</Text>
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
            {isEditing ? "Edit visit" : "New visit"}
          </Text>

          <View style={styles.nailFormAlignedColumn}>
            <Text style={[Typography.label, styles.nailSectionLabelFirst]}>
              What kind of service?
            </Text>

            <View style={styles.nailServiceBlock}>
              {serviceOptions.map((opt) => (
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
                    style={[Typography.bodyMedium, styles.nailServiceRowText]}
                  >
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>

            <PrimaryOutlineTextField
              label="Describe the service"
              value={newHaircode}
              onChangeText={onChangeDescription}
              multiline
              minInputHeight={responsiveScale(120)}
              placeholder="Describe the service"
              containerStyle={styles.nailFieldBlock}
            />

            <View style={styles.nailTimeFieldWrap}>
              <Text
                style={[Typography.label, styles.nailTimeLabel]}
                accessibilityRole="text"
              >
                Time used
              </Text>
              <Pressable
                onPress={onTimePickerOpen}
                style={({ pressed }) => [
                  styles.nailTimePressable,
                  pressed && styles.nailTimePressablePressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Time used on the treatment"
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
                    : "Time used on the treatment"}
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
                        <Text style={styles.nailTimePickerDoneText}>Done</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            <BrandOutlineField
              label="Price"
              value={price}
              onChangeText={onChangePrice}
              keyboardType="decimal-pad"
              singleLineShape="rounded"
              containerStyle={styles.nailFieldBlock}
            />

            <Text style={[Typography.label, styles.nailSectionLabel]}>
              Upload images and video
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
                        {item.uri && item.type === "image" ? (
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
                          accessibilityLabel="Remove media"
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
                style={({ pressed }) => [
                  styles.nailUploadAddRow,
                  capturedMedia.length > 0 && styles.nailUploadAddRowBelowGrid,
                  pressed && styles.nailUploadAddRowPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add image"
              >
                <Plus
                  size={responsiveScale(20)}
                  color={primaryBlack}
                  strokeWidth={1.5}
                />
                <Text style={[Typography.bodyMedium, styles.nailUploadAddText]}>
                  Add image
                </Text>
                <View style={styles.nailUploadAddRowEndSpacer} />
              </Pressable>
            </View>

            <PaddedLabelButton
              title={
                isPending || isUploadingMedia
                  ? "Saving…"
                  : "Save visit"
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
  nailBackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveMargin(4),
    paddingVertical: responsiveMargin(4),
    paddingHorizontal: responsivePadding(4),
  },
  nailBackLabel: {
    color: primaryBlack,
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
    maxWidth: 400,
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
    marginBottom: responsiveMargin(28),
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
    backgroundColor: secondaryGreen,
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
  nailFieldBlock: {
    marginBottom: responsiveMargin(22),
  },
  nailTimeFieldWrap: {
    width: "100%",
    maxWidth: 400,
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
