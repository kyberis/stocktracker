import { NextRequest } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import {
  isGmailConfigured,
  listUnreadByQuery,
  getMessageContent,
  markAsRead,
  parseForwardedDate,
  parseForwardedSender,
  extractLinksFromHtml,
} from "@/lib/gmail";
import { getGlobalOpenAIApiKey, getAiModelForFlow } from "@/lib/db/settings";
import {
  digestSourceExistsByGmailId,
  getDigestByDate,
  addDigestSource,
  getDigestSources,
  insertMarketDigest,
  updateDigestContent,
  getActiveUserLanguages,
  getDigestSenderDomains,
  buildDigestGmailQuery,
} from "@/lib/db";
import type { MarketDigestSource } from "@/lib/db";
import { YahooProvider } from "@/lib/api-providers/yahoo";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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
  modelOverride?: string,
): Promise<{ content: string; tokensUsed: number }> {
  const aiModel = modelOverride || await getAiModelForFlow("digest_email");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: aiModel,
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

interface ParsedEmail {
  gmailId: string;
  originalDate: string;
  originalSender: string;
  subject: string;
  receivedAt: string;
  textBody: string;
  htmlBody: string;
  extractedLinks: { url: string; text: string }[];
}

function buildSourcePrompt(sources: Array<{ sender: string; textBody: string; htmlBody: string; extractedLinks: { url: string; text: string }[] }>): string {
  return sources.map((src, idx) => {
    const body = src.textBody || stripHtml(src.htmlBody);
    const linksBlock = src.extractedLinks.length > 0
      ? "\n\nLinks found in this source:\n" + src.extractedLinks.map((l) => `- [${l.text}](${l.url})`).join("\n")
      : "";
    return `Source ${idx + 1} (from ${src.sender}):\n${body.slice(0, 8000)}${linksBlock}`;
  }).join("\n\n---\n\n");
}

async function generateDigestFromSources(
  apiKey: string,
  model: string,
  sources: Array<{ sender: string; textBody: string; htmlBody: string; extractedLinks: { url: string; text: string }[] }>,
): Promise<{
  rewrite: { title: string; market_overview: string; summary: string; key_points: string[]; mentioned_tickers: string[]; sectors: string[]; sentiment: string };
  totalTokens: number;
  translations: { language: string; title: string; summary: string; keyPoints: string[] }[];
} | null> {
  const marketContext = await fetchMarketContext();
  const sourceText = buildSourcePrompt(sources);

  const { content: rewriteJson, tokensUsed: rewriteTokens } = await callOpenAI(
    apiKey,
    REWRITE_SYSTEM_PROMPT,
    `Live market data (last 7 days):\n${marketContext}\n\n${sourceText}`,
    4000,
    model,
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

NOTE: Keep ticker symbols (e.g. AAPL, MSFT), numbers, percentages, the ▲/▼ arrows, and all markdown links [text](url) as-is. Only translate the prose.`;

      try {
        const { content: translateJson, tokensUsed } = await callOpenAI(
          apiKey,
          TRANSLATE_SYSTEM_PROMPT,
          translatePrompt,
          4000,
          model,
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

  return {
    rewrite,
    totalTokens: rewriteTokens + translateTokens,
    translations,
  };
}

async function processDigestEmail(): Promise<Record<string, unknown>> {
  if (!isGmailConfigured()) {
    return { skipped: true, reason: "Gmail credentials not configured" };
  }

  const apiKey = getGlobalOpenAIApiKey();
  const digestEmailModel = await getAiModelForFlow("digest_email");
  if (!apiKey) {
    return { skipped: true, reason: "OpenAI API key not configured" };
  }

  const senderDomains = await getDigestSenderDomains();
  const digestQuery = buildDigestGmailQuery(senderDomains);
  console.log("[digest-email] Gmail query:", digestQuery);
  console.log("[digest-email] Configured senders:", senderDomains.map((d) => d.value).join(", "));
  const messages = await listUnreadByQuery(digestQuery);
  if (messages.length === 0) {
    return { checked: true, newEmails: 0, processed: 0, gmailQuery: digestQuery, configuredSenders: senderDomains.map((d) => d.value) };
  }

  const skipReasons: string[] = [];
  const newParsed: ParsedEmail[] = [];

  for (const msg of messages) {
    if (await digestSourceExistsByGmailId(msg.id)) {
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

    const originalDate = parseForwardedDate(email);
    const originalSender = parseForwardedSender(email);
    const links = extractLinksFromHtml(email.htmlBody);

    newParsed.push({
      gmailId: msg.id,
      originalDate,
      originalSender,
      subject: email.subject,
      receivedAt: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
      textBody: email.textBody,
      htmlBody: email.htmlBody,
      extractedLinks: links,
    });
  }

  const byDate = new Map<string, ParsedEmail[]>();
  for (const p of newParsed) {
    const group = byDate.get(p.originalDate) || [];
    group.push(p);
    byDate.set(p.originalDate, group);
  }

  let digestsCreated = 0;
  let digestsUpdated = 0;
  const processedDigests: { date: string; sources: number; tickers: string[] }[] = [];

  for (const [date, emails] of byDate) {
    const existingDigest = await getDigestByDate(date);

    if (existingDigest && existingDigest.status !== "draft") {
      for (const e of emails) {
        await markAsRead(e.gmailId);
        skipReasons.push(`published_digest:${e.gmailId}:${date}`);
      }
      continue;
    }

    if (existingDigest) {
      for (const e of emails) {
        await addDigestSource(existingDigest.id, {
          gmailMessageId: e.gmailId,
          sender: e.originalSender,
          originalSubject: e.subject,
          originalDate: e.originalDate,
          receivedAt: e.receivedAt,
          rawText: e.textBody,
          rawHtml: e.htmlBody,
          extractedLinks: e.extractedLinks,
        });
      }

      const allSources = await getDigestSources(existingDigest.id);
      const sourcesForAI = allSources.map((s: MarketDigestSource) => ({
        sender: s.sender,
        textBody: s.rawText,
        htmlBody: s.rawHtml,
        extractedLinks: s.extractedLinks,
      }));

      const result = await generateDigestFromSources(apiKey, digestEmailModel, sourcesForAI);
      if (result) {
        await updateDigestContent(existingDigest.id, {
          mentionedTickers: result.rewrite.mentioned_tickers || [],
          sectors: result.rewrite.sectors || [],
          sentiment: result.rewrite.sentiment || "neutral",
          aiModel: digestEmailModel,
          tokensUsed: existingDigest.tokensUsed + result.totalTokens,
          translations: result.translations,
        });
        processedDigests.push({ date, sources: allSources.length, tickers: result.rewrite.mentioned_tickers || [] });
      }

      for (const e of emails) await markAsRead(e.gmailId);
      digestsUpdated++;
    } else {
      const firstEmail = emails[0];
      const digestId = await insertMarketDigest({
        gmailMessageId: firstEmail.gmailId,
        sender: firstEmail.originalSender,
        originalSubject: firstEmail.subject,
        receivedAt: firstEmail.receivedAt,
        rawText: firstEmail.textBody,
        rawHtml: firstEmail.htmlBody,
        mentionedTickers: [],
        sectors: [],
        sentiment: "neutral",
        aiModel: digestEmailModel,
        tokensUsed: 0,
        digestDate: date,
        translations: [],
      });

      for (const e of emails) {
        await addDigestSource(digestId, {
          gmailMessageId: e.gmailId,
          sender: e.originalSender,
          originalSubject: e.subject,
          originalDate: e.originalDate,
          receivedAt: e.receivedAt,
          rawText: e.textBody,
          rawHtml: e.htmlBody,
          extractedLinks: e.extractedLinks,
        });
      }

      const allSources = await getDigestSources(digestId);
      const sourcesForAI = allSources.map((s: MarketDigestSource) => ({
        sender: s.sender,
        textBody: s.rawText,
        htmlBody: s.rawHtml,
        extractedLinks: s.extractedLinks,
      }));

      const result = await generateDigestFromSources(apiKey, digestEmailModel, sourcesForAI);
      if (result) {
        await updateDigestContent(digestId, {
          mentionedTickers: result.rewrite.mentioned_tickers || [],
          sectors: result.rewrite.sectors || [],
          sentiment: result.rewrite.sentiment || "neutral",
          aiModel: digestEmailModel,
          tokensUsed: result.totalTokens,
          translations: result.translations,
        });
        processedDigests.push({ date, sources: emails.length, tickers: result.rewrite.mentioned_tickers || [] });
      }

      for (const e of emails) await markAsRead(e.gmailId);
      digestsCreated++;
    }
  }

  return {
    checked: true,
    gmailQuery: digestQuery,
    configuredSenders: senderDomains.map((d) => d.value),
    newEmails: messages.length,
    digestsCreated,
    digestsUpdated,
    skipped: skipReasons.length,
    skipReasons,
    processedDigests,
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
