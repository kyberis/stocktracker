import { describe, expect, it } from "vitest";

import { auditIntegrityFindings } from "./integrity";
import { fingerprintFindings, maxSeverity, codesFromFindings } from "./fingerprint";
import { buildDeterministicExplanation } from "./explain";
import type { AnomalyScanFinding } from "./types";
import type { Holding, Transaction } from "@/lib/types";

const baseHolding = (over: Partial<Holding> = {}): Holding => ({
  id: "h1",
  name: "Apple",
  ticker: "AAPL",
  isin: "",
  assetType: "stock",
  shares: 10,
  purchasePrice: 100,
  displayCurrency: "USD",
  exchange: "NASDAQ",
  valueInEUR: 900,
  sector: "",
  region: "",
  assetClass: "",
  accountId: "",
  tags: [],
  ...over,
});

describe("portfolio-anomaly fingerprint", () => {
  it("is stable for same findings in any order", () => {
    const a: AnomalyScanFinding[] = [
      {
        id: "1",
        severity: "error",
        code: "missing_fx",
        ticker: "AAPL",
        message: "x",
        evidence: {},
        autoFixable: false,
        fixAction: "none",
      },
      {
        id: "2",
        severity: "warn",
        code: "ghost_holding",
        ticker: "MSFT",
        message: "y",
        evidence: {},
        autoFixable: true,
        fixAction: "delete_ghost_holding",
      },
    ];
    const b = [...a].reverse();
    expect(fingerprintFindings(a)).toBe(fingerprintFindings(b));
    expect(maxSeverity(a)).toBe("error");
    expect(codesFromFindings(a)).toEqual(["ghost_holding", "missing_fx"]);
  });
});

describe("auditIntegrityFindings", () => {
  it("flags ghost holdings and zero cost basis", () => {
    const findings = auditIntegrityFindings({
      holdings: [baseHolding({ purchasePrice: 0 })],
      rawHoldings: [
        { id: "g1", ticker: "DEAD", shares: 0, purchasePrice: 1, exchange: "" },
      ],
      transactions: [],
      quotes: {},
      exchangeRates: {},
    });
    expect(findings.some((f) => f.code === "ghost_holding")).toBe(true);
    expect(findings.some((f) => f.code === "zero_cost_basis")).toBe(true);
  });

  it("flags value_eur_inconsistent when live value differs 10x+", () => {
    const findings = auditIntegrityFindings({
      holdings: [baseHolding({ valueInEUR: 50, shares: 10, displayCurrency: "USD" })],
      transactions: [],
      quotes: { AAPL: { price: 200, currency: "USD" } },
      exchangeRates: { EURUSD: 1 },
    });
    expect(findings.some((f) => f.code === "value_eur_inconsistent")).toBe(true);
  });

  it("flags snapshot spikes", () => {
    const findings = auditIntegrityFindings({
      holdings: [baseHolding()],
      transactions: [],
      quotes: {},
      exchangeRates: {},
      recentSnapshots: [
        { date: "2026-08-10", totalValueEur: 1000 },
        { date: "2026-08-11", totalValueEur: 3000 },
      ],
    });
    expect(findings.some((f) => f.code === "snapshot_spike")).toBe(true);
  });

  it("flags ledger mismatch when derived shares differ", () => {
    const txs: Transaction[] = [
      {
        id: "t1",
        holdingId: "h1",
        date: "2026-01-01",
        type: "buy",
        ticker: "AAPL",
        name: "Apple",
        shares: 5,
        pricePerShare: 100,
        totalAmount: 500,
        fees: 0,
        taxes: 0,
        currency: "USD",
        displayCurrency: "USD",
        exchange: "NASDAQ",
        isin: "",
        assetType: "stock",
        accountId: "",
        notes: "",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];
    const findings = auditIntegrityFindings({
      holdings: [baseHolding({ shares: 10 })],
      transactions: txs,
      quotes: {},
      exchangeRates: {},
    });
    expect(findings.some((f) => f.code === "ledger_holdings_mismatch")).toBe(true);
  });
});

describe("buildDeterministicExplanation", () => {
  it("mentions auto-fixable counts", () => {
    const result = buildDeterministicExplanation([
      {
        id: "1",
        severity: "warn",
        code: "ghost_holding",
        message: "ghost",
        evidence: {},
        autoFixable: true,
        fixAction: "delete_ghost_holding",
      },
    ]);
    expect(result.aiExplanation).toContain("1 finding");
    expect(result.remediationPrompt.toLowerCase()).toContain("safe fix");
  });
});
