"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";
import TierFeatureBadge from "@/components/TierFeatureBadge";
import { ChartSkeleton } from "@/components/Skeleton";
import {
  getNativeDesktopOnlyTools,
  getNativeInteractiveTools,
  getTierBadgeForTool,
  getToolPath,
} from "@/lib/tools-registry";

const TransactionHistory = dynamic(() => import("@/components/TransactionHistory"), { ssr: false });
const DividendSummary = dynamic(() => import("@/components/DividendSummary"), { ssr: false });
const PerformanceMetrics = dynamic(() => import("@/components/PerformanceMetrics"), { ssr: false });
const Watchlist = dynamic(() => import("@/components/Watchlist"), { ssr: false });
const PriceAlerts = dynamic(() => import("@/components/PriceAlerts"), { ssr: false });

type NativeInteractiveId = ReturnType<typeof getNativeInteractiveTools>[number]["id"];

export default function MobileToolsPage() {
  const [activeTool, setActiveTool] = useState<NativeInteractiveId>("watchlist");
  const { t } = useI18n();

  const interactiveTools = getNativeInteractiveTools();
  const desktopOnlyTools = getNativeDesktopOnlyTools();

  const toolLabel = (id: NativeInteractiveId): string => {
    const entry = interactiveTools.find((e) => e.id === id)!;
    return t(entry.labelKey);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 overflow-x-hidden">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {interactiveTools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => setActiveTool(tool.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-full transition-colors ${
              activeTool === tool.id
                ? "bg-emerald-500 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d={tool.icon} />
            </svg>
            {toolLabel(tool.id)}
            {tool.nativeTierBadge && <TierFeatureBadge requiredPlan={tool.nativeTierBadge} size="xs" />}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl">
        <Suspense fallback={<ChartSkeleton />}>
          {activeTool === "watchlist" && <Watchlist />}
          {activeTool === "dividends" && <DividendSummary />}
          {activeTool === "transactions" && <TransactionHistory />}
          {activeTool === "alerts" && <PriceAlerts />}
          {activeTool === "performance" && <PerformanceMetrics />}
        </Suspense>
      </div>

      <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-slate-500 mb-3">
          {t("desktopOnly")}
        </p>
        <div className="space-y-1.5">
          {desktopOnlyTools.map((tool) => {
            const tier = getTierBadgeForTool(tool.id);
            return (
              <Link
                key={tool.id}
                href={getToolPath(tool.id)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="text-xs text-gray-600 dark:text-slate-400">
                  {t(tool.labelKey)}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {tier ? <TierFeatureBadge requiredPlan={tier} size="xs" /> : null}
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {t("toolsOpenOnWeb")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
