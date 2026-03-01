/* eslint-disable react/react-in-jsx-scope */
import {
  CaretLeft,
} from "phosphor-react-native";
import { useRouter } from "expo-router";
import { View, Pressable, StyleSheet } from "react-native";
import { Colors } from "@/src/constants/Colors";
import { scale, verticalScale } from "@/src/utils/responsive";

const RapportUser = () => {

    const router = useRouter(); 
 




  return (

        <View style={styles.container}>
          <Pressable onPress={() => router.back()} style={styles.iconContainer}>
            <CaretLeft size={scale(32)} color={Colors.dark.dark} />
          </Pressable>
    
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

  





