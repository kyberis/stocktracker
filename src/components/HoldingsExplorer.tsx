"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { usePortfolio } from "@/lib/portfolio-context";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { useTrack } from "@/lib/use-track";
import { useStealthMode } from "@/lib/stealth-context";
import {
  formatCompactNumber,
  formatPercent,
  formatStealthCurrency,
  convertCurrency,
} from "@/lib/utils";
import HoldingResearchLinks from "@/components/HoldingResearchLinks";
import type { Holding, HoldingAssetType } from "@/lib/types";
import {
  PRESET_SORT,
  buildResearchViews,
  filterResearchViews,
  sortResearchViews,
  type HoldingsResearchApiRow,
  type HoldingsResearchFundamentals,
  type HoldingsResearchPreset,
  type HoldingsResearchSortKey,
  type HoldingResearchView,
} from "@/lib/holdings-research";

const StockDetailDrawer = dynamic(() => import("@/components/StockDetailDrawer"), { ssr: false });

type AssetFilter = HoldingAssetType | "all";

function formatPe(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val) || val <= 0) return "—";
  return val.toFixed(1);
}

function formatYieldPct(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return "—";
  return `${(val * 100).toFixed(2)}%`;
}

function formatRatioPct(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return "—";
  const pct = Math.abs(val) <= 2 ? val * 100 : val;
  return `${pct.toFixed(1)}%`;
}

function formatCap(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return "—";
  return formatCompactNumber(val);
}

function SortButton({
  col,
  label,
  active,
  dir,
  align,
  onSort,
}: {
  col: HoldingsResearchSortKey;
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  align?: "right";
  onSort: (col: HoldingsResearchSortKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      className={`inline-flex items-center gap-0.5 min-h-11 sm:min-h-0 font-semibold uppercase tracking-wide text-[10px] sm:text-[11px] text-[color:var(--muted)] hover:text-[color:var(--foreground)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] rounded ${align === "right" ? "ml-auto" : ""}`}
    >
      {label}
      {active ? <span aria-hidden="true">{dir === "desc" ? "↓" : "↑"}</span> : null}
    </button>
  );
}

export default function HoldingsExplorer() {
  const { t } = useI18n();
  const { layoutTheme } = useTheme();
  const track = useTrack();
  const { stealthMode } = useStealthMode();
  const { holdings, quotes, exchangeRates, activePortfolioId } = usePortfolio();
  const { getApiHeaders, defaultCurrency } = useSettings();

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);
  const [fundById, setFundById] = useState<Map<string, HoldingsResearchFundamentals>>(new Map());
  const [sortKey, setSortKey] = useState<HoldingsResearchSortKey>("weightPct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [preset, setPreset] = useState<HoldingsResearchPreset | null>("largestWeight");
  const [query, setQuery] = useState("");
  const [assetType, setAssetType] = useState<AssetFilter>("all");
  const [sector, setSector] = useState("");
  const [tag, setTag] = useState("");
  const [selected, setSelected] = useState<Holding | null>(null);

  useEffect(() => {
    track("holdings_explorer_open");
  }, [track]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setFetchError(null);
      try {
        const qp = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
        const res = await fetch(`/api/holdings-research${qp}`, { headers: getApiHeaders() });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || t("holdingsExplorerError"));
        }
        const data = (await res.json()) as { rows: HoldingsResearchApiRow[]; metricsPartial?: boolean };
        if (cancelled) return;
        const next = new Map<string, HoldingsResearchFundamentals>();
        for (const row of data.rows ?? []) {
          next.set(row.holdingId, row.fundamentals);
        }
        setFundById(next);
        setPartial(Boolean(data.metricsPartial));
      } catch (err) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : t("holdingsExplorerError"));
          setFundById(new Map());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [activePortfolioId, getApiHeaders, t]);

  const views = useMemo(
    () => buildResearchViews(holdings, fundById, quotes, exchangeRates),
    [holdings, fundById, quotes, exchangeRates],
  );

  const sectors = useMemo(() => {
    const set = new Set<string>();
    for (const v of views) {
      const s = v.fundamentals.sector || v.holding.sector;
      if (s) set.add(s);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [views]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const v of views) {
      for (const tg of v.holding.tags ?? []) {
        if (tg) set.add(tg);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [views]);

  const filtered = useMemo(
    () => filterResearchViews(views, { query, assetType, sector, tag }),
    [views, query, assetType, sector, tag],
  );

  const sorted = useMemo(
    () => sortResearchViews(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  );

  const handleSort = useCallback(
    (key: HoldingsResearchSortKey) => {
      track("holdings_explorer_sort", { sort_by: key });
      setPreset(null);
      setSortKey((prev) => {
        if (prev === key) {
          setSortDir((d) => (d === "desc" ? "asc" : "desc"));
          return prev;
        }
        setSortDir(key === "name" || key === "peRatio" || key === "forwardPe" || key === "pegRatio" ? "asc" : "desc");
        return key;
      });
    },
    [track],
  );

  const applyPreset = (id: HoldingsResearchPreset) => {
    const spec = PRESET_SORT[id];
    setPreset(id);
    setSortKey(spec.key);
    setSortDir(spec.dir);
    track("holdings_explorer_sort", { sort_by: spec.key, preset: id });
  };

  const money = (eur: number) => {
    const display = convertCurrency(eur, "EUR", defaultCurrency || "EUR", exchangeRates);
    const amount = Number.isFinite(display) ? display : eur;
    const ccy = Number.isFinite(display) ? defaultCurrency || "EUR" : "EUR";
    return formatStealthCurrency(amount, ccy, stealthMode);
  };

  const containerClass =
    layoutTheme === "terminal"
      ? "max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-4 space-y-3"
      : "max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4";

  const presets: { id: HoldingsResearchPreset; label: string }[] = [
    { id: "cheapPe", label: t("holdingsExplorerPresetCheapPe") },
    { id: "highDiv", label: t("holdingsExplorerPresetHighDiv") },
    { id: "largestWeight", label: t("holdingsExplorerPresetLargest") },
    { id: "highBeta", label: t("holdingsExplorerPresetHighBeta") },
    { id: "nearHighs", label: t("holdingsExplorerPresetNearHighs") },
  ];

  const typeFilters: { key: AssetFilter; label: string }[] = [
    { key: "all", label: t("allAssets") },
    { key: "stock", label: t("stocksLabel") },
    { key: "etf", label: t("etfsLabel") },
    { key: "fund", label: t("fundsLabel") },
    { key: "crypto", label: t("cryptoLabel") },
  ];

  return (
    <div className={containerClass} data-testid="holdings-explorer" style={{ fontFamily: "var(--font-primary, inherit)" }}>
      <header>
        <h1 className={`font-bold ${layoutTheme === "terminal" ? "text-lg font-mono text-zinc-300" : "text-2xl"}`}>
          {t("holdingsExplorerTitle")}
        </h1>
        <p className={`mt-1 ${layoutTheme === "terminal" ? "text-xs font-mono text-zinc-500" : "text-sm text-[color:var(--muted)]"}`}>
          {t("holdingsExplorerDesc")}
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t("holdingsExplorerPresets")}>
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id)}
            aria-pressed={preset === p.id}
            className={`min-h-11 sm:min-h-0 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              preset === p.id
                ? "border-[color:var(--accent)] text-[color:var(--accent)] bg-[color:var(--accent-soft,transparent)]"
                : "border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <label className="sr-only" htmlFor="holdings-explorer-search">
          {t("holdingsExplorerSearch")}
        </label>
        <input
          id="holdings-explorer-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("holdingsExplorerSearch")}
          className="w-full sm:max-w-xs min-h-11 sm:min-h-0"
        />
        <div className="flex gap-1.5 flex-wrap" role="group" aria-label={t("allAssets")}>
          {typeFilters.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setAssetType(opt.key)}
              aria-pressed={assetType === opt.key}
              className={`min-h-11 sm:min-h-0 px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                assetType === opt.key
                  ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                  : "border-[color:var(--border)] text-[color:var(--muted)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {sectors.length > 0 && (
          <label className="text-xs text-[color:var(--muted)] flex items-center gap-2">
            {t("sector")}
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="min-h-11 sm:min-h-0 text-sm"
            >
              <option value="">{t("screenerAnySector")}</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        {tags.length > 0 && (
          <label className="text-xs text-[color:var(--muted)] flex items-center gap-2">
            {t("holdingsExplorerTags")}
            <select value={tag} onChange={(e) => setTag(e.target.value)} className="min-h-11 sm:min-h-0 text-sm">
              <option value="">{t("holdingsExplorerAnyTag")}</option>
              {tags.map((tg) => (
                <option key={tg} value={tg}>
                  {tg}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {partial && (
        <p role="status" className="text-xs text-amber-700 dark:text-amber-400">
          {t("holdingsExplorerPartial")}
        </p>
      )}

      {fetchError && (
        <div role="alert" className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {fetchError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-[color:var(--muted)]" aria-busy="true">
          {t("holdingsExplorerLoading")}
        </div>
      ) : holdings.length === 0 ? (
        <div className="card p-8 text-center space-y-3">
          <p className="text-[color:var(--muted)]">{t("holdingsExplorerEmpty")}</p>
          <a href="/import" className="btn-primary inline-flex min-h-11 items-center justify-center px-4">
            {t("holdingsExplorerEmptyCta")}
          </a>
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-center py-12 text-sm text-[color:var(--muted)]">{t("screenerNoResults")}</p>
      ) : (
        <div className="card overflow-x-auto max-w-full">
          <table className="w-full min-w-[1100px] text-sm">
            <caption className="sr-only">{t("holdingsExplorerTitle")}</caption>
            <thead>
              <tr className="border-b border-[color:var(--border)] text-left">
                <th scope="col" aria-sort={sortKey === "name" ? (sortDir === "asc" ? "ascending" : "descending") : "none"} className="px-3 py-2 sticky left-0 bg-[color:var(--surface,var(--page-background))] z-10">
                  <SortButton col="name" label={t("name")} active={sortKey === "name"} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortButton col="positionValue" label={t("holdingsExplorerColValue")} active={sortKey === "positionValue"} dir={sortDir} align="right" onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortButton col="weightPct" label={t("holdingsExplorerColWeight")} active={sortKey === "weightPct"} dir={sortDir} align="right" onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortButton col="dayChange" label={t("screenerDay")} active={sortKey === "dayChange"} dir={sortDir} align="right" onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortButton col="returnPct" label={t("sortReturnPct")} active={sortKey === "returnPct"} dir={sortDir} align="right" onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortButton col="peRatio" label={t("peRatio")} active={sortKey === "peRatio"} dir={sortDir} align="right" onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortButton col="forwardPe" label={t("forwardPE")} active={sortKey === "forwardPe"} dir={sortDir} align="right" onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortButton col="pegRatio" label={t("pegRatio")} active={sortKey === "pegRatio"} dir={sortDir} align="right" onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortButton col="dividendYield" label={t("dividendYield")} active={sortKey === "dividendYield"} dir={sortDir} align="right" onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right">{t("holdingsExplorerColDivIncome")}</th>
                <th className="px-3 py-2">
                  <SortButton col="sectorSize" label={t("sector")} active={sortKey === "sectorSize"} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortButton col="beta" label={t("beta")} active={sortKey === "beta"} dir={sortDir} align="right" onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right">{t("eps")}</th>
                <th className="px-3 py-2 text-right">
                  <SortButton col="roe" label={t("returnOnEquity")} active={sortKey === "roe"} dir={sortDir} align="right" onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right">{t("screenerMarketCap")}</th>
                <th className="px-3 py-2 text-right">
                  <SortButton col="pctFromHigh" label={t("holdingsExplorerCol52w")} active={sortKey === "pctFromHigh"} dir={sortDir} align="right" onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortButton col="analystUpside" label={t("holdingsExplorerColUpside")} active={sortKey === "analystUpside"} dir={sortDir} align="right" onSort={handleSort} />
                </th>
                <th className="px-3 py-2">{t("holdingsExplorerResearch")}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <ExplorerRow key={row.holding.id} row={row} money={money} onOpen={() => setSelected(row.holding)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className={`text-center ${layoutTheme === "terminal" ? "text-[10px] font-mono text-zinc-600" : "text-xs text-[color:var(--muted)]"}`}>
        {t("holdingsExplorerDisclaimer")}
      </p>

      {selected && <StockDetailDrawer holding={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ExplorerRow({
  row,
  money,
  onOpen,
}: {
  row: HoldingResearchView;
  money: (eur: number) => string;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const f = row.fundamentals;
  const type = row.holding.assetType ?? "stock";
  const showFund = type === "stock" || type === "etf";
  const dayClass =
    (row.dayChangePct ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
  const retClass =
    (row.returnPct ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";

  return (
    <tr className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface-hover,transparent)]">
      <td className="px-3 py-2.5 sticky left-0 bg-[color:var(--surface,var(--page-background))]">
        <button
          type="button"
          onClick={onOpen}
          className="text-left min-h-11 sm:min-h-0 focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] rounded"
        >
          <span className="font-semibold block">{row.holding.ticker}</span>
          <span className="text-xs text-[color:var(--muted)] block truncate max-w-[160px]">{row.holding.name}</span>
          <span className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">{type}</span>
        </button>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">{money(row.valueEUR)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{row.weightPct.toFixed(1)}%</td>
      <td className={`px-3 py-2.5 text-right tabular-nums ${dayClass}`}>
        {row.dayChangePct == null ? "—" : formatPercent(row.dayChangePct)}
      </td>
      <td className={`px-3 py-2.5 text-right tabular-nums ${retClass}`}>
        {row.returnPct == null ? "—" : formatPercent(row.returnPct)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">{showFund ? formatPe(f.peRatio) : t("holdingsExplorerMetricsNa")}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{showFund ? formatPe(f.forwardPe) : t("holdingsExplorerMetricsNa")}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{showFund ? formatPe(f.pegRatio) : t("holdingsExplorerMetricsNa")}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{showFund ? formatYieldPct(f.dividendYield) : t("holdingsExplorerMetricsNa")}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {showFund && row.estimatedDivIncomeEUR != null ? money(row.estimatedDivIncomeEUR) : "—"}
      </td>
      <td className="px-3 py-2.5">
        <div className="text-xs">{f.sector || row.holding.sector || "—"}</div>
        <div className="text-[10px] text-[color:var(--muted)]">{formatCap(f.marketCap)}</div>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">{showFund && f.beta != null ? f.beta.toFixed(2) : "—"}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{showFund && f.eps != null ? f.eps.toFixed(2) : "—"}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{showFund ? formatRatioPct(f.returnOnEquity) : "—"}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{formatCap(f.marketCap)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {row.pctFromHigh == null ? "—" : formatPercent(row.pctFromHigh)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {row.analystUpsidePct == null ? "—" : formatPercent(row.analystUpsidePct)}
      </td>
      <td className="px-3 py-2.5">
        <HoldingResearchLinks holding={row.holding} variant="inline" />
      </td>
    </tr>
  );
}
