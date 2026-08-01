/**
 * Regenerates native app icon PNGs from the SVG logo sources.
 * Expo/EAS require PNG for icon, adaptiveIcon, and notification plugin config.
 *
 * Android adaptive icons mask the foreground — keep the logo in the center ~58%
 * safe zone so the launcher icon is not cropped/zoomed.
 */
const path = require("path");
const sharp = require("sharp");

const ICON_SIZE = 1024;
const NOTIFICATION_SIZE = 96;
/** ~66% safe zone on 108dp canvas; slightly smaller avoids circle/squircle clip. */
const ADAPTIVE_LOGO_RATIO = 0.58;

async function writePng(svgPath, outPath, size) {
  await sharp(svgPath)
    .resize({
      width: size,
      height: size,
      fit: "contain",
      background: { r: 178, g: 220, b: 197, alpha: 1 },
    })
    .png()
    .toFile(outPath);
  console.log("Wrote", outPath);
}

async function writeAdaptiveForeground(svgPath, outPath, canvasSize) {
  const logoSize = Math.round(canvasSize * ADAPTIVE_LOGO_RATIO);
  const logoBuf = await sharp(svgPath)
    .resize({
      width: logoSize,
      height: logoSize,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const left = Math.round((canvasSize - logoSize) / 2);
  const top = Math.round((canvasSize - logoSize) / 2);

  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logoBuf, top, left }])
    .png()
    .toFile(outPath);

  console.log("Wrote", outPath);
}

async function main() {
  const root = path.join(__dirname, "..");
  const assets = path.join(root, "assets");
  const appstoreSvg = path.join(assets, "appstore.svg");
  const androidSvg = path.join(assets, "android_icon.svg");

  await writePng(appstoreSvg, path.join(assets, "appstore.png"), ICON_SIZE);

  await writePng(androidSvg, path.join(assets, "android_icon.png"), ICON_SIZE);

  await writeAdaptiveForeground(
    appstoreSvg,
    path.join(assets, "android_adaptive_foreground.png"),
    ICON_SIZE
  );

  await writePng(androidSvg, path.join(assets, "notification-icon.png"), NOTIFICATION_SIZE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
