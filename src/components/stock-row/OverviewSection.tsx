"use client";

import { useI18n } from "@/lib/i18n";
import type { CompanyOverview } from "@/lib/types";

export default function OverviewSection({ overview }: { overview: CompanyOverview }) {
  const { t } = useI18n();

  const items: Array<{ label: string; value: string | null }> = [
    { label: t("sector"), value: overview.sector || null },
    { label: t("industry"), value: overview.industry || null },
    { label: t("peRatio"), value: overview.peRatio != null ? overview.peRatio.toFixed(2) : null },
    { label: t("forwardPE"), value: overview.forwardPE != null ? overview.forwardPE.toFixed(2) : null },
    { label: t("pegRatio"), value: overview.pegRatio != null ? overview.pegRatio.toFixed(2) : null },
    { label: t("eps"), value: overview.eps != null ? `$${overview.eps.toFixed(2)}` : null },
    {
      label: t("dividendYield"),
      value: overview.dividendYield != null ? `${(overview.dividendYield * 100).toFixed(2)}%` : null,
    },
    {
      label: t("dividendPerShare"),
      value: overview.dividendPerShare != null ? `$${overview.dividendPerShare.toFixed(2)}` : null,
    },
    { label: t("beta"), value: overview.beta != null ? overview.beta.toFixed(2) : null },
    {
      label: t("profitMargin"),
      value: overview.profitMargin != null ? `${(overview.profitMargin * 100).toFixed(1)}%` : null,
    },
    {
      label: t("returnOnEquity"),
      value: overview.returnOnEquity != null ? `${(overview.returnOnEquity * 100).toFixed(1)}%` : null,
    },
    {
      label: t("analystTarget"),
      value: overview.analystTargetPrice != null ? `$${overview.analystTargetPrice.toFixed(2)}` : null,
    },
    { label: t("fiftyDayMA"), value: overview.fiftyDayMA != null ? `$${overview.fiftyDayMA.toFixed(2)}` : null },
    {
      label: t("twoHundredDayMA"),
      value: overview.twoHundredDayMA != null ? `$${overview.twoHundredDayMA.toFixed(2)}` : null,
    },
  ].filter((i) => i.value != null);

  const ratings = overview.analystRatings;
  const totalRatings = ratings
    ? ratings.strongBuy + ratings.buy + ratings.hold + ratings.sell + ratings.strongSell
    : 0;

  return (
    <div className="mt-3">
      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-2">{t("fundamentals")}</p>

      {overview.description && (
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-3 line-clamp-2">{overview.description}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 mb-3">
        {items.map(({ label, value }) => (
          <div key={label} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-2.5 py-1.5">
            <p className="text-[10px] text-gray-400 dark:text-slate-500">{label}</p>
            <p className="text-xs font-medium text-gray-800 dark:text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {ratings && totalRatings > 0 && (
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-1.5">{t("analystRatings")}</p>
          <div className="flex gap-0.5 h-3 rounded-full overflow-hidden mb-1.5">
            {ratings.strongBuy > 0 && (
              <div className="bg-emerald-500" style={{ width: `${(ratings.strongBuy / totalRatings) * 100}%` }} />
            )}
            {ratings.buy > 0 && (
              <div className="bg-green-400" style={{ width: `${(ratings.buy / totalRatings) * 100}%` }} />
            )}
            {ratings.hold > 0 && (
              <div className="bg-amber-400" style={{ width: `${(ratings.hold / totalRatings) * 100}%` }} />
            )}
            {ratings.sell > 0 && (
              <div className="bg-orange-400" style={{ width: `${(ratings.sell / totalRatings) * 100}%` }} />
            )}
            {ratings.strongSell > 0 && (
              <div className="bg-red-500" style={{ width: `${(ratings.strongSell / totalRatings) * 100}%` }} />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 dark:text-slate-400">
            <span className="text-emerald-600 dark:text-emerald-400">{t("buy")} {ratings.strongBuy + ratings.buy}</span>
            <span className="text-amber-600 dark:text-amber-400">{t("hold")} {ratings.hold}</span>
            <span className="text-red-500 dark:text-red-400">{t("sell")} {ratings.sell + ratings.strongSell}</span>
          </div>
        </div>
      )}
    </div>
  );
}
