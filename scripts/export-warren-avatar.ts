/**
 * Render `public/avatars/warren.svg` to a square PNG suitable for Telegram
 * BotFather (`/setuserpic`). BotFather requires JPG/PNG, square, max 1280×1280.
 *
 * Usage: `npx tsx scripts/export-warren-avatar.ts`
 *
 * Output: `public/avatars/warren-512.png`
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const SVG_PATH = path.join(process.cwd(), "public", "avatars", "warren.svg");
const PNG_PATH = path.join(process.cwd(), "public", "avatars", "warren-512.png");
const SIZE = 512;

async function main() {
  const svg = await readFile(SVG_PATH);
  const png = await sharp(svg, { density: 384 })
    .resize(SIZE, SIZE, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(PNG_PATH, png);
  console.log(`Wrote ${PNG_PATH} (${png.byteLength} bytes)`);
  console.log(
    "Upload to BotFather: /setuserpic → choose this file, then verify with @BotFather /mybots.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
