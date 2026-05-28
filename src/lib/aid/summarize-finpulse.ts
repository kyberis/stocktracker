import { fetchGatewayChatCompletions, resolveGatewayApiKey } from "@/lib/ai/gateway";
import type { AidFinPulseSummary, AidNewsImpact } from "@/lib/types";

const IMPACT_VALUES = new Set<AidNewsImpact>(["high", "medium", "low"]);

function parseSummaryJson(raw: string): AidFinPulseSummary | null {
  try {
    const parsed = JSON.parse(raw) as AidFinPulseSummary;
    if (!parsed?.headline || !Array.isArray(parsed.bullets)) return null;
    const impact = IMPACT_VALUES.has(parsed.impact) ? parsed.impact : "medium";
    return {
      headline: String(parsed.headline).slice(0, 240),
      bullets: parsed.bullets.map((b) => String(b).slice(0, 280)).slice(0, 3),
      impact,
    };
  } catch {
    return null;
  }
}

export async function summarizeFinPulsePost(args: {
  handle: string;
  title: string;
  excerpt: string;
  sourceUrl: string;
  language: string;
  portfolioTickers?: string[];
}): Promise<AidFinPulseSummary | null> {
  const gatewayConfigured = await resolveGatewayApiKey();
  if (!gatewayConfigured) {
    return {
      headline: args.title.slice(0, 240),
      bullets: [args.excerpt.slice(0, 280) || "Summary unavailable."],
      impact: "medium",
    };
  }

  const portfolioBlock =
    args.portfolioTickers && args.portfolioTickers.length > 0
      ? `\nUser portfolio tickers (for relevance only): ${args.portfolioTickers.join(", ")}`
      : "";

  const system = `You summarize influential X (Twitter) posts for retail investors scanning a portfolio dashboard.
Write in ${args.language}.
Return ONLY valid JSON with keys: headline (string), bullets (array of 2-3 short strings), impact ("high"|"medium"|"low").
Rules: neutral tone, no buy/sell advice, no invented numbers, attribute uncertainty, base content only on provided text.${portfolioBlock}`;

  const user = `Handle: ${args.handle}
Title: ${args.title}
Source: ${args.sourceUrl}
Excerpt:
${args.excerpt || "(none)"}`;

  try {
    const openaiRes = await fetchGatewayChatCompletions({
      model: "openai/gpt-4o-mini",
      stream: false,
      max_tokens: 400,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });
    if (!openaiRes.ok) return null;
    const result = (await openaiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = result.choices?.[0]?.message?.content ?? "";
    if (!content) return null;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return parseSummaryJson(jsonMatch[0]);
  } catch {
    return null;
  }
}

export async function summarizeAidBriefing(args: {
  language: string;
  contextLines: string[];
}): Promise<string | null> {
  const gatewayConfigured = await resolveGatewayApiKey();
  if (!gatewayConfigured || args.contextLines.length === 0) return null;

  const system = `Write one sentence (max 220 chars) morning briefing for a portfolio dashboard.
Write in ${args.language}. Neutral tone, no buy/sell advice.`;

  const user = args.contextLines.join("\n");

  try {
    const openaiRes = await fetchGatewayChatCompletions({
      model: "openai/gpt-4o-mini",
      stream: false,
      max_tokens: 120,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    if (!openaiRes.ok) return null;
    const result = (await openaiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = (result.choices?.[0]?.message?.content ?? "").trim();
    return text ? text.slice(0, 220) : null;
  } catch {
    return null;
  }
}

export function extractTickersFromText(text: string, knownTickers: string[]): string[] {
  const upper = text.toUpperCase();
  const found = new Set<string>();
  for (const t of knownTickers) {
    const sym = t.toUpperCase();
    if (sym.length < 2) continue;
    const re = new RegExp(`\\b${sym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (re.test(upper)) found.add(sym);
  }
  return [...found].slice(0, 8);
}
