import React, { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  Dimensions,
  View,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import RemoteImage from "@/src/components/RemoteImage";
import { api } from "@/src/lib/apiClient";
import TopNavGallery from "@/src/components/TopNavGallery";
import MyButton from "@/src/components/MyButton";
import { Colors } from "@/src/constants/Colors";
import { XCircle } from "phosphor-react-native";
import {
  scale,
  scalePercent,
  verticalScale,
  isTablet,
  responsiveFontSize,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";


// 🔹 Reusable ImageWithSpinner wrapper
const ImageWithSpinner = ({
  uri,
  storage,
  style,
  spinnerSize = "small",
  spinnerColor = "#fff",
}: {
  uri: string;
  storage: string;
  style: any;
  spinnerSize?: "small" | "large";
  spinnerColor?: string;
}) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true); // reset when URI changes
  }, [uri]);

  return (
    <View style={[style, { justifyContent: "center", alignItems: "center" }]}>
      <RemoteImage
        highResPath={uri}
        storage={storage}
        style={style}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => {
          setLoading(false);
          // failsafe to clear spinner even if event missed
          setTimeout(() => setLoading(false), 1000);
        }}
      />
      {loading && (
        <View style={styles.spinnerOverlay}>
          <ActivityIndicator size={spinnerSize} color={spinnerColor} />
        </View>
      )}
    </View>
  );
};



const ViewGallery = () => {
  const { clientId, clientName } = useLocalSearchParams();
  const [numColumns, setNumColumns] = useState(3);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [haircodeDetails, setHaircodeDetails] = useState<any>(null);

  useEffect(() => {
    const updateNumColumns = () => {
      const screenWidth = Dimensions.get("window").width;
      const newNumColumns = Math.floor(screenWidth / 150);
      setNumColumns(newNumColumns);
    };

    updateNumColumns();
    const subscription = Dimensions.addEventListener("change", updateNumColumns);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const fetchClientImages = async () => {
      try {
        setLoading(true);
        const media = await api.get<{ haircode_id: string; media_url: string; media_type: string }[]>(
          `/api/haircodes/client-gallery?clientId=${encodeURIComponent(clientId as string)}`
        );
        setImages(Array.isArray(media) ? media : []);
      } catch (error) {
        console.error("Error fetching images:", error);
        setImages([]);
      } finally {
        setLoading(false);
      }
    };

    if (clientId) fetchClientImages();
  }, [clientId]);

  const handleImagePress = async (item: any) => {
    setSelectedImage(item);
    setModalVisible(true);

    try {
      const haircode = await api.get<{
        id: string;
        hairdresserId: string;
        hairdresserName: string;
        createdAt: string;
        serviceDescription: string;
        services: string;
        price: string;
      }>(`/api/haircodes/${item.haircode_id}`);

      const hairdresserProfile = await api.get<{
        id: string;
        avatarUrl: string;
        salonName: string;
        salonPhoneNumber: string;
        aboutMe: string;
        bookingSite: string;
        socialMedia: string;
      }>(`/api/profiles/${haircode.hairdresserId}`);

      setHaircodeDetails({
        id: haircode.id,
        hairdresser_id: haircode.hairdresserId,
        hairdresser_name: haircode.hairdresserName,
        created_at: haircode.createdAt,
        service_description: haircode.serviceDescription,
        services: haircode.services,
        price: haircode.price,
        hairdresser_profile: {
          id: hairdresserProfile.id,
          avatar_url: hairdresserProfile.avatarUrl,
          salon_name: hairdresserProfile.salonName,
          salon_phone_number: hairdresserProfile.salonPhoneNumber,
          about_me: hairdresserProfile.aboutMe,
          booking_site: hairdresserProfile.bookingSite,
          social_media: hairdresserProfile.socialMedia,
        },
      });
    } catch (err) {
      console.error("Unexpected error:", err);
      Alert.alert("Error", "Failed to load haircode details.");
    }
  };

  const navigateToHaircode = () => {
    if (!haircodeDetails) return;
    setModalVisible(false);

    router.push({
      pathname: "./single_haircode",
      params: {
        haircodeId: haircodeDetails.id,
        hairdresserName: haircodeDetails.hairdresser_name,
        hairdresser_profile_pic: haircodeDetails.hairdresser_profile.avatar_url,
        description: haircodeDetails.service_description,
        services: haircodeDetails.services,
        createdAt: new Date(haircodeDetails.created_at).toLocaleDateString(
          "en-GB"
        ),
        salon_name: haircodeDetails.hairdresser_profile.salon_name,
        salonPhoneNumber: haircodeDetails.hairdresser_profile.salon_phone_number,
        about_me: haircodeDetails.hairdresser_profile.about_me,
        booking_site: haircodeDetails.hairdresser_profile.booking_site,
        social_media: haircodeDetails.hairdresser_profile.social_media,
        price: haircodeDetails.price,
        full_name: clientName,
      },
    });
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
    setHaircodeDetails(null);
  };

  const size = Dimensions.get("window").width / numColumns;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.topNav}>
          <TopNavGallery title={clientName} />
        </View>

        {/* 🔹 Image Gallery with spinner */}
        <View style={styles.galleryContainer}>
          <FlatList
            data={images}
            renderItem={({ item }) => (
              <Pressable onPress={() => handleImagePress(item)}>
                <ImageWithSpinner
                  uri={item.media_url}
                  storage="haircode_images"
                  style={{ width: size, height: size }}
                />
              </Pressable>
            )}
            numColumns={numColumns}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.contentContainer}
            keyExtractor={(item, index) => `${item.media_url}-${index}`}
            ListEmptyComponent={
              <View style={styles.noImagesContainer}>
                <Text style={styles.noImagesText}>
                  No images available for this client.
                </Text>
              </View>
            }
          />
        </View>

        {/* 🔹 Enlarged Image Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <Pressable style={styles.modalOverlay} onPress={closeModal}>
            <View style={styles.modalContent}>
              <Pressable style={styles.closeButton} onPress={closeModal}>
                <XCircle size={scale(32)} weight="regular" color={Colors.dark.dark} />
              </Pressable>

              {selectedImage && (
                <ImageWithSpinner
                  uri={selectedImage.media_url}
                  storage="haircode_images"
                  style={styles.enlargedImage}
                  spinnerSize="large"
                  spinnerColor={Colors.dark.dark}
                />
              )}

              {haircodeDetails && (
                <View style={styles.buttonContainer}>
                  <MyButton
                    style={styles.button}
                    text="View Haircode"
                    textSize={18}
                    textTabletSize={14}
                    onPress={navigateToHaircode}
                  />
                </View>
              )}
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topNav: {
    marginHorizontal: scalePercent(5),
  },
  galleryContainer: {
    flex: 1,
    marginTop: scalePercent(5),
  },
  row: {
    flex: 1,
    gap: scale(2),
  },
  image: {
    marginBottom: 0,
  },
  contentContainer: {
    flexGrow: 1,
  },
  noImagesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noImagesText: {
    fontFamily: "Inter-Bold",
    fontSize: responsiveFontSize(18, 14),
    color: "black",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: scalePercent(100),
    height: isTablet() ? scalePercent(110) : undefined,
    backgroundColor: Colors.light.light,
    borderRadius: scale(5),
    alignItems: "center",
    position: "relative",
  },
  enlargedImage: {
    width: "100%",
    height: isTablet() ? scalePercent(85) : verticalScale(400),
    resizeMode: "contain",
    marginTop: isTablet() ? scalePercent(8) : scalePercent(15),
  },
  closeButton: {
    position: "absolute",
    top: verticalScale(5),
    right: scale(5),
    padding: scale(10),
    elevation: 5,
    zIndex: 1,
  },
  buttonContainer: {
    marginTop: scalePercent(5),
    marginBottom: scalePercent(5),
    width: scalePercent(90),
  },
  button: {
    width: scalePercent(90),
    borderWidth: scale(2),
    borderColor: Colors.light.warmGreen,
    backgroundColor: Colors.dark.yellowish,
    alignSelf: "center",

    shadowColor: Colors.dark.dark,
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.6,
    shadowRadius: scale(4),
    elevation: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  spinnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    height: isTablet() ? scalePercent(85) : verticalScale(400),
  },
});

export default ViewGallery;
