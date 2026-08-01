/**
 * Regenerates assets/images/splash.png for Expo's native splash.
 * Square canvas so Android `contain` does not shrink the logo inside a tall phone frame.
 */
const path = require("path");
const sharp = require("sharp");

const PRIMARY_GREEN = { r: 178, g: 220, b: 197, alpha: 1 }; // #B2DCC5

/** Square — logo fills ~58% so native splash `imageWidth` reads large on device. */
const SIZE = 1284;
const LOGO_FRACTION = 0.58;

async function main() {
  const root = path.join(__dirname, "..");
  const svgPath = path.join(root, "assets/appstore.svg");
  const outPath = path.join(root, "assets/images/splash.png");

  const logoWidth = Math.round(SIZE * LOGO_FRACTION);
  const logoBuf = await sharp(svgPath)
    .resize({ width: logoWidth, height: logoWidth, fit: "contain" })
    .png()
    .toBuffer();

  const meta = await sharp(logoBuf).metadata();
  const lw = meta.width ?? logoWidth;
  const lh = meta.height ?? logoWidth;
  const left = Math.round((SIZE - lw) / 2);
  const top = Math.round((SIZE - lh) / 2);

  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
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
