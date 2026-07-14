const { withAndroidManifest } = require("expo/config-plugins");

const META_NAME = "com.google.android.geo.API_KEY";

/**
 * Writes the Google Maps API key into AndroidManifest.xml.
 * Expo's android.config.googleMaps.apiKey is not always applied on SDK 54 + new arch;
 * this plugin guarantees react-native-maps finds the key at runtime.
 */
module.exports = function withGoogleMapsApiKey(config, props = {}) {
  const apiKey =
    props.apiKey ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ||
    config.android?.config?.googleMaps?.apiKey ||
    "";

  if (!apiKey) {
    return config;
  }

  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) {
      return config;
    }

    const meta = application["meta-data"] ?? [];
    const list = Array.isArray(meta) ? [...meta] : [meta];

    const withoutOld = list.filter((entry) => {
      const name = entry.$?.["android:name"] ?? entry["android:name"];
      return name !== META_NAME;
    });

    withoutOld.push({
      $: {
        "android:name": META_NAME,
        "android:value": apiKey,
      },
    });

    application["meta-data"] = withoutOld;
    return config;
  });
};
