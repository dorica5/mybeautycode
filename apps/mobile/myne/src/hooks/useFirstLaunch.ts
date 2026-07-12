import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "onboarding_seen_v2";

export function useFirstLaunch() {
  const [loading, setLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);

  useEffect(() => {
    void (async () => {
      let seen = await AsyncStorage.getItem(KEY);
      if (!seen) {
        const legacy = await AsyncStorage.getItem("onboarding_seen");
        if (legacy) {
          await AsyncStorage.setItem(KEY, legacy);
          seen = legacy;
        }
      }
      setIsFirstLaunch(!seen);
      setLoading(false);
    })();
  }, []);

  const markSeen = async () => {
    await AsyncStorage.setItem(KEY, "true");
    setIsFirstLaunch(false);
  };

  return { loading, isFirstLaunch, markSeen };
}
