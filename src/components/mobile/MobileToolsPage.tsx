"use client";

import { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import TierFeatureBadge from "@/components/TierFeatureBadge";
import { ChartSkeleton } from "@/components/Skeleton";

const TransactionHistory = dynamic(() => import("@/components/TransactionHistory"), { ssr: false });
const DividendSummary = dynamic(() => import("@/components/DividendSummary"), { ssr: false });
const PerformanceMetrics = dynamic(() => import("@/components/PerformanceMetrics"), { ssr: false });
const Watchlist = dynamic(() => import("@/components/Watchlist"), { ssr: false });
const PriceAlerts = dynamic(() => import("@/components/PriceAlerts"), { ssr: false });

type MobileTool = "watchlist" | "dividends" | "transactions" | "alerts" | "performance";

const MOBILE_TOOLS: { key: MobileTool; icon: string; tierBadge?: "starter" | "pro" }[] = [
  { key: "watchlist", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
  { key: "dividends", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "transactions", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { key: "alerts", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", tierBadge: "starter" },
  { key: "performance", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", tierBadge: "starter" },
];

const DESKTOP_ONLY_TOOLS = [
  { labelKey: "taxReportsNav", tierBadge: "pro" as const },
  { labelKey: "simulatorNav", tierBadge: "pro" as const },
  { labelKey: "screenerNav", tierBadge: "pro" as const },
  { labelKey: "accounts", tierBadge: undefined },
  { labelKey: "rebalancing", tierBadge: undefined },
];

export default function MobileToolsPage() {
  const [activeTool, setActiveTool] = useState<MobileTool>("watchlist");
  const { t } = useI18n();
  const { user } = useAuth();
  const isPaid = user?.plan === "starter" || user?.plan === "pro";

  const toolLabel = (key: MobileTool): string => {
    const map: Record<MobileTool, string> = {
      watchlist: t("watchlist"),
      dividends: t("dividends"),
      transactions: t("transactions"),
      alerts: t("priceAlerts"),
      performance: t("performanceMetrics"),
    };
    return map[key] || key;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Tool tabs — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {MOBILE_TOOLS.map((tool) => (
          <button
            key={tool.key}
            onClick={() => setActiveTool(tool.key)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-full transition-colors ${
              activeTool === tool.key
                ? "bg-emerald-500 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d={tool.icon} />
            </svg>
            {toolLabel(tool.key)}
            {tool.tierBadge && <TierFeatureBadge requiredPlan={tool.tierBadge} size="xs" />}
          </button>
        ))}
      </div>

      {/* Active tool content */}
      <Suspense fallback={<ChartSkeleton />}>
        {activeTool === "watchlist" && <Watchlist />}
        {activeTool === "dividends" && <DividendSummary />}
        {activeTool === "transactions" && <TransactionHistory />}
        {activeTool === "alerts" && <PriceAlerts />}
        {activeTool === "performance" && <PerformanceMetrics />}
      </Suspense>

      {/* Desktop-only tools — greyed out section */}
      <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-slate-500 mb-3">
          {t("desktopOnly") || "Desktop Only"}
        </p>
        <div className="space-y-1.5">
          {DESKTOP_ONLY_TOOLS.map((tool) => (
            <div
              key={tool.labelKey}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 opacity-50"
            >
              <span className="text-xs text-gray-500 dark:text-slate-500">
                {t(tool.labelKey as Parameters<typeof t>[0]) || tool.labelKey}
              </span>
              <div className="flex items-center gap-2">
                {tool.tierBadge && <TierFeatureBadge requiredPlan={tool.tierBadge} size="xs" />}
                <span className="text-[9px] text-gray-400 dark:text-slate-600 bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
                  Desktop
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
