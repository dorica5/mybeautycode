import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
  ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CaretLeft,
  Plus,
  Eye,
  Images,
  DotsThree,
} from "phosphor-react-native";
import RapportUserModal from "@/src/components/RapportUserModal";
import { router, useLocalSearchParams } from "expo-router";
import Profile from "@/src/components/Profile";
import ProfileRectangle from "@/src/components/profileRectangles";
import MyButton from "@/src/components/MyButton";
import { Colors } from "@/src/constants/Colors";
import { useClientSearch } from "@/src/api/profiles";
import SmallDraggableModal from "@/src/components/SmallDraggableModal";
import {
  blockUser,
  isBlocked,
  reportUserEnhanced,
  unblockUser,
  REPORT_REASONS,
  type ReportReason,
} from "@/src/api/moderation";
import { useAuth } from "@/src/providers/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { useRelationshipCheck, removeRelationship } from "@/src/api/relationships";
import { 
  responsiveScale, 
  scalePercent, 
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";

const HaircodeList = () => {
  const {
    id: client_id,
    phone_number,
    full_name,
    relationship,
    price,
  } = useLocalSearchParams();

  const { data: profileData } = useClientSearch(client_id);
  const data = profileData
    ? {
        full_name: profileData.fullName ?? profileData.full_name,
        avatar_url: profileData.avatarUrl ?? profileData.avatar_url,
      }
    : undefined;
  const { session } = useAuth();
  const hairdresser_id = session?.user.id;
  const queryClient = useQueryClient();
  const { data: isRelated = false, isFetching: relLoading } = useRelationshipCheck(
    client_id as string,
    hairdresser_id ?? undefined
  );

  const normalizedPhoneNumber = Array.isArray(phone_number)
    ? phone_number[0]
    : phone_number;

  // Control modals
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const [isBlockedUser, setIsBlockedUser] = useState(false);

  // Handlers
  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
  };

  const deleteClient = async (clientId: string) => {
    try {
      await removeRelationship(hairdresser_id, clientId);
      queryClient.invalidateQueries({
        queryKey: ["listAllClientSearch", hairdresser_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["latest_haircodes", hairdresser_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["client_haircodes", clientId],
      });
      await queryClient.refetchQueries({
        queryKey: ["latest_haircodes", hairdresser_id],
      });
      router.replace({ pathname: `/(hairdresser)/clientProfile/${clientId}` });
    } catch (error) {
      Alert.alert("Error", "Failed to delete user.");
    }
  };

  const handleModalOption = (action: string) => {
    setPendingAction(action);
    setIsModalVisible(false);
  };

  useEffect(() => {
    const checkBlocked = async () => {
      if (client_id && hairdresser_id) {
        const blocked = await isBlocked(hairdresser_id, client_id);
        setIsBlockedUser(blocked);
      }
    };
    checkBlocked();
  }, [client_id, hairdresser_id]);

  const handleReport = async (reason: ReportReason) => {
    try {
      const result = await reportUserEnhanced(
        hairdresser_id,
        client_id,
        reason,
        queryClient
      );

      if (result.autoBlocked) {
        Alert.alert(
          "User Reported & Blocked",
          "This user has been automatically blocked due to multiple reports and removed from the platform."
        );
      } else {
        Alert.alert("Reported", result.message);
      }

      setActiveAction(null);
    } catch (error) {
      if (error.message === "You have already reported this user") {
        Alert.alert("Already Reported", "You have already reported this user.");
      } else {
        console.error("Error reporting user:", error);
        Alert.alert("Error", "Failed to report user");
      }
      setActiveAction(null);
    }
  };

  const modalContent = (
    <View style={{ marginTop: "5%" }}>
      {isRelated && (
        <RapportUserModal
          title="Delete"
          top={true}
          onPress={() => handleModalOption("Delete")}
        />
      )}
      <RapportUserModal
        title="Block"
        top={!isRelated}
        bottom={false}
        onPress={() => handleModalOption("Block")}
      />
      <RapportUserModal
        title="Report"
        bottom={true}
        onPress={() => handleModalOption("Report")}
      />
      <RapportUserModal
        title="Cancel"
        top={true}
        bottom={true}
        onPress={() => setIsModalVisible(false)}
      />
    </View>
  );

  // Content for second modal
  const renderSecondaryModal = () => (
    <View>
      <Text style={styles.modalHeader}>{activeAction}</Text>
      {activeAction !== "Delete" && (
        <Text style={styles.modalSubtext}>Your reason remains private</Text>
      )}

      {activeAction === "Delete" && (
        <>
          <MyButton
            style={styles.optionButton}
            text="Confirm delete"
            textSize={18}
            textTabletSize={14}
            onPress={async () => {
              await deleteClient(client_id);
              setActiveAction(null);
            }}
          />
          <MyButton
            style={styles.optionButton}
            text="Cancel"
            textSize={18}
            textTabletSize={14}
            onPress={async () => {
              setActiveAction(null);
            }}
          />
        </>
      )}
      {activeAction === "Block" && (
        <>
          {["No reason", "Spam, fake profile", "Inappropriate content"].map(
            (reason, idx) => (
              <MyButton
                key={`${reason}-${idx}`}
                style={styles.optionButton}
                text={reason}
                textSize={18}
                textTabletSize={14}
                onPress={async () => {
                  await blockUser(
                    hairdresser_id,
                    client_id,
                    reason,
                    queryClient
                  );
                  Alert.alert("Blocked", "You have blocked this user.");
                  setActiveAction(null);
                  setIsBlockedUser(true);
                }}
              />
            )
          )}
        </>
      )}

      {activeAction === "Report" && (
        <ScrollView
          style={{  }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {REPORT_REASONS.map((reason) => (
            <MyButton
              key={reason.value}
              style={styles.optionButton}
              text={reason.label}
              textSize={18}
              textTabletSize={14}
              onPress={() => handleReport(reason.value)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );

  if (relLoading) return null;

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.dark.warmGreen} />
      <View style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.iconContainer}>
          <CaretLeft size={responsiveScale(32)} color={Colors.dark.dark} />
        </Pressable>

        {!isBlockedUser && (
          <Pressable onPress={toggleModal} style={styles.moreIconContainer}>
            <DotsThree size={responsiveScale(32)} color={Colors.dark.dark} weight="bold" />
          </Pressable>
        )}

        <ProfileRectangle full_name={data?.full_name} />

        <View>
          <AvatarWithSpinner
            uri={data?.avatar_url}
            size={scalePercent(25)}
            style={styles.profilePic}
          />
        </View>

        <View style={styles.stack}>
          {isBlockedUser ? (
            <MyButton
              style={[styles.clientProfileButton, { borderColor: "red" }]}
              text="Unblock User"
              textSize={18}
              textTabletSize={14}
              onPress={async () => {
                await unblockUser(hairdresser_id, client_id, queryClient);
                setIsBlockedUser(false);
                Alert.alert(
                  "User unblocked",
                  "You can now access this user's profile."
                );
              }}
            />
          ) : (
            <>
              <MyButton
                style={styles.clientProfileButton}
                text="View profile"
                textSize={18}
                textTabletSize={14}
                onPress={() => {
                  router.push({
                    pathname: `/(hairdresser)/clientProfile/${client_id}`,
                    params: { relationship },
                  });
                }}
              />

              <View style={styles.profileContainer}>
                <Profile
                  title="New haircode"
                  Icon={Plus}
                  top={true}
                  onPress={() =>
                    router.push({
                      pathname: "/haircodes/new_haircode",
                      params: { clientId: client_id },
                    })
                  }
                />
                <Profile
                  title="See haircodes"
                  Icon={Eye}
                  onPress={() =>
                    router.push({
                      pathname: "/haircodes/see_haircode",
                      params: {
                        id: client_id,
                        phone_number,
                        full_name,
                        relationship,
                        price,
                      },
                    })
                  }
                />
                <Profile
                  title="View gallery"
                  Icon={Images}
                  bottom={true}
                  onPress={() =>
                    router.push({
                      pathname: "/haircodes/view_gallery",
                      params: { clientId: client_id, clientName: full_name },
                    })
                  }
                />
              </View>
            </>
          )}
        </View>

        <SmallDraggableModal
          isVisible={isModalVisible}
          onClose={toggleModal}
          onModalHide={() => {
            if (pendingAction) {
              setActiveAction(pendingAction);
              setPendingAction(null);
            }
          }}
          modalHeight={"50%"}
          renderContent={modalContent}
        />

        <SmallDraggableModal
          isVisible={!!activeAction}
          onClose={() => setActiveAction(null)}
          modalHeight={"70%"}
          renderContent={renderSecondaryModal()}
        />
      </View>
    </>
  );
};

export default HaircodeList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  moreIconContainer: {
    position: "absolute",
    top: responsiveScale(60),
    right: responsiveScale(20),
    zIndex: 10,
  },
  stack: {
    marginTop: responsiveScale(90, 120),
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    position: "absolute",
    top: responsiveScale(60),
    left: responsiveScale(20),
    zIndex: 10,
    paddingHorizontal: scalePercent(5),
    paddingTop: responsiveScale(1),
  },
  name: {
    fontSize: responsiveFontSize(20, 18),
    fontFamily: "Inter-SemiBold",
  },
  profileContainer: {
    marginTop: responsiveScale(40),
    width: scalePercent(100),
    alignSelf: "center",
  },
  profilePic: {
    backgroundColor: Colors.dark.yellowish,
    position: "absolute",
    width: scalePercent(25),
    height: scalePercent(25),
    borderRadius: scalePercent(25) / 2,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: responsiveScale(55, 40),
  },
  clientProfileButton: {
    height: responsiveScale(50),
    paddingVertical: responsivePadding(12, 8),
    marginTop: responsiveScale(200, 300),
    backgroundColor: Colors.light.yellowish,
    borderWidth: responsiveScale(2),
    borderColor: Colors.dark.warmGreen,
    shadowColor: Colors.dark.dark,
    shadowOffset: { width: 0, height: responsiveScale(2) },
    shadowOpacity: 0.4,
    shadowRadius: responsiveScale(3),
    elevation: 5,
  },
  optionButton: {
    height: responsiveScale(50,70),
    paddingVertical: responsivePadding(12),
    marginTop: scalePercent(3),
    backgroundColor: Colors.light.yellowish,
    borderWidth: responsiveScale(2),
    borderColor: Colors.dark.warmGreen,
    shadowColor: Colors.dark.dark,
    shadowOffset: { width: 0, height: responsiveScale(2) },
    shadowOpacity: 0.4,
    shadowRadius: responsiveScale(3),
    elevation: 5,
  },
  modalHeader: {
    fontSize: responsiveFontSize(18, 16),
    textAlign: "center",
    marginBottom: responsiveMargin(10),
    fontFamily: "Inter-Bold"
  },
  modalSubtext: {
    fontSize: responsiveFontSize(14, 12),
    textAlign: "center",
    marginBottom: responsiveMargin(20),
    color: "gray",
  },
  buttonText: {
    fontSize: responsiveFontSize(18, 16),
    color: Colors.dark.dark,
    fontFamily: "Inter-Bold"
  },
  rapportButton: {
    backgroundColor: Colors.dark.yellowish,
  },
  deleteButton: {
    backgroundColor: Colors.dark.warmGreen,
  },
});