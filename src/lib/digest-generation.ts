import { fetchGatewayChatCompletions } from "@/lib/ai/gateway";
import { getAiModelForFlow } from "@/lib/db/settings";
import { getActiveUserLanguages } from "@/lib/db";
import { YahooProvider } from "@/lib/api-providers/yahoo";

const REWRITE_SYSTEM_PROMPT = `You are trefolio's market analyst. Given raw source material from **one or more** financial newsletters (and optionally live market data), produce an **original market insight article** in trefolio's editorial voice.

CRITICAL RULES:
- Do NOT summarize or paraphrase the sources. Extract the underlying market intelligence and write a completely fresh piece.
- **Synthesize information from all sources into a single cohesive article.** Do not treat each source separately or refer to them by number.
- Use your own structure, headings, framing, and editorial angle.
- Reorder information by importance to retail investors. Add context where helpful.
- The output must read as if trefolio's editorial team wrote it independently — no references to any source newsletter.
- Never mention the source, the sender, or that this content is derived from another publication.
- **When a source references a relevant news article or webpage via a link, include that link inline using markdown format** \`[descriptive text](url)\`. Prefer links provided in the source material over generic references. Only include links that add value — skip generic homepage links.

Return a JSON object with these fields:
- "title": a compelling headline (max 80 chars)
- "market_overview": 1-2 short paragraphs giving a high-level view of how the market has performed over the last 7 days. Reference the index data provided (S&P 500, Gold, Oil, BTC) with actual numbers.
- "summary": 2-3 paragraphs of original analysis covering the main themes. Include relevant markdown links from the source material where appropriate.
- "key_points": array of up to 8 bullet points. Each bullet MUST be data-first and scannable:
  - Lead with the ticker/asset and direction: e.g. "AAPL ▲ — iPhone demand drove Apple to new highs; analysts raised targets to $220"
  - Keep each bullet to 1-2 sentences max
  - Front-load the actionable data, explanations come after
  - Include relevant markdown links where a source referenced a specific news story
- "mentioned_tickers": array of stock ticker symbols mentioned (uppercase, e.g. ["AAPL", "MSFT"]). Only include real tradeable ticker symbols, not index names.
- "sectors": array of relevant market sectors (e.g. ["Technology", "Healthcare"])
- "sentiment": one of "bullish", "bearish", or "neutral"`;

const TRANSLATE_SYSTEM_PROMPT = `You are a professional financial translator for trefolio.
Translate the provided market insight content into the requested languages.
Maintain the same editorial quality, financial terminology, and tone.
Preserve all markdown links [text](url) exactly as-is — do not translate URLs.
Return a JSON object where each key is a language code and the value is an object with "title", "summary", and "key_points" (array of strings).`;

const MARKET_INDICES = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "GC=F", label: "Gold" },
  { symbol: "CL=F", label: "Oil (WTI)" },
];

interface TickerSnapshot {
  symbol: string;
  price: number;
  currency: string;
  change7d: number | null;
  change7dPercent: number | null;
}

export interface DigestSourceInput {
  sender: string;
  textBody: string;
  htmlBody: string;
  extractedLinks: { url: string; text: string }[];
}

export interface DigestGenerationResult {
  rewrite: {
    title: string;
    market_overview: string;
    summary: string;
    key_points: string[];
    mentioned_tickers: string[];
    sectors: string[];
    sentiment: string;
  };
  totalTokens: number;
  translations: { language: string; title: string; summary: string; keyPoints: string[] }[];
}

async function callOpenAI(
  system: string,
  user: string,
  maxTokens = 3000,
  modelOverride?: string,
  gatewayHeaders?: Headers,
): Promise<{ content: string; tokensUsed: number }> {
  const aiModel = modelOverride || (await getAiModelForFlow("digest_email"));
  const res = await fetchGatewayChatCompletions(
    {
      model: aiModel,
      max_tokens: maxTokens,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    },
    gatewayHeaders ? { headers: gatewayHeaders } : undefined,
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI Gateway error (${res.status}): ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content ?? "{}",
    tokensUsed: data.usage?.total_tokens ?? 0,
  };
}

async function fetchMarketContext(): Promise<string> {
  const yahoo = new YahooProvider();
  const lines: string[] = [];
  for (const idx of MARKET_INDICES) {
    try {
      const [quote, hist] = await Promise.all([
        yahoo.getQuote(idx.symbol),
        yahoo.getHistorical(idx.symbol, "1w"),
      ]);
      const price = quote.regularMarketPrice;
      let weekChange = "";
      if (hist.length >= 2) {
        const first = hist[0].close;
        const pct = ((price - first) / first) * 100;
        weekChange = ` | 7d: ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
      }
      lines.push(`${idx.label}: $${price.toFixed(2)}${weekChange}`);
    } catch {
      lines.push(`${idx.label}: data unavailable`);
    }
  }
  return lines.join("\n");
}

async function fetchTickerSnapshots(tickers: string[]): Promise<TickerSnapshot[]> {
  if (tickers.length === 0) return [];
  const yahoo = new YahooProvider();
  const snapshots: TickerSnapshot[] = [];

  await Promise.all(
    tickers.slice(0, 15).map(async (symbol) => {
      try {
        const [quote, hist] = await Promise.all([
          yahoo.getQuote(symbol),
          yahoo.getHistorical(symbol, "1w"),
        ]);
        let change7d: number | null = null;
        let change7dPercent: number | null = null;
        if (hist.length >= 2) {
          const first = hist[0].close;
          change7d = quote.regularMarketPrice - first;
          change7dPercent = (change7d / first) * 100;
        }
        snapshots.push({
          symbol,
          price: quote.regularMarketPrice,
          currency: quote.currency,
          change7d,
          change7dPercent,
        });
      } catch (err) {
        console.error(`[digest-generation] Quote fetch failed for ${symbol}:`, err instanceof Error ? err.message : err);
      }
    }),
  );

  return snapshots;
}

function formatTickerLine(s: TickerSnapshot): string {
  const dir = (s.change7dPercent ?? 0) >= 0 ? "▲" : "▼";
  const pct = s.change7dPercent != null ? ` (7d: ${s.change7dPercent >= 0 ? "+" : ""}${s.change7dPercent.toFixed(2)}%)` : "";
  return `${s.symbol} ${dir} $${s.price.toFixed(2)} ${s.currency}${pct}`;
}

export function buildSourcePrompt(sources: DigestSourceInput[]): string {
  return sources.map((src, idx) => {
    const body = src.textBody || stripHtml(src.htmlBody);
    const linksBlock = src.extractedLinks.length > 0
      ? "\n\nLinks found in this source:\n" + src.extractedLinks.map((l) => `- [${l.text}](${l.url})`).join("\n")
      : "";
    return `Source ${idx + 1} (from ${src.sender}):\n${body.slice(0, 8000)}${linksBlock}`;
  }).join("\n\n---\n\n");
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateDigestFromSources(
  model: string,
  sources: DigestSourceInput[],
  gatewayHeaders?: Headers,
): Promise<DigestGenerationResult | null> {
  const marketContext = await fetchMarketContext();
  const sourceText = buildSourcePrompt(sources);

  const { content: rewriteJson, tokensUsed: rewriteTokens } = await callOpenAI(
    REWRITE_SYSTEM_PROMPT,
    `Live market data (last 7 days):\n${marketContext}\n\n${sourceText}`,
    4000,
    model,
    gatewayHeaders,
  );

  let rewrite: DigestGenerationResult["rewrite"];
  try {
    rewrite = JSON.parse(rewriteJson);
  } catch {
    console.error("[digest-generation] Failed to parse AI rewrite:", rewriteJson.slice(0, 300));
    return null;
  }

  const tickerSnapshots = await fetchTickerSnapshots(rewrite.mentioned_tickers || []);

  const tickerBlock = tickerSnapshots.length > 0
    ? "\n\n📊 Mentioned Stocks:\n" + tickerSnapshots.map(formatTickerLine).join("\n")
    : "";

  const fullSummary = [
    rewrite.market_overview || "",
    rewrite.summary || "",
    tickerBlock,
  ].filter(Boolean).join("\n\n");

  const activeLanguages = await getActiveUserLanguages();
  const nonEnglishLangs = activeLanguages.filter((l) => l !== "en");

  const translations: DigestGenerationResult["translations"] = [
    {
      language: "en",
      title: rewrite.title || "Market Insight",
      summary: fullSummary,
      keyPoints: rewrite.key_points || [],
    },
  ];

  let translateTokens = 0;

  if (nonEnglishLangs.length > 0) {
    const batchSize = 6;
    for (let i = 0; i < nonEnglishLangs.length; i += batchSize) {
      const batch = nonEnglishLangs.slice(i, i + batchSize);
      const translatePrompt = `Translate this market insight into these languages: ${batch.join(", ")}.

Content to translate:
Title: ${rewrite.title}

Market Overview: ${rewrite.market_overview || ""}

Summary: ${rewrite.summary || ""}

Key Points:
${(rewrite.key_points || []).map((p, idx) => `${idx + 1}. ${p}`).join("\n")}

NOTE: Keep ticker symbols (e.g. AAPL, MSFT), numbers, percentages, the ▲/▼ arrows, and all markdown links [text](url) as-is. Only translate the prose.`;

      try {
        const { content: translateJson, tokensUsed } = await callOpenAI(
          TRANSLATE_SYSTEM_PROMPT,
          translatePrompt,
          4000,
          model,
          gatewayHeaders,
        );
        translateTokens += tokensUsed;

        const parsed = JSON.parse(translateJson);
        for (const lang of batch) {
          const t = parsed[lang];
          if (t) {
            translations.push({
              language: lang,
              title: t.title || rewrite.title,
              summary: t.summary || rewrite.summary,
              keyPoints: Array.isArray(t.key_points) ? t.key_points : rewrite.key_points || [],
            });
          }
        }
      } catch (err) {
        console.error(`[digest-generation] Translation batch [${batch.join(",")}] failed:`, err);
      }
    }
  }

  return {
    rewrite,
    totalTokens: rewriteTokens + translateTokens,
    translations,
  };
}
