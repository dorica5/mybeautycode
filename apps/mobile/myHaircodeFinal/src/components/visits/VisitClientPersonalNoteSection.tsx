import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CustomAlert from "@/src/components/CustomAlert";
import { InfoStroke16 } from "@/src/components/icons/GetDiscoveredStrokeIcons";
import { primaryBlack, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { updateHaircode } from "@/src/api/visits";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";

export const VISIT_CLIENT_PRIVATE_NOTE_MAX_CHARS = 1200;

type Props = {
  haircodeId: string;
  /** From visit detail API. Only returned for the client on the visit. */
  remoteNote: string | null | undefined;
  /** After the keyboard opens, parent can scroll so this field stays visible. */
  onPersonalNoteFocus?: () => void;
};

/**
 * Personal note visible only to the client on this visit ({@link InfoStroke16} explains privacy).
 */
export function VisitClientPersonalNoteSection({
  haircodeId,
  remoteNote,
  onPersonalNoteFocus,
}: Props) {
  const queryClient = useQueryClient();
  const [infoVisible, setInfoVisible] = useState(false);
  const [draft, setDraft] = useState(() => remoteNote ?? "");
  const [snapshot, setSnapshot] = useState(() => (remoteNote ?? "").trim());

  useEffect(() => {
    const from = remoteNote ?? "";
    setDraft(from);
    setSnapshot(from.trim());
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

  const flushSave = useCallback(async () => {
    const trimmed = draft.trim();
    if (trimmed === snapshot) return;
    try {
      await saveMutation.mutateAsync(trimmed);
      setSnapshot(trimmed);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Could not save your note. Try again.";
      Alert.alert("Error", msg);
    }
  }, [draft, saveMutation, snapshot]);

  return (
    <>
      <View style={styles.outer}>
        <View style={styles.labelRow}>
          <Text style={[Typography.label, styles.labelFlex]}>
            Your personal note
          </Text>
          <View style={styles.labelRowEnd}>
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color={primaryBlack} />
            ) : null}
            <Pressable
              onPress={() => setInfoVisible(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Who can see this note"
            >
              <InfoStroke16 />
            </Pressable>
          </View>
        </View>

        <View style={styles.noteFieldWrap}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder="Optional note about this visit..."
            placeholderTextColor={`${primaryBlack}99`}
            style={[Typography.bodyMedium, styles.noteInput]}
            maxLength={VISIT_CLIENT_PRIVATE_NOTE_MAX_CHARS}
            onBlur={() => {
              void flushSave();
            }}
            onFocus={() => {
              onPersonalNoteFocus?.();
            }}
            textAlignVertical="top"
          />
          <Text
            style={[Typography.bodyMedium, styles.charCount]}
            accessibilityLiveRegion="polite"
          >
            {`${draft.length}/${VISIT_CLIENT_PRIVATE_NOTE_MAX_CHARS}`}
          </Text>
        </View>
      </View>

      <CustomAlert
        visible={infoVisible}
        title="Personal note"
        message="Only you can read what you write here. The professional who logged this visit cannot see it."
        onClose={() => setInfoVisible(false)}
        compact
      />
    </>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: responsiveMargin(14),
    paddingHorizontal: responsivePadding(20),
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
    gap: responsiveMargin(10),
  },
  noteFieldWrap: {
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(18),
    borderWidth: 1,
    borderColor: primaryBlack,
    paddingVertical: responsivePadding(12),
    paddingHorizontal: responsivePadding(16),
  },
  noteInput: {
    color: primaryBlack,
    minHeight: responsiveScale(100),
    paddingTop: responsivePadding(2),
    paddingBottom: responsivePadding(6),
    width: "100%",
  },
  charCount: {
    color: `${primaryBlack}80`,
    alignSelf: "flex-end",
    fontSize: responsiveScale(12),
    marginTop: responsiveMargin(4),
  },
});
