import { fetchGatewayChatCompletions, resolveGatewayApiKey } from "@/lib/ai/gateway";
import type { AidDigestSummary, AidNewsImpact, AidNewsFilterTag } from "@/lib/types";

const IMPACT_VALUES = new Set<AidNewsImpact>(["high", "medium", "low"]);
const FILTER_TAGS = new Set<AidNewsFilterTag>(["earnings", "move", "news"]);

function parseSummaryJson(raw: string): AidDigestSummary | null {
  try {
    const parsed = JSON.parse(raw) as AidDigestSummary;
    if (!parsed?.headline || !Array.isArray(parsed.bullets)) return null;
    const impact = IMPACT_VALUES.has(parsed.impact) ? parsed.impact : "medium";
    const filterTags = Array.isArray(parsed.filterTags)
      ? parsed.filterTags.filter((t): t is AidNewsFilterTag => FILTER_TAGS.has(t as AidNewsFilterTag))
      : (["news"] as AidNewsFilterTag[]);
    return {
      headline: String(parsed.headline).slice(0, 240),
      bullets: parsed.bullets.map((b) => String(b).slice(0, 280)).slice(0, 3),
      impact,
      filterTags,
    };
  } catch {
    return null;
  }
}

export async function summarizeAidDigestItem(args: {
  ticker: string;
  title: string;
  excerpt: string;
  source?: string;
  publishedAt?: string;
  language: string;
  kind: "news" | "earnings";
  webSnippets?: string[];
}): Promise<AidDigestSummary | null> {
  const gatewayConfigured = await resolveGatewayApiKey();
  if (!gatewayConfigured) return fallbackSummary(args);

  const webBlock =
    args.webSnippets && args.webSnippets.length > 0
      ? `\n\nWeb search snippets (third-party; may be incomplete):\n${args.webSnippets.join("\n---\n")}`
      : "";

  const system = `You produce scannable portfolio news digests for retail investors.
Write in ${args.language}.
Return ONLY valid JSON with keys: headline (string), bullets (array of 2-3 short strings), impact ("high"|"medium"|"low"), filterTags (array containing any of: "news", "earnings", "move").
Rules: neutral tone, no buy/sell advice, no invented numbers, base content only on provided text.${args.kind === "earnings" ? ' Set filterTags to include "earnings".' : ""}`;

  const user = `Ticker: ${args.ticker}
Title: ${args.title}
Source: ${args.source ?? "unknown"}
Date: ${args.publishedAt ?? "unknown"}
Excerpt:
${args.excerpt || "(none)"}${webBlock}`;

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

    if (!openaiRes.ok) return fallbackSummary(args);

    const result = (await openaiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = result.choices?.[0]?.message?.content;
    if (!content) return fallbackSummary(args);
    return parseSummaryJson(content) ?? fallbackSummary(args);
  } catch {
    return fallbackSummary(args);
  }
}

function fallbackSummary(args: {
  ticker: string;
  title: string;
  excerpt: string;
  kind: "news" | "earnings";
}): AidDigestSummary {
  const snippet = (args.excerpt || args.title).trim();
  const bullets: string[] = [];
  if (snippet) bullets.push(snippet.slice(0, 200));
  bullets.push("AI summary unavailable — showing feed excerpt only.");
  return {
    headline: args.title.slice(0, 240) || `${args.ticker} update`,
    bullets: bullets.slice(0, 3),
    impact: "medium",
    filterTags: args.kind === "earnings" ? ["earnings", "news"] : ["news"],
  };
}
