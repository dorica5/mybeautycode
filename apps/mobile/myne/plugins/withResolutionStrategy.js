// plugins/withResolutionStrategy.js
const { withProjectBuildGradle } = require("@expo/config-plugins");

module.exports = function withResolutionStrategy(config) {
  return withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes("resolutionStrategy")) {
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*{[\s\S]*?repositories\s*{/,
        (match) =>
          `${match}
        configurations.all {
          resolutionStrategy {
            force "org.jetbrains.kotlin:kotlin-compose-compiler-plugin-embeddable:1.6.10"
          }
        }`
      );
    }
    return config;
  });
};
