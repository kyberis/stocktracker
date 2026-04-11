/**
 * Compares OpenAI chat usage with vs without the token-efficiency rule text injected
 * into the system message. Loads STOCKTRACKER_OPENAI_API_KEY from .env.local if unset.
 *
 * Usage: node scripts/compare-token-rule-prompt.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
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

function stripFrontmatter(raw) {
  return raw.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");
}

const BASE_SYSTEM =
  "You are a helpful senior engineer helping with a Next.js (App Router) + TypeScript codebase.";

const EXAMPLE_USER_PROMPT = `Onboarding question for a new hire:

Explain how PortfolioProvider "demo mode" works in this app: what API calls or side effects are skipped, where initial data comes from, and three concrete pitfalls to avoid when editing the dashboard or the /demo page.

Answer in plain prose. Do not include code blocks. Aim to be accurate and complete.`;

const MODEL = "gpt-4o-mini";

async function chat(system, user) {
  const apiKey = process.env.STOCKTRACKER_OPENAI_API_KEY ?? "";
  if (!apiKey) {
    throw new Error("Missing STOCKTRACKER_OPENAI_API_KEY (set in env or .env.local)");
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${err.slice(0, 500)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const u = data.usage ?? {};
  return {
    text,
    promptTokens: u.prompt_tokens ?? 0,
    completionTokens: u.completion_tokens ?? 0,
    totalTokens: u.total_tokens ?? 0,
  };
}

function stats(text) {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return { chars, words };
}

async function main() {
  loadEnvLocal();

  const rulePath = resolve(process.cwd(), ".cursor/rules/token-efficiency.mdc");
  const ruleBody = stripFrontmatter(readFileSync(rulePath, "utf8")).trim();

  console.log("=== Example user prompt ===\n");
  console.log(EXAMPLE_USER_PROMPT);
  console.log("\n=== Running OpenAI (same model, same user message) ===\n");

  const without = await chat(BASE_SYSTEM, EXAMPLE_USER_PROMPT);
  const withRule = await chat(
    `${BASE_SYSTEM}\n\nFollow these additional instructions:\n\n${ruleBody}`,
    EXAMPLE_USER_PROMPT
  );

  const s1 = stats(without.text);
  const s2 = stats(withRule.text);

  console.log(`Model: ${MODEL}\n`);
  console.log("| Metric | Without rule | With token-efficiency rule | Delta |");
  console.log("|--------|--------------|---------------------------|-------|");
  console.log(
    `| Prompt tokens | ${without.promptTokens} | ${withRule.promptTokens} | ${withRule.promptTokens - without.promptTokens >= 0 ? "+" : ""}${withRule.promptTokens - without.promptTokens} |`
  );
  console.log(
    `| Completion tokens | ${without.completionTokens} | ${withRule.completionTokens} | ${withRule.completionTokens - without.completionTokens >= 0 ? "+" : ""}${withRule.completionTokens - without.completionTokens} |`
  );
  console.log(
    `| Total tokens | ${without.totalTokens} | ${withRule.totalTokens} | ${withRule.totalTokens - without.totalTokens >= 0 ? "+" : ""}${withRule.totalTokens - without.totalTokens} |`
  );
  console.log(
    `| Reply characters | ${s1.chars} | ${s2.chars} | ${s2.chars - s1.chars >= 0 ? "+" : ""}${s2.chars - s1.chars} |`
  );
  console.log(
    `| Reply words | ${s1.words} | ${s2.words} | ${s2.words - s1.words >= 0 ? "+" : ""}${s2.words - s1.words} |`
  );

  console.log("\n--- Reply WITHOUT extra rule (first ~1200 chars) ---\n");
  console.log(without.text.slice(0, 1200) + (without.text.length > 1200 ? "\n…" : ""));
  console.log("\n--- Reply WITH token-efficiency rule (first ~1200 chars) ---\n");
  console.log(withRule.text.slice(0, 1200) + (withRule.text.length > 1200 ? "\n…" : ""));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
