"use client";

import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";
import TierFeatureBadge from "@/components/TierFeatureBadge";
import { ChartSkeleton } from "@/components/Skeleton";
import { useFavoriteTools } from "@/lib/favorite-tools";
import {
  getNativeDesktopOnlyTools,
  getNativeInteractiveTools,
  getTierBadgeForTool,
  getToolPath,
  NATIVE_INTERACTIVE_TOOL_ORDER,
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
  const { favoriteIds, toggleFavorite, isFavorite } = useFavoriteTools();

  const interactiveTools = useMemo(() => {
    const base = getNativeInteractiveTools();
    return [...base].sort((a, b) => {
      const af = favoriteIds.has(a.id) ? 0 : 1;
      const bf = favoriteIds.has(b.id) ? 0 : 1;
      if (af !== bf) return af - bf;
      return NATIVE_INTERACTIVE_TOOL_ORDER.indexOf(a.id) - NATIVE_INTERACTIVE_TOOL_ORDER.indexOf(b.id);
    });
  }, [favoriteIds]);
  const desktopOnlyTools = getNativeDesktopOnlyTools();

  const toolLabel = (id: NativeInteractiveId): string => {
    const entry = interactiveTools.find((e) => e.id === id)!;
    return t(entry.labelKey);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 overflow-x-hidden">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {interactiveTools.map((tool) => {
          const fav = isFavorite(tool.id);
          return (
            <div
              key={tool.id}
              className={`flex shrink-0 items-stretch overflow-hidden rounded-full border text-xs font-medium transition-colors ${
                activeTool === tool.id
                  ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className="flex items-center gap-1.5 px-3 py-2"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={tool.icon} />
                </svg>
                {toolLabel(tool.id)}
                {tool.nativeTierBadge && <TierFeatureBadge requiredPlan={tool.nativeTierBadge} size="xs" />}
              </button>
              <button
                type="button"
                aria-pressed={fav}
                aria-label={fav ? t("toolFavoriteRemove") : t("toolFavoriteAdd")}
                onClick={() => toggleFavorite(tool.id)}
                className={`flex items-center border-l px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset ${
                  activeTool === tool.id
                    ? "border-emerald-400/50 text-amber-200 hover:bg-emerald-600/30"
                    : "border-gray-200 text-amber-500 hover:bg-amber-500/10 dark:border-slate-600 dark:hover:bg-amber-400/10"
                }`}
              >
                {fav ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005z" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
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
