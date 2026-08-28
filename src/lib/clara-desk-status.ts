import type { ClaraSavingsSummary } from "@/lib/ai/office/types";
import { formatCurrency } from "@/lib/utils";

export type ClaraDeskStatus = {
  linked: boolean;
  surplusEur?: number;
  currency?: string;
  dayOfMonth?: number;
  daysInMonth?: number;
  monthBalance?: number;
};

export type MoneyDeskHandoffKind = "surplus" | "add_first" | null;

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function isUsableSurplus(surplus: number | undefined): surplus is number {
  return typeof surplus === "number" && Number.isFinite(surplus) && surplus > 0;
}

export function remainingDaysInMonth(
  dayOfMonth?: number,
  daysInMonth?: number,
): number | null {
  if (
    dayOfMonth == null ||
    daysInMonth == null ||
    !Number.isFinite(dayOfMonth) ||
    !Number.isFinite(daysInMonth) ||
    dayOfMonth < 1 ||
    daysInMonth < 1 ||
    dayOfMonth > daysInMonth
  ) {
    return null;
  }
  return daysInMonth - dayOfMonth;
}

export function mapClaraSavingsToDeskStatus(clara: ClaraSavingsSummary): ClaraDeskStatus {
  if (!clara.available) return { linked: false };
  return {
    linked: true,
    surplusEur: finiteNumber(clara.surplusEur),
    currency: typeof clara.currency === "string" && clara.currency.trim() ? clara.currency : undefined,
    dayOfMonth: finiteNumber(clara.dayOfMonth),
    daysInMonth: finiteNumber(clara.daysInMonth),
    monthBalance: finiteNumber(clara.monthBalance),
  };
}

export function parseClaraDeskStatus(raw: unknown): ClaraDeskStatus {
  if (!raw || typeof raw !== "object") return { linked: false };
  const o = raw as Record<string, unknown>;
  if (o.linked !== true) return { linked: false };
  return {
    linked: true,
    surplusEur: finiteNumber(o.surplusEur),
    currency: typeof o.currency === "string" && o.currency.trim() ? o.currency : undefined,
    dayOfMonth: finiteNumber(o.dayOfMonth),
    daysInMonth: finiteNumber(o.daysInMonth),
    monthBalance: finiteNumber(o.monthBalance),
  };
}

export function resolveMoneyDeskHandoff(opts: {
  hasHoldings: boolean;
  linked: boolean;
  surplusEur?: number;
}): MoneyDeskHandoffKind {
  if (opts.hasHoldings && opts.linked && isUsableSurplus(opts.surplusEur)) return "surplus";
  if (!opts.hasHoldings && opts.linked) return "add_first";
  return null;
}

export function formatSignedCurrency(value: number, currency: string): string {
  const formatted = formatCurrency(value, currency);
  return value > 0 ? `+${formatted}` : formatted;
}
