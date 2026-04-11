import { describe, it, expect } from "vitest";

type Tab = "transactions" | "dividends" | "performance" | "taxonomy" | "rebalancing" | "accounts" | "watchlist" | "alerts" | "screener" | "tax" | "simulator" | "planning" | "score";

/** Tabs that require Trefolio (paid); all others are Folio. */
const TIER_BADGE_MAP: Partial<Record<Tab, "pro">> = {
  performance: "pro",
  screener: "pro",
  tax: "pro",
  simulator: "pro",
  planning: "pro",
  score: "pro",
};

const ALL_TABS: Tab[] = [
  "transactions", "dividends", "performance", "taxonomy",
  "rebalancing", "accounts", "watchlist", "alerts",
  "screener", "tax", "simulator", "planning", "score",
];

const TIER_RANK = { free: 0, pro: 1 } as const;

function computeUserRank(plan: string, role: string): number {
  if (role === "admin") return 1;
  if (plan === "pro") return 1;
  return TIER_RANK[plan as keyof typeof TIER_RANK] ?? 0;
}

function isIncluded(key: Tab, userRank: number): boolean {
  const required = TIER_BADGE_MAP[key];
  if (!required) return true;
  return userRank >= TIER_RANK[required];
}

function groupTabs(plan: string, role: string) {
  const userRank = computeUserRank(plan, role);
  const included = ALL_TABS.filter((key) => isIncluded(key, userRank));
  const lockedPro = ALL_TABS.filter((key) => !isIncluded(key, userRank) && TIER_BADGE_MAP[key] === "pro");
  return { included, lockedPro };
}

describe("Tools tier grouping", () => {
  it("free user: free tools included, pro-gated tools in lockedPro", () => {
    const { included, lockedPro } = groupTabs("free", "user");
    expect(included).toContain("transactions");
    expect(included).toContain("dividends");
    expect(included).toContain("alerts");
    expect(included).toContain("watchlist");
    expect(included).not.toContain("performance");
    expect(included).not.toContain("screener");

    expect(lockedPro).toContain("performance");
    expect(lockedPro).toContain("screener");
    expect(lockedPro).toContain("tax");
    expect(lockedPro).toContain("simulator");
    expect(lockedPro).toContain("planning");
    expect(lockedPro).toContain("score");
  });

  it("pro user: all tools included", () => {
    const { included, lockedPro } = groupTabs("pro", "user");
    expect(included).toEqual(ALL_TABS);
    expect(lockedPro).toHaveLength(0);
  });

  it("admin user: all tools included regardless of plan field", () => {
    const { included, lockedPro } = groupTabs("free", "admin");
    expect(included).toEqual(ALL_TABS);
    expect(lockedPro).toHaveLength(0);
  });

  it("alerts is a free tool (not gated)", () => {
    expect(TIER_BADGE_MAP["alerts"]).toBeUndefined();
    const { included } = groupTabs("free", "user");
    expect(included).toContain("alerts");
  });

  it("unknown plan defaults to free rank", () => {
    const rank = computeUserRank("unknown_plan", "user");
    expect(rank).toBe(0);
    const { lockedPro } = groupTabs("unknown_plan", "user");
    expect(lockedPro).toContain("performance");
    expect(lockedPro).toContain("screener");
  });
});
