import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listHoldings, updateHolding } from "@/lib/db";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { withMetrics } from "@/lib/with-metrics";
import {
  auditImportBatch,
  buildQualityReport,
  fetchExchangeRatesForCurrencies,
  fetchQuotesForTickers,
  planHoldingAutoFixes,
  summarizeImportQuality,
} from "@/lib/import-quality";

/**
 * POST /api/import/quality-repair
 * Audit existing holdings against live market data, auto-fix safe issues,
 * return findings + optional AI summary. Body JSON: { portfolioId?, locale?, confirmFindingIds? }
 */
export const POST = withMetrics("/api/import/quality-repair", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  let body: { portfolioId?: string; locale?: string; confirmFindingIds?: string[] } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const holdings = await listHoldings(session.userId, body.portfolioId);
  if (holdings.length === 0) {
    return NextResponse.json(
      buildQualityReport([], "No holdings to audit."),
    );
  }

  const yahoo = new YahooProvider();
  const quotes = await fetchQuotesForTickers(
    yahoo,
    holdings.map((h) => ({ ticker: h.ticker, exchange: h.exchange })),
  );
  let rates = await fetchExchangeRatesForCurrencies(yahoo, [
    ...holdings.map((h) => h.displayCurrency),
    ...Object.values(quotes).map((q) => q.currency),
  ]);

  const holdingInputs = holdings.map((h) => ({
    id: h.id,
    ticker: h.ticker,
    name: h.name,
    isin: h.isin,
    shares: h.shares,
    purchasePrice: h.purchasePrice,
    displayCurrency: h.displayCurrency,
    exchange: h.exchange,
    valueInEUR: h.valueInEUR,
  }));

  let findings = auditImportBatch({
    transactions: [],
    holdings: holdingInputs,
    quotes,
    exchangeRates: rates,
  });

  // Refresh FX for any missing pairs, then re-audit
  if (findings.some((f) => f.code === "missing_fx")) {
    rates = await fetchExchangeRatesForCurrencies(yahoo, [
      ...holdings.map((h) => h.displayCurrency),
      ...Object.values(quotes).map((q) => q.currency),
      ...findings.map((f) => String(f.evidence.currency || "")),
    ]);
    findings = auditImportBatch({
      transactions: [],
      holdings: holdingInputs,
      quotes,
      exchangeRates: rates,
    });
    for (const f of findings) {
      if (f.code === "missing_fx") {
        const pair = String(f.evidence.pair || `EUR${f.evidence.currency || ""}`);
        if (rates[pair] || (f.evidence.currency && rates[`EUR${f.evidence.currency}`])) {
          f.fixed = true;
          f.after = { fetched: true };
        }
      }
    }
  }

  const confirmSet = new Set(body.confirmFindingIds || []);
  // Only auto-fix safe findings; confirmed propose findings (recent_trade) can update price
  for (const f of findings) {
    if (f.code === "recent_trade_price" && confirmSet.has(f.id) && f.ticker) {
      f.autoFixable = true;
      f.fixAction = "set_price_per_share";
    }
  }

  const { plans, findings: afterPlan } = planHoldingAutoFixes(
    holdings,
    findings,
    quotes,
    rates,
  );

  // Handle confirmed price overrides
  for (const f of afterPlan) {
    if (f.fixAction !== "set_price_per_share" || !f.fixed && !confirmSet.has(f.id)) continue;
    if (!confirmSet.has(f.id) || !f.ticker) continue;
    const h = holdings.find((x) => x.ticker === f.ticker);
    const q = quotes[f.ticker];
    if (!h || !q) continue;
    await updateHolding(session.userId, h.id, { purchasePrice: q.price });
    f.fixed = true;
    f.before = { purchasePrice: h.purchasePrice };
    f.after = { purchasePrice: q.price };
  }

  for (const plan of plans) {
    if (Object.keys(plan.updates).length === 0) continue;
    await updateHolding(session.userId, plan.holdingId, plan.updates);
  }

  const aiSummary = await summarizeImportQuality({
    findings: afterPlan,
    broker: "portfolio-repair",
    locale: body.locale,
    headers: req.headers,
  });

  return NextResponse.json(buildQualityReport(afterPlan, aiSummary));
});
