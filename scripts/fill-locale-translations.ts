/**
 * Fills UI strings that still match English for de, fr, pt (European Portuguese), nl.
 * Requires AI_GATEWAY_API_KEY or STOCKTRACKER_OPENAI_API_KEY (loads .env.local if present).
 *
 * Usage from repo root: npx tsx scripts/fill-locale-translations.ts
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import type { TranslationStrings } from "../src/locales/types";
import en from "../src/locales/en";
import de from "../src/locales/de";
import fr from "../src/locales/fr";
import pt from "../src/locales/pt";
import nl from "../src/locales/nl";
import { toGatewayModelId, VERCEL_AI_GATEWAY_BASE } from "../src/lib/ai/gateway";

function loadEnvLocal(): void {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const LANG: Record<string, { file: string; label: string; importObj: TranslationStrings }> = {
  de: { file: "de", label: "German (Germany) — formal Sie-form for UI", importObj: de },
  fr: { file: "fr", label: "French (France)", importObj: fr },
  pt: { file: "pt", label: "European Portuguese (Portugal)", importObj: pt },
  nl: { file: "nl", label: "Dutch (Netherlands)", importObj: nl },
};

const MODEL = "gpt-4o-mini";
const BATCH = 55;
const CACHE_DIR = resolve(process.cwd(), "scripts", ".locale-fill-cache");

async function callOpenAI(
  apiKey: string,
  system: string,
  user: string,
): Promise<{ content: string; tokensUsed: number }> {
  const res = await fetch(`${VERCEL_AI_GATEWAY_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: toGatewayModelId(MODEL),
      max_tokens: 16000,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI Gateway error (${res.status}): ${text.slice(0, 800)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { total_tokens?: number };
  };
  return {
    content: data.choices?.[0]?.message?.content ?? "{}",
    tokensUsed: data.usage?.total_tokens ?? 0,
  };
}

function gapKeys(
  merged: TranslationStrings,
): { keys: string[]; subset: Record<string, string> } {
  const keys: string[] = [];
  const subset: Record<string, string> = {};
  for (const k of Object.keys(en) as (keyof typeof en)[]) {
    const key = k as string;
    if (merged[key] === en[key]) {
      keys.push(key);
      subset[key] = en[key];
    }
  }
  return { keys, subset };
}

function serializeLocale(code: string, data: TranslationStrings): string {
  const order = Object.keys(en) as (keyof typeof en)[];
  const lines = order.map((key) => {
    const k = key as string;
    const v = data[k];
    if (v === undefined) throw new Error(`Missing key ${k} for ${code}`);
    return `  ${k}: ${JSON.stringify(v)},`;
  });
  return `import type { TranslationStrings } from "./types";

const ${code}: TranslationStrings = {
${lines.join("\n")}
};

export default ${code};
`;
}

async function translateLanguage(
  apiKey: string,
  code: string,
  label: string,
  merged: TranslationStrings,
): Promise<TranslationStrings> {
  const { keys, subset } = gapKeys(merged);
  console.log(`\n${code}: ${keys.length} keys still identical to English`);

  if (keys.length === 0) {
    return { ...merged };
  }

  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = resolve(CACHE_DIR, `${code}-gaps.json`);
  let translated: Record<string, string> = {};
  if (existsSync(cachePath)) {
    try {
      translated = JSON.parse(readFileSync(cachePath, "utf8")) as Record<string, string>;
      console.log(`  Loaded ${Object.keys(translated).length} cached translations`);
    } catch {
      translated = {};
    }
  }

  const pending = keys.filter((k) => translated[k] === undefined);
  console.log(`  ${pending.length} keys to translate (cached ${keys.length - pending.length})`);

  const system = `You are a professional software UI translator. Return ONLY valid JSON: an object whose keys are the input keys and values are ${label} translations.
Rules:
- Preserve placeholders exactly: {value}, {market}, {time}, {name}, {ticker}, {plan}, {count}, {limit}, {tier}, {broker}, {email}, {symbol}, {hours}, {minutes}, {seconds}, {date}, {year}, {month}, {label}, {error}, {url}, {title}, {body}, {field}, {min}, {max}, {n}, {pct}, {from}, {to}, {start}, {end}, {open}, {close}, {high}, {low}, {change}, {currency}, {code}, {provider}, {status}, {id}, {type}, {segment}, {ratio}, {amount}, {price}, {shares}, {return}, {gain}, {loss}, {dividend}, {yield}, {pe}, {eps}, {beta}, {sector}, {region}, {asset}, {weight}, {target}, {current}, {delta}, etc. Use the same brace names.
- Keep product name "trefolio" and "Bifolio" unchanged. Keep ticker symbols (e.g. AAPL, BTC, EUR/USD, S&P 500) and units as in source when they are proper nouns or symbols.
- Do not add explanations; only JSON.`;

  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH);
    let toFetch: Record<string, string> = {};
    for (const k of slice) {
      toFetch[k] = subset[k];
    }

    for (let attempt = 0; attempt < 4; attempt++) {
      const user = `Translate these UI strings to ${label}.\nInput JSON:\n${JSON.stringify(toFetch)}`;
      try {
        const { content } = await callOpenAI(apiKey, system, user);
        const parsed = JSON.parse(content) as Record<string, string>;
        for (const k of Object.keys(toFetch)) {
          if (typeof parsed[k] === "string" && parsed[k].length > 0) {
            translated[k] = parsed[k];
          }
        }
        const missing = Object.keys(toFetch).filter((k) => !translated[k]);
        if (missing.length === 0) break;
        if (attempt === 3) {
          throw new Error(
            `Batch starting ${i}: still missing ${missing.length} keys (e.g. ${missing[0]})`,
          );
        }
        toFetch = Object.fromEntries(missing.map((k) => [k, subset[k]]));
        console.warn(`  Retry ${missing.length} missing keys in batch...`);
        await new Promise((r) => setTimeout(r, 1200));
      } catch (e) {
        if (attempt === 3) throw e;
        console.error(`  API error (attempt ${attempt + 1}):`, e);
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }

    writeFileSync(cachePath, JSON.stringify(translated, null, 0), "utf8");
    console.log(`  Progress: ${Math.min(i + BATCH, pending.length)}/${pending.length}`);
    await new Promise((r) => setTimeout(r, 350));
  }

  const out: TranslationStrings = { ...merged };
  for (const k of keys) {
    const t = translated[k];
    if (t !== undefined) out[k] = t;
    else out[k] = en[k as keyof typeof en];
  }

  const stillEn = Object.keys(en).filter((k) => out[k] === en[k]);
  if (stillEn.length > 0) {
    console.warn(`  ${code}: WARNING ${stillEn.length} keys still match English (first 10):`, stillEn.slice(0, 10));
  }

  return out;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const apiKey =
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_OIDC_TOKEN?.trim() ||
    process.env.STOCKTRACKER_OPENAI_API_KEY?.trim() ||
    "";
  if (!apiKey) {
    console.error("Set AI_GATEWAY_API_KEY or STOCKTRACKER_OPENAI_API_KEY (or add to .env.local)");
    process.exit(1);
  }

  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg?.slice("--only=".length).split(",").map((s) => s.trim()).filter(Boolean);
  const allTargets = ["de", "fr", "pt", "nl"] as const;
  const targets = (only?.length ? only : [...allTargets]) as typeof allTargets[number][];
  for (const t of targets) {
    if (!allTargets.includes(t as (typeof allTargets)[number])) {
      console.error(`Unknown locale: ${t}. Use: de, fr, pt, nl`);
      process.exit(1);
    }
  }

  for (const code of targets) {
    const meta = LANG[code];
    const merged = await translateLanguage(apiKey, code, meta.label, meta.importObj);
    const path = resolve(process.cwd(), "src", "locales", `${code}.ts`);
    writeFileSync(path, serializeLocale(meta.file, merged), "utf8");
    console.log(`Wrote ${path}`);
  }

  console.log("\nDone. Run: npm run typecheck && npx vitest run src/locales/__tests__/locale-parity.test.ts");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
