import type { ClaraSavingsSummary } from "@/lib/ai/office/types";
import { formatCurrency } from "@/lib/utils";

export type ClaraDeskStatus = {
  linked: boolean;
  surplusEur?: number;
  currency?: string;
  dayOfMonth?: number;
  daysInMonth?: number;
  monthBalance?: number;
  hasMonthRecord?: boolean;
  remainingExpenses?: number;
};

export type MoneyDeskHandoffKind = "surplus" | "add_first" | null;

export type ClaraPulseDisplayKind = "unlinked" | "setup" | "balance" | "zero";

export type ClaraPulseTone = "positive" | "negative" | "neutral";

export type ClaraPulseDisplay = {
  kind: ClaraPulseDisplayKind;
  value?: number;
  tone: ClaraPulseTone;
};

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
    hasMonthRecord: clara.hasMonthRecord === true ? true : clara.hasMonthRecord === false ? false : undefined,
    remainingExpenses: finiteNumber(clara.remainingExpenses),
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
    hasMonthRecord: o.hasMonthRecord === true ? true : o.hasMonthRecord === false ? false : undefined,
    remainingExpenses: finiteNumber(o.remainingExpenses),
  };
}

export function resolveClaraPulseDisplay(status: ClaraDeskStatus | null): ClaraPulseDisplay {
  if (!status?.linked) {
    return { kind: "unlinked", tone: "neutral" };
  }

  const hasRecord =
    status.hasMonthRecord === true ||
    (status.hasMonthRecord !== false &&
      typeof status.monthBalance === "number" &&
      Number.isFinite(status.monthBalance));

  if (!hasRecord) {
    return { kind: "setup", tone: "neutral" };
  }

  const balance = status.monthBalance ?? 0;
  if (Math.abs(balance) < 0.005) {
    return { kind: "zero", value: 0, tone: "neutral" };
  }
  if (balance > 0) {
    return { kind: "balance", value: balance, tone: "positive" };
  }
  return { kind: "balance", value: balance, tone: "negative" };
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
