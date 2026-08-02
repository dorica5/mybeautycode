/**
 * Generates favicon, Apple touch, and PWA icons from the mark-only SVG
 * (no wordmark). Source: public/images/myne-mark.svg
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SOURCE_SVG = path.join(__dirname, "../public/images/myne-mark.svg");
const BRAND_GREEN = { r: 0xb2, g: 0xdc, b: 0xc5, alpha: 1 };

async function writePng(size, outPath, { background } = {}) {
  const pipeline = sharp(SOURCE_SVG).resize({
    width: size,
    height: size,
    fit: "contain",
    background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
  });

  if (background) {
    await pipeline
      .flatten({ background })
      .png()
      .toFile(outPath);
  } else {
    await pipeline.png().toFile(outPath);
  }
  console.log("Wrote", outPath);
}

async function main() {
  const root = path.join(__dirname, "..");
  const appDir = path.join(root, "src/app");
  const iconsDir = path.join(root, "public/icons");

  fs.mkdirSync(iconsDir, { recursive: true });

  // Next.js file-based metadata icons (tab + iOS home screen / bookmarks)
  fs.copyFileSync(SOURCE_SVG, path.join(appDir, "icon.svg"));
  await writePng(180, path.join(appDir, "apple-icon.png"), {
    background: BRAND_GREEN,
  });

  // Explicit PNGs for older browsers + PWA / Android home screen
  await writePng(32, path.join(iconsDir, "favicon-32x32.png"));
  await writePng(16, path.join(iconsDir, "favicon-16x16.png"));
  await writePng(192, path.join(iconsDir, "icon-192.png"), {
    background: BRAND_GREEN,
  });
  await writePng(512, path.join(iconsDir, "icon-512.png"), {
    background: BRAND_GREEN,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
