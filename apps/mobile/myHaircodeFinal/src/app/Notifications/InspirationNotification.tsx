import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  Alert,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MyButton from "@/src/components/MyButton";
import {
  fetchSharedInspirationsByBatch,
  acceptSharedInspiration,
  acceptSharedInspirations,
  rejectSharedInspiration,
  rejectSharedInspirations,
} from "@/src/api/shared-inspirations";
import { SafeAreaView } from "react-native-safe-area-context";
import { XCircle } from "phosphor-react-native";
import { useAuth } from "@/src/providers/AuthProvider";
import TopNav from "@/src/components/TopNav";
import { useImageContext } from "@/src/providers/ImageProvider";
import RemoteImage from "@/src/components/RemoteImage";
import { Colors } from "@/src/constants/Colors";
import NoImageHaircode from "@/src/components/no_image_haircode";
import { 
  responsiveScale, 
  scalePercent, 
  responsivePadding, 
  responsiveMargin, 
  responsiveFontSize,
  responsiveBorderRadius,
  isTablet 
} from "@/src/utils/responsive";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import { isBlocked } from "@/src/api/moderation";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { fetchSignedStorageUrls } from "@/src/lib/storageSignedUrl";

type SharedInspirationRow = { path: string; displayUri: string };

const InspirationNotification = () => {
  const { senderName, batch_id, profile_pic, senderId } =
    useLocalSearchParams();
  const { profile } = useAuth();
  const [images, setImages] = useState<SharedInspirationRow[]>([]);
  const [selectedImage, setSelectedImage] = useState<SharedInspirationRow | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [flatListKey, setFlatListKey] = useState("flatlist-0");
  const [hasPendingImages, setHasPendingImages] = useState(false);
  const { refreshInspirationImages } = useImageContext();
  const [statusMessage, setStatusMessage] = useState("");
  const [isBlockedUser, setIsBlockedUser] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const user_type = profile?.user_type;

  const screenWidth = Dimensions.get("window").width;

  useEffect(() => {
    const checkBlocked = async () => {
      if (profile.id && senderId) {
        const blocked = await isBlocked(senderId, profile.id);
        console.log("User is blocked:", blocked);
        setIsBlockedUser(blocked);
      }
    };
    checkBlocked();
  }, [profile.id, senderId]);

  useEffect(() => {
    const fetchSharedInspirations = async () => {
      if (!batch_id) {
        console.warn("⚠ No batch_id provided, skipping fetch.");
        setHasPendingImages(false);
        setStatusMessage("No shared inspiration available.");
        return;
      }

      try {
        const paths = await fetchSharedInspirationsByBatch(batch_id as string);
        const displayUris = await fetchSignedStorageUrls(
          paths.map((path) => ({
            bucket: "shared_inspiration_images",
            path,
          }))
        );
        const imageList: SharedInspirationRow[] = paths
          .map((path, i) => ({
            path,
            displayUri: displayUris[i] ?? "",
          }))
          .filter((row) => !!row.displayUri);
        setImages(imageList);
        setHasPendingImages(imageList.length > 0);
        setFlatListKey(`flatlist-${Date.now()}`);

        if (imageList.length === 0) {
          setStatusMessage("These shared images have already been handled.");
        } else {
          setStatusMessage("");
        }
      } catch (error) {
        console.error("Error fetching shared inspirations:", error);
        setStatusMessage("Something went wrong while loading the images.");
      }
    };

    fetchSharedInspirations();
  }, [batch_id]);

  const addToInspirationContext = async (newImages) => {
    // Since we can't directly modify the context, we'll use a workaround
    // by refreshing after a small delay to ensure the database write is complete
    setTimeout(async () => {
      await refreshInspirationImages();
    }, 500);
  };

  const handleAccept = async (row: SharedInspirationRow | null) => {
    if (isProcessing || !batch_id || !row) return;
    setIsProcessing(true);

    try {
      await acceptSharedInspiration(batch_id as string, row.path);
      await addToInspirationContext([]);

      const updatedImages = images.filter((img) => img.path !== row.path);
      setImages(updatedImages);
      setHasPendingImages(updatedImages.length > 0);
      setFlatListKey(`flatlist-${Date.now()}`);
      setModalVisible(false);
    } catch (error) {
      console.error("Error accepting image:", error);
      Alert.alert("Error", "Failed to save inspiration.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptAll = async () => {
    if (isProcessing || !batch_id || images.length === 0) return;
    setIsProcessing(true);

    try {
      const { accepted } = await acceptSharedInspirations(
        batch_id as string,
        images.map((r) => r.path)
      );
      await addToInspirationContext([]);

      setImages([]);
      setHasPendingImages(false);
      setFlatListKey(`flatlist-${Date.now()}`);

      if (accepted === 0) {
        Alert.alert("Error", "Failed to save any inspirations.");
      } else if (accepted < images.length && images.length > 0) {
        Alert.alert(
          "Partial Success",
          `Saved ${accepted} of ${images.length} images.`
        );
      } else {
        Alert.alert("Success", "All images saved successfully!");
      }
    } catch (error) {
      console.error("Error in accept all process:", error);
      Alert.alert("Error", "Failed to complete the operation.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (row: SharedInspirationRow | null) => {
    if (isProcessing || !row) return;
    setIsProcessing(true);

    try {
      await rejectSharedInspiration(row.path);

      const updatedImages = images.filter((img) => img.path !== row.path);
      setImages(updatedImages);
      setHasPendingImages(updatedImages.length > 0);
      setFlatListKey(`flatlist-${Date.now()}`);
      setModalVisible(false);
    } catch (error) {
      console.error("Error rejecting image:", error);
      Alert.alert("Error", "Failed to remove inspiration.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAll = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      await rejectSharedInspirations(images.map((r) => r.path));
      setImages([]);
      setHasPendingImages(false);
      setFlatListKey(`flatlist-${Date.now()}`);
    } catch (error) {
      console.error("Error rejecting images:", error);
      Alert.alert("Error", "Failed to remove inspirations.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getImageGridDimensions = () => {
    const screenWidth = Dimensions.get("window").width;
    const padding = responsivePadding(16) * 2; // Left and right padding
    const availableWidth = screenWidth - padding;
    
    // Adjust number of columns based on device type
    const baseColumnWidth = isTablet() ? 180 : 150;
    const numColumns = Math.floor(availableWidth / baseColumnWidth);
    const imageSize = (availableWidth - (numColumns - 1) * responsiveScale(2)) / numColumns;
    
    return { numColumns, imageSize };
  };

  const { numColumns, imageSize } = getImageGridDimensions();

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <SafeAreaView style={styles.container}>
          <TopNav title="Inspiration Shared" />
          <View style={styles.subContainer}>
            <ResponsiveText size={16} tabletSize={14} style={styles.message}>
              From
            </ResponsiveText>

            <Pressable
              style={styles.profileColumn}
              onPress={
                !isBlockedUser
                  ? () =>
                      user_type === "HAIRDRESSER"
                        ? router.push({
                            pathname: `../(hairdresser)/clientProfile/${senderId}`,
                            params: { id: senderId, relationship: "true" },
                          })
                        : router.push({
                            pathname: `../(client)/(tabs)/userList/professionalProfile/${senderId}`,
                            params: { id: senderId, relationship: "true" },
                          })
                  : null
              }
            >
              <AvatarWithSpinner
                uri={profile_pic}
                size={responsiveScale(55, 70)}
                style={styles.profileImage}
              />
              <ResponsiveText 
                size={16} 
                tabletSize={14} 
                weight="SemiBold" 
                style={styles.name}
              >
                {senderName}
              </ResponsiveText>
            </Pressable>
          </View>

          {statusMessage !== "" && (
            <View style={styles.statusBanner}>
              <ResponsiveText 
                size={14} 
                tabletSize={12} 
                style={styles.statusText}
              >
                {statusMessage}
              </ResponsiveText>
            </View>
          )}

          <View style={styles.flatListContainer}>
            <FlatList
              key={flatListKey}
              data={images}
              keyExtractor={(item) => item.path}
              numColumns={numColumns}
              columnWrapperStyle={numColumns > 1 ? styles.row : null}
              contentContainerStyle={styles.contentContainer}
              renderItem={({ item, index }) => (
                <Pressable
                  onPress={() => {
                    setSelectedImage(item);
                    setModalVisible(true);
                  }}
                  style={[
                    styles.imageContainer, 
                    { width: imageSize, height: imageSize }
                  ]}
                >
                  <Image
                    source={{ uri: item.displayUri }}
                    style={[
                      styles.image, 
                      { width: imageSize, height: imageSize }
                    ]}
                    resizeMode="cover"
                  />
                </Pressable>
              )}
              showsVerticalScrollIndicator={true}
            />
          </View>

          {hasPendingImages && images.length > 0 && (
            <View style={styles.buttonContainer}>
              <MyButton
                text={isProcessing ? "Processing..." : "Accept All"}
                textSize={18}
                textTabletSize={14}
                onPress={handleAcceptAll}
                style={{
                  opacity: isProcessing ? 0.6 : 1,
                }}
                disabled={isProcessing}
              />
              <MyButton
                text={isProcessing ? "Processing..." : "Reject All"}
                textSize={18}
                textTabletSize={14}
                onPress={handleRejectAll}
                style={[
                  styles.rejectButton,
                  { opacity: isProcessing ? 0.6 : 1 },
                ]}
                reject={true}
                disabled={isProcessing}
              />
            </View>
          )}

          <Modal visible={modalVisible} transparent animationType="fade">
            <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                  <Pressable
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <XCircle 
                      size={responsiveScale(30, 36)} 
                      color={Colors.dark.dark} 
                    />
                  </Pressable>

                  {selectedImage && (
                    <Image
                      source={{ uri: selectedImage.displayUri }}
                      style={[
                        styles.modalImage,
                        { 
                          width: scalePercent(90), 
                          height: isTablet() ? scalePercent(95) : scalePercent(90) * (4 / 3)
                        },
                      ]}
                      resizeMode="cover"
                    />
                  )}

                  <View style={styles.modalButtons}>
                    <MyButton
                      text={isProcessing ? "Processing" : "Accept"}
                      textSize={18}
                      textTabletSize={14}
                      onPress={() => handleAccept(selectedImage)}
                      style={{
                        marginLeft: responsiveMargin(9),
                        opacity: isProcessing ? 0.6 : 1,
                      }}
                      disabled={isProcessing}
                    />
                    <MyButton
                      text={isProcessing ? "Processing" : "Reject"}
                      textSize={18}
                      textTabletSize={14}
                      onPress={() => handleReject(selectedImage)}
                      style={[
                        styles.modalRejectButton,
                        { opacity: isProcessing ? 0.6 : 1 },
                      ]}
                      reject={true}
                      disabled={isProcessing}
                    />
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </SafeAreaView>
      </View>
    </>
  );
};

export default InspirationNotification;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flex: 1,
    justifyContent: "flex-start",
    gap: responsiveScale(2),
  },
  flatListContainer: {
    flex: 1,
    paddingHorizontal: responsivePadding(16),
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: responsivePadding(20),
  },
  image: {
    resizeMode: "cover",
    borderRadius: responsiveBorderRadius(8),
  },
  imageContainer: {
    aspectRatio: 1,
    borderRadius: responsiveBorderRadius(8),
    marginBottom: responsiveMargin(2),
  },
  buttonContainer: {
    marginTop: responsiveMargin(20),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: responsivePadding(16),
    paddingBottom: responsivePadding(20),
    gap: responsiveMargin(12),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: scalePercent(95),
    backgroundColor: Colors.dark.light,
    borderRadius: responsiveBorderRadius(10),
    alignItems: "center",
    paddingBottom: responsivePadding(20),
  },
  closeButton: {
    position: "absolute",
    top: responsiveScale(10),
    right: responsiveScale(10),
    zIndex: 10,
  },
  modalImage: {
    borderRadius: responsiveBorderRadius(10),
    marginTop: responsiveMargin(50),
  },
  modalButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: responsiveMargin(20),
  },
  rejectButton: {
    backgroundColor: "transparent",
    borderRadius: responsiveBorderRadius(30),
    borderWidth: responsiveScale(2),
    borderColor: Colors.dark.warmGreen,
  },
  modalRejectButton: {
    backgroundColor: "transparent",
    borderRadius: responsiveBorderRadius(30),
    borderWidth: responsiveScale(2),
    borderColor: Colors.dark.warmGreen,
    marginLeft: responsiveMargin(9),
  },
  profileImage: {
    width: responsiveScale(55, 70),
    height: responsiveScale(55, 70),
    borderRadius: responsiveScale(30, 35),
  },
  name: {
    lineHeight: responsiveScale(24, 20),
    textAlign: "center",
    paddingBottom: responsivePadding(20),
  },
  message: {
    lineHeight: responsiveScale(40, 32),
  },
  subContainer: {
    alignItems: "center",
    paddingHorizontal: responsivePadding(16),
  },
  statusBanner: {
    backgroundColor: "#f2f2f2",
    paddingVertical: responsivePadding(12),
    paddingHorizontal: responsivePadding(20),
    borderRadius: responsiveBorderRadius(10),
    marginHorizontal: responsiveMargin(16),
    marginBottom: responsiveMargin(10),
    borderWidth: responsiveScale(1),
    borderColor: Colors.dark.warmGreen,
    alignItems: "center",
    justifyContent: "center",
    marginTop: responsiveMargin(30),
  },
  statusText: {
    color: Colors.dark.dark,
    fontFamily: "Inter-Medium",
    textAlign: "center",
  },
  profileColumn: {
    flexDirection: "column",
    alignItems: "center",
    gap: responsiveScale(8),
  },
});