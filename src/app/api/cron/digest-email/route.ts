import { NextRequest } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { isGmailConfigured, listUnreadByQuery, getMessageContent, markAsRead } from "@/lib/gmail";
import { getGlobalOpenAIApiKey } from "@/lib/db/settings";
import { digestExistsByGmailId, insertMarketDigest, getActiveUserLanguages } from "@/lib/db";
import { YahooProvider } from "@/lib/api-providers/yahoo";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DIGEST_QUERY = "to:digest@trefolio.com from:suarez84@gmail.com is:unread";

const REWRITE_SYSTEM_PROMPT = `You are trefolio's market analyst. Given raw source material from a financial newsletter (and optionally live market data), produce an **original market insight article** in trefolio's editorial voice.

CRITICAL RULES:
- Do NOT summarize or paraphrase the source. Extract the underlying market intelligence and write a completely fresh piece.
- Use your own structure, headings, framing, and editorial angle.
- Reorder information by importance to retail investors. Add context where helpful.
- The output must read as if trefolio's editorial team wrote it independently — no references to any source newsletter.
- Never mention the source, the sender, or that this content is derived from another publication.

Return a JSON object with these fields:
- "title": a compelling headline (max 80 chars)
- "market_overview": 1-2 short paragraphs giving a high-level view of how the market has performed over the last 7 days. Reference the index data provided (S&P 500, Gold, Oil, BTC) with actual numbers.
- "summary": 2-3 paragraphs of original analysis covering the main themes
- "key_points": array of up to 8 bullet points. Each bullet MUST be data-first and scannable:
  - Lead with the ticker/asset and direction: e.g. "AAPL ▲ — iPhone demand drove Apple to new highs; analysts raised targets to $220"
  - Keep each bullet to 1-2 sentences max
  - Front-load the actionable data, explanations come after
- "mentioned_tickers": array of stock ticker symbols mentioned (uppercase, e.g. ["AAPL", "MSFT"]). Only include real tradeable ticker symbols, not index names.
- "sectors": array of relevant market sectors (e.g. ["Technology", "Healthcare"])
- "sentiment": one of "bullish", "bearish", or "neutral"`;

const TRANSLATE_SYSTEM_PROMPT = `You are a professional financial translator for trefolio.
Translate the provided market insight content into the requested languages.
Maintain the same editorial quality, financial terminology, and tone.
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
        console.error(`[digest-email] Quote fetch failed for ${symbol}:`, err instanceof Error ? err.message : err);
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

async function callOpenAI(
  apiKey: string,
  system: string,
  user: string,
  maxTokens = 3000,
): Promise<{ content: string; tokensUsed: number }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content ?? "{}",
    tokensUsed: data.usage?.total_tokens ?? 0,
  };
}

async function processDigestEmail(): Promise<Record<string, unknown>> {
  if (!isGmailConfigured()) {
    return { skipped: true, reason: "Gmail credentials not configured" };
  }

  const apiKey = getGlobalOpenAIApiKey();
  if (!apiKey) {
    return { skipped: true, reason: "OpenAI API key not configured" };
  }

  const messages = await listUnreadByQuery(DIGEST_QUERY);
  if (messages.length === 0) {
    return { checked: true, newEmails: 0, processed: 0 };
  }

  let processed = 0;
  const skipReasons: string[] = [];
  const processedEmails: { id: string; subject: string; receivedAt: string; tickers: string[] }[] = [];

  for (const msg of messages) {
    if (await digestExistsByGmailId(msg.id)) {
      await markAsRead(msg.id);
      skipReasons.push(`duplicate:${msg.id}`);
      continue;
    }

    const email = await getMessageContent(msg.id);

    const bodyForAI = email.textBody || stripHtml(email.htmlBody);
    if (!bodyForAI.trim()) {
      await markAsRead(msg.id);
      skipReasons.push(`empty_body:${msg.id}:${email.subject.slice(0, 60)}`);
      continue;
    }

    const marketContext = await fetchMarketContext();

    const { content: rewriteJson, tokensUsed: rewriteTokens } = await callOpenAI(
      apiKey,
      REWRITE_SYSTEM_PROMPT,
      `Live market data (last 7 days):\n${marketContext}\n\nSource material:\n\n${bodyForAI.slice(0, 11000)}`,
    );

    let rewrite: {
      title: string;
      market_overview: string;
      summary: string;
      key_points: string[];
      mentioned_tickers: string[];
      sectors: string[];
      sentiment: string;
    };
    try {
      rewrite = JSON.parse(rewriteJson);
    } catch {
      console.error("[digest-email] Failed to parse AI rewrite:", rewriteJson.slice(0, 300));
      await markAsRead(msg.id);
      skipReasons.push(`parse_error:${msg.id}:${email.subject.slice(0, 60)}`);
      continue;
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

    const translations: { language: string; title: string; summary: string; keyPoints: string[] }[] = [
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

NOTE: Keep ticker symbols (e.g. AAPL, MSFT), numbers, percentages, and the ▲/▼ arrows as-is. Only translate the prose.`;

        try {
          const { content: translateJson, tokensUsed } = await callOpenAI(
            apiKey,
            TRANSLATE_SYSTEM_PROMPT,
            translatePrompt,
            4000,
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
          console.error(`[digest-email] Translation batch [${batch.join(",")}] failed:`, err);
        }
      }
    }

    await insertMarketDigest({
      gmailMessageId: msg.id,
      sender: email.from,
      originalSubject: email.subject,
      receivedAt: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
      rawText: email.textBody,
      rawHtml: email.htmlBody,
      mentionedTickers: rewrite.mentioned_tickers || [],
      sectors: rewrite.sectors || [],
      sentiment: rewrite.sentiment || "neutral",
      aiModel: "gpt-4o-mini",
      tokensUsed: rewriteTokens + translateTokens,
      translations,
    });

    await markAsRead(msg.id);
    processed++;
    processedEmails.push({
      id: msg.id,
      subject: email.subject.slice(0, 80),
      receivedAt: email.date || "unknown",
      tickers: rewrite.mentioned_tickers || [],
    });
  }

  return {
    checked: true,
    newEmails: messages.length,
    processed,
    skipped: skipReasons.length,
    skipReasons,
    processedEmails,
    processedAt: new Date().toISOString(),
  };
}

function stripHtml(html: string): string {
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

const handler = withCronLogging("digest-email", processDigestEmail);

export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("digest-email", req.headers.get("authorization"));
  if (denied) return denied;
  return handler();
}
