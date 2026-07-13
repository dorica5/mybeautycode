/**
 * Regenerates assets/images/splash.png for Expo's native splash.
 * Source: assets/android_icon.svg (same as the app icon).
 */
const path = require("path");
const sharp = require("sharp");

const PRIMARY_GREEN = { r: 178, g: 220, b: 197, alpha: 1 }; // #B2DCC5

const W = 1284;
const H = 2778;

async function main() {
  const root = path.join(__dirname, "..");
  const svgPath = path.join(root, "assets/android_icon.svg");
  const outPath = path.join(root, "assets/images/splash.png");

  const logoWidth = Math.round(W * 0.42);
  const logoBuf = await sharp(svgPath)
    .resize({ width: logoWidth, height: logoWidth, fit: "contain" })
    .png()
    .toBuffer();

  const meta = await sharp(logoBuf).metadata();
  const lw = meta.width ?? logoWidth;
  const lh = meta.height ?? logoWidth;
  const left = Math.round((W - lw) / 2);
  const top = Math.round((H - lh) / 2);

  await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: PRIMARY_GREEN,
    },
  })
    .composite([{ input: logoBuf, top, left }])
    .png()
    .toFile(outPath);

  console.log("Wrote", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
