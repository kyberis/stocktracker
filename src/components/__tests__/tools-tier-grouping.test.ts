import { describe, it, expect } from "vitest";

type Tab = "transactions" | "dividends" | "performance" | "taxonomy" | "rebalancing" | "accounts" | "watchlist" | "alerts" | "screener" | "tax" | "simulator" | "planning" | "score";

const TIER_BADGE_MAP: Partial<Record<Tab, "starter" | "pro">> = {
  performance: "starter",
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

const TIER_RANK = { free: 0, starter: 1, pro: 2 } as const;

function computeUserRank(plan: string, role: string): number {
  if (role === "admin") return 2;
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
  const starter = ALL_TABS.filter((key) => !isIncluded(key, userRank) && TIER_BADGE_MAP[key] === "starter");
  const pro = ALL_TABS.filter((key) => !isIncluded(key, userRank) && TIER_BADGE_MAP[key] === "pro");
  return { included, starter, pro };
}

describe("Tools tier grouping", () => {
  it("free user: free tools included, performance in starter, pro tools in pro", () => {
    const { included, starter, pro } = groupTabs("free", "user");
    expect(included).toContain("transactions");
    expect(included).toContain("dividends");
    expect(included).toContain("alerts");
    expect(included).toContain("watchlist");
    expect(included).not.toContain("performance");
    expect(included).not.toContain("screener");

    expect(starter).toContain("performance");
    expect(starter).not.toContain("screener");

    expect(pro).toContain("screener");
    expect(pro).toContain("tax");
    expect(pro).toContain("simulator");
    expect(pro).toContain("planning");
    expect(pro).toContain("score");
  });

  it("starter (bifolio) user: performance included, pro tools still in pro", () => {
    const { included, starter, pro } = groupTabs("starter", "user");
    expect(included).toContain("transactions");
    expect(included).toContain("dividends");
    expect(included).toContain("performance");
    expect(included).toContain("alerts");

    expect(starter).toHaveLength(0);

    expect(pro).toContain("screener");
    expect(pro).toContain("tax");
    expect(pro).toContain("score");
  });

  it("pro (trefolio) user: all tools included, no upgrade sections", () => {
    const { included, starter, pro } = groupTabs("pro", "user");
    expect(included).toEqual(ALL_TABS);
    expect(starter).toHaveLength(0);
    expect(pro).toHaveLength(0);
  });

  it("admin user: all tools included regardless of plan field", () => {
    const { included, starter, pro } = groupTabs("free", "admin");
    expect(included).toEqual(ALL_TABS);
    expect(starter).toHaveLength(0);
    expect(pro).toHaveLength(0);
  });

  it("alerts is a free tool (not gated by starter or pro)", () => {
    expect(TIER_BADGE_MAP["alerts"]).toBeUndefined();
    const { included } = groupTabs("free", "user");
    expect(included).toContain("alerts");
  });

  it("unknown plan defaults to free rank", () => {
    const rank = computeUserRank("unknown_plan", "user");
    expect(rank).toBe(0);
    const { included, starter, pro } = groupTabs("unknown_plan", "user");
    expect(starter).toContain("performance");
    expect(pro).toContain("screener");
    expect(included).not.toContain("performance");
  });
});
