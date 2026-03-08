#!/usr/bin/env node
/**
 * Adds import page i18n keys (English fallback) to all locale files except en.ts, es.ts, index.ts, types.ts.
 * Inserts before the line containing "  simpleCsvTitle:".
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, "../src/locales");

const KEYS_TO_INSERT = `  importNav: "Import",
  importPageTitle: "Import Your Portfolio",
  importPageSubtitle: "All import methods in one place. Choose your broker, upload, review, and import.",
  importSectionBrokerCsv: "Broker CSV",
  importSectionBrokerApi: "Broker API",
  importSectionAi: "AI Import",
  importSectionManual: "Manual Add",
  importToolsRedirect: "Looking for import? It moved to its own page.",
  importGoToPage: "Go to Import",
`;

const SKIP_FILES = new Set(["en.ts", "es.ts", "index.ts", "types.ts"]);
const ANCHOR = "  simpleCsvTitle:";

const files = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".ts") && !SKIP_FILES.has(f));

let updated = 0;
let skipped = 0;

for (const file of files) {
  const filePath = path.join(LOCALES_DIR, file);
  let content = fs.readFileSync(filePath, "utf8");

  if (content.includes("importNav:")) {
    console.log(`Skip ${file}: importNav already exists`);
    skipped++;
    continue;
  }

  if (!content.includes(ANCHOR)) {
    console.error(`Error ${file}: anchor "${ANCHOR}" not found`);
    process.exit(1);
  }

  content = content.replace(ANCHOR, KEYS_TO_INSERT + ANCHOR);
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
  updated++;
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
