import { NextRequest } from "next/server";
import {
  getDigestEligibleUsers,
  getDigestBaselineSnapshot,
  hasDigestForWeek,
  insertDigest,
  isFeatureEnabledForUser,
  listHoldings,
  listCashEntries,
  listTransactions,
  listPortfolios,
  insertAiLog,
  logEmailSend,
} from "@/lib/db";
import { fetchGatewayChatCompletions, resolveGatewayApiKey } from "@/lib/ai/gateway";
import { getAiModelForFlow } from "@/lib/db/settings";
import { sendEmail } from "@/lib/email";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { incrementGlobalAiCalls, incrementGlobalAiTokens } from "@/lib/rate-limit";
import { getQuotesWithCache, getRatesWithCache } from "@/lib/quote-cache";
import { convertToEUR, resolveQuoteCurrency } from "@/lib/utils";
import { buildWeeklyDigestEmailHtml } from "@/lib/weekly-digest-email";
import { computeNetBuyFlowEUR, isDigestBaselineTooOld } from "@/lib/weekly-digest-math";
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

interface UserContext {
  user: { id: string; email: string; displayName: string; defaultPortfolioId: string };
  holdings: Awaited<ReturnType<typeof listHoldings>>;
  cashEntries: Awaited<ReturnType<typeof listCashEntries>>;
  baseCurrency: string;
}

const DIGEST_CONCURRENCY = 3;

const runWeeklyDigest = withCronLogging("weekly-digest", async () => {
  const gatewayConfigured = await resolveGatewayApiKey();
  if (!gatewayConfigured) {
    return { skipped: true, reason: "AI Gateway not configured" };
  }

  const { weekStart, weekEnd } = getWeekRange();
  const users = await getDigestEligibleUsers();

  let skipped = 0;

  // -- Phase 1: load holdings for all eligible users and collect all tickers/currencies --
  const allTickers = new Set<string>();
  const allCurrencies = new Set<string>();
  let hasGBX = false;
  const prepared: UserContext[] = [];

  for (const user of users) {
    if (!user.defaultPortfolioId) { skipped++; continue; }
    if (!(await isFeatureEnabledForUser("weekly_digest_enabled", user.id))) { skipped++; continue; }
    if (await hasDigestForWeek(user.id, weekEnd)) { skipped++; continue; }

    const [holdings, cashEntries, portfolios] = await Promise.all([
      listHoldings(user.id, user.defaultPortfolioId),
      listCashEntries(user.id, user.defaultPortfolioId),
      listPortfolios(user.id),
    ]);

    if (holdings.length === 0) { skipped++; continue; }

    const portfolio = portfolios.find((p) => p.id === user.defaultPortfolioId);
    for (const h of holdings) {
      if (h.ticker) allTickers.add(h.ticker);
      const cur = h.displayCurrency.toUpperCase();
      if (cur !== "EUR" && cur !== "GBX") allCurrencies.add(cur);
      if (cur === "GBX" || cur === "GBP") hasGBX = true;
    }

    prepared.push({
      user,
      holdings,
      cashEntries,
      baseCurrency: portfolio?.currency || "EUR",
    });
  }

  if (prepared.length === 0) {
    return { weekStart, weekEnd, eligible: users.length, sent: 0, skipped, errors: 0 };
  }

  // -- Phase 2: single batch fetch of quotes & FX rates --
  const neededPairs = FX_PAIRS.filter((pair) => allCurrencies.has(pair.substring(3)));
  if (hasGBX && !neededPairs.includes("EURGBP")) neededPairs.push("EURGBP");

  const [quotes, exchangeRates] = await Promise.all([
    getQuotesWithCache([...allTickers]),
    getRatesWithCache(neededPairs),
  ]);

  const digestModel = await getAiModelForFlow("weekly_digest");

  // -- Phase 3: process users with bounded concurrency --
  let sent = 0;
  let errors = 0;
  let skippedOptOut = 0;
  let emailSkippedByConfig = 0;
  const weeklyEmailDisabledGlobal = process.env.WEEKLY_DIGEST_EMAIL_DISABLED === "1";

  async function processUser(ctx: UserContext): Promise<void> {
    const { user, holdings, cashEntries, baseCurrency } = ctx;
    try {
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

      const allTransactions = await listTransactions(user.id, undefined, user.defaultPortfolioId);
      const weekDividends = allTransactions
        .filter((tx) => tx.type === "dividend" && tx.date >= weekStart && tx.date <= weekEnd)
        .reduce((sum, tx) => sum + tx.shares * tx.pricePerShare, 0);
      const netBuyFlowEUR = computeNetBuyFlowEUR(allTransactions, weekStart, weekEnd);

      // Holdings vs snapshot baseline (holdings-only; snapshots exclude cash). Stale baselines omitted.
      const baseline = await getDigestBaselineSnapshot(user.id, user.defaultPortfolioId, weekStart);
      let weekChange: number | undefined;
      let weekChangePct: number | undefined;
      let weekChangeBaselineDate: string | undefined;
      if (baseline && !isDigestBaselineTooOld(baseline.snapshotDay, weekStart)) {
        weekChange = holdingsValueEUR - baseline.totalValueEur;
        weekChangePct = (weekChange / baseline.totalValueEur) * 100;
        weekChangeBaselineDate = baseline.snapshotDay;
      }

      holdingPerformance.sort((a, b) => b.changePct - a.changePct);
      const bestPerformer = holdingPerformance.length > 0 ? holdingPerformance[0] : undefined;
      const worstPerformer = holdingPerformance.length > 1 ? holdingPerformance[holdingPerformance.length - 1] : undefined;

      const stats: WeeklyDigestStats = {
        currency: baseCurrency,
        totalValue: currentValueEUR,
        holdingCount: holdings.length,
        weekChange,
        weekChangePct,
        weekChangeBaselineDate,
        netBuyFlowEUR,
        bestPerformer,
        worstPerformer,
        dividendsReceived: weekDividends,
      };

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
- Use the provided performance data (holdings vs snapshot, best/worst session move, dividends, estimated net buy flow).
- The "holdings vs snapshot" figure is NOT realized profit or "money made" — it is the change in holdings value versus a saved portfolio snapshot and can include trades, deposits deployed into stocks, or market moves. Do not describe it as profit, gain you earned, or money you made.
- Best/worst tickers use the provider's latest session % change, not a full calendar week.
- Focus on portfolio composition and general observations.
- Mention top holdings by weight.
- Suggest one actionable insight if appropriate.
- End with a brief note about portfolio health.
- Keep it under 100 words.
- Write in English.
- Never give specific financial advice.`;

      const weekChangeStr = weekChange !== undefined
        ? `€${weekChange.toFixed(0)} (${weekChangePct!.toFixed(1)}%) vs snapshot${weekChangeBaselineDate ? ` (${weekChangeBaselineDate})` : ""}`
        : "N/A (no recent snapshot baseline — omitted)";
      const bestStr = bestPerformer ? `${bestPerformer.ticker} ${bestPerformer.changePct.toFixed(1)}% (session)` : "N/A";
      const worstStr = worstPerformer ? `${worstPerformer.ticker} ${worstPerformer.changePct.toFixed(1)}% (session)` : "N/A";
      const divStr = weekDividends > 0 ? `€${weekDividends.toFixed(2)}` : "None";
      const flowStr = `€${netBuyFlowEUR.toFixed(0)} (buys minus sells, estimate)`;

      const userPrompt = `Weekly digest for portfolio with ${holdings.length} positions:
Holdings: ${JSON.stringify(holdingsSummary.slice(0, 20))}
Total cost basis: ~€${totalCost.toFixed(0)}
Current value: ~€${currentValueEUR.toFixed(0)}
Cash: ~€${totalCashEUR.toFixed(0)}
Holdings vs prior snapshot (not realized P/L): ${weekChangeStr}
Estimated net buy flow this week: ${flowStr}
Best performer (session %): ${bestStr}
Worst performer (session %): ${worstStr}
Dividends received: ${divStr}
Week: ${weekStart} to ${weekEnd}`;

      const openaiRes = await fetchGatewayChatCompletions({
        model: digestModel,
        max_tokens: 300,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        console.error(`Weekly digest AI Gateway error for user ${user.id}:`, errText);
        errors++;
        return;
      }

      const aiData = await openaiRes.json();
      const summaryText = aiData.choices?.[0]?.message?.content?.trim() || "";
      const tokensUsed = aiData.usage?.total_tokens || 0;

      if (!summaryText) {
        errors++;
        return;
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

      if (weeklyEmailDisabledGlobal) {
        emailSkippedByConfig++;
      } else {
        const baseUrl = process.env.APP_BASE_URL || "https://trefolio.com";
        const digestSubject = `Your Weekly Portfolio Digest — ${weekStart} to ${weekEnd}`;
        const html = buildWeeklyDigestEmailHtml(summaryText, stats, baseUrl, weekStart, weekEnd, { fractionDigits: 2 });
        // sendEmail enforces profile / one-click unsubscribe before Resend (see isMarketingEmailAllowed + sendEmail).
        const emailResult = await sendEmail({
          to: user.email,
          subject: digestSubject,
          html,
          userId: user.id,
        });

        const emailStatus = emailResult.suppressed ? "suppressed" : emailResult.success ? "sent" : "failed";
        logEmailSend({
          resendId: emailResult.messageId,
          userId: user.id,
          emailTo: user.email,
          subject: digestSubject,
          bodyHtml: html,
          status: emailStatus,
        }).catch(() => {});

        if (emailResult.suppressed) {
          skippedOptOut++;
        } else if (emailResult.success) {
          sent++;
        } else {
          errors++;
        }
      }
    } catch (err) {
      console.error(`Weekly digest error for user ${ctx.user.id}:`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  for (let i = 0; i < prepared.length; i += DIGEST_CONCURRENCY) {
    const batch = prepared.slice(i, i + DIGEST_CONCURRENCY);
    await Promise.all(batch.map(processUser));
  }

  return {
    weekStart,
    weekEnd,
    eligible: users.length,
    sent,
    skipped,
    skippedOptOut,
    errors,
    weeklyDigestEmailDisabled: weeklyEmailDisabledGlobal,
    emailSkippedByConfig,
  };
});

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth("weekly-digest", req);
  if (authError) return authError;
  const result = await runWeeklyDigest();
  return Response.json(result);
}
