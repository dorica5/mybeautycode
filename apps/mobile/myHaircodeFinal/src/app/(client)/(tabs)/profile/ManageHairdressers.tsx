import {
  Alert,
  Pressable,
  StyleSheet,
  View,
  FlatList,
  Modal,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/src/constants/Colors";
import MyButton from "@/src/components/MyButton";
import TopNav from "@/src/components/TopNav";
import HairdresserList from "@/src/components/HairdresserList";
import { useManageHairdresser, useRemoveRelationships } from "@/src/api/profiles";
import { useAuth } from "@/src/providers/AuthProvider";
import CustomAlert from "@/src/components/CustomAlert";
import { XCircle } from "phosphor-react-native";
import { Href, router } from "expo-router";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import { responsiveFontSize, responsiveScale, scale, scalePercent, verticalScale } from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";


const DeleteHairdressers = () => {
  const { profile } = useAuth();
  const { data } = useManageHairdresser(profile?.id);
  const removeRelationships = useRemoveRelationships(profile?.id ?? "");
  const [dataState, setDataState] = useState([]); 
  const [checkedItems, setCheckedItems] = useState({});
  const [modalVisible, setModalVisible] = useState(false)

  useEffect(() => {
    if (data) {
      setDataState(data);
    }
  }, [data]);

  const handleCheck = (id, isChecked) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: isChecked,
    }));
  };

  const getCheckedItems = () => {
    return dataState.filter((item) => checkedItems[item.id]);
  };

  const [alertVisible, setAlertVisible] = useState(false);

  const confirmDelete = async () => {
    const itemsToDelete = getCheckedItems();
  
    if (itemsToDelete.length === 0) {
      Alert.alert("Error", "No items selected for deletion.");
      return;
    }
  
    try {
      const idsToDelete = itemsToDelete.map((item) => item.id);
      await removeRelationships.mutateAsync(idsToDelete);
  
      setDataState((prev) =>
        prev.filter((item) => !idsToDelete.includes(item.id))
      );
  
      setCheckedItems((prev) => {
        const updated = { ...prev };
        idsToDelete.forEach((id) => delete updated[id]);
        return updated;
      });
    } catch (error) {
      console.error("Error deleting hairdresser(s):", error);
      setAlertVisible(true);
    }
  };
  

  

  return (
    <>
    <StatusBar style="dark" backgroundColor="#fff" />
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
    <SafeAreaView style={styles.container}>

      <TopNav title="Manage professionals" />

      <View style={styles.content}>
        <FlatList
          data={dataState}
          renderItem={({ item }) => (
            <HairdresserList
              item={item}
              isChecked={checkedItems[item.id] || false}
              onCheck={handleCheck}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={
            <View style={styles.noHairdresserContainer}>
              <ResponsiveText size={18} weight="Bold" style={styles.noHairdresserText}>
                No professional added yet
              </ResponsiveText>
              
              <MyButton text="Add professional" onPress={() => {router.replace("/(client)/(tabs)/userList" as Href)}} />
            </View>
         
          }
          showsVerticalScrollIndicator={false}
        />
        
      </View>

      {dataState.length > 0 && (
  <View style={styles.buttonWrapper}>
    <MyButton
      style={[
        styles.deleteButton,
        { opacity: getCheckedItems().length > 0 ? 1 : 0.5 },
      ]}
      text="Delete professional(s)"
      onPress={() => {
        if (getCheckedItems().length > 0) {
          setModalVisible(true);
        }
      }}
      disabled={getCheckedItems().length === 0} 
    />
  </View>
)}


<CustomAlert
  visible={alertVisible}
  title="Error"
  message="Failed to delete professional(s)."
  onClose={() => setAlertVisible(false)}
/>

{modalVisible && (
  <Modal 
    visible={modalVisible}
    transparent={true}
    animationType="fade"
    onRequestClose={() => setModalVisible(false)}
  >
    <View style={styles.overlay}>
      <View style={styles.modalContent}>
        <Pressable onPress={() => setModalVisible(false)} style={styles.close}>
          <XCircle style={styles.closeButton} />
        </Pressable>
        <ResponsiveText style={styles.modalMessage} size={16} weight="SemiBold">
          Are you sure you want to remove this professional? They will no longer
          see your haircodes.
        </ResponsiveText>
  
        <MyButton
          text="Delete"
          onPress={() => {
            setModalVisible(false);
            confirmDelete();
          }}
          style={styles.deleteConfirmButton}
        />
      </View>
    </View>
  </Modal>
)}



</SafeAreaView>
</View>
</>
  );
};

export default DeleteHairdressers;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: scalePercent(5),
  },
  content: {
    flex: 1,
  },
  buttonWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: responsiveScale(20, 14),
  },
  noHairdresserContainer: {
    marginTop: responsiveScale(20, 50),
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
   
  },
  noHairdresserText: {
    fontSize: responsiveFontSize(18, 14),
    color: Colors.dark.warmGreen,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: scalePercent(100),
    height: responsiveScale(326, 250),
    backgroundColor: "white",
    borderTopLeftRadius: responsiveScale(20, 16),
    borderTopRightRadius: responsiveScale(20, 16),
    padding: scale(20),
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalMessage: {
    textAlign: "center",
    color: "black",
    marginTop: responsiveScale(14, 10),
    fontSize: responsiveFontSize(16, 14),
  },
  deleteConfirmButton: {
    width: scalePercent(80),
    borderRadius: responsiveScale(25, 20),
    backgroundColor: Colors.dark.warmGreen,
    marginBottom: responsiveScale(18, 12),
  },
  deleteButton: {
    width: scalePercent(90),
    borderRadius: responsiveScale(25, 20),
    justifyContent: "center",
    backgroundColor: Colors.dark.warmGreen,
    marginBottom: responsiveScale(20, 14),
  },
  close: {
    position: "absolute",
    top: scale(10),
    right: scale(20),
    borderRadius: scale(15),
    width: scale(30),
    height: scale(30),
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    color: Colors.dark.dark,
  },
});