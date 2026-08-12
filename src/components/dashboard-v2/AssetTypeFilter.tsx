"use client";

import { useI18n } from "@/lib/i18n";
import type { HoldingAssetType } from "@/lib/types";

export type AssetFilter = HoldingAssetType | "all" | "fixed_return";

const ASSET_COLORS: Record<AssetFilter, string> = {
  all: "var(--gain, #10b981)",
  stock: "#6366f1",
  etf: "#f59e0b",
  fund: "#14b8a6",
  crypto: "#ec4899",
  fixed_return: "#0ea5e9",
};

interface Props {
  value: AssetFilter;
  onChange: (v: AssetFilter) => void;
  dayChangePct?: Partial<Record<AssetFilter, number>>;
}

export default function AssetTypeFilter({ value, onChange, dayChangePct }: Props) {
  const { t } = useI18n();

  const options: { key: AssetFilter; label: string }[] = [
    { key: "all", label: t("allAssets") },
    { key: "stock", label: t("stocksLabel") },
    { key: "etf", label: t("etfsLabel") },
    { key: "fund", label: t("fundsLabel") },
    { key: "crypto", label: t("cryptoLabel") },
    { key: "fixed_return", label: t("assetTypeFixedReturn") },
  ];

  return (
    <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Asset type filter">
      {options.map(({ key, label }) => {
        const isActive = value === key;
        const color = ASSET_COLORS[key];
        const pct = dayChangePct?.[key];
        const hasPct = pct != null;
        const pctColor =
          !hasPct || pct === 0
            ? "text-gray-400 dark:text-slate-500"
            : pct > 0
              ? "text-emerald-500 dark:text-emerald-400"
              : "text-red-500 dark:text-red-400";

        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            aria-pressed={isActive}
            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              isActive
                ? "border-transparent"
                : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600 hover:text-gray-700 dark:hover:text-slate-300"
            }`}
            style={isActive ? {
              background: `color-mix(in srgb, ${color} 12%, transparent)`,
              color,
              borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
            } : undefined}
          >
            <span
              className="w-[7px] h-[7px] rounded-full shrink-0"
              style={{ background: color }}
            />
            {label}
            {hasPct && (
              <span className={`text-[10px] tabular-nums font-medium ${pctColor}`}>
                {pct > 0 ? "+" : ""}{pct.toFixed(2)}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { ASSET_COLORS };
