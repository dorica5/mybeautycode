import "dotenv/config";

export default ({ config }) => {
  const androidMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY || "";
  const iosMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY || "";

  const plugins = [...(config.plugins ?? [])];
  if (androidMapsKey) {
    plugins.push([
      "./plugins/withGoogleMapsApiKey",
      { apiKey: androidMapsKey },
    ]);
  }

  const newConfig = {
    ...config,
    plugins,
    android: {
      ...config.android,
      ...(process.env.GOOGLE_SERVICES_JSON
        ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
        : {}),
      config: {
        ...config.android?.config,
        ...(androidMapsKey ? { googleMaps: { apiKey: androidMapsKey } } : {}),
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        ...(iosMapsKey ? { googleMapsApiKey: iosMapsKey } : {}),
      },
    },
    extra: {
      ...config.extra,
      SUPABASE_URL: process.env.SUPABASE_URL || "",
      SUPABASE_ANON: process.env.SUPABASE_ANON || "",
      SUPABASE_FUNCTION_URL: process.env.SUPABASE_FUNCTION_URL || "",
      EXPO_PUBLIC_API_URL:
        process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001",
      /** Places API (or Maps key with Places enabled) for address autocomplete on setup. */
      googlePlacesApiKey:
        process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
        process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ||
        process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY ||
        "",
      EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY: androidMapsKey,
      EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY: iosMapsKey,
      EXPO_PUBLIC_GOOGLE_PLACES_API_KEY:
        process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || "",
      eas: {
        ...(config.extra?.eas ?? {}),
        projectId: "4b757cda-0041-447c-95f9-0b36c1d70c6c",
      },
    },
  };

  return newConfig;
};
