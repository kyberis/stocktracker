"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import TierFeatureBadge from "@/components/TierFeatureBadge";

/**
 * Static design preview for the Strategies tool — no API calls.
 * Route: /preview/strategies
 */
export default function StrategiesMockupPreview() {
  const { t } = useI18n();

  const handlePreviewCta = () => {
    window.alert("This is a static design preview. Use Tools → Strategies for the live feature.");
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div
        role="status"
        className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
      >
        <strong className="font-semibold">{t("strategiesPreviewBannerTitle")}</strong>
        <span className="mx-1.5">—</span>
        {t("strategiesPreviewBannerBody")}
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("strategiesNav")}</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t("toolDescStrategies")}</p>
      </div>

      {/* Search (static) */}
      <div className="card px-4 py-4 space-y-3">
        <label htmlFor="mock-strategy-search" className="block text-xs font-medium text-gray-500 dark:text-slate-400">
          {t("search")}
        </label>
        <div className="relative">
          <input
            id="mock-strategy-search"
            readOnly
            value="AAPL"
            className="w-full text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2"
            aria-describedby="mock-search-hint"
          />
          <p id="mock-search-hint" className="text-[10px] text-gray-400 dark:text-slate-500 mt-1.5">
            {t("strategiesMockSearchHint")}
          </p>
        </div>
      </div>

      {/* Quote strip */}
      <div className="card px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">Apple Inc.</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">AAPL · NASDAQ</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">USD 198.42</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">+1.24 (+0.63%)</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-500 dark:text-slate-400">{t("week52High")}</p>
            <p className="text-sm font-semibold tabular-nums">USD 260.10</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-500 dark:text-slate-400">{t("week52Low")}</p>
            <p className="text-sm font-semibold tabular-nums">USD 168.63</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-500 dark:text-slate-400">{t("marketCap")}</p>
            <p className="text-sm font-semibold">3.1T</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-500 dark:text-slate-400">{t("analystTarget")}</p>
            <p className="text-sm font-semibold tabular-nums">USD 235.00</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 text-xs">
          <Link
            href="/analisis/AAPL?exchange=NASDAQ"
            className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
          >
            {t("strategiesOpenDetail")}
          </Link>
          <Link
            href="/analisis/AAPL?tab=evaluation&exchange=NASDAQ"
            className="text-violet-600 dark:text-violet-400 font-medium hover:underline inline-flex items-center gap-1"
          >
            {t("strategiesOpenMoat")}
            <TierFeatureBadge requiredPlan="pro" size="xs" />
          </Link>
        </div>
      </div>

      {/* Moat snapshot (static tiles) */}
      <div className="card px-4 py-4 space-y-3">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("strategiesMoatSnapshot")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: t("moatEvalPE"), value: "28.4" },
            { label: t("moatEvalForwardPE"), value: "26.1" },
            { label: t("moatEvalPEG"), value: "2.05" },
            { label: t("moatEvalAugPayout"), value: "15%" },
          ].map((row) => (
            <div key={row.label} className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
              <p className="text-[10px] text-gray-500 dark:text-slate-400">{row.label}</p>
              <p className="text-sm font-semibold tabular-nums">{row.value}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 dark:text-slate-400">{t("strategiesMockMoatNote")}</p>
      </div>

      {/* Strategy form */}
      <div className="card px-4 py-4 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("strategiesPlanTitle")}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="mock-purchase" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              {t("strategiesPurchasePrice")}
            </label>
            <input
              id="mock-purchase"
              readOnly
              value="175.00"
              className="w-full text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="mock-currency" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              {t("currency")}
            </label>
            <input
              id="mock-currency"
              readOnly
              value="USD"
              className="w-full text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2"
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="mock-tp" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              {t("strategiesTargetPrice")}
            </label>
            <input
              id="mock-tp"
              readOnly
              value="220.00"
              className="w-full text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="mock-sl" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              {t("strategiesStopLossOptional")}
            </label>
            <input
              id="mock-sl"
              readOnly
              value="160.00"
              className="w-full text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">{t("strategiesNotifyLegend")}</legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input type="checkbox" defaultChecked readOnly className="rounded border-gray-300" />
              {t("channelEmail")}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input type="checkbox" defaultChecked readOnly className="rounded border-gray-300" />
              {t("channelWhatsApp")}
            </label>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-slate-400">{t("strategiesChannelsHint")}</p>
        </fieldset>

        <button type="button" onClick={handlePreviewCta} className="btn-primary w-full sm:w-auto">
          {t("strategiesCreateAlerts")}
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-slate-500">
        <Link href="/tools/strategies" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          {t("strategiesGoToLive")}
        </Link>
      </p>
    </main>
  );
}
