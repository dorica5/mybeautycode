import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { CaretUp, Images, X } from "phosphor-react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { randomUUID } from "expo-crypto";
import TopNav from "@/src/components/TopNav";
import {
  MintProfileScreenShell,
} from "@/src/components/MintProfileScreenShell";
import { PrimaryOutlineTextField } from "@/src/components/PrimaryOutlineTextField";
import MyButton from "@/src/components/MyButton";
import { Typography } from "@/src/constants/Typography";
import {
  primaryBlack,
  primaryGreen,
  primaryWhite,
  secondaryGreen,
} from "@/src/constants/Colors";
import {
  responsiveBorderRadius,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { uploadToStorage } from "@/src/lib/uploadHelpers";
import {
  FEEDBACK_SCREENSHOT_BUCKET,
  FEEDBACK_TYPE_OPTIONS,
  MAX_FEEDBACK_SCREENSHOTS,
  type FeedbackItem,
  type FeedbackItemStatus,
  type FeedbackItemType,
  useFeedbackBoard,
  useSubmitFeedback,
  useToggleFeedbackVote,
  VOTABLE_FEEDBACK_TYPES,
} from "@/src/api/feedback";
import { FeedbackSubmittedModal } from "@/src/components/feedback/FeedbackSubmittedModal";
import {
  clampFeedbackDescription,
  FEEDBACK_DESCRIPTION_MAX_CHARS,
  FEEDBACK_TEXT_INPUT_HEIGHT_DP,
} from "@/src/lib/feedbackTextInput";
import { useI18n } from "@/src/providers/LanguageProvider";

const MAX_DESCRIPTION = FEEDBACK_DESCRIPTION_MAX_CHARS;
const SCREENSHOT_THUMB = responsiveScale(72);

type PendingScreenshot = { localId: string; uri: string };

function statusChipStyle(status: FeedbackItemStatus) {
  switch (status) {
    case "in_development":
      return { bg: primaryGreen, border: primaryBlack };
    case "planned":
      return { bg: secondaryGreen, border: primaryBlack };
    case "shipped":
      return { bg: primaryWhite, border: primaryBlack };
    default:
      return { bg: primaryWhite, border: primaryBlack };
  }
}

function FeedbackBoardRow({
  item,
  onVote,
  voting,
}: {
  item: FeedbackItem;
  onVote: (id: string) => void;
  voting: boolean;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const chip = statusChipStyle(item.status);
  const hasDetails =
    Boolean(item.description?.trim()) || item.screenshot_urls.length > 0;
  const canVote = VOTABLE_FEEDBACK_TYPES.has(item.type);

  return (
    <View style={styles.boardRow}>
      <Pressable
        onPress={() => hasDetails && setExpanded((e) => !e)}
        style={styles.boardRowMain}
        accessibilityRole="button"
      >
        <View
          style={[
            styles.statusChip,
            { backgroundColor: chip.bg, borderColor: chip.border },
          ]}
        >
          <Text style={styles.statusChipText}>
            {t(`feedback.statuses.${item.status}`)}
          </Text>
        </View>
        <Text style={[Typography.body, styles.boardTitle]}>{item.title}</Text>
        {expanded && item.description ? (
          <Text style={[Typography.bodySmall, styles.boardDescription]}>
            {item.description}
          </Text>
        ) : null}
        {expanded && item.screenshot_urls.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.boardScreenshotRow}
          >
            {item.screenshot_urls.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={styles.boardScreenshotThumb}
                accessibilityIgnoresInvertColors
              />
            ))}
          </ScrollView>
        ) : null}
        {!expanded && hasDetails ? (
          <Text style={[Typography.bodySmall, styles.tapHint]}>
            {t("feedback.tapForDetails")}
          </Text>
        ) : null}
      </Pressable>
      {canVote ? (
        <Pressable
          onPress={() => onVote(item.id)}
          disabled={voting}
          style={({ pressed }) => [
            styles.voteButton,
            item.viewer_has_voted && styles.voteButtonActive,
            pressed && styles.voteButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("feedback.voteA11y", { count: item.vote_count })}
          accessibilityState={{ selected: item.viewer_has_voted }}
        >
          <CaretUp
            size={responsiveScale(18)}
            color={primaryBlack}
            weight={item.viewer_has_voted ? "fill" : "regular"}
          />
          <Text style={styles.voteCount}>{item.vote_count}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function FeedbackScreen() {
  const { t } = useI18n();
  const { data: items = [], isPending, isError, refetch } = useFeedbackBoard();
  const submitMutation = useSubmitFeedback();
  const voteMutation = useToggleFeedbackVote();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<FeedbackItemType>("feature");
  const [pendingScreenshots, setPendingScreenshots] = useState<
    PendingScreenshot[]
  >([]);
  const [preparingScreenshots, setPreparingScreenshots] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successSubmittedType, setSuccessSubmittedType] =
    useState<FeedbackItemType>("feature");
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === "ios") return;

    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardBottomInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardBottomInset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const descriptionChars = description.length;
  const canSubmit =
    title.trim().length > 0 &&
    !submitMutation.isPending &&
    !preparingScreenshots;

  const sortedItems = useMemo(() => items, [items]);

  const handleVote = useCallback(
    (id: string) => {
      voteMutation.mutate(id);
    },
    [voteMutation]
  );

  const addScreenshots = useCallback(async () => {
    if (
      pendingScreenshots.length >= MAX_FEEDBACK_SCREENSHOTS ||
      preparingScreenshots
    ) {
      return;
    }
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("common.permissionNeeded"), t("feedback.photoLibraryRequired"));
        return;
      }
      const remaining = MAX_FEEDBACK_SCREENSHOTS - pendingScreenshots.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsMultipleSelection: true,
        quality: 1,
      });
      if (result.canceled || !result.assets?.length) return;

      const assets = result.assets.slice(0, remaining);
      if (result.assets.length > remaining) {
        Alert.alert(
          t("feedback.screenshotLimitTitle"),
          t("feedback.screenshotLimitMessage", {
            count: MAX_FEEDBACK_SCREENSHOTS,
          })
        );
      }

      setPreparingScreenshots(true);
      const prepared: PendingScreenshot[] = [];
      for (const asset of assets) {
        const compressed = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
        );
        prepared.push({ localId: randomUUID(), uri: compressed.uri });
      }
      setPendingScreenshots((prev) => [...prev, ...prepared]);
    } catch {
      Alert.alert(t("common.error"), t("feedback.couldNotAddScreenshots"));
    } finally {
      setPreparingScreenshots(false);
    }
  }, [pendingScreenshots.length, preparingScreenshots, t]);

  const removeScreenshot = useCallback((localId: string) => {
    setPendingScreenshots((prev) => prev.filter((s) => s.localId !== localId));
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert(
        t("feedback.missingTitle"),
        t(`feedback.missingTitleMessage.${type}`)
      );
      return;
    }
    Keyboard.dismiss();
    try {
      const screenshotPaths: string[] = [];
      for (const shot of pendingScreenshots) {
        const path = await uploadToStorage(
          shot.uri,
          FEEDBACK_SCREENSHOT_BUCKET,
          undefined,
          "image/jpeg"
        );
        if (!path) {
          throw new Error(t("feedback.couldNotUploadScreenshot"));
        }
        screenshotPaths.push(path);
      }

      await submitMutation.mutateAsync({
        title: trimmedTitle,
        description: clampFeedbackDescription(description.trim()) || undefined,
        type,
        screenshot_paths:
          screenshotPaths.length > 0 ? screenshotPaths : undefined,
      });
      setSuccessSubmittedType(type);
      setSuccessVisible(true);
      setTitle("");
      setDescription("");
      setType("feature");
      setPendingScreenshots([]);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : t("feedback.couldNotSendSuggestion");
      Alert.alert(t("feedback.somethingWentWrong"), message);
    }
  }, [description, pendingScreenshots, submitMutation, t, title, type]);

  return (
    <MintProfileScreenShell>
      <Stack.Screen options={{ headerShown: false }} />
      <TopNav title={t("feedback.title")} />
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS === "android" &&
            keyboardBottomInset > 0 && {
              paddingBottom: responsiveMargin(32) + keyboardBottomInset,
            },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[Typography.body, styles.intro]}>
          {t("feedback.intro")}
        </Text>

        <Text style={[Typography.label, styles.sectionTitle]}>
          {t("feedback.communityBoard")}
        </Text>
        <Text style={[Typography.bodySmall, styles.boardHint]}>
          {t("feedback.boardHint")}
        </Text>

        {isPending ? (
          <ActivityIndicator color={primaryBlack} style={styles.loader} />
        ) : isError ? (
          <View style={styles.emptyWrap}>
            <Text style={[Typography.bodySmall, styles.emptyText]}>
              {t("feedback.couldNotLoadBoard")}
            </Text>
            <Pressable onPress={() => refetch()}>
              <Text style={[Typography.label, styles.retryLink]}>{t("common.tryAgain")}</Text>
            </Pressable>
          </View>
        ) : sortedItems.length === 0 ? (
          <Text style={[Typography.bodySmall, styles.emptyText]}>
            {t("feedback.emptyBoard")}
          </Text>
        ) : (
          sortedItems.map((item) => (
            <FeedbackBoardRow
              key={item.id}
              item={item}
              onVote={handleVote}
              voting={voteMutation.isPending}
            />
          ))
        )}

        <View style={styles.divider} />

        <Text style={[Typography.label, styles.sectionTitle]}>
          {t(`feedback.formHeading.${type}`)}
        </Text>
        <Text style={[Typography.bodySmall, styles.formHint]}>
          {t(`feedback.formHint.${type}`)}
        </Text>

        <View style={styles.typeRow}>
          {FEEDBACK_TYPE_OPTIONS.map((code) => {
            const active = type === code;
            return (
              <Pressable
                key={code}
                onPress={() => setType(code)}
                style={({ pressed }) => [
                  styles.typeChip,
                  active && styles.typeChipActive,
                  pressed && styles.typeChipPressed,
                ]}
              >
                <Text
                  style={[
                    Typography.bodySmall,
                    styles.typeChipLabel,
                    active && styles.typeChipLabelActive,
                  ]}
                >
                  {t(`feedback.types.${code}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <PrimaryOutlineTextField
          label={t("feedback.titleLabel")}
          value={title}
          onChangeText={setTitle}
          placeholder={t(`feedback.titlePlaceholder.${type}`)}
          maxLength={120}
          singleLineShape="rounded"
        />

        <PrimaryOutlineTextField
          label={t("feedback.descriptionLabel")}
          value={description}
          onChangeText={(text) => setDescription(clampFeedbackDescription(text))}
          placeholder={t(`feedback.descriptionPlaceholder.${type}`)}
          multiline
          maxInputHeight={FEEDBACK_TEXT_INPUT_HEIGHT_DP}
          scrollEnabled
          maxLength={MAX_DESCRIPTION}
          singleLineShape="rounded"
          onFocus={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        />
        <Text style={[Typography.bodySmall, styles.charCount]}>
          {descriptionChars}/{MAX_DESCRIPTION}
        </Text>

        <Text style={[Typography.label, styles.screenshotLabel]}>
          {t("feedback.screenshotsOptional")}
        </Text>
        <View style={styles.screenshotRow}>
          {pendingScreenshots.map((shot) => (
            <View key={shot.localId} style={styles.screenshotThumbWrap}>
              <Image
                source={{ uri: shot.uri }}
                style={styles.screenshotThumb}
                accessibilityIgnoresInvertColors
              />
              <Pressable
                onPress={() => removeScreenshot(shot.localId)}
                style={styles.screenshotRemove}
                accessibilityRole="button"
                accessibilityLabel={t("feedback.removeScreenshot")}
                hitSlop={8}
              >
                <X size={responsiveScale(14)} color={primaryWhite} weight="bold" />
              </Pressable>
            </View>
          ))}
          {pendingScreenshots.length < MAX_FEEDBACK_SCREENSHOTS ? (
            <Pressable
              onPress={addScreenshots}
              disabled={preparingScreenshots}
              style={({ pressed }) => [
                styles.screenshotAdd,
                pressed && styles.screenshotAddPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("feedback.addScreenshot")}
            >
              {preparingScreenshots ? (
                <ActivityIndicator color={primaryBlack} size="small" />
              ) : (
                <>
                  <Images size={responsiveScale(22)} color={primaryBlack} />
                  <Text style={[Typography.bodySmall, styles.screenshotAddLabel]}>
                    {t("feedback.add")}
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>

        <MyButton
          text={
            submitMutation.isPending
              ? t("feedback.sending")
              : preparingScreenshots
                ? t("feedback.preparing")
                : t("feedback.sendToTeam")
          }
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={!canSubmit ? styles.submitDisabled : undefined}
        />
      </ScrollView>
      <FeedbackSubmittedModal
        visible={successVisible}
        submittedType={successSubmittedType}
        onDismiss={() => setSuccessVisible(false)}
      />
    </MintProfileScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: responsivePadding(24),
    paddingTop: responsiveMargin(12),
    paddingBottom: responsiveMargin(32),
  },
  intro: {
    color: primaryBlack,
    marginBottom: responsiveMargin(16),
  },
  sectionTitle: {
    color: primaryBlack,
    marginBottom: responsiveMargin(10),
  },
  boardHint: {
    color: primaryBlack,
    opacity: 0.68,
    marginBottom: responsiveMargin(12),
    lineHeight: responsiveScale(20),
  },
  loader: {
    marginVertical: responsiveMargin(24),
  },
  emptyWrap: {
    alignItems: "flex-start",
    gap: responsiveMargin(8),
    marginBottom: responsiveMargin(8),
  },
  emptyText: {
    color: primaryBlack,
    opacity: 0.75,
  },
  retryLink: {
    color: primaryBlack,
    textDecorationLine: "underline",
  },
  boardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: responsiveMargin(10),
    backgroundColor: primaryWhite,
    borderRadius: responsiveBorderRadius(16),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    padding: responsivePadding(14),
    marginBottom: responsiveMargin(10),
  },
  boardRowMain: {
    flex: 1,
    gap: responsiveMargin(6),
  },
  statusChip: {
    alignSelf: "flex-start",
    borderRadius: responsiveBorderRadius(100),
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: responsivePadding(10),
    paddingVertical: responsivePadding(4),
  },
  statusChipText: {
    ...Typography.bodySmall,
    color: primaryBlack,
    fontSize: responsiveScale(11),
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  boardTitle: {
    color: primaryBlack,
  },
  boardDescription: {
    color: primaryBlack,
    opacity: 0.85,
  },
  tapHint: {
    color: primaryBlack,
    opacity: 0.5,
  },
  voteButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: responsiveScale(44),
    paddingVertical: responsivePadding(8),
    paddingHorizontal: responsivePadding(6),
    borderRadius: responsiveBorderRadius(12),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
  },
  voteButtonActive: {
    backgroundColor: primaryGreen,
  },
  voteButtonPressed: {
    opacity: 0.85,
  },
  voteCount: {
    ...Typography.label,
    color: primaryBlack,
    fontSize: responsiveScale(13),
    marginTop: responsiveMargin(2),
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: primaryBlack,
    opacity: 0.15,
    marginVertical: responsiveMargin(24),
  },
  formHint: {
    color: primaryBlack,
    opacity: 0.75,
    marginBottom: responsiveMargin(14),
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: responsiveMargin(8),
    marginBottom: responsiveMargin(16),
  },
  typeChip: {
    borderRadius: responsiveBorderRadius(100),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
    paddingHorizontal: responsivePadding(14),
    paddingVertical: responsivePadding(8),
  },
  typeChipActive: {
    backgroundColor: primaryBlack,
  },
  typeChipPressed: {
    opacity: 0.88,
  },
  typeChipLabel: {
    color: primaryBlack,
  },
  typeChipLabelActive: {
    color: primaryWhite,
  },
  charCount: {
    textAlign: "right",
    color: primaryBlack,
    opacity: 0.55,
    marginTop: -responsiveMargin(8),
    marginBottom: responsiveMargin(8),
  },
  screenshotLabel: {
    color: primaryBlack,
    marginBottom: responsiveMargin(8),
  },
  screenshotRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: responsiveMargin(10),
    marginBottom: responsiveMargin(20),
  },
  screenshotThumbWrap: {
    position: "relative",
  },
  screenshotThumb: {
    width: SCREENSHOT_THUMB,
    height: SCREENSHOT_THUMB,
    borderRadius: responsiveBorderRadius(12),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
  },
  screenshotRemove: {
    position: "absolute",
    top: responsiveScale(4),
    right: responsiveScale(4),
    width: responsiveScale(22),
    height: responsiveScale(22),
    borderRadius: responsiveScale(11),
    backgroundColor: primaryBlack,
    alignItems: "center",
    justifyContent: "center",
  },
  screenshotAdd: {
    width: SCREENSHOT_THUMB,
    height: SCREENSHOT_THUMB,
    borderRadius: responsiveBorderRadius(12),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    borderStyle: "dashed",
    backgroundColor: primaryWhite,
    alignItems: "center",
    justifyContent: "center",
    gap: responsiveMargin(4),
  },
  screenshotAddPressed: {
    opacity: 0.88,
  },
  screenshotAddLabel: {
    color: primaryBlack,
  },
  boardScreenshotRow: {
    gap: responsiveMargin(8),
    paddingTop: responsiveMargin(4),
  },
  boardScreenshotThumb: {
    width: responsiveScale(88),
    height: responsiveScale(88),
    borderRadius: responsiveBorderRadius(10),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
  },
  submitDisabled: {
    opacity: 0.5,
  },
});
