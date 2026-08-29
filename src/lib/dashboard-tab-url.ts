import type { ReadonlyURLSearchParams } from "next/navigation";
import type { SubscriptionPlan } from "@/lib/types";
import { isPaidPlan } from "@/lib/plan-rank";

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
  userPlan: SubscriptionPlan;
}

export function clampDashboardTab(tab: DashboardTab, ctx: ClampDashboardTabContext): DashboardTab {
  if (tab === "diversification" && ctx.holdingsCount === 0) return "portfolio";
  if (ctx.tierGate) {
    if ((tab === "metrics" || tab === "growth") && !isPaidPlan(ctx.userPlan)) {
      return "portfolio";
    }
  }
  return tab;
}
