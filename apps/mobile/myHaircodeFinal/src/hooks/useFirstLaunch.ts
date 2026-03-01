import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "onboarding_seen_v2"

export function useFirstLaunch () {
    const [loading, setLoading] = useState(true);
    const [isFirstLaunch, setIsFirstLaunch] = useState(false);

    useEffect(() => {
        (async () => {
            const seen = await AsyncStorage.getItem(KEY);
            setIsFirstLaunch(!seen);
            setLoading(false);
        })();
    }, [])

    const markSeen = async () => {
        await AsyncStorage.setItem(KEY, "true");
        setIsFirstLaunch(false);
    }

    return {loading, isFirstLaunch, markSeen};


}