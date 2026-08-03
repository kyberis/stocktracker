/**
 * Append any keys present in en.ts but missing from other *full* locale files,
 * using English strings as placeholders.
 *
 * Locales that `...en` spread inherit new keys automatically — skip them.
 * Parses key lines from source text (avoids ESM default-interop pitfalls).
 */
import fs from "fs";
import path from "path";

const FULL_LOCALES = ["es", "fr", "de", "it", "pt", "nl"] as const;

function extractKeys(src: string): Map<string, string> {
  const map = new Map<string, string>();
  const re =
    /^  ([a-zA-Z][a-zA-Z0-9_]*):\s*((?:`(?:\\`|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')),?\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    map.set(m[1], m[2]);
  }
  return map;
}

function main() {
  const enPath = path.join("src/locales", "en.ts");
  const enSrc = fs.readFileSync(enPath, "utf8");
  const enMap = extractKeys(enSrc);
  if (enMap.size < 1000) {
    throw new Error(`en.ts parse failed — only ${enMap.size} keys`);
  }

  for (const code of FULL_LOCALES) {
    const file = path.join("src/locales", `${code}.ts`);
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    if (src.includes("...en")) {
      console.log(code, "skip (spreads en)");
      continue;
    }
    const locMap = extractKeys(src);
    const missing = [...enMap.keys()].filter((k) => !locMap.has(k));
    if (missing.length === 0) {
      console.log(code, "ok");
      continue;
    }
    console.log(code, "missing", missing.length);
    const blocks = missing.map((k) => `  ${k}: ${enMap.get(k)!},`);
    const idx = src.lastIndexOf("\n};");
    if (idx < 0) throw new Error("no end " + code);
    const next = src.slice(0, idx) + "\n" + blocks.join("\n") + src.slice(idx);
    fs.writeFileSync(file, next);
  }
}

main();
