// src/hooks/useLoadFonts.ts
import { useFonts } from "expo-font";

const useLoadFonts = () => {
  const [fontsLoaded] = useFonts({
    "Inter-Regular": require("../assets/fonts/Inter/static/Inter-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter/static/Inter-Medium.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter/static/Inter-SemiBold.ttf"),
    "Inter-Bold": require("../assets/fonts/Inter/static/Inter-Bold.ttf"),
    "Inter-ExtraBold": require("../assets/fonts/Inter/static/Inter-ExtraBold.ttf"),
    "Inter-Light": require("../assets/fonts/Inter/static/Inter-Light.ttf"),
    "Inter-Thin": require("../assets/fonts/Inter/static/Inter-Thin.ttf"),

    "ChauPhilomeneOne-Regular": require("../assets/fonts/Chau_Philomene_One/ChauPhilomeneOne-Regular.ttf"),
    "ChauPhilomeneOne-Italic": require("../assets/fonts/Chau_Philomene_One/ChauPhilomeneOne-Italic.ttf"),
  });

  return fontsLoaded;
};

export default useLoadFonts;
