import { NextRequest } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { isGmailConfigured, listUnreadByQuery, getMessageContent, markAsRead } from "@/lib/gmail";
import { getGlobalOpenAIApiKey } from "@/lib/db/settings";
import { digestExistsByGmailId, insertMarketDigest, getActiveUserLanguages } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DIGEST_QUERY = "to:digest@trefolio.com is:unread";

const REWRITE_SYSTEM_PROMPT = `You are trefolio's market analyst. Given raw source material from a financial newsletter, produce an **original market insight article** in trefolio's editorial voice.

CRITICAL RULES:
- Do NOT summarize or paraphrase the source. Extract the underlying market intelligence and write a completely fresh piece.
- Use your own structure, headings, framing, and editorial angle.
- Reorder information by importance to retail investors. Add context where helpful.
- The output must read as if trefolio's editorial team wrote it independently — no references to any source newsletter.
- Never mention the source, the sender, or that this content is derived from another publication.

Return a JSON object with these fields:
- "title": a compelling headline (max 80 chars)
- "summary": 2-3 paragraphs of original analysis
- "key_points": array of up to 8 concise bullet points
- "mentioned_tickers": array of stock ticker symbols mentioned (uppercase, e.g. ["AAPL", "MSFT"])
- "sectors": array of relevant market sectors (e.g. ["Technology", "Healthcare"])
- "sentiment": one of "bullish", "bearish", or "neutral"`;

const TRANSLATE_SYSTEM_PROMPT = `You are a professional financial translator for trefolio.
Translate the provided market insight content into the requested languages.
Maintain the same editorial quality, financial terminology, and tone.
Return a JSON object where each key is a language code and the value is an object with "title", "summary", and "key_points" (array of strings).`;

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
  let skipped = 0;

  for (const msg of messages) {
    if (await digestExistsByGmailId(msg.id)) {
      await markAsRead(msg.id);
      skipped++;
      continue;
    }

    const email = await getMessageContent(msg.id);

    const bodyForAI = email.textBody || stripHtml(email.htmlBody);
    if (!bodyForAI.trim()) {
      await markAsRead(msg.id);
      skipped++;
      continue;
    }

    const { content: rewriteJson, tokensUsed: rewriteTokens } = await callOpenAI(
      apiKey,
      REWRITE_SYSTEM_PROMPT,
      `Source material:\n\n${bodyForAI.slice(0, 12000)}`,
    );

    let rewrite: {
      title: string;
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
      skipped++;
      continue;
    }

    const activeLanguages = await getActiveUserLanguages();
    const nonEnglishLangs = activeLanguages.filter((l) => l !== "en");

    const translations: { language: string; title: string; summary: string; keyPoints: string[] }[] = [
      {
        language: "en",
        title: rewrite.title || "Market Insight",
        summary: rewrite.summary || "",
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

Summary: ${rewrite.summary}

Key Points:
${(rewrite.key_points || []).map((p, idx) => `${idx + 1}. ${p}`).join("\n")}`;

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
  }

  return { checked: true, newEmails: messages.length, processed, skipped };
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
