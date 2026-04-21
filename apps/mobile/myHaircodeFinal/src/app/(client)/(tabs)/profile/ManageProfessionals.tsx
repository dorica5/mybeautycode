import {
  Alert,
  Pressable,
  StyleSheet,
  View,
  FlatList,
  Text,
} from "react-native";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Colors, primaryBlack, primaryWhite } from "@/src/constants/Colors";
import TopNav from "@/src/components/TopNav";
import ProfessionalList from "@/src/components/ProfessionalList";
import {
  useManageHairdresser,
  useRemoveRelationships,
  type RemoveRelationshipPayload,
} from "@/src/api/profiles";
import { useAuth } from "@/src/providers/AuthProvider";
import CustomAlert from "@/src/components/CustomAlert";
import { Href, router } from "expo-router";
import {
  responsiveFontSize,
  responsiveScale,
  responsivePadding,
  responsiveBorderRadius,
  scalePercent,
} from "@/src/utils/responsive";
import { MintProfileScreenShell } from "@/src/components/MintProfileScreenShell";
import { Typography } from "@/src/constants/Typography";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import {
  MintBrandModal,
  MintBrandModalFooterRow,
  MintBrandModalPrimaryButton,
  MintBrandModalSecondaryButton,
} from "@/src/components/MintBrandModal";

type ProRow = {
  link_id: string;
  id: string;
  profession_code?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  lastInteraction?: string;
};

type ManageFilterTab = "all" | "hair" | "nails" | "brows_lashes";

const MANAGE_PRO_FILTERS: { key: ManageFilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hair", label: "Hair" },
  { key: "nails", label: "Nails" },
  { key: "brows_lashes", label: "Brows" },
];

const ManageProfessionals = () => {
  const { profile } = useAuth();
  const { data } = useManageHairdresser(profile?.id ?? "");
  const removeRelationships = useRemoveRelationships(profile?.id ?? "");
  const [dataState, setDataState] = useState<ProRow[]>([]);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [filterTab, setFilterTab] = useState<ManageFilterTab>("all");

  useEffect(() => {
    if (data) {
      setDataState(data as ProRow[]);
    }
  }, [data]);

  useEffect(() => {
    setCheckedItems({});
  }, [filterTab]);

  const filteredList = useMemo(() => {
    if (filterTab === "all") return dataState;
    return dataState.filter((r) => r.profession_code === filterTab);
  }, [dataState, filterTab]);

  const handleCheck = useCallback((rowId: string, isChecked: boolean) => {
    setCheckedItems((prev) => ({
      ...prev,
      [rowId]: isChecked,
    }));
  }, []);

  const getCheckedInView = useCallback(() => {
    return filteredList.filter((item) => {
      const rowId = item.link_id ?? item.id;
      return checkedItems[rowId];
    });
  }, [filteredList, checkedItems]);

  const confirmDelete = async () => {
    const selected = getCheckedInView();

    if (selected.length === 0) {
      Alert.alert("Error", "No items selected for deletion.");
      return;
    }

    try {
      const payloads: RemoveRelationshipPayload[] = selected.map((item) => ({
        hairdresserId: String(item.id),
        professionCode: item.profession_code ?? undefined,
      }));
      await removeRelationships.mutateAsync(payloads);

      const removeIds = new Set(selected.map((i) => i.link_id ?? i.id));
      setDataState((prev) =>
        prev.filter((row) => !removeIds.has(row.link_id ?? row.id))
      );

      setCheckedItems((prev) => {
        const next = { ...prev };
        selected.forEach((row) => {
          const k = row.link_id ?? row.id;
          delete next[k];
        });
        return next;
      });
    } catch (error) {
      console.error("Error deleting hairdresser(s):", error);
      setAlertVisible(true);
    }
  };

  const hasRows = dataState.length > 0;
  const hasVisibleRows = filteredList.length > 0;
  const checkedCount = getCheckedInView().length;

  const primaryCtaTextStyle = styles.primaryCtaLabel;

  return (
    <MintProfileScreenShell>
      <TopNav title="Manage professionals" />

      {hasRows ? (
        <View style={styles.filtersRow}>
          {MANAGE_PRO_FILTERS.map((tab) => {
            const active = filterTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setFilterTab(tab.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    active && styles.filterPillTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.content}>
        <FlatList
          data={filteredList}
          renderItem={({ item }) => {
            const rowId = item.link_id ?? item.id;
            return (
              <ProfessionalList
                item={item}
                isChecked={checkedItems[rowId] || false}
                onCheck={handleCheck}
              />
            );
          }}
          keyExtractor={(item) => String(item.link_id ?? item.id)}
          contentContainerStyle={
            !hasVisibleRows ? styles.emptyList : styles.listPad
          }
          ListEmptyComponent={
            <View style={styles.noHairdresserContainer}>
              {!hasRows ? (
                <>
                  <Text style={styles.noHairdresserText}>
                    No professional added yet
                  </Text>
                  <PaddedLabelButton
                    title="Add professional"
                    horizontalPadding={32}
                    verticalPadding={16}
                    onPress={() => {
                      router.replace("/(client)/(tabs)/userList" as Href);
                    }}
                    style={styles.primaryCta}
                    textStyle={primaryCtaTextStyle}
                  />
                </>
              ) : (
                <Text style={styles.noHairdresserText}>
                  No professionals in this category
                </Text>
              )}
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      {hasVisibleRows ? (
        <View style={styles.buttonWrapper}>
          <PaddedLabelButton
            title="Delete professional(s)"
            horizontalPadding={32}
            verticalPadding={16}
            disabled={checkedCount === 0}
            onPress={() => {
              if (checkedCount > 0) setModalVisible(true);
            }}
            style={[
              styles.primaryCta,
              { opacity: checkedCount > 0 ? 1 : 0.45 },
            ]}
            textStyle={primaryCtaTextStyle}
          />
        </View>
      ) : null}

      <CustomAlert
        visible={alertVisible}
        title="Error"
        message="Failed to delete professional(s)."
        onClose={() => setAlertVisible(false)}
      />

      <MintBrandModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Delete professional"
        message="Are you sure you want to remove this professional?"
        footer={
          <MintBrandModalFooterRow>
            <MintBrandModalSecondaryButton
              label="Cancel"
              onPress={() => setModalVisible(false)}
            />
            <MintBrandModalPrimaryButton
              label="Delete"
              onPress={() => {
                setModalVisible(false);
                void confirmDelete();
              }}
            />
          </MintBrandModalFooterRow>
        }
      />
    </MintProfileScreenShell>
  );
};

export default ManageProfessionals;

const styles = StyleSheet.create({
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: responsiveScale(10),
    paddingHorizontal: scalePercent(5),
    marginTop: responsiveScale(8),
    marginBottom: responsiveScale(18),
  },
  filterPill: {
    paddingVertical: responsiveScale(10),
    paddingHorizontal: responsiveScale(20),
    borderRadius: responsiveBorderRadius(999),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    backgroundColor: "transparent",
  },
  filterPillActive: {
    backgroundColor: primaryBlack,
    borderColor: primaryBlack,
  },
  filterPillText: {
    fontFamily: "Inter-Medium",
    fontSize: responsiveFontSize(16, 14),
    color: primaryBlack,
  },
  filterPillTextActive: {
    color: primaryWhite,
  },
  content: {
    flex: 1,
    paddingHorizontal: responsivePadding(24),
  },
  listPad: {
    paddingBottom: responsiveScale(24, 16),
  },
  emptyList: {
    flexGrow: 1,
  },
  buttonWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: responsiveScale(20, 14),
    paddingHorizontal: responsivePadding(24),
  },
  primaryCta: {
    alignSelf: "center",
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
    overflow: "hidden",
  },
  primaryCtaLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
  modalDeleteCta: {
    alignSelf: "center",
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
    overflow: "hidden",
    marginBottom: responsiveScale(18, 12),
    minWidth: scalePercent(70),
  },
  noHairdresserContainer: {
    marginTop: responsiveScale(20, 50),
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    paddingHorizontal: responsivePadding(12),
  },
  noHairdresserText: {
    ...Typography.h3,
    fontSize: responsiveFontSize(18, 16),
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveScale(24, 16),
  },
  // Legacy bottom-sheet delete modal styles removed in favor of MintBrandModal.
});
