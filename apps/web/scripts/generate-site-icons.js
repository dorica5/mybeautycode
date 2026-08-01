/**
 * Generates favicon, Apple touch, and PWA icons from the mobile app mark (no wordmark).
 * Source of truth: apps/mobile/myne/assets/android_icon.svg
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SOURCE_SVG = path.join(
  __dirname,
  "../../mobile/myne/assets/android_icon.svg"
);

async function writePng(size, outPath) {
  await sharp(SOURCE_SVG)
    .resize({
      width: size,
      height: size,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outPath);
  console.log("Wrote", outPath);
}

async function main() {
  const root = path.join(__dirname, "..");
  const appDir = path.join(root, "src/app");
  const iconsDir = path.join(root, "public/icons");

  fs.mkdirSync(iconsDir, { recursive: true });

  fs.copyFileSync(SOURCE_SVG, path.join(appDir, "icon.svg"));

  await writePng(180, path.join(appDir, "apple-icon.png"));
  await writePng(32, path.join(iconsDir, "favicon-32x32.png"));
  await writePng(16, path.join(iconsDir, "favicon-16x16.png"));
  await writePng(192, path.join(iconsDir, "icon-192.png"));
  await writePng(512, path.join(iconsDir, "icon-512.png"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
