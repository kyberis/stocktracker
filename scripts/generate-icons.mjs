import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const svg = readFileSync(resolve(root, "public/icon.svg"));

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-maskable-192.png", size: 192, padding: 48 },
  { name: "icon-maskable-512.png", size: 512, padding: 128 },
];

for (const { name, size, padding } of sizes) {
  if (padding) {
    const inner = size - padding * 2;
    const buf = await sharp(svg).resize(inner, inner).png().toBuffer();
    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 15, g: 23, b: 42, alpha: 1 } },
    })
      .composite([{ input: buf, gravity: "centre" }])
      .png()
      .toFile(resolve(root, "public/icons", name));
  } else {
    await sharp(svg).resize(size, size).png().toFile(resolve(root, "public/icons", name));
  }
  console.log(`Generated ${name} (${size}x${size})`);
}

// Also generate a proper favicon.ico (48x48 PNG works as favicon)
await sharp(svg).resize(48, 48).png().toFile(resolve(root, "public/favicon.png"));
console.log("Generated favicon.png (48x48)");
