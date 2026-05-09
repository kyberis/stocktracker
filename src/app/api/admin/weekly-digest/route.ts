import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import {
  findUserById,
  getDigestBaselineSnapshot,
  listHoldings,
  listCashEntries,
  listTransactions,
  listPortfolios,
  insertAiLog,
  hasDigestForWeek,
  insertDigest,
  getDefaultPortfolio,
  logEmailSend,
} from "@/lib/db";
import { fetchGatewayChatCompletions, resolveGatewayApiKey } from "@/lib/ai/gateway";
import { getAiModelForFlow } from "@/lib/db/settings";
import { sendEmail } from "@/lib/email";
import { incrementGlobalAiCalls, incrementGlobalAiTokens } from "@/lib/rate-limit";
import { getQuotesWithCache, getRatesWithCache } from "@/lib/quote-cache";
import { convertToEUR, resolveQuoteCurrency } from "@/lib/utils";
import { buildWeeklyDigestEmailHtml } from "@/lib/weekly-digest-email";
import { computeNetBuyFlowEUR, isDigestBaselineTooOld } from "@/lib/weekly-digest-math";
import { withMetrics } from "@/lib/with-metrics";
import type { WeeklyDigestStats } from "@/lib/db/weekly-digest";
import type { ExchangeRates } from "@/lib/types";

export const maxDuration = 120;

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

export const POST = withMetrics("/api/admin/weekly-digest", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  let userId: string;
  let sendEmail_: boolean;
  let force: boolean;
  try {
    const body = await req.json();
    userId = body.userId;
    sendEmail_ = body.sendEmail !== false;
    force = body.force === true;
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const gatewayConfigured = await resolveGatewayApiKey();
  if (!gatewayConfigured) {
    return NextResponse.json({ error: "AI Gateway not configured" }, { status: 500 });
  }

  const user = await findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { weekStart, weekEnd } = getWeekRange();

  if (!force && await hasDigestForWeek(userId, weekEnd)) {
    return NextResponse.json({ error: "Digest already exists for this week. Use force=true to regenerate." }, { status: 409 });
  }

  let defaultPortfolio: string;
  try {
    const p = await getDefaultPortfolio(userId);
    defaultPortfolio = p.id;
  } catch {
    return NextResponse.json({ error: "User has no portfolio" }, { status: 400 });
  }

  const holdings = await listHoldings(userId, defaultPortfolio);
  const cashEntries = await listCashEntries(userId, defaultPortfolio);

  if (holdings.length === 0) {
    return NextResponse.json({ error: "User has no holdings in default portfolio" }, { status: 400 });
  }

  // -- Resolve portfolio currency --
  const portfolios = await listPortfolios(userId);
  const portfolio = portfolios.find((p) => p.id === defaultPortfolio);
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

  const allTransactions = await listTransactions(userId, undefined, defaultPortfolio);
  const weekDividends = allTransactions
    .filter((tx) => tx.type === "dividend" && tx.date >= weekStart && tx.date <= weekEnd)
    .reduce((sum, tx) => sum + tx.shares * tx.pricePerShare, 0);
  const netBuyFlowEUR = computeNetBuyFlowEUR(allTransactions, weekStart, weekEnd);

  const baseline = await getDigestBaselineSnapshot(userId, defaultPortfolio, weekStart);
  let weekChange: number | undefined;
  let weekChangePct: number | undefined;
  let weekChangeBaselineDate: string | undefined;
  if (baseline && !isDigestBaselineTooOld(baseline.snapshotDay, weekStart)) {
    weekChange = holdingsValueEUR - baseline.totalValueEur;
    weekChangePct = (weekChange / baseline.totalValueEur) * 100;
    weekChangeBaselineDate = baseline.snapshotDay;
  }

  // -- Best & worst performer --
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

  const digestModel = await getAiModelForFlow("weekly_digest_admin");
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
    return NextResponse.json({ error: `AI Gateway error: ${errText.slice(0, 300)}` }, { status: 502 });
  }

  const aiData = await openaiRes.json();
  const summaryText = aiData.choices?.[0]?.message?.content?.trim() || "";
  const tokensUsed = aiData.usage?.total_tokens || 0;

  if (!summaryText) {
    return NextResponse.json({ error: "AI returned empty summary" }, { status: 502 });
  }

  const digestId = await insertDigest({
    userId,
    portfolioId: defaultPortfolio,
    weekStart,
    weekEnd,
    summaryText,
    stats,
  });

  insertAiLog({
    userId,
    source: "weekly_digest_admin",
    model: digestModel,
    promptSystem: systemPrompt,
    promptUser: userPrompt.slice(0, 2000),
    durationMs: 0,
    tokensInput: aiData.usage?.prompt_tokens || 0,
    tokensOutput: aiData.usage?.completion_tokens || 0,
  }).catch(() => {});
  incrementGlobalAiCalls().catch(() => {});
  incrementGlobalAiTokens(tokensUsed).catch(() => {});

  let emailSent = false;
  const weeklyEmailDisabled = process.env.WEEKLY_DIGEST_EMAIL_DISABLED === "1";
  if (sendEmail_ && user.email && !weeklyEmailDisabled) {
    try {
      const baseUrl = process.env.APP_BASE_URL || "https://trefolio.com";
      const digestSubject = `Your Weekly Portfolio Digest — ${weekStart} to ${weekEnd}`;
      const html = buildWeeklyDigestEmailHtml(summaryText, stats, baseUrl, weekStart, weekEnd, {
        fractionDigits: 0,
        includeUnsubscribePlaceholder: false,
      });
      const emailResult = await sendEmail({
        to: user.email,
        subject: digestSubject,
        html,
        userId,
      });
      emailSent = Boolean(emailResult.success && !emailResult.suppressed);

      logEmailSend({
        resendId: emailResult.messageId,
        userId,
        emailTo: user.email,
        subject: digestSubject,
        bodyHtml: html,
        status: emailResult.suppressed ? "suppressed" : emailResult.success ? "sent" : "failed",
      }).catch(() => {});
    } catch (e) {
      console.error("[admin/weekly-digest] email send failed:", e);
    }
  }

  return NextResponse.json({
    ok: true,
    digestId,
    weekStart,
    weekEnd,
    summaryText,
    stats,
    emailSent,
    weeklyDigestEmailSkipped: weeklyEmailDisabled,
    tokensUsed,
  });
});
