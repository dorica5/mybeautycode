// src/screens/ImageDetails.tsx
import React from "react";
import { View, Text, Image, StyleSheet, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/src/constants/Colors";
import TopNavGallery from "@/src/components/TopNavGallery";

type ImageDetailsParams = {
  imageUri: string;
  name: string;
  phoneNumber: string;
  aboutMe: string;
};

function ImageDetails() {
  const { imageUri, name, phoneNumber, aboutMe } =
    useLocalSearchParams<ImageDetailsParams>();
  const router = useRouter();
  if (!name || !phoneNumber) {
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNavGallery title={name} secondTitle={phoneNumber} />
      <Image source={{ uri: imageUri }} style={styles.image} />
      <View style={styles.detailsContainer}>
        <Text style={styles.hairdresser}>Cecilie Efford, Dada Hårstudio</Text>
        <Text style={styles.date}>14.02.24</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  image: {
    width: "100%",
    aspectRatio: 1,
    marginTop: 20,
  },
  detailsContainer: {
    height: "20%",
    paddingHorizontal: "5%",
    paddingTop: "5%",
    backgroundColor: Colors.dark.yellowish,
  },
  hairdresser: {
    fontFamily: "Inter-SemiBold",
    fontSize: 18,
  },
  date: {
    fontFamily: "Inter-SemiBold",
    fontSize: 16,
  },
  detailText: {
    fontSize: 16,
    fontFamily: "Inter-Regular",
    paddingTop: "5%",
  },
});

export default ImageDetails;
