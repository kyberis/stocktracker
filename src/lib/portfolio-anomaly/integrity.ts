import { createHash } from "crypto";

import { deriveHoldingsFromTransactions } from "@/lib/derive-holdings";
import { convertToEUR, hasExchangeRate, resolveQuoteCurrency } from "@/lib/utils";
import type { ExchangeRates, Holding, HoldingAssetType, Transaction } from "@/lib/types";
import type { MarketQuoteRef } from "@/lib/import-quality";

import type { AnomalyScanFinding } from "./types";

function findingId(code: string, key: string): string {
  return `${code}:${key}`;
}

const SHARE_EPS = 0.0001;
const SNAPSHOT_SPIKE_PCT = 0.5;
const SNAPSHOT_SPIKE_ABS_EUR = 1000;
const VALUE_EUR_RATIO_WARN = 10;

export function auditIntegrityFindings(args: {
  holdings: Holding[];
  rawHoldings?: Array<{ id: string; ticker: string; shares: number; purchasePrice: number; exchange: string }>;
  transactions: Transaction[];
  quotes: Record<string, MarketQuoteRef>;
  exchangeRates: ExchangeRates;
  recentSnapshots?: Array<{ date: string; totalValueEur: number }>;
}): AnomalyScanFinding[] {
  const findings: AnomalyScanFinding[] = [];
  const seen = new Set<string>();
  const push = (f: AnomalyScanFinding) => {
    if (seen.has(f.id)) return;
    seen.add(f.id);
    findings.push(f);
  };

  // Ghost holdings (shares <= 0 still in DB)
  for (const h of args.rawHoldings ?? []) {
    if (h.shares > 0) continue;
    push({
      id: findingId("ghost_holding", h.id),
      severity: "warn",
      code: "ghost_holding",
      ticker: h.ticker,
      holdingId: h.id,
      message: `Ghost holding ${h.ticker || h.id} has shares=${h.shares}.`,
      evidence: { shares: h.shares, holdingId: h.id },
      autoFixable: true,
      fixAction: "delete_ghost_holding",
    });
  }

  // Zero cost basis / missing exchange
  for (const h of args.holdings) {
    if (h.shares > 0 && !(h.purchasePrice > 0)) {
      push({
        id: findingId("zero_cost_basis", h.ticker),
        severity: "warn",
        code: "zero_cost_basis",
        ticker: h.ticker,
        holdingId: h.id,
        message: `${h.ticker} has shares but purchase price is ${h.purchasePrice}.`,
        evidence: { shares: h.shares, purchasePrice: h.purchasePrice },
        autoFixable: false,
        fixAction: "none",
      });
    }
    if (h.shares > 0 && h.ticker && !h.exchange?.trim()) {
      // Crypto tickers often have no exchange; skip obvious crypto-like symbols with USD/EUR only
      const looksStock = /^[A-Z0-9.-]+$/i.test(h.ticker) && !h.ticker.includes("-USD");
      if (looksStock && h.assetType !== "crypto") {
        push({
          id: findingId("missing_exchange", h.ticker),
          severity: "info",
          code: "missing_exchange",
          ticker: h.ticker,
          holdingId: h.id,
          message: `${h.ticker} is missing an exchange code.`,
          evidence: { ticker: h.ticker },
          autoFixable: false,
          fixAction: "none",
        });
      }
    }
  }

  // Ledger vs holdings mismatch (transaction-sourced positions only when txs exist)
  if (args.transactions.length > 0) {
    const meta = new Map<
      string,
      {
        id: string;
        name: string;
        isin: string;
        assetType: HoldingAssetType;
        displayCurrency: string;
        accountId?: string;
        tags?: string[];
      }
    >();
    for (const h of args.holdings) {
      const key = `${h.ticker.toUpperCase()}|${(h.exchange || "").toUpperCase()}`;
      meta.set(key, {
        id: h.id || createHash("sha1").update(key).digest("hex").slice(0, 12),
        name: h.name,
        isin: h.isin || "",
        assetType: (h.assetType || "stock") as HoldingAssetType,
        displayCurrency: h.displayCurrency,
        accountId: h.accountId,
        tags: h.tags,
      });
    }
    let derived: Holding[] = [];
    try {
      derived = deriveHoldingsFromTransactions(args.transactions, meta);
    } catch {
      push({
        id: findingId("ledger_holdings_mismatch", "derive_error"),
        severity: "error",
        code: "ledger_holdings_mismatch",
        message: "Failed to derive holdings from transactions (possible oversell or corrupt ledger).",
        evidence: { transactionCount: args.transactions.length },
        autoFixable: false,
        fixAction: "none",
      });
      derived = [];
    }

    const storedByKey = new Map(
      args.holdings.map((h) => [
        `${h.ticker.toUpperCase()}|${(h.exchange || "").toUpperCase()}`,
        h,
      ]),
    );
    const derivedByKey = new Map(
      derived.map((h) => [
        `${h.ticker.toUpperCase()}|${(h.exchange || "").toUpperCase()}`,
        h,
      ]),
    );

    for (const [key, stored] of storedByKey) {
      // SnapTrade positions are source-of-truth when present — skip ledger compare for those keys
      // We don't have source on Holding type after listHoldings merge; compare all transaction-derived.
      const d = derivedByKey.get(key);
      if (!d) {
        if (stored.shares > SHARE_EPS) {
          push({
            id: findingId("ledger_holdings_mismatch", `extra:${key}`),
            severity: "warn",
            code: "ledger_holdings_mismatch",
            ticker: stored.ticker,
            holdingId: stored.id,
            message: `${stored.ticker} exists in holdings but not in derived ledger positions.`,
            evidence: { storedShares: stored.shares, derivedShares: 0 },
            autoFixable: false,
            fixAction: "rebuild_holdings",
          });
        }
        continue;
      }
      if (Math.abs(stored.shares - d.shares) > SHARE_EPS) {
        push({
          id: findingId("ledger_holdings_mismatch", key),
          severity: "error",
          code: "ledger_holdings_mismatch",
          ticker: stored.ticker,
          holdingId: stored.id,
          message: `${stored.ticker} shares mismatch: holdings=${stored.shares}, ledger=${d.shares}.`,
          evidence: { storedShares: stored.shares, derivedShares: d.shares },
          autoFixable: false,
          fixAction: "rebuild_holdings",
        });
      }
    }
  }

  // value_in_eur inconsistent vs live quote
  for (const h of args.holdings) {
    if (!(h.shares > 0) || !(h.valueInEUR > 0)) continue;
    const q = args.quotes[h.ticker] || args.quotes[h.ticker.toUpperCase()];
    if (!q?.price) continue;
    const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, q.currency);
    if (!hasExchangeRate(quoteCurrency, args.exchangeRates) && quoteCurrency !== "EUR") continue;
    const live = convertToEUR(h.shares * q.price, quoteCurrency, args.exchangeRates);
    if (!Number.isFinite(live) || live <= 0) continue;
    const ratio = Math.max(live, h.valueInEUR) / Math.min(live, h.valueInEUR);
    if (ratio >= VALUE_EUR_RATIO_WARN) {
      push({
        id: findingId("value_eur_inconsistent", h.ticker),
        severity: "error",
        code: "value_eur_inconsistent",
        ticker: h.ticker,
        holdingId: h.id,
        message: `${h.ticker} stored value_in_eur (€${h.valueInEUR.toFixed(0)}) differs ~${ratio.toFixed(1)}× from live (€${live.toFixed(0)}).`,
        evidence: { stored: h.valueInEUR, live, ratio },
        autoFixable: true,
        fixAction: "recompute_value_in_eur",
      });
    }
  }

  // Snapshot spike day-over-day
  const snaps = [...(args.recentSnapshots ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  if (snaps.length >= 2) {
    const prev = snaps[snaps.length - 2];
    const curr = snaps[snaps.length - 1];
    if (prev.totalValueEur > 0) {
      const delta = Math.abs(curr.totalValueEur - prev.totalValueEur);
      const pct = delta / prev.totalValueEur;
      if (pct >= SNAPSHOT_SPIKE_PCT && delta >= SNAPSHOT_SPIKE_ABS_EUR) {
        push({
          id: findingId("snapshot_spike", curr.date),
          severity: "warn",
          code: "snapshot_spike",
          message: `Portfolio snapshot jumped ${(pct * 100).toFixed(0)}% (€${delta.toFixed(0)}) from ${prev.date} to ${curr.date}.`,
          evidence: {
            prevDate: prev.date,
            currDate: curr.date,
            prevValue: prev.totalValueEur,
            currValue: curr.totalValueEur,
            pct,
          },
          autoFixable: false,
          fixAction: "none",
        });
      }
    }
  }

  // Live ledger empty but snapshot history shows a real portfolio — usually an
  // accidental Reset Portfolio after holdings were invisible (blank portfolio_id).
  const maxSnap = Math.max(0, ...(args.recentSnapshots ?? []).map((s) => s.totalValueEur));
  const openHoldings = args.holdings.filter((h) => h.shares > 0).length;
  if (
    openHoldings === 0 &&
    args.transactions.length === 0 &&
    maxSnap >= 100 &&
    (args.recentSnapshots?.length ?? 0) > 0
  ) {
    push({
      id: findingId("empty_ledger_with_history", "all"),
      severity: "error",
      code: "empty_ledger_with_history",
      message: `Live ledger is empty but snapshot history peaked at €${maxSnap.toFixed(0)}. Likely accidental portfolio reset or failed import visibility.`,
      evidence: {
        maxSnapshotEur: maxSnap,
        snapshotCount: args.recentSnapshots?.length ?? 0,
        holdings: 0,
        transactions: 0,
      },
      autoFixable: false,
      fixAction: "none",
    });
  }

  return findings;
}
