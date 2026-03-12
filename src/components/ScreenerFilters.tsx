"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { useTrack } from "@/lib/use-track";
import type { ScreenerFilters as FiltersType } from "@/lib/db/screener";

interface Preset {
  key: string;
  labelKey: string;
  filters: Partial<FiltersType>;
}

const PRESETS: Preset[] = [
  { key: "all", labelKey: "screenerPresetAll", filters: {} },
  { key: "dividend", labelKey: "screenerPresetDividend", filters: { divYieldMin: 3, sortBy: "dividendYield", sortDir: "desc" } },
  { key: "value", labelKey: "screenerPresetValue", filters: { peMax: 15, sortBy: "peRatio", sortDir: "asc" } },
  { key: "growth", labelKey: "screenerPresetGrowth", filters: { peMin: 20, marketCap: "large", sortBy: "regularMarketChangePercent", sortDir: "desc" } },
  { key: "bluechip", labelKey: "screenerPresetBluechip", filters: { marketCap: "mega", divYieldMin: 1, sortBy: "marketCap", sortDir: "desc" } },
];

const MARKET_CAP_OPTIONS = [
  { value: "", labelKey: "screenerAnySize" },
  { value: "mega", labelKey: "screenerMega" },
  { value: "large", labelKey: "screenerLarge" },
  { value: "mid", labelKey: "screenerMid" },
  { value: "small", labelKey: "screenerSmall" },
  { value: "micro", labelKey: "screenerMicro" },
] as const;

interface Props {
  filters: FiltersType;
  meta: { sectors: string[]; countries: string[]; exchanges: string[]; total: number } | null;
  onChange: (f: FiltersType) => void;
}

export default function ScreenerFilters({ filters, meta, onChange }: Props) {
  const { t } = useI18n();
  const { layoutTheme } = useTheme();
  const track = useTrack();

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.sector) count++;
    if (filters.divYieldMin != null) count++;
    if (filters.divYieldMax != null) count++;
    if (filters.peMin != null) count++;
    if (filters.peMax != null) count++;
    if (filters.marketCap) count++;
    if (filters.exchange) count++;
    if (filters.country) count++;
    return count;
  }, [filters]);

  const activePreset = useMemo(() => {
    if (activeCount === 0 && !filters.divYieldMin && !filters.peMax) return "all";
    for (const p of PRESETS) {
      if (p.key === "all") continue;
      const f = p.filters;
      let match = true;
      if (f.divYieldMin != null && filters.divYieldMin !== f.divYieldMin) match = false;
      if (f.peMax != null && filters.peMax !== f.peMax) match = false;
      if (f.peMin != null && filters.peMin !== f.peMin) match = false;
      if (f.marketCap && filters.marketCap !== f.marketCap) match = false;
      if (match && Object.keys(f).length > 0) return p.key;
    }
    return null;
  }, [filters, activeCount]);

  function applyPreset(preset: Preset) {
    track("screener_preset_selected", { preset_name: preset.key });
    onChange({
      ...preset.filters,
      sortBy: preset.filters.sortBy || "dividendYield",
      sortDir: preset.filters.sortDir || "desc",
      limit: filters.limit,
      page: 1,
    });
  }

  function updateFilter(key: string, value: string | number | undefined) {
    track("screener_filter_applied", { filter_name: key, filter_value: String(value ?? "") });
    const updated = { ...filters, [key]: value || undefined };
    onChange(updated);
  }

  function clearAll() {
    onChange({ sortBy: "dividendYield", sortDir: "desc", limit: filters.limit, page: 1 });
  }

  // Terminal: compact inline layout
  if (layoutTheme === "terminal") {
    return (
      <div>
        {/* Presets */}
        <div className="flex gap-1 mb-2 flex-wrap font-mono">
          {PRESETS.map((p) => (
            <button key={p.key} onClick={() => applyPreset(p)}
              className={`px-2 py-0.5 text-[11px] uppercase tracking-widest border transition-colors ${
                activePreset === p.key
                  ? "bg-green-500/20 text-green-400 border-green-500/40"
                  : "border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
              }`}>{t(p.labelKey as keyof typeof t)}</button>
          ))}
        </div>
        {/* Filters row */}
        <div className="border border-zinc-800 p-2">
          <div className="flex items-center gap-1 mb-2">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">{t("screenerFilters")}</span>
            {activeCount > 0 && <span className="text-[10px] text-zinc-600 font-mono">[{activeCount}]</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <FilterSelect label={t("screenerSector")} value={filters.sector || ""} onChange={(v) => updateFilter("sector", v)} theme="terminal"
              options={[{ value: "", label: t("screenerAnySector") }, ...(meta?.sectors.map((s) => ({ value: s, label: s })) || [])]} />
            <div>
              <label className="block text-[9px] uppercase tracking-widest text-zinc-600 font-mono mb-0.5">{t("screenerDivYield")}</label>
              <div className="flex gap-1">
                <input type="number" placeholder={t("screenerDivYieldMin")} value={filters.divYieldMin ?? ""} onChange={(e) => updateFilter("divYieldMin", e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-black border border-zinc-700 text-zinc-300 font-mono text-[11px] px-1.5 py-1 focus:border-green-500 focus:outline-none" />
                <input type="number" placeholder={t("screenerDivYieldMax")} value={filters.divYieldMax ?? ""} onChange={(e) => updateFilter("divYieldMax", e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-black border border-zinc-700 text-zinc-300 font-mono text-[11px] px-1.5 py-1 focus:border-green-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-widest text-zinc-600 font-mono mb-0.5">{t("screenerPE")}</label>
              <div className="flex gap-1">
                <input type="number" placeholder={t("screenerPEMin")} value={filters.peMin ?? ""} onChange={(e) => updateFilter("peMin", e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-black border border-zinc-700 text-zinc-300 font-mono text-[11px] px-1.5 py-1 focus:border-green-500 focus:outline-none" />
                <input type="number" placeholder={t("screenerPEMax")} value={filters.peMax ?? ""} onChange={(e) => updateFilter("peMax", e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-black border border-zinc-700 text-zinc-300 font-mono text-[11px] px-1.5 py-1 focus:border-green-500 focus:outline-none" />
              </div>
            </div>
            <FilterSelect label={t("screenerMarketCap")} value={filters.marketCap || ""} onChange={(v) => updateFilter("marketCap", v)} theme="terminal"
              options={MARKET_CAP_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey as keyof typeof t) }))} />
            <FilterSelect label={t("screenerExchange")} value={filters.exchange || ""} onChange={(v) => updateFilter("exchange", v)} theme="terminal"
              options={[{ value: "", label: t("screenerAllExchanges") }, ...(meta?.exchanges.map((e) => ({ value: e, label: e })) || [])]} />
            <FilterSelect label={t("screenerCountry")} value={filters.country || ""} onChange={(v) => updateFilter("country", v)} theme="terminal"
              options={[{ value: "", label: t("screenerAnyCountry") }, ...(meta?.countries.map((c) => ({ value: c, label: c })) || [])]} />
          </div>
          <div className="flex gap-2 mt-2 pt-2 border-t border-zinc-800">
            <button onClick={() => onChange(filters)} className="px-3 py-1 text-[11px] font-mono uppercase tracking-widest bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30 transition-colors">
              {t("screenerScreenBtn")}
            </button>
            <button onClick={clearAll} className="px-3 py-1 text-[11px] font-mono uppercase tracking-widest border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors">
              {t("screenerClearBtn")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Canvas: spacious, warm, rounded
  if (layoutTheme === "canvas") {
    return (
      <div>
        <div className="flex gap-2 mb-4 flex-wrap">
          {PRESETS.map((p) => (
            <button key={p.key} onClick={() => applyPreset(p)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                activePreset === p.key
                  ? "bg-green-600 text-white border-green-600 shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-sm"
              }`}>{t(p.labelKey as keyof typeof t)}</button>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              {t("screenerFilters")}
            </h2>
            {activeCount > 0 && <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">{t("screenerActiveFilters").replace("{count}", String(activeCount))}</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FilterSelect label={t("screenerSector")} value={filters.sector || ""} onChange={(v) => updateFilter("sector", v)} theme="canvas"
              options={[{ value: "", label: t("screenerAnySector") }, ...(meta?.sectors.map((s) => ({ value: s, label: s })) || [])]} />
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">{t("screenerDivYield")}</label>
              <div className="flex gap-2 items-center">
                <input type="number" placeholder={t("screenerDivYieldMin")} value={filters.divYieldMin ?? ""} onChange={(e) => updateFilter("divYieldMin", e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none" />
                <span className="text-slate-300">&ndash;</span>
                <input type="number" placeholder={t("screenerDivYieldMax")} value={filters.divYieldMax ?? ""} onChange={(e) => updateFilter("divYieldMax", e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">{t("screenerPE")}</label>
              <div className="flex gap-2 items-center">
                <input type="number" placeholder={t("screenerPEMin")} value={filters.peMin ?? ""} onChange={(e) => updateFilter("peMin", e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none" />
                <span className="text-slate-300">&ndash;</span>
                <input type="number" placeholder={t("screenerPEMax")} value={filters.peMax ?? ""} onChange={(e) => updateFilter("peMax", e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none" />
              </div>
            </div>
            <FilterSelect label={t("screenerMarketCap")} value={filters.marketCap || ""} onChange={(v) => updateFilter("marketCap", v)} theme="canvas"
              options={MARKET_CAP_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey as keyof typeof t) }))} />
            <FilterSelect label={t("screenerExchange")} value={filters.exchange || ""} onChange={(v) => updateFilter("exchange", v)} theme="canvas"
              options={[{ value: "", label: t("screenerAllExchanges") }, ...(meta?.exchanges.map((e) => ({ value: e, label: e })) || [])]} />
            <FilterSelect label={t("screenerCountry")} value={filters.country || ""} onChange={(v) => updateFilter("country", v)} theme="canvas"
              options={[{ value: "", label: t("screenerAnyCountry") }, ...(meta?.countries.map((c) => ({ value: c, label: c })) || [])]} />
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
            <button onClick={() => onChange(filters)} className="px-5 py-2 text-sm font-medium bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm">
              {t("screenerScreenBtn")}
            </button>
            <button onClick={clearAll} className="px-4 py-2 text-sm font-medium border border-slate-200 text-slate-500 rounded-xl hover:border-slate-300 hover:text-slate-700 transition-colors">
              {t("screenerClearBtn")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Studio: glass card
  if (layoutTheme === "studio") {
    return (
      <div>
        <div className="flex gap-2 mb-4 flex-wrap">
          {PRESETS.map((p) => (
            <button key={p.key} onClick={() => applyPreset(p)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border ${
                activePreset === p.key
                  ? "bg-green-500/15 text-green-400 border-green-500/30"
                  : "border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20"
              }`}>{t(p.labelKey as keyof typeof t)}</button>
          ))}
        </div>
        <div className="rounded-[20px] border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              {t("screenerFilters")}
            </h2>
            {activeCount > 0 && <span className="text-xs text-zinc-500 bg-white/5 px-2.5 py-0.5 rounded-full">{t("screenerActiveFilters").replace("{count}", String(activeCount))}</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <FilterSelect label={t("screenerSector")} value={filters.sector || ""} onChange={(v) => updateFilter("sector", v)} theme="studio"
              options={[{ value: "", label: t("screenerAnySector") }, ...(meta?.sectors.map((s) => ({ value: s, label: s })) || [])]} />
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">{t("screenerDivYield")}</label>
              <div className="flex gap-2 items-center">
                <input type="number" placeholder={t("screenerDivYieldMin")} value={filters.divYieldMin ?? ""} onChange={(e) => updateFilter("divYieldMin", e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-white/[0.03] border border-white/10 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:border-green-500/50 focus:outline-none" />
                <span className="text-zinc-600">&ndash;</span>
                <input type="number" placeholder={t("screenerDivYieldMax")} value={filters.divYieldMax ?? ""} onChange={(e) => updateFilter("divYieldMax", e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-white/[0.03] border border-white/10 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:border-green-500/50 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">{t("screenerPE")}</label>
              <div className="flex gap-2 items-center">
                <input type="number" placeholder={t("screenerPEMin")} value={filters.peMin ?? ""} onChange={(e) => updateFilter("peMin", e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-white/[0.03] border border-white/10 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:border-green-500/50 focus:outline-none" />
                <span className="text-zinc-600">&ndash;</span>
                <input type="number" placeholder={t("screenerPEMax")} value={filters.peMax ?? ""} onChange={(e) => updateFilter("peMax", e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-white/[0.03] border border-white/10 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:border-green-500/50 focus:outline-none" />
              </div>
            </div>
            <FilterSelect label={t("screenerMarketCap")} value={filters.marketCap || ""} onChange={(v) => updateFilter("marketCap", v)} theme="studio"
              options={MARKET_CAP_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey as keyof typeof t) }))} />
            <FilterSelect label={t("screenerExchange")} value={filters.exchange || ""} onChange={(v) => updateFilter("exchange", v)} theme="studio"
              options={[{ value: "", label: t("screenerAllExchanges") }, ...(meta?.exchanges.map((e) => ({ value: e, label: e })) || [])]} />
            <FilterSelect label={t("screenerCountry")} value={filters.country || ""} onChange={(v) => updateFilter("country", v)} theme="studio"
              options={[{ value: "", label: t("screenerAnyCountry") }, ...(meta?.countries.map((c) => ({ value: c, label: c })) || [])]} />
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
            <button onClick={() => onChange(filters)} className="px-5 py-2 text-sm font-medium bg-green-500/15 text-green-400 border border-green-500/30 rounded-xl hover:bg-green-500/25 transition-colors">
              {t("screenerScreenBtn")}
            </button>
            <button onClick={clearAll} className="px-4 py-2 text-sm font-medium border border-white/10 text-zinc-500 rounded-xl hover:text-zinc-300 hover:border-white/20 transition-colors">
              {t("screenerClearBtn")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default theme
  return (
    <div>
      <div className="flex gap-2 mb-5 flex-wrap">
        {PRESETS.map((p) => (
          <button key={p.key} onClick={() => applyPreset(p)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border ${
              activePreset === p.key
                ? "bg-emerald-500 text-white border-emerald-500"
                : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600 hover:text-gray-700 dark:hover:text-slate-300"
            }`}>{t(p.labelKey as keyof typeof t)}</button>
        ))}
      </div>
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            {t("screenerFilters")}
          </h2>
          {activeCount > 0 && <span className="text-xs text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700/50 px-2.5 py-0.5 rounded-full">{t("screenerActiveFilters").replace("{count}", String(activeCount))}</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FilterSelect label={t("screenerSector")} value={filters.sector || ""} onChange={(v) => updateFilter("sector", v)} theme="default"
            options={[{ value: "", label: t("screenerAnySector") }, ...(meta?.sectors.map((s) => ({ value: s, label: s })) || [])]} />
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t("screenerDivYield")}</label>
            <div className="flex gap-2 items-center">
              <input type="number" placeholder={t("screenerDivYieldMin")} value={filters.divYieldMin ?? ""} onChange={(e) => updateFilter("divYieldMin", e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none" />
              <span className="text-gray-300 dark:text-slate-600">&ndash;</span>
              <input type="number" placeholder={t("screenerDivYieldMax")} value={filters.divYieldMax ?? ""} onChange={(e) => updateFilter("divYieldMax", e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t("screenerPE")}</label>
            <div className="flex gap-2 items-center">
              <input type="number" placeholder={t("screenerPEMin")} value={filters.peMin ?? ""} onChange={(e) => updateFilter("peMin", e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none" />
              <span className="text-gray-300 dark:text-slate-600">&ndash;</span>
              <input type="number" placeholder={t("screenerPEMax")} value={filters.peMax ?? ""} onChange={(e) => updateFilter("peMax", e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none" />
            </div>
          </div>
          <FilterSelect label={t("screenerMarketCap")} value={filters.marketCap || ""} onChange={(v) => updateFilter("marketCap", v)} theme="default"
            options={MARKET_CAP_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey as keyof typeof t) }))} />
          <FilterSelect label={t("screenerExchange")} value={filters.exchange || ""} onChange={(v) => updateFilter("exchange", v)} theme="default"
            options={[{ value: "", label: t("screenerAllExchanges") }, ...(meta?.exchanges.map((e) => ({ value: e, label: e })) || [])]} />
          <FilterSelect label={t("screenerCountry")} value={filters.country || ""} onChange={(v) => updateFilter("country", v)} theme="default"
            options={[{ value: "", label: t("screenerAnyCountry") }, ...(meta?.countries.map((c) => ({ value: c, label: c })) || [])]} />
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
          <button onClick={() => onChange(filters)} className="px-5 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            {t("screenerScreenBtn")}
          </button>
          <button onClick={clearAll} className="px-4 py-2 text-sm font-medium border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 rounded-lg hover:border-gray-300 dark:hover:border-slate-500 hover:text-gray-700 dark:hover:text-slate-300 transition-colors">
            {t("screenerClearBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, theme }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  theme: "default" | "terminal" | "canvas" | "studio";
}) {
  const selectClass = theme === "terminal"
    ? "w-full bg-black border border-zinc-700 text-zinc-300 font-mono text-[11px] px-1.5 py-1 focus:border-green-500 focus:outline-none appearance-none"
    : theme === "canvas"
    ? "w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none appearance-none"
    : theme === "studio"
    ? "w-full bg-white/[0.03] border border-white/10 text-zinc-200 rounded-xl px-3 py-2 text-sm focus:border-green-500/50 focus:outline-none appearance-none"
    : "w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none appearance-none";

  const labelClass = theme === "terminal"
    ? "block text-[9px] uppercase tracking-widest text-zinc-600 font-mono mb-0.5"
    : theme === "canvas"
    ? "block text-xs font-medium text-slate-500 mb-1.5"
    : theme === "studio"
    ? "block text-[11px] font-medium text-zinc-500 mb-1"
    : "block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide";

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
