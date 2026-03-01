import React, { useState } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Share, Trash } from "phosphor-react-native";
import SmallDraggableModal from "@/src/components/SmallDraggableModal";
import { useMark } from "@/src/providers/MarkProvider";
import { View } from "react-native";
import { Colors } from "@/src/constants/Colors";
import ShareInspirationModal from "./ShareInspirationModal";
import InspirationDraggable from "@/src/components/InspirationDraggable";
import { isTablet } from "@/src/utils/responsive";

const Layout = () => {
  const { marked, handleDelete, selectedImages } = useMark();
  const iconOpacity = selectedImages.length > 0 ? 1 : 0.2;
  const [isModalVisibleSmall, setIsModalVisibleSmall] = useState(false);
  const [isModalVisibleLarge, setIsModalVisibleLarge] = useState(false);

  const toggleModalSmall = () => {
    setIsModalVisibleSmall((prev) => !prev);
  };

  const toggleModalLarge = () => {
    setIsModalVisibleLarge((prev) => !prev);
  };

  const handleDeleteConfirm = () => {
    handleDelete();
    setIsModalVisibleSmall(false);
  };

  const modalContentSmall = (
    <View style={styles.confirmationContainer}>
      <Pressable onPress={handleDeleteConfirm} style={styles.deleteButton}>
        <Text style={styles.myButtonText}>Delete</Text>
      </Pressable>
      <Pressable onPress={toggleModalSmall} style={styles.cancelButton}>
        <Text style={styles.myButtonText}>Cancel</Text>
      </Pressable>
    </View>
  );

  <View style={styles.confirmationContainer}>
    <Pressable onPress={handleDeleteConfirm} style={styles.deleteButton}>
      <Text style={styles.myButtonText}>Delete</Text>
    </Pressable>
    <Pressable onPress={toggleModalSmall} style={styles.cancelButton}>
      <Text style={styles.myButtonText}>Cancel</Text>
    </Pressable>
  </View>;

  
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          headerShown: false,
          
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="ShareInspirationModal"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="share"
          options={{
            tabBarIcon: () => (
              <Share size={32} color={`rgba(0,0,0,${iconOpacity})`}  />
            ),
            tabBarButton: (props) => (
              <Pressable
                {...props}
                onPress={marked ? toggleModalLarge : null}
              />
            ),
          }}
        />
        
        <Tabs.Screen
          name="delete"
          options={{
            tabBarIcon: () => (
              <Trash size={32} color={`rgba(0,0,0,${iconOpacity})`} />
            ),
            tabBarButton: (props) => (
              <Pressable
                {...props}
                onPress={marked ? toggleModalSmall : null}
              />
            ),
          }}
        />
      </Tabs>

      {isModalVisibleSmall && (
        <SmallDraggableModal
          isVisible={isModalVisibleSmall}
          onClose={toggleModalSmall}
          modalHeight={"40%"}
          renderContent={modalContentSmall}
        />
      )}

      <InspirationDraggable
        isVisible={isModalVisibleLarge}
        onClose={toggleModalLarge}
        modalHeight={"98%"}
        renderContent={(
          <ShareInspirationModal onClose={toggleModalLarge} />
        )}
        preview={true}
      />
    </>
  );
};

export default Layout;

const styles = StyleSheet.create({
  confirmationContainer: {
    padding: 20,
    alignItems: "center",
    marginTop: "-20%",
  },
  confirmationText: {
    fontSize: 16,
    color: Colors.dark.dark,
    fontFamily: "Inter",
    textAlign: "center",
    marginTop: 30,
  },
  myButtonText: {
    color: Colors.dark.dark,
    fontSize: 16,
    fontFamily: "Inter-SemiBold",
  },
  deleteButton: {
    backgroundColor: Colors.dark.warmGreen,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 10,
    marginTop: "20%",
    padding: 15,
    borderRadius: 81,
    width: isTablet() ? "100%" : "110%",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: Colors.dark.yellowish,
    borderWidth: 2,
    borderColor: Colors.light.warmGreen,
    shadowColor: Colors.dark.dark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 10,
    marginTop: "10%",
    padding: 15,
    borderRadius: 81,
    width: isTablet() ? "100%" : "110%",
    alignItems: "center",
  },
});