/**
 * Generates all native image assets required for EAS prebuild.
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

execSync("node scripts/generate-app-icons.js", { cwd: root, stdio: "inherit" });
execSync("node scripts/generate-splash.js", { cwd: root, stdio: "inherit" });
