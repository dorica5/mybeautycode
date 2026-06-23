import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CaretRight, NotePencil } from "phosphor-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CustomAlert from "@/src/components/CustomAlert";
import { InfoStroke16 } from "@/src/components/icons/GetDiscoveredStrokeIcons";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { updateHaircode } from "@/src/api/visits";
import { useI18n } from "@/src/providers/LanguageProvider";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";

export const VISIT_CLIENT_PRIVATE_NOTE_MAX_CHARS = 1200;

type Props = {
  haircodeId: string;
  remoteNote: string | null | undefined;
  onPersonalNoteFocus?: () => void;
};

export function VisitClientPersonalNoteSection({
  haircodeId,
  remoteNote,
  onPersonalNoteFocus,
}: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const inputRef = useRef<TextInput>(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(() => remoteNote ?? "");
  const [snapshot, setSnapshot] = useState(() => (remoteNote ?? "").trim());

  useEffect(() => {
    const from = remoteNote ?? "";
    const trimmed = from.trim();
    setDraft(from);
    setSnapshot(trimmed);
    setExpanded(trimmed.length > 0);
  }, [haircodeId, remoteNote]);

  const saveMutation = useMutation({
    mutationFn: async (text: string) => {
      await updateHaircode(haircodeId, { client_private_note: text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [haircodeId, "visit_with_media"],
      });
      queryClient.invalidateQueries({ queryKey: ["client_visits"] });
    },
  });

  const hasSavedNote = snapshot.length > 0;
  const isDirty = draft.trim() !== snapshot;

  const flushSave = useCallback(async () => {
    const trimmed = draft.trim();
    if (trimmed === snapshot) return true;
    try {
      await saveMutation.mutateAsync(trimmed);
      setSnapshot(trimmed);
      if (!trimmed) setExpanded(false);
      return true;
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : t("visits.personalNoteSaveError");
      Alert.alert(t("common.error"), msg);
      return false;
    }
  }, [draft, saveMutation, snapshot, t]);

  const openEditor = useCallback(() => {
    setExpanded(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      onPersonalNoteFocus?.();
    });
  }, [onPersonalNoteFocus]);

  const handleBlur = useCallback(() => {
    void flushSave();
  }, [flushSave]);

  const statusLabel = saveMutation.isPending
    ? t("visits.personalNoteSaving")
    : isDirty
      ? t("visits.personalNoteUnsaved")
      : hasSavedNote
        ? t("visits.personalNoteSaved")
        : null;

  return (
    <>
      <View style={styles.outer}>
        {!expanded ? (
          <View style={styles.compactCard}>
            <Pressable
              onPress={openEditor}
              style={({ pressed }) => [
                styles.compactMain,
                pressed && styles.cardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                hasSavedNote
                  ? t("visits.personalNote")
                  : t("visits.personalNoteAdd")
              }
            >
              <View style={styles.compactIconWrap}>
                <NotePencil size={responsiveScale(20)} color={primaryBlack} />
              </View>
              <View style={styles.compactTextCol}>
                <Text style={[Typography.label, styles.compactTitle]}>
                  {t("visits.personalNote")}
                </Text>
                <Text
                  style={[Typography.bodySmall, styles.compactSubtitle]}
                  numberOfLines={hasSavedNote ? 2 : 1}
                >
                  {hasSavedNote
                    ? snapshot
                    : t("visits.personalNoteAddHint")}
                </Text>
              </View>
              <CaretRight size={responsiveScale(18)} color={primaryBlack} />
            </Pressable>
            <Pressable
              onPress={() => setInfoVisible(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("visits.personalNoteInfoA11y")}
              style={styles.compactInfoBtn}
            >
              <InfoStroke16 />
            </Pressable>
          </View>
        ) : (
          <View style={styles.editorCard}>
            <View style={styles.labelRow}>
              <Text style={[Typography.label, styles.labelFlex]}>
                {t("visits.personalNote")}
              </Text>
              <View style={styles.labelRowEnd}>
                {statusLabel ? (
                  <Text style={[Typography.bodySmall, styles.statusText]}>
                    {statusLabel}
                  </Text>
                ) : null}
                {saveMutation.isPending ? (
                  <ActivityIndicator size="small" color={primaryBlack} />
                ) : isDirty ? (
                  <Pressable
                    onPress={() => void flushSave()}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t("visits.personalNoteSave")}
                    style={({ pressed }) => [
                      styles.saveBtn,
                      pressed && styles.saveBtnPressed,
                    ]}
                  >
                    <Text style={[Typography.label, styles.saveBtnLabel]}>
                      {t("visits.personalNoteSave")}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => setInfoVisible(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("visits.personalNoteInfoA11y")}
                >
                  <InfoStroke16 />
                </Pressable>
              </View>
            </View>

            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              multiline
              placeholder={t("visits.personalNotePlaceholder")}
              placeholderTextColor={`${primaryBlack}66`}
              style={[Typography.bodyMedium, styles.noteInput]}
              maxLength={VISIT_CLIENT_PRIVATE_NOTE_MAX_CHARS}
              onBlur={handleBlur}
              onFocus={() => onPersonalNoteFocus?.()}
              textAlignVertical="top"
            />

            <View style={styles.footerRow}>
              <Text
                style={[Typography.bodySmall, styles.charCount]}
                accessibilityLiveRegion="polite"
              >
                {`${draft.length}/${VISIT_CLIENT_PRIVATE_NOTE_MAX_CHARS}`}
              </Text>
            </View>
          </View>
        )}
      </View>

      <CustomAlert
        visible={infoVisible}
        title={t("visits.personalNote")}
        message={t("visits.personalNoteInfoMessage")}
        onClose={() => setInfoVisible(false)}
        compact
      />
    </>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: responsiveMargin(20),
    paddingHorizontal: responsivePadding(20),
  },
  compactCard: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(18),
    borderWidth: 1,
    borderColor: primaryBlack,
    overflow: "hidden",
  },
  compactMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: responsivePadding(12),
    paddingLeft: responsivePadding(14),
    paddingRight: responsivePadding(10),
    gap: responsiveMargin(10),
  },
  compactInfoBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: responsivePadding(12),
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: `${primaryBlack}33`,
  },
  cardPressed: {
    opacity: 0.92,
  },
  compactIconWrap: {
    width: responsiveScale(36),
    height: responsiveScale(36),
    borderRadius: responsiveScale(18),
    backgroundColor: primaryGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  compactTextCol: {
    flex: 1,
    gap: responsiveMargin(2),
    minWidth: 0,
  },
  compactTitle: {
    color: primaryBlack,
  },
  compactSubtitle: {
    color: `${primaryBlack}99`,
  },
  editorCard: {
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(18),
    borderWidth: 1,
    borderColor: primaryBlack,
    paddingVertical: responsivePadding(12),
    paddingHorizontal: responsivePadding(16),
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: responsiveMargin(8),
    gap: responsiveMargin(8),
  },
  labelFlex: {
    color: primaryBlack,
    flex: 1,
  },
  labelRowEnd: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveMargin(8),
  },
  statusText: {
    color: `${primaryBlack}80`,
  },
  saveBtn: {
    paddingHorizontal: responsivePadding(10),
    paddingVertical: responsivePadding(4),
    borderRadius: responsiveScale(100),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryGreen,
  },
  saveBtnPressed: {
    opacity: 0.88,
  },
  saveBtnLabel: {
    color: primaryBlack,
    fontSize: responsiveScale(13),
  },
  noteInput: {
    color: primaryBlack,
    minHeight: responsiveScale(72),
    maxHeight: responsiveScale(160),
    paddingTop: responsivePadding(2),
    paddingBottom: responsivePadding(4),
    width: "100%",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: responsiveMargin(6),
  },
  charCount: {
    color: `${primaryBlack}80`,
    fontSize: responsiveScale(12),
  },
});
