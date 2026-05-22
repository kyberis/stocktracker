import type { PortfolioSnapshot } from "@/lib/ai/warren/tools";
import type { SectorGap } from "./types";

const INFRA_SECTOR_KEYS = new Set([
  "infrastructure",
  "utilities",
  "infra",
  "utility",
  "infraestructura",
  "utilities & infrastructure",
]);

/** Default target weight for infra/utilities when under-diversified. */
const INFRA_TARGET_PCT = 8;

function normalizeSector(raw?: string): string {
  return (raw || "Unknown").trim().toLowerCase();
}

function isInfraSector(sector: string): boolean {
  const s = normalizeSector(sector);
  for (const key of INFRA_SECTOR_KEYS) {
    if (s.includes(key)) return true;
  }
  return false;
}

export function findPrimarySectorGap(snapshot: PortfolioSnapshot): SectorGap | null {
  const total = snapshot.totals.value;
  if (total <= 0) return null;

  let infraValue = 0;
  for (const h of snapshot.topHoldings) {
    if (isInfraSector(h.sector || "")) {
      infraValue += h.value;
    }
  }

  const currentPct = (infraValue / total) * 100;
  if (currentPct >= INFRA_TARGET_PCT - 0.5) return null;

  const targetValue = (INFRA_TARGET_PCT / 100) * total;
  const gapEur = Math.max(0, targetValue - infraValue);

  return {
    label: "Infra / Utilities",
    currentPct: Math.round(currentPct * 10) / 10,
    targetPct: INFRA_TARGET_PCT,
    gapEur: Math.round(gapEur),
  };
}

export function portfolioCashEur(snapshot: PortfolioSnapshot): number {
  return Object.values(snapshot.cashSummary || {}).reduce((a, b) => a + b, 0);
}
