import { fetchGatewayChatCompletions } from "@/lib/ai/gateway";
import { getAiModelForFlow } from "@/lib/db/settings";
import { AI_FLOW_META } from "@/lib/ai-models";
import type { DigestTranslation } from "@/lib/db/market-digests";

const SYSTEM_PROMPT = `You are a concise financial content writer for X.com (formerly Twitter).
Your audience is retail investors and the FinTwit community.

Rules:
- Write a single post about today's market digest.
- Maximum 240 characters (leave room for hashtags added separately).
- No emojis.
- Use a confident, informative tone — not clickbait.
- If the digest mentions specific tickers, include 1-2 cashtags (e.g. $AAPL).
- End with: trefolio.com/daily-digests
- Return ONLY the post text, nothing else.`;

export async function generateDigestTweet(
  translation: DigestTranslation,
  mentionedTickers: string[],
): Promise<string> {
  const { maxTokens, temperature } = AI_FLOW_META.digest_x_post;
  const model = await getAiModelForFlow("digest_x_post");

  const keyPointsList = translation.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n");
  const tickerHint = mentionedTickers.length > 0
    ? `\nMentioned tickers: ${mentionedTickers.slice(0, 5).join(", ")}`
    : "";

  const userPrompt = `Title: ${translation.title}

Summary: ${translation.summary}

Key points:
${keyPointsList}${tickerHint}`;

  const res = await fetchGatewayChatCompletions({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI Gateway error (${res.status}): ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const tweet = (data.choices?.[0]?.message?.content ?? "").trim();
  if (!tweet) throw new Error("AI Gateway returned empty tweet content");

  return tweet;
}

export function buildDigestHashtags(mentionedTickers: string[]): string {
  const tags = ["#FinTwit", "#MarketDigest", "#trefolio"];
  const cashtags = mentionedTickers.slice(0, 3).map((t) => `$${t}`);
  return [...cashtags, ...tags].join(" ");
}

export function computeEveningSchedule(): string {
  const now = new Date();
  const target = new Date(now);
  target.setUTCHours(18, 0, 0, 0);

  if (now.getTime() > target.getTime() - 15 * 60 * 1000) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  return target.toISOString();
}
