#!/usr/bin/env node
/**
 * Generates app icons for iOS and Android from the SVG source.
 * Uses sharp (already a dev dependency) to rasterize.
 *
 * Usage: node scripts/generate-app-icons.mjs
 */

import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";

const SVG_PATH = "public/icon.svg";
const BG_COLOR = { r: 15, g: 23, b: 42, alpha: 1 }; // #0f172a (slate-900)

const IOS_SIZES = [20, 29, 40, 60, 76, 83.5, 1024];
const IOS_SCALES = {
  20: [2, 3],
  29: [2, 3],
  40: [2, 3],
  60: [2, 3],
  76: [1, 2],
  "83.5": [2],
  1024: [1],
};

const ANDROID_SIZES = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

async function generateIcon(size, outputPath) {
  const px = Math.round(size);
  mkdirSync(dirname(outputPath), { recursive: true });
  await sharp(SVG_PATH)
    .resize(px, px, { fit: "contain", background: BG_COLOR })
    .flatten({ background: BG_COLOR })
    .png()
    .toFile(outputPath);
  console.log(`  ${outputPath} (${px}x${px})`);
}

async function main() {
  console.log("Generating iOS icons...");
  const iosDir = "ios/App/App/Assets.xcassets/AppIcon.appiconset";
  const iosImages = [];

  for (const baseSize of IOS_SIZES) {
    const scales = IOS_SCALES[baseSize] || [1];
    for (const scale of scales) {
      const px = Math.round(baseSize * scale);
      const filename = `icon-${px}.png`;
      await generateIcon(px, join(iosDir, filename));
      iosImages.push({
        size: `${baseSize}x${baseSize}`,
        idiom: baseSize === 1024 ? "ios-marketing" : "iphone",
        filename,
        scale: `${scale}x`,
      });
      if (baseSize === 76 || baseSize === 83.5) {
        iosImages[iosImages.length - 1].idiom = "ipad";
      }
    }
  }

  const contentsJson = {
    images: iosImages,
    info: { version: 1, author: "trefolio-generate-icons" },
  };
  writeFileSync(
    join(iosDir, "Contents.json"),
    JSON.stringify(contentsJson, null, 2)
  );

  console.log("\nGenerating Android icons...");
  for (const [density, size] of Object.entries(ANDROID_SIZES)) {
    const dir = `android/app/src/main/res/mipmap-${density}`;
    await generateIcon(size, join(dir, "ic_launcher.png"));
    await generateIcon(Math.round(size * 1.5), join(dir, "ic_launcher_foreground.png"));
    await generateIcon(size, join(dir, "ic_launcher_round.png"));
  }

  console.log("\nGenerating web icons (public/icons/)...");
  const webIcons = [
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
    { name: "icon-maskable-192.png", size: 192 },
    { name: "icon-maskable-512.png", size: 512 },
  ];
  mkdirSync("public/icons", { recursive: true });
  for (const { name, size } of webIcons) {
    await generateIcon(size, join("public/icons", name));
  }

  console.log("\nDone!");
}

main().catch(console.error);
