"use client";

import { useI18n } from "@/lib/i18n";
import { formatAnalysisNumber } from "@/lib/company-analysis/format";
import type { CompanyAnalysisEtf } from "@/lib/company-analysis/types";

function WeightBar({ label, weight, max }: { label: string; weight: number; max: number }) {
  const { language } = useI18n();
  const pct = formatAnalysisNumber(weight, language, { digits: 1 });
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 capitalize text-xs text-[color:var(--foreground)]">
        {label.replace(/_/g, " ")}
      </span>
      <div className="h-4 flex-1 overflow-hidden rounded-full bg-[color:var(--surface-soft)]">
        <div
          className="h-full rounded-full bg-[color:var(--accent)] transition-all"
          style={{ width: `${max > 0 ? (weight / max) * 100 : 0}%` }}
        />
      </div>
      <span className="w-14 text-right text-xs tabular-nums font-medium text-[color:var(--muted)]">
        {pct != null ? `${pct}%` : "—"}
      </span>
    </div>
  );
}

export default function EtfCompositionPanel({ etf }: { etf?: CompanyAnalysisEtf | null }) {
  const { t, language } = useI18n();
  if (!etf) return null;

  const holdings = etf.holdings ?? [];
  const sectors = etf.sectorWeightings ?? [];
  const assets = etf.assetClassWeightings ?? [];
  if (holdings.length === 0 && sectors.length === 0 && assets.length === 0) return null;

  const maxSector = sectors.length > 0 ? Math.max(...sectors.map((s) => s.weight)) : 0;
  const maxAsset = assets.length > 0 ? Math.max(...assets.map((s) => s.weight)) : 0;

  return (
    <section className="space-y-4" aria-labelledby="etf-composition">
      <h2 id="etf-composition" className="sr-only">
        {t("etfAnalysisComposition")}
      </h2>
      {holdings.length > 0 && (
        <div className="card overflow-x-auto">
          <h3 className="px-6 pb-3 pt-5 text-sm font-semibold text-[color:var(--foreground)]">
            {t("etfAnalysisTopHoldings")}
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[color:var(--surface-soft)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--muted)]">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--muted)]">
                  {t("name")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--muted)]">
                  {t("ticker")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[color:var(--muted)]">
                  {t("weight")}
                </th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, idx) => {
                const w = formatAnalysisNumber(h.weight, language, { digits: 2 });
                return (
                  <tr
                    key={h.symbol || idx}
                    className="border-t border-[color:var(--border)]"
                  >
                    <td className="px-4 py-2.5 text-xs text-[color:var(--muted)]">{idx + 1}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-[color:var(--foreground)]">
                      {h.name || "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[color:var(--muted)]">
                      {h.symbol || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums font-medium text-[color:var(--foreground)]">
                      {w != null ? `${w}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {sectors.length > 0 && (
        <div className="card px-6 py-5">
          <h3 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
            {t("etfAnalysisSectors")}
          </h3>
          <div className="space-y-2">
            {sectors.map((s) => (
              <WeightBar key={s.sector} label={s.sector} weight={s.weight} max={maxSector} />
            ))}
          </div>
        </div>
      )}
      {assets.length > 0 && (
        <div className="card px-6 py-5">
          <h3 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
            {t("etfAnalysisAssetClasses")}
          </h3>
          <div className="space-y-2">
            {assets.map((s) => (
              <WeightBar key={s.assetClass} label={s.assetClass} weight={s.weight} max={maxAsset} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
