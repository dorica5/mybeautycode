import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
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
  mintProfileScrollContent,
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
} from "@/src/api/feedback";

const MAX_DESCRIPTION = 1000;
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
  const [expanded, setExpanded] = useState(false);
  const chip = statusChipStyle(item.status);
  const hasDetails =
    Boolean(item.description?.trim()) || item.screenshot_urls.length > 0;

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
          <Text style={styles.statusChipText}>{item.status_label}</Text>
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
            Tap for details
          </Text>
        ) : null}
      </Pressable>
      <Pressable
        onPress={() => onVote(item.id)}
        disabled={voting}
        style={({ pressed }) => [
          styles.voteButton,
          item.viewer_has_voted && styles.voteButtonActive,
          pressed && styles.voteButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Vote, ${item.vote_count} votes`}
        accessibilityState={{ selected: item.viewer_has_voted }}
      >
        <CaretUp
          size={responsiveScale(18)}
          color={primaryBlack}
          weight={item.viewer_has_voted ? "fill" : "regular"}
        />
        <Text style={styles.voteCount}>{item.vote_count}</Text>
      </Pressable>
    </View>
  );
}

export default function FeedbackScreen() {
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
        Alert.alert("Permission needed", "Photo library access is required.");
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
          "Screenshot limit",
          `You can attach up to ${MAX_FEEDBACK_SCREENSHOTS} screenshots.`
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
      Alert.alert("Error", "Could not add screenshots.");
    } finally {
      setPreparingScreenshots(false);
    }
  }, [pendingScreenshots.length, preparingScreenshots]);

  const removeScreenshot = useCallback((localId: string) => {
    setPendingScreenshots((prev) => prev.filter((s) => s.localId !== localId));
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert("Missing title", "Please add a short title for your idea.");
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
          throw new Error("Could not upload a screenshot. Please try again.");
        }
        screenshotPaths.push(path);
      }

      await submitMutation.mutateAsync({
        title: trimmedTitle,
        description: description.trim() || undefined,
        type,
        screenshot_paths:
          screenshotPaths.length > 0 ? screenshotPaths : undefined,
      });
      setTitle("");
      setDescription("");
      setType("feature");
      setPendingScreenshots([]);
      Alert.alert(
        "Thanks!",
        "Your suggestion is on the board. Vote for other ideas you'd like us to prioritise."
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not send your suggestion.";
      Alert.alert("Something went wrong", message);
    }
  }, [description, pendingScreenshots, submitMutation, title, type]);

  return (
    <MintProfileScreenShell>
      <Stack.Screen options={{ headerShown: false }} />
      <TopNav title="Feedback" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={mintProfileScrollContent}
      >
        <Text style={[Typography.body, styles.intro]}>
          Vote for what we should build next. Submit your own idea below. We
          review everything and update status as we go.
        </Text>

        <Text style={[Typography.label, styles.sectionTitle]}>
          Community board
        </Text>

        {isPending ? (
          <ActivityIndicator color={primaryBlack} style={styles.loader} />
        ) : isError ? (
          <View style={styles.emptyWrap}>
            <Text style={[Typography.bodySmall, styles.emptyText]}>
              Could not load the board.
            </Text>
            <Pressable onPress={() => refetch()}>
              <Text style={[Typography.label, styles.retryLink]}>Try again</Text>
            </Pressable>
          </View>
        ) : sortedItems.length === 0 ? (
          <Text style={[Typography.bodySmall, styles.emptyText]}>
            No ideas on the board yet. Be the first to suggest something below.
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
          Have a suggestion?
        </Text>
        <Text style={[Typography.bodySmall, styles.formHint]}>
          Send an idea, improvement, or bug. We&apos;ll add it to the board for
          others to vote on.
        </Text>

        <View style={styles.typeRow}>
          {FEEDBACK_TYPE_OPTIONS.map((opt) => {
            const active = type === opt.code;
            return (
              <Pressable
                key={opt.code}
                onPress={() => setType(opt.code)}
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
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <PrimaryOutlineTextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Filter map by price range"
          maxLength={120}
          singleLineShape="rounded"
        />

        <PrimaryOutlineTextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What should it do, and why would it help you?"
          multiline
          minInputHeight={responsiveScale(120)}
          maxLength={MAX_DESCRIPTION}
          singleLineShape="rounded"
        />
        <Text style={[Typography.bodySmall, styles.charCount]}>
          {descriptionChars}/{MAX_DESCRIPTION}
        </Text>

        <Text style={[Typography.label, styles.screenshotLabel]}>
          Screenshots (optional)
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
                accessibilityLabel="Remove screenshot"
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
              accessibilityLabel="Add screenshot"
            >
              {preparingScreenshots ? (
                <ActivityIndicator color={primaryBlack} size="small" />
              ) : (
                <>
                  <Images size={responsiveScale(22)} color={primaryBlack} />
                  <Text style={[Typography.bodySmall, styles.screenshotAddLabel]}>
                    Add
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>

        <MyButton
          text={
            submitMutation.isPending
              ? "Sending…"
              : preparingScreenshots
                ? "Preparing…"
                : "Send to team"
          }
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={!canSubmit ? styles.submitDisabled : undefined}
        />
      </ScrollView>
    </MintProfileScreenShell>
  );
}

const styles = StyleSheet.create({
  intro: {
    color: primaryBlack,
    marginBottom: responsiveMargin(16),
  },
  sectionTitle: {
    color: primaryBlack,
    marginBottom: responsiveMargin(10),
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
