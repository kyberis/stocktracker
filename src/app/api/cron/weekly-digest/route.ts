import { NextRequest } from "next/server";
import {
  getDigestEligibleUsers,
  hasDigestForWeek,
  insertDigest,
  listHoldings,
  listCashEntries,
  listTransactions,
  listPortfolios,
  insertAiLog,
  logEmailSend,
} from "@/lib/db";
import { getGlobalOpenAIApiKey, getAiModelForFlow } from "@/lib/db/settings";
import { sendEmail, getFromAddress } from "@/lib/email";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { incrementGlobalAiCalls, incrementGlobalAiTokens } from "@/lib/rate-limit";
import { getQuotesWithCache, getRatesWithCache } from "@/lib/quote-cache";
import { convertToEUR, resolveQuoteCurrency } from "@/lib/utils";
import { ensureInitialized } from "@/lib/db/client";
import { num } from "@/lib/db/helpers";
import type { WeeklyDigestStats } from "@/lib/db/weekly-digest";
import type { ExchangeRates } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const FX_PAIRS = [
  "EURUSD", "EURGBP", "EURDKK", "EURCAD", "EURCHF",
  "EURSEK", "EURNOK", "EURAUD", "EURNZD", "EURJPY",
  "EURPLN", "EURCZK", "EURHUF", "EURRON", "EURSGD",
  "EURHKD", "EURZAR", "EURTRY", "EURBRL", "EURMXN",
];

async function getSnapshotValue(userId: string, portfolioId: string, date: string): Promise<number | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT total_value_eur FROM portfolio_snapshots
          WHERE user_id = ? AND portfolio_id = ? AND date <= ?
          ORDER BY date DESC LIMIT 1`,
    args: [userId, portfolioId, date],
  });
  if (result.rows.length === 0) return null;
  return num(result.rows[0].total_value_eur);
}

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

function buildWeeklyDigestEmail(displayName: string, summaryText: string, stats: WeeklyDigestStats, baseUrl: string, weekStart: string, weekEnd: string): string {
  const currency = stats.currency || "EUR";
  const currencySymbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : "€";
  const fmtNum = (n: number) => Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const weekChange = stats.weekChange !== undefined
    ? `${stats.weekChange >= 0 ? "+" : "−"}${currencySymbol}${fmtNum(stats.weekChange)}`
    : "—";
  const weekChangeColor = stats.weekChange !== undefined
    ? (stats.weekChange >= 0 ? "#10b981" : "#ef4444")
    : "#64748b";
  const weekChangeBg = stats.weekChange !== undefined
    ? (stats.weekChange >= 0 ? "#f0fdf4" : "#fef2f2")
    : "#f8fafc";
  const best = stats.bestPerformer
    ? `${stats.bestPerformer.ticker} ${stats.bestPerformer.changePct >= 0 ? "+" : ""}${stats.bestPerformer.changePct.toFixed(2)}%`
    : "—";
  const bestColor = stats.bestPerformer
    ? (stats.bestPerformer.changePct >= 0 ? "#10b981" : "#ef4444")
    : "#64748b";
  const divs = stats.dividendsReceived && stats.dividendsReceived > 0
    ? `${currencySymbol}${stats.dividendsReceived.toFixed(2)}`
    : "None this week";

  const logoUrl = `${baseUrl}/email-logo@2x.png`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f8fafc;font-family:'DM Sans',-apple-system,sans-serif;">
<div style="max-width:520px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;">
<div style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:24px 28px;text-align:center;">
<img src="${logoUrl}" alt="trefolio" width="36" height="36" style="display:inline-block;width:36px;height:36px;border-radius:8px;vertical-align:middle;margin-right:8px;" /><span style="color:#fff;font-size:20px;font-weight:700;vertical-align:middle;letter-spacing:-0.3px;">trefolio</span>
</div>
<div style="padding:28px;">
<div style="text-align:center;margin-bottom:20px;">
<div style="font-size:18px;font-weight:700;color:#0f172a;">Your Weekly Portfolio Digest</div>
<div style="font-size:12px;color:#64748b;">${weekStart} — ${weekEnd}</div>
</div>
<div style="display:flex;gap:8px;margin-bottom:20px;">
<div style="flex:1;background:${weekChangeBg};border-radius:8px;padding:10px;text-align:center;">
<div style="font-size:10px;color:#64748b;text-transform:uppercase;">Week Change</div>
<div style="font-size:16px;font-weight:700;color:${weekChangeColor};">${weekChange}</div>
</div>
<div style="flex:1;background:#f0fdf4;border-radius:8px;padding:10px;text-align:center;">
<div style="font-size:10px;color:#64748b;text-transform:uppercase;">Best</div>
<div style="font-size:16px;font-weight:700;color:${bestColor};">${best}</div>
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
</div></div></body></html>`;
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

      // -- Resolve portfolio currency --
      const portfolios = await listPortfolios(user.id);
      const portfolio = portfolios.find((p) => p.id === user.defaultPortfolioId);
      const baseCurrency = portfolio?.currency || "EUR";

      // -- Fetch live quotes & exchange rates --
      const tickers = [...new Set(holdings.map((h) => h.ticker).filter(Boolean))];
      const neededCurrencies = new Set(
        holdings.map((h) => h.displayCurrency.toUpperCase()).filter((c) => c !== "EUR" && c !== "GBX"),
      );
      const neededPairs = FX_PAIRS.filter((pair) => neededCurrencies.has(pair.substring(3)));
      if (holdings.some((h) => h.displayCurrency === "GBX" || h.displayCurrency === "GBp")) {
        if (!neededPairs.includes("EURGBP")) neededPairs.push("EURGBP");
      }

      const [quotes, exchangeRates] = await Promise.all([
        getQuotesWithCache(tickers),
        getRatesWithCache(neededPairs),
      ]);

      // -- Compute current portfolio value in EUR --
      let holdingsValueEUR = 0;
      const holdingPerformance: { ticker: string; changePct: number }[] = [];

      for (const h of holdings) {
        const q = quotes[h.ticker];
        if (q && q.regularMarketPrice > 0) {
          const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, q.currency);
          const valueInQuoteCurrency = h.shares * q.regularMarketPrice;
          holdingsValueEUR += convertToEUR(valueInQuoteCurrency, quoteCurrency, exchangeRates as ExchangeRates);

          if (typeof q.regularMarketChangePercent === "number") {
            holdingPerformance.push({ ticker: h.ticker, changePct: q.regularMarketChangePercent });
          }
        } else if (h.valueInEUR > 0) {
          holdingsValueEUR += h.valueInEUR;
        }
      }
      const totalCashEUR = cashEntries.reduce((sum, c) => sum + c.amountEUR, 0);
      const currentValueEUR = holdingsValueEUR + totalCashEUR;

      // -- Week change from snapshots (compare holdings-only, since snapshots exclude cash) --
      const weekStartValue = await getSnapshotValue(user.id, user.defaultPortfolioId, weekStart);
      let weekChange: number | undefined;
      let weekChangePct: number | undefined;
      if (weekStartValue && weekStartValue > 0) {
        weekChange = holdingsValueEUR - weekStartValue;
        weekChangePct = (weekChange / weekStartValue) * 100;
      }

      // -- Best & worst performer --
      holdingPerformance.sort((a, b) => b.changePct - a.changePct);
      const bestPerformer = holdingPerformance.length > 0 ? holdingPerformance[0] : undefined;
      const worstPerformer = holdingPerformance.length > 1 ? holdingPerformance[holdingPerformance.length - 1] : undefined;

      // -- Dividends received this week --
      const allTransactions = await listTransactions(user.id, undefined, user.defaultPortfolioId);
      const weekDividends = allTransactions
        .filter((tx) => tx.type === "dividend" && tx.date >= weekStart && tx.date <= weekEnd)
        .reduce((sum, tx) => sum + tx.shares * tx.pricePerShare, 0);

      const stats: WeeklyDigestStats = {
        currency: baseCurrency,
        totalValue: currentValueEUR,
        holdingCount: holdings.length,
        weekChange,
        weekChangePct,
        bestPerformer,
        worstPerformer,
        dividendsReceived: weekDividends,
      };

      // -- Build AI summary with real data --
      const holdingsSummary = holdings.map((h) => {
        const q = quotes[h.ticker];
        return {
          ticker: h.ticker,
          name: h.name,
          shares: h.shares,
          avgCost: h.purchasePrice,
          currentPrice: q?.regularMarketPrice,
          changePct: q?.regularMarketChangePercent,
          sector: h.sector || "Unknown",
        };
      });

      const totalCost = holdings.reduce((sum, h) => sum + h.shares * h.purchasePrice, 0);

      const systemPrompt = `You are a concise financial newsletter writer. Write a brief weekly portfolio digest (3-5 sentences) for the user. Be factual and encouraging.
Rules:
- Use the provided performance data (week change, best/worst performer, dividends).
- Focus on portfolio composition and general observations.
- Mention top holdings by weight.
- Suggest one actionable insight if appropriate.
- End with a brief note about portfolio health.
- Keep it under 100 words.
- Write in English.
- Never give specific financial advice.`;

      const weekChangeStr = weekChange !== undefined ? `€${weekChange.toFixed(0)} (${weekChangePct!.toFixed(1)}%)` : "N/A";
      const bestStr = bestPerformer ? `${bestPerformer.ticker} ${bestPerformer.changePct.toFixed(1)}%` : "N/A";
      const worstStr = worstPerformer ? `${worstPerformer.ticker} ${worstPerformer.changePct.toFixed(1)}%` : "N/A";
      const divStr = weekDividends > 0 ? `€${weekDividends.toFixed(2)}` : "None";

      const userPrompt = `Weekly digest for portfolio with ${holdings.length} positions:
Holdings: ${JSON.stringify(holdingsSummary.slice(0, 20))}
Total cost basis: ~€${totalCost.toFixed(0)}
Current value: ~€${currentValueEUR.toFixed(0)}
Cash: ~€${totalCashEUR.toFixed(0)}
Week change: ${weekChangeStr}
Best performer: ${bestStr}
Worst performer: ${worstStr}
Dividends received: ${divStr}
Week: ${weekStart} to ${weekEnd}`;

      const digestModel = await getAiModelForFlow("weekly_digest");
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: digestModel,
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
        model: digestModel,
        promptSystem: systemPrompt,
        promptUser: userPrompt.slice(0, 2000),
        durationMs: 0,
        tokensInput: aiData.usage?.prompt_tokens || 0,
        tokensOutput: aiData.usage?.completion_tokens || 0,
      }).catch(() => {});
      incrementGlobalAiCalls().catch(() => {});
      incrementGlobalAiTokens(tokensUsed).catch(() => {});

      const baseUrl = process.env.APP_BASE_URL || "https://trefolio.com";
      const digestSubject = `Your Weekly Portfolio Digest — ${weekStart} to ${weekEnd}`;
      const html = buildWeeklyDigestEmail(user.displayName, summaryText, stats, baseUrl, weekStart, weekEnd);
      const emailResult = await sendEmail({
        to: user.email,
        subject: digestSubject,
        html,
        userId: user.id,
      });

      logEmailSend({
        resendId: emailResult.messageId,
        userId: user.id,
        emailTo: user.email,
        subject: digestSubject,
        bodyHtml: html,
        status: emailResult.success ? "sent" : "failed",
      }).catch(() => {});

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
