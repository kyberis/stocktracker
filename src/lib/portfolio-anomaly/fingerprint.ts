import { createHash } from "crypto";

import type { PortfolioAnomalySeverity } from "@/lib/types";

import type { AnomalyScanFinding } from "./types";

export function maxSeverity(findings: AnomalyScanFinding[]): PortfolioAnomalySeverity {
  if (findings.some((f) => f.severity === "error")) return "error";
  if (findings.some((f) => f.severity === "warn")) return "warn";
  return "info";
}

export function fingerprintFindings(findings: AnomalyScanFinding[]): string {
  const parts = findings
    .map((f) => `${f.code}:${(f.ticker || f.holdingId || "").toUpperCase()}`)
    .sort();
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24);
}

export function codesFromFindings(findings: AnomalyScanFinding[]): string[] {
  return [...new Set(findings.map((f) => f.code))].sort();
}
