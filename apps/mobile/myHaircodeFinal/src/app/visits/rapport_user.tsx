/* eslint-disable react/react-in-jsx-scope */
import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { NavBackRow } from "@/src/components/NavBackRow";
import { scale, verticalScale } from "@/src/utils/responsive";

const RapportUser = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <NavBackRow onPress={() => router.back()} />
      </View>
    </View>
  );
};

export default RapportUser;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconContainer: {
    position: "absolute",
    top: verticalScale(60),
    left: scale(20),
    zIndex: 10,
  },
});
