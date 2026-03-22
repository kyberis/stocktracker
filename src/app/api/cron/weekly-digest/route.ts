import { NextRequest } from "next/server";
import {
  getDigestEligibleUsers,
  hasDigestForWeek,
  insertDigest,
  listHoldings,
  listCashEntries,
  insertAiLog,
} from "@/lib/db";
import { getGlobalOpenAIApiKey } from "@/lib/db/settings";
import { sendEmail, getFromAddress } from "@/lib/email";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { incrementGlobalAiCalls, incrementGlobalAiTokens } from "@/lib/rate-limit";
import type { WeeklyDigestStats } from "@/lib/db/weekly-digest";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function getWeekRange(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const day = now.getUTCDay();
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - (day === 0 ? 0 : day));
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  return {
    weekStart: start.toISOString().slice(0, 10),
    weekEnd: end.toISOString().slice(0, 10),
  };
}

function buildWeeklyDigestEmail(displayName: string, summaryText: string, stats: WeeklyDigestStats, baseUrl: string): string {
  const currency = stats.currency || "EUR";
  const weekChange = stats.weekChange !== undefined
    ? `${stats.weekChange >= 0 ? "+" : ""}${currency === "EUR" ? "€" : "$"}${Math.abs(stats.weekChange).toFixed(0)}`
    : "—";
  const best = stats.bestPerformer
    ? `${stats.bestPerformer.ticker} ${stats.bestPerformer.changePct >= 0 ? "+" : ""}${stats.bestPerformer.changePct.toFixed(1)}%`
    : "—";
  const divs = stats.dividendsReceived !== undefined
    ? `${currency === "EUR" ? "€" : "$"}${stats.dividendsReceived.toFixed(2)}`
    : "—";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f8fafc;font-family:'DM Sans',-apple-system,sans-serif;">
<div style="max-width:520px;margin:24px auto;background:#fff;border-radius:12px;padding:28px;">
<div style="text-align:center;margin-bottom:20px;">
<div style="font-size:24px;margin-bottom:4px;">🍀</div>
<div style="font-size:18px;font-weight:700;color:#0f172a;">Your Weekly Portfolio Digest</div>
<div style="font-size:12px;color:#64748b;">${stats.currency || ""}</div>
</div>
<div style="display:flex;gap:8px;margin-bottom:20px;">
<div style="flex:1;background:#f0fdf4;border-radius:8px;padding:10px;text-align:center;">
<div style="font-size:10px;color:#64748b;text-transform:uppercase;">Week Change</div>
<div style="font-size:16px;font-weight:700;color:#10b981;">${weekChange}</div>
</div>
<div style="flex:1;background:#f0fdf4;border-radius:8px;padding:10px;text-align:center;">
<div style="font-size:10px;color:#64748b;text-transform:uppercase;">Best</div>
<div style="font-size:16px;font-weight:700;color:#10b981;">${best}</div>
</div>
<div style="flex:1;background:#f8fafc;border-radius:8px;padding:10px;text-align:center;">
<div style="font-size:10px;color:#64748b;text-transform:uppercase;">Dividends</div>
<div style="font-size:16px;font-weight:700;color:#0f172a;">${divs}</div>
</div>
</div>
<div style="font-size:14px;color:#475569;line-height:1.7;margin-bottom:20px;">${summaryText}</div>
<div style="text-align:center;margin-bottom:16px;">
<a href="${baseUrl}" style="display:inline-block;padding:10px 28px;border-radius:10px;background:#10b981;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">View full dashboard</a>
</div>
<div style="font-size:10px;color:#94a3b8;text-align:center;font-style:italic;">
AI-generated summary. Not financial advice. <a href="{{unsubscribe_url}}" style="color:#94a3b8;">Unsubscribe</a>
</div>
</div></body></html>`;
}

const runWeeklyDigest = withCronLogging("weekly-digest", async () => {
  const apiKey = getGlobalOpenAIApiKey();
  if (!apiKey) {
    return { skipped: true, reason: "No OpenAI API key configured" };
  }

  const { weekStart, weekEnd } = getWeekRange();
  const users = await getDigestEligibleUsers();

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    try {
      if (await hasDigestForWeek(user.id, weekEnd)) {
        skipped++;
        continue;
      }

      if (!user.defaultPortfolioId) {
        skipped++;
        continue;
      }

      const holdings = await listHoldings(user.id, user.defaultPortfolioId);
      const cashEntries = await listCashEntries(user.id, user.defaultPortfolioId);

      if (holdings.length === 0) {
        skipped++;
        continue;
      }

      const holdingsSummary = holdings.map((h) => ({
        ticker: h.ticker,
        name: h.name,
        shares: h.shares,
        avgCost: h.purchasePrice,
        sector: h.sector || "Unknown",
      }));

      const totalCost = holdings.reduce((sum, h) => sum + h.shares * h.purchasePrice, 0);
      const totalCash = cashEntries.reduce((sum, c) => sum + c.amountEUR, 0);

      const systemPrompt = `You are a concise financial newsletter writer. Write a brief weekly portfolio digest (3-5 sentences) for the user. Be factual and encouraging.
Rules:
- DO NOT invent specific numbers, returns, or market data not in the input.
- Focus on portfolio composition and general observations.
- Mention top holdings by weight.
- Suggest one actionable insight if appropriate.
- End with a brief note about portfolio health.
- Keep it under 100 words.
- Write in English.
- Never give specific financial advice.`;

      const userPrompt = `Weekly digest for portfolio with ${holdings.length} positions:
Holdings: ${JSON.stringify(holdingsSummary.slice(0, 20))}
Total cost basis: ~€${totalCost.toFixed(0)}
Cash: ~€${totalCash.toFixed(0)}
Week: ${weekStart} to ${weekEnd}`;

      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 300,
          temperature: 0.4,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        console.error(`Weekly digest OpenAI error for user ${user.id}:`, errText);
        errors++;
        continue;
      }

      const aiData = await openaiRes.json();
      const summaryText = aiData.choices?.[0]?.message?.content?.trim() || "";
      const tokensUsed = aiData.usage?.total_tokens || 0;

      if (!summaryText) {
        errors++;
        continue;
      }

      const stats: WeeklyDigestStats = {
        currency: "EUR",
      };

      await insertDigest({
        userId: user.id,
        portfolioId: user.defaultPortfolioId,
        weekStart,
        weekEnd,
        summaryText,
        stats,
      });

      insertAiLog({
        userId: user.id,
        source: "weekly_digest",
        model: "gpt-4o-mini",
        promptSystem: systemPrompt,
        promptUser: userPrompt.slice(0, 2000),
        durationMs: 0,
        tokensInput: aiData.usage?.prompt_tokens || 0,
        tokensOutput: aiData.usage?.completion_tokens || 0,
      }).catch(() => {});
      incrementGlobalAiCalls().catch(() => {});
      incrementGlobalAiTokens(tokensUsed).catch(() => {});

      const baseUrl = process.env.APP_BASE_URL || "https://trefolio.com";
      const html = buildWeeklyDigestEmail(user.displayName, summaryText, stats, baseUrl);
      await sendEmail({
        to: user.email,
        subject: `🍀 Your Weekly Portfolio Digest — ${weekStart} to ${weekEnd}`,
        html,
        userId: user.id,
      });

      sent++;
    } catch (err) {
      console.error(`Weekly digest error for user ${user.id}:`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  return { weekStart, weekEnd, eligible: users.length, sent, skipped, errors };
});

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth("weekly-digest", req.headers.get("authorization"));
  if (authError) return authError;
  const result = await runWeeklyDigest();
  return Response.json(result);
}
