import { YahooProvider } from "@/lib/api-providers/yahoo";
import {
  auditImportBatch,
  fetchExchangeRatesForCurrencies,
  fetchQuotesForTickers,
  planHoldingAutoFixes,
} from "@/lib/import-quality";
import {
  listHoldings,
  listTransactions,
  rebuildHoldings,
  removeHolding,
  updateHolding,
} from "@/lib/db";
import { ensureInitialized } from "@/lib/db/client";
import { num, str } from "@/lib/db/helpers";
import { repairExchangeAliasDuplicatesForUser } from "@/lib/repair-exchange-alias-duplicates";
import type { Holding } from "@/lib/types";

import { codesFromFindings, fingerprintFindings, maxSeverity } from "./fingerprint";
import { auditIntegrityFindings } from "./integrity";
import type { AnomalyScanFinding, AnomalyScanResult } from "./types";

async function listRawHoldingsRows(userId: string): Promise<
  Array<{ id: string; ticker: string; shares: number; purchasePrice: number; exchange: string }>
> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, ticker, shares, purchase_price, exchange FROM holdings WHERE user_id = ?`,
    args: [userId],
  });
  return result.rows.map((r) => ({
    id: str(r.id),
    ticker: str(r.ticker),
    shares: num(r.shares),
    purchasePrice: num(r.purchase_price),
    exchange: str(r.exchange),
  }));
}

async function listRecentSnapshots(
  userId: string,
): Promise<Array<{ date: string; totalValueEur: number }>> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT date, total_value_eur FROM portfolio_snapshots
          WHERE user_id = ?
          ORDER BY date DESC
          LIMIT 8`,
    args: [userId],
  });
  return result.rows
    .map((r) => ({
      date: str(r.date),
      totalValueEur: num(r.total_value_eur),
    }))
    .reverse();
}

function toAnomalyFindings(
  findings: Array<{
    id: string;
    severity: string;
    code: string;
    ticker?: string;
    message: string;
    evidence: Record<string, unknown>;
    autoFixable: boolean;
    fixAction: string;
  }>,
): AnomalyScanFinding[] {
  return findings
    .filter((f) => f.severity === "error" || f.severity === "warn" || f.severity === "info")
    .map((f) => ({
      id: f.id,
      severity: f.severity as AnomalyScanFinding["severity"],
      code: f.code,
      ticker: f.ticker,
      message: f.message,
      evidence: f.evidence,
      autoFixable: f.autoFixable,
      fixAction: f.fixAction,
    }));
}

/** Run deterministic anomaly rules for one user.
 *  Also scans empty ledgers that still have snapshot history (orphaned resets).
 */
export async function scanUserPortfolioAnomalies(userId: string): Promise<AnomalyScanResult | null> {
  const holdings = await listHoldings(userId);
  const [rawHoldings, transactions, recentSnapshots] = await Promise.all([
    listRawHoldingsRows(userId),
    listTransactions(userId),
    listRecentSnapshots(userId),
  ]);

  const maxSnap = Math.max(0, ...recentSnapshots.map((s) => s.totalValueEur));
  const emptyWithHistory =
    holdings.length === 0 && transactions.length === 0 && maxSnap >= 100;

  if (holdings.length === 0 && !emptyWithHistory) return null;

  if (emptyWithHistory) {
    const integrity = auditIntegrityFindings({
      holdings: [],
      rawHoldings: [],
      transactions: [],
      quotes: {},
      exchangeRates: {},
      recentSnapshots,
    });
    const findings = integrity.filter((f) => f.severity === "error" || f.severity === "warn");
    if (findings.length === 0) return null;
    return {
      userId,
      findings,
      severity: maxSeverity(findings),
      codes: codesFromFindings(findings),
      fingerprint: fingerprintFindings(findings),
    };
  }

  const yahoo = new YahooProvider();
  const quotes = await fetchQuotesForTickers(
    yahoo,
    holdings.map((h) => ({ ticker: h.ticker, exchange: h.exchange })),
  );
  const exchangeRates = await fetchExchangeRatesForCurrencies(yahoo, [
    ...holdings.map((h) => h.displayCurrency),
    ...Object.values(quotes).map((q) => q.currency),
  ]);

  const quality = auditImportBatch({
    transactions: [],
    holdings: holdings.map((h) => ({
      id: h.id,
      ticker: h.ticker,
      name: h.name,
      isin: h.isin,
      shares: h.shares,
      purchasePrice: h.purchasePrice,
      displayCurrency: h.displayCurrency,
      exchange: h.exchange,
      valueInEUR: h.valueInEUR,
    })),
    quotes,
    exchangeRates,
  });

  const integrity = auditIntegrityFindings({
    holdings,
    rawHoldings,
    transactions,
    quotes,
    exchangeRates,
    recentSnapshots,
  });

  const findings = [...toAnomalyFindings(quality), ...integrity].filter(
    (f) => f.severity === "error" || f.severity === "warn",
  );

  if (findings.length === 0) return null;

  return {
    userId,
    findings,
    severity: maxSeverity(findings),
    codes: codesFromFindings(findings),
    fingerprint: fingerprintFindings(findings),
  };
}

export async function applySafeAnomalyFixes(userId: string, findings: AnomalyScanFinding[]): Promise<{
  fixedCount: number;
  findings: AnomalyScanFinding[];
  rebuilt: boolean;
  deletedGhosts: number;
}> {
  let fixedCount = 0;
  let rebuilt = false;
  let deletedGhosts = 0;
  const nextFindings = findings.map((f) => ({ ...f }));

  // Ghost deletes
  for (const f of nextFindings) {
    if (f.fixAction !== "delete_ghost_holding" || !f.autoFixable || !f.holdingId) continue;
    const ok = await removeHolding(userId, f.holdingId);
    if (ok) {
      f.evidence = { ...f.evidence, fixed: true };
      fixedCount += 1;
      deletedGhosts += 1;
    }
  }

  // Collapse CPH/OMK (and similar) duplicate lots
  if (nextFindings.some((f) => f.fixAction === "collapse_venue_aliases" && f.autoFixable)) {
    const summary = await repairExchangeAliasDuplicatesForUser(userId);
    for (const f of nextFindings) {
      if (f.fixAction === "collapse_venue_aliases" && f.autoFixable) {
        f.evidence = { ...f.evidence, fixed: true, summary };
        fixedCount += 1;
      }
    }
  }

  // Rebuild holdings once if requested
  if (nextFindings.some((f) => f.fixAction === "rebuild_holdings" && f.autoFixable)) {
    await rebuildHoldings(userId);
    rebuilt = true;
    for (const f of nextFindings) {
      if (f.fixAction === "rebuild_holdings" && f.autoFixable) {
        f.evidence = { ...f.evidence, fixed: true };
        fixedCount += 1;
      }
    }
  }

  // Import-quality style holding plans
  let holdings = await listHoldings(userId);
  const yahoo = new YahooProvider();
  const quotes = await fetchQuotesForTickers(
    yahoo,
    holdings.map((h) => ({ ticker: h.ticker, exchange: h.exchange })),
  );
  const exchangeRates = await fetchExchangeRatesForCurrencies(yahoo, [
    ...holdings.map((h) => h.displayCurrency),
    ...Object.values(quotes).map((q) => q.currency),
  ]);

  // Map integrity recompute_value_in_eur into import-quality style findings for planning
  const qualityLike = nextFindings
    .filter((f) =>
      ["recompute_value_in_eur", "align_display_currency", "normalize_gbx", "pad_hk_ticker", "fetch_fx"].includes(
        f.fixAction,
      ),
    )
    .map((f) => ({
      id: f.id,
      severity: f.severity,
      code: f.code as import("@/lib/import-quality").ImportQualityCode,
      ticker: f.ticker,
      message: f.message,
      evidence: f.evidence,
      autoFixable: f.autoFixable,
      fixAction: f.fixAction as
        | "fetch_fx"
        | "align_display_currency"
        | "normalize_gbx"
        | "pad_hk_ticker"
        | "recompute_value_in_eur"
        | "set_price_per_share"
        | "none",
    }));

  // Also re-audit for fresh quality findings that are auto-fixable
  const freshQuality = auditImportBatch({
    transactions: [],
    holdings: holdings.map((h) => ({
      id: h.id,
      ticker: h.ticker,
      name: h.name,
      isin: h.isin,
      shares: h.shares,
      purchasePrice: h.purchasePrice,
      displayCurrency: h.displayCurrency,
      exchange: h.exchange,
      valueInEUR: h.valueInEUR,
    })),
    quotes,
    exchangeRates,
  }).filter((f) => f.autoFixable);

  const { plans } = planHoldingAutoFixes(
    holdings.map((h) => ({
      id: h.id,
      ticker: h.ticker,
      name: h.name,
      isin: h.isin,
      shares: h.shares,
      purchasePrice: h.purchasePrice,
      displayCurrency: h.displayCurrency,
      exchange: h.exchange,
      valueInEUR: h.valueInEUR,
      assetType: h.assetType,
      sector: h.sector,
      region: h.region,
      assetClass: h.assetClass,
      accountId: h.accountId,
      tags: h.tags,
    })) as Holding[],
    [...qualityLike, ...freshQuality] as Parameters<typeof planHoldingAutoFixes>[1],
    quotes,
    exchangeRates,
  );

  for (const plan of plans) {
    const updated = await updateHolding(userId, plan.holdingId, plan.updates);
    if (updated) {
      fixedCount += plan.findingIds.length;
      for (const fid of plan.findingIds) {
        const f = nextFindings.find((x) => x.id === fid);
        if (f) f.evidence = { ...f.evidence, fixed: true };
      }
    }
  }

  holdings = await listHoldings(userId);
  return { fixedCount, findings: nextFindings, rebuilt, deletedGhosts };
}
