import type { TranslationKey } from "@/lib/i18n";

/** All tools under /tools — single source of truth for routes, labels, and native UX. */
export type ToolTabId =
  | "transactions"
  | "dividends"
  | "performance"
  | "taxonomy"
  | "rebalancing"
  | "accounts"
  | "watchlist"
  | "alerts"
  | "screener"
  | "warren"
  | "tax"
  | "simulator"
  | "planning"
  | "projection"
  | "score"
  | "evaluation"
  | "strategies"
  | "events"
  | "holdingsExplorer";

/** Which user-setting or flag controls hub card visibility (matches former `toolFlagMap`). */
export type ToolHubVisibilitySource =
  | "always"
  | "alertsEnabled"
  | "toolTransactionsEnabled"
  | "toolDividendsEnabled"
  | "toolPerformanceEnabled"
  | "toolTaxonomyEnabled"
  | "toolRebalancingEnabled"
  | "toolAccountsEnabled"
  | "toolWatchlistEnabled"
  | "ai_report_enabled"
  | "tool_tax_reports_enabled"
  | "tool_simulator_enabled"
  | "tool_planning_enabled";

/** Subsection on /tools hub (tier sections unchanged; this is an extra label inside each tier band). */
export type ToolHubCategory =
  | "portfolioActivity"
  | "analysis"
  | "planningTax"
  | "aiInsights"
  | "rebalancing";

export interface ToolCatalogEntry {
  id: ToolTabId;
  /** `/tools/[tab]` except nested tools under `/tools/<segment>`. */
  route: { kind: "dynamic" } | { kind: "nested"; segment: "screener" | "warren-screener" | "holdings-explorer" };
  labelKey: TranslationKey;
  descKey: TranslationKey;
  icon: string;
  gradient: string;
  tierBadge?: "pro";
  hubVisibility: ToolHubVisibilitySource;
  /** Native shell: full in-page tool vs listed under “desktop only”. */
  nativeInteractive: boolean;
  /** Optional badge on native chips (e.g. starter-gated tools). */
  nativeTierBadge?: "pro";
  hubCategory: ToolHubCategory;
}

export const TOOLS_CATALOG: ToolCatalogEntry[] = [
  {
    id: "transactions",
    route: { kind: "dynamic" },
    labelKey: "transactions",
    descKey: "toolDescTransactions",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    gradient: "from-blue-500 to-indigo-600",
    hubVisibility: "toolTransactionsEnabled",
    nativeInteractive: true,
    hubCategory: "portfolioActivity",
  },
  {
    id: "dividends",
    route: { kind: "dynamic" },
    labelKey: "dividends",
    descKey: "toolDescDividends",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    gradient: "from-emerald-500 to-green-600",
    hubVisibility: "toolDividendsEnabled",
    nativeInteractive: true,
    hubCategory: "portfolioActivity",
  },
  {
    id: "performance",
    route: { kind: "dynamic" },
    labelKey: "performanceMetrics",
    descKey: "toolDescPerformance",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    gradient: "from-orange-500 to-red-500",
    tierBadge: "pro",
    hubVisibility: "toolPerformanceEnabled",
    nativeInteractive: true,
    nativeTierBadge: "pro",
    hubCategory: "analysis",
  },
  {
    id: "taxonomy",
    route: { kind: "dynamic" },
    labelKey: "taxonomy",
    descKey: "toolDescTaxonomy",
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
    gradient: "from-pink-500 to-rose-600",
    hubVisibility: "toolTaxonomyEnabled",
    nativeInteractive: false,
    hubCategory: "analysis",
  },
  {
    id: "rebalancing",
    route: { kind: "dynamic" },
    labelKey: "rebalancing",
    descKey: "toolDescRebalancing",
    icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
    gradient: "from-cyan-500 to-teal-600",
    hubVisibility: "toolRebalancingEnabled",
    nativeInteractive: false,
    hubCategory: "rebalancing",
  },
  {
    id: "accounts",
    route: { kind: "dynamic" },
    labelKey: "accounts",
    descKey: "toolDescAccounts",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    gradient: "from-slate-500 to-gray-600",
    hubVisibility: "toolAccountsEnabled",
    nativeInteractive: false,
    hubCategory: "portfolioActivity",
  },
  {
    id: "watchlist",
    route: { kind: "dynamic" },
    labelKey: "watchlist",
    descKey: "toolDescWatchlist",
    icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
    gradient: "from-violet-500 to-purple-600",
    hubVisibility: "toolWatchlistEnabled",
    nativeInteractive: true,
    hubCategory: "analysis",
  },
  {
    id: "strategies",
    route: { kind: "dynamic" },
    labelKey: "strategiesNav",
    descKey: "toolDescStrategies",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    gradient: "from-fuchsia-500 to-violet-600",
    tierBadge: "pro",
    hubVisibility: "always",
    nativeInteractive: false,
    hubCategory: "analysis",
  },
  {
    id: "alerts",
    route: { kind: "dynamic" },
    labelKey: "priceAlerts",
    descKey: "toolDescAlerts",
    icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    gradient: "from-amber-500 to-yellow-600",
    hubVisibility: "alertsEnabled",
    nativeInteractive: true,
    nativeTierBadge: "pro",
    hubCategory: "portfolioActivity",
  },
  {
    id: "holdingsExplorer",
    route: { kind: "nested", segment: "holdings-explorer" },
    labelKey: "holdingsExplorerNav",
    descKey: "toolDescHoldingsExplorer",
    icon: "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z",
    gradient: "from-sky-500 to-indigo-600",
    tierBadge: "pro",
    hubVisibility: "always",
    nativeInteractive: false,
    hubCategory: "analysis",
  },
  {
    id: "screener",
    route: { kind: "nested", segment: "screener" },
    labelKey: "screenerNav",
    descKey: "toolDescScreener",
    icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z",
    gradient: "from-sky-500 to-blue-600",
    tierBadge: "pro",
    hubVisibility: "always",
    nativeInteractive: false,
    hubCategory: "analysis",
  },
  {
    id: "warren",
    route: { kind: "nested", segment: "warren-screener" },
    labelKey: "warrenScreenerNav",
    descKey: "toolDescWarrenScreener",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    gradient: "from-teal-500 to-emerald-600",
    tierBadge: "pro",
    hubVisibility: "always",
    nativeInteractive: false,
    hubCategory: "analysis",
  },
  {
    id: "tax",
    route: { kind: "dynamic" },
    labelKey: "taxReportsNav",
    descKey: "toolDescTax",
    icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z",
    gradient: "from-indigo-500 to-violet-600",
    tierBadge: "pro",
    hubVisibility: "tool_tax_reports_enabled",
    nativeInteractive: false,
    hubCategory: "planningTax",
  },
  {
    id: "simulator",
    route: { kind: "dynamic" },
    labelKey: "simulatorNav",
    descKey: "toolDescSimulator",
    icon: "M3 3v18h18M19 9l-5 5-4-4-3 3",
    gradient: "from-teal-500 to-emerald-600",
    tierBadge: "pro",
    hubVisibility: "tool_simulator_enabled",
    nativeInteractive: false,
    hubCategory: "planningTax",
  },
  {
    id: "projection",
    route: { kind: "dynamic" },
    labelKey: "projectionToolNav",
    descKey: "toolDescProjection",
    icon: "M3 3v1.5M3 21v-6m0 0l2.722-.917A4.502 4.502 0 016.382 15H10M3 21l2.722-.917A4.5 4.5 0 016.382 15m6 0a4.5 4.5 0 004.5-4.5V9m0 0a4.5 4.5 0 00-4.5-4.5h-3.75",
    gradient: "from-emerald-500 to-teal-600",
    hubVisibility: "always",
    nativeInteractive: false,
    hubCategory: "planningTax",
  },
  {
    id: "planning",
    route: { kind: "dynamic" },
    labelKey: "planningToolNav",
    descKey: "toolDescPlanning",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    gradient: "from-fuchsia-500 to-pink-600",
    tierBadge: "pro",
    hubVisibility: "tool_planning_enabled",
    nativeInteractive: false,
    hubCategory: "planningTax",
  },
  {
    id: "score",
    route: { kind: "dynamic" },
    labelKey: "portfolioScoreNav",
    descKey: "toolDescScore",
    icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
    gradient: "from-amber-500 to-orange-600",
    tierBadge: "pro",
    hubVisibility: "ai_report_enabled",
    nativeInteractive: false,
    hubCategory: "aiInsights",
  },
  {
    id: "evaluation",
    route: { kind: "dynamic" },
    labelKey: "moatEvalNav",
    descKey: "toolDescEvaluation",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    gradient: "from-violet-500 to-indigo-600",
    tierBadge: "pro",
    hubVisibility: "always",
    nativeInteractive: false,
    hubCategory: "aiInsights",
  },
  {
    id: "events",
    route: { kind: "dynamic" },
    labelKey: "eventsTab",
    descKey: "toolDescEvents",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    gradient: "from-sky-500 to-indigo-600",
    hubVisibility: "always",
    nativeInteractive: false,
    hubCategory: "analysis",
  },
];

const CATALOG_BY_ID = Object.fromEntries(TOOLS_CATALOG.map((e) => [e.id, e])) as Record<ToolTabId, ToolCatalogEntry>;

export function getToolEntry(id: ToolTabId): ToolCatalogEntry {
  return CATALOG_BY_ID[id];
}

/** Public URL for a tool (screener uses `/tools/screener`). */
export function getToolPath(id: ToolTabId): string {
  const e = CATALOG_BY_ID[id];
  if (e.route.kind === "nested") {
    return `/tools/${e.route.segment}`;
  }
  return `/tools/${id}`;
}

/** Tabs accepted by `app/(app)/tools/[tab]/page.tsx` — excludes nested-only routes. */
export const VALID_DYNAMIC_TAB_IDS = TOOLS_CATALOG.filter((e) => e.route.kind === "dynamic").map((e) => e.id);

/** Tier requirement for hub upgrade badges (Trefolio = pro). */
export function getTierBadgeForTool(id: ToolTabId): "pro" | undefined {
  return CATALOG_BY_ID[id].tierBadge;
}

export function resolveHubVisibility(
  id: ToolTabId,
  settings: {
    alertsEnabled: boolean;
    toolTransactionsEnabled: boolean;
    toolDividendsEnabled: boolean;
    toolPerformanceEnabled: boolean;
    toolTaxonomyEnabled: boolean;
    toolRebalancingEnabled: boolean;
    toolAccountsEnabled: boolean;
    toolWatchlistEnabled: boolean;
  },
  aiReportEnabled: boolean,
  extraFlags: {
    toolTaxReportsEnabled?: boolean;
    toolSimulatorEnabled?: boolean;
    toolPlanningEnabled?: boolean;
  } = {},
): boolean {
  const src = CATALOG_BY_ID[id].hubVisibility;
  if (src === "always") return true;
  if (src === "ai_report_enabled") return aiReportEnabled;
  if (src === "tool_tax_reports_enabled") return extraFlags.toolTaxReportsEnabled === true;
  if (src === "tool_simulator_enabled") return extraFlags.toolSimulatorEnabled === true;
  if (src === "tool_planning_enabled") return extraFlags.toolPlanningEnabled === true;
  return settings[src];
}

/** Native horizontal chips: same order as before (watchlist first, …, performance). */
export const NATIVE_INTERACTIVE_TOOL_ORDER: ToolTabId[] = ["watchlist", "dividends", "transactions", "alerts", "performance"];

export function getNativeInteractiveTools(): ToolCatalogEntry[] {
  return NATIVE_INTERACTIVE_TOOL_ORDER.map((id) => CATALOG_BY_ID[id]);
}

/** Tools listed in the native “desktop only” section (non-interactive), catalog order. */
export function getNativeDesktopOnlyTools(): ToolCatalogEntry[] {
  return TOOLS_CATALOG.filter((e) => !e.nativeInteractive);
}

const HUB_CATEGORY_ORDER: ToolHubCategory[] = [
  "portfolioActivity",
  "analysis",
  "planningTax",
  "aiInsights",
  "rebalancing",
];

export function sortTabsByHubCategory<T extends { id: ToolTabId }>(tabs: T[]): T[] {
  const orderIndex = (id: ToolTabId) => TOOLS_CATALOG.findIndex((e) => e.id === id);
  return [...tabs].sort((a, b) => {
    const ca = CATALOG_BY_ID[a.id].hubCategory;
    const cb = CATALOG_BY_ID[b.id].hubCategory;
    const ia = HUB_CATEGORY_ORDER.indexOf(ca);
    const ib = HUB_CATEGORY_ORDER.indexOf(cb);
    if (ia !== ib) return ia - ib;
    return orderIndex(a.id) - orderIndex(b.id);
  });
}
