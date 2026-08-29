"use client";

import { useI18n } from "@/lib/i18n";
import { FEATURE_QUOTAS, type FeatureQuotaKey } from "@/lib/platform-config";

interface QuotaCompareTableProps {
  features?: FeatureQuotaKey[];
  className?: string;
  /** When true, renders a compact, card-friendly variant with no header. */
  compact?: boolean;
}

const DEFAULT_FEATURES: FeatureQuotaKey[] = [
  "ai_consult",
  "ai_portfolio_review",
  "investment_screening",
  "ai_import",
  "fundamentals",
  "intelligence",
  "screener",
  "stock_evaluation",
  "economic_indicators",
  "tax_report",
  "csv_export",
  "support_chat",
];

function formatLimit(
  n: number,
  window: "month" | "week" | "day" | "year",
  t: ReturnType<typeof useI18n>["t"],
): string {
  if (!Number.isFinite(n) || n >= 1_000_000) return t("quotaTableUnlimited");
  if (window === "week") return `${n.toLocaleString()}/week`;
  const tpl =
    window === "day"
      ? t("quotaTableUnitDay")
      : window === "year"
        ? t("quotaTableUnitYear")
        : t("quotaTableUnit");
  return tpl.replace("{n}", n.toLocaleString());
}

export default function QuotaCompareTable({
  features = DEFAULT_FEATURES,
  className = "",
  compact = false,
}: QuotaCompareTableProps) {
  const { t } = useI18n();
  return (
    <div className={`overflow-x-auto ${className}`}>
      {!compact && (
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
          {t("quotaTableTitle")}
        </h4>
      )}
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-700">
            <th className="text-left font-semibold text-gray-600 dark:text-slate-300 py-1.5 pr-3">
              {t("quotaTableFeature")}
            </th>
            <th className="text-right font-semibold text-gray-500 dark:text-slate-400 py-1.5 px-2">
              Free
            </th>
            <th className="text-right font-semibold text-gray-500 dark:text-slate-400 py-1.5 px-2">
              Basic
            </th>
            <th className="text-right font-semibold text-emerald-600 dark:text-emerald-400 py-1.5 px-2">
              Pro
            </th>
            <th className="text-right font-semibold text-amber-700 dark:text-amber-400 py-1.5 pl-2">
              Wealth
            </th>
          </tr>
        </thead>
        <tbody>
          {features.map((key) => {
            const cfg = FEATURE_QUOTAS[key];
            if (!cfg) return null;
            return (
              <tr
                key={key}
                className="border-b border-gray-100 dark:border-slate-800/60 last:border-b-0"
              >
                <td className="py-1.5 pr-3 text-gray-700 dark:text-slate-200">{cfg.label}</td>
                <td className="py-1.5 px-2 text-right tabular-nums text-gray-500 dark:text-slate-400">
                  {formatLimit(cfg.free, cfg.window, t)}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums text-gray-500 dark:text-slate-400">
                  {formatLimit(cfg.basic, cfg.window, t)}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatLimit(cfg.pro, cfg.window, t)}
                </td>
                <td className="py-1.5 pl-2 text-right tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                  {formatLimit(cfg.wealth, cfg.window, t)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
