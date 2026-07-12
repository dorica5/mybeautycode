/**
 * Regenerates native app icon PNGs from the SVG logo sources.
 * Expo/EAS require PNG for icon, adaptiveIcon, and notification plugin config.
 */
const path = require("path");
const sharp = require("sharp");

const ICON_SIZE = 1024;
const NOTIFICATION_SIZE = 96;

async function writePng(svgPath, outPath, size) {
  await sharp(svgPath)
    .resize({ width: size, height: size, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
  console.log("Wrote", outPath);
}

async function main() {
  const root = path.join(__dirname, "..");
  const assets = path.join(root, "assets");

  await writePng(
    path.join(assets, "appstore.svg"),
    path.join(assets, "appstore.png"),
    ICON_SIZE
  );

  await writePng(
    path.join(assets, "android_icon.svg"),
    path.join(assets, "android_icon.png"),
    ICON_SIZE
  );

  await writePng(
    path.join(assets, "android_icon.svg"),
    path.join(assets, "notification-icon.png"),
    NOTIFICATION_SIZE
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
