import type { ReadonlyURLSearchParams } from "next/navigation";

export const DASHBOARD_TAB_VALUES = [
  "portfolio",
  "diversification",
  "dividends",
  "metrics",
  "growth",
  "events",
  "news",
] as const;

export type DashboardTab = (typeof DASHBOARD_TAB_VALUES)[number];

export function parseDashboardTabParam(value: string | null): DashboardTab | null {
  if (!value) return null;
  return (DASHBOARD_TAB_VALUES as readonly string[]).includes(value) ? (value as DashboardTab) : null;
}

export function buildPathWithTab(
  pathname: string,
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
  tab: DashboardTab,
): string {
  const next = new URLSearchParams(searchParams.toString());
  if (tab === "portfolio") {
    next.delete("tab");
  } else {
    next.set("tab", tab);
  }
  const q = next.toString();
  return q ? `${pathname}?${q}` : pathname;
}

export interface ClampDashboardTabContext {
  holdingsCount: number;
  /** When true, free users cannot land on metrics/growth via URL (mobile paywall flow). */
  tierGate: boolean;
  userPlan: "free" | "starter" | "pro";
}

export function clampDashboardTab(tab: DashboardTab, ctx: ClampDashboardTabContext): DashboardTab {
  if (tab === "diversification" && ctx.holdingsCount === 0) return "portfolio";
  if (ctx.tierGate) {
    const rank = { free: 0, starter: 1, pro: 2 };
    if ((tab === "metrics" || tab === "growth") && rank[ctx.userPlan] < rank.starter) {
      return "portfolio";
    }
  }
  return tab;
}
