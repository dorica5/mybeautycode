const { withAppBuildGradle } = require("@expo/config-plugins");

/**
 * Removes any `enableBundleCompression = ...` line from android/app/build.gradle
 */
module.exports = function withRemoveEnableBundleCompression(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes("enableBundleCompression")) {
      config.modResults.contents = config.modResults.contents.replace(
        /enableBundleCompression\s*=\s*.*\n/g,
        ""
      );
      console.log("✅ Removed enableBundleCompression from app/build.gradle");
    }
    return config;
  });
};
