"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

interface ScreenerRow {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  scorePct: number;
  verdict: string;
  passedCount: number;
  criteriaCount: number;
  peRatio: number | null;
  price: number | null;
  currency: string | null;
  earningsConsistencyStatus: string | null;
  grossMarginStatus: string | null;
  netMarginStatus: string | null;
  retainedEarningsStatus: string | null;
  returnOnEquityStatus: string | null;
  debtSustainabilityStatus: string | null;
  capexEfficiencyStatus: string | null;
  productDurabilityStatus: string | null;
  updatedAt: string;
}

interface ScreenerMeta {
  sectors: string[];
  industries: string[];
  verdicts: string[];
  total: number;
}

const CRITERIA_KEYS = [
  { key: "earningsConsistency", label: "Earnings" },
  { key: "grossMargin", label: "Gross Margin" },
  { key: "netMargin", label: "Net Margin" },
  { key: "retainedEarnings", label: "Retained Earn." },
  { key: "returnOnEquity", label: "ROE" },
  { key: "debtSustainability", label: "Debt" },
  { key: "capexEfficiency", label: "CapEx" },
  { key: "productDurability", label: "Durability" },
] as const;

const STATUS_DOT: Record<string, string> = {
  pass: "bg-emerald-500",
  warning: "bg-amber-500",
  fail: "bg-red-500",
};

function getValuationSignal(pe: number | null): "undervalued" | "fair" | "overvalued" | null {
  if (pe == null || pe <= 0) return null;
  if (pe < 15) return "undervalued";
  if (pe <= 25) return "fair";
  return "overvalued";
}

const VERDICT_COLORS: Record<string, string> = {
  "Strong Durable Competitive Advantage": "text-emerald-500 bg-emerald-500/10",
  "Moderate Competitive Advantage": "text-blue-500 bg-blue-500/10",
  "Narrow Moat — Proceed with Caution": "text-amber-500 bg-amber-500/10",
  "No Clear Moat Detected": "text-red-500 bg-red-500/10",
};

export default function MoatScreener() {
  const { t } = useI18n();
  const router = useRouter();

  const [meta, setMeta] = useState<ScreenerMeta | null>(null);
  const [results, setResults] = useState<ScreenerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [scoreMin, setScoreMin] = useState(0);
  const [sector, setSector] = useState("");
  const [peMin, setPeMin] = useState("");
  const [peMax, setPeMax] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [criteriaFilters, setCriteriaFilters] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState("score");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    fetch("/api/moat-screener?action=meta")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setMeta(d); })
      .catch(() => {});
  }, []);

  const runSearch = useCallback(async (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (scoreMin > 0) params.set("scoreMin", String(scoreMin));
    if (sector) params.set("sector", sector);
    if (peMin) params.set("peMin", peMin);
    if (peMax) params.set("peMax", peMax);
    if (priceMin) params.set("priceMin", priceMin);
    if (priceMax) params.set("priceMax", priceMax);
    for (const [k, v] of Object.entries(criteriaFilters)) {
      if (v) params.set(k, v);
    }
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    params.set("page", String(p));
    params.set("limit", "20");

    try {
      const res = await fetch(`/api/moat-screener?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
        setTotal(data.total);
        setPage(data.page);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [scoreMin, sector, peMin, peMax, priceMin, priceMax, criteriaFilters, sortBy, sortDir]);

  useEffect(() => { runSearch(1); }, [runSearch]);

  const totalPages = Math.ceil(total / 20);

  const getStatusDots = (row: ScreenerRow) => [
    row.earningsConsistencyStatus,
    row.grossMarginStatus,
    row.netMarginStatus,
    row.retainedEarningsStatus,
    row.returnOnEquityStatus,
    row.debtSustainabilityStatus,
    row.capexEfficiencyStatus,
    row.productDurabilityStatus,
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
        <h3 className="text-base font-bold">{t("moatScreenerTitle")}</h3>
        {meta && <span className="text-[11px] text-[var(--muted)]">{meta.total} {t("moatScreenerStocksEvaluated")}</span>}
      </div>

      {/* Filters */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
        {/* Score slider */}
        <div className="flex items-center gap-3">
          <label className="text-[12px] font-semibold text-[var(--muted)] w-24 flex-shrink-0">{t("moatScreenerMinScore")}</label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={scoreMin}
            onChange={(e) => setScoreMin(Number(e.target.value))}
            className="flex-1 accent-violet-500"
          />
          <span className="text-sm font-bold tabular-nums w-12 text-right">{scoreMin}%</span>
        </div>

        {/* Sector */}
        <div className="flex items-center gap-3">
          <label className="text-[12px] font-semibold text-[var(--muted)] w-24 flex-shrink-0">{t("sector")}</label>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="flex-1 bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--foreground)]"
          >
            <option value="">{t("all")}</option>
            {meta?.sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Price & P/E range filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-semibold text-[var(--muted)] w-24 flex-shrink-0">{t("moatScreenerPrice")}</label>
            <input
              type="number"
              min={0}
              step="any"
              placeholder={t("min")}
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="w-24 bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)] tabular-nums"
            />
            <span className="text-[var(--muted)] text-xs">–</span>
            <input
              type="number"
              min={0}
              step="any"
              placeholder={t("max")}
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="w-24 bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)] tabular-nums"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-semibold text-[var(--muted)] w-24 flex-shrink-0">{t("moatScreenerPE")}</label>
            <input
              type="number"
              min={0}
              step="any"
              placeholder={t("min")}
              value={peMin}
              onChange={(e) => setPeMin(e.target.value)}
              className="w-24 bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)] tabular-nums"
            />
            <span className="text-[var(--muted)] text-xs">–</span>
            <input
              type="number"
              min={0}
              step="any"
              placeholder={t("max")}
              value={peMax}
              onChange={(e) => setPeMax(e.target.value)}
              className="w-24 bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)] tabular-nums"
            />
          </div>
        </div>

        {/* Criterion filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CRITERIA_KEYS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-0.5">
              <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">{label}</label>
              <select
                value={criteriaFilters[key] || ""}
                onChange={(e) => setCriteriaFilters((prev) => ({ ...prev, [key]: e.target.value }))}
                className="bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-2 py-1 text-[12px] text-[var(--foreground)]"
              >
                <option value="">{t("any")}</option>
                <option value="pass">Pass</option>
                <option value="warning">Warning</option>
                <option value="fail">Fail</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" />
        </div>
      ) : results.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
          <p className="text-sm text-[var(--muted)]">{t("moatScreenerEmpty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Sort controls */}
          <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
            <span>{t("sortBy")}:</span>
            {[
              { key: "score", label: t("moatReportSavedScore") },
              { key: "symbol", label: "Symbol" },
              { key: "price", label: t("moatScreenerPrice") },
              { key: "pe", label: "P/E" },
              { key: "passed", label: t("moatScreenerPassed") },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  if (sortBy === key) {
                    setSortDir((d) => d === "desc" ? "asc" : "desc");
                  } else {
                    setSortBy(key);
                    setSortDir("desc");
                  }
                }}
                className={`px-2 py-0.5 rounded ${sortBy === key ? "bg-violet-500/15 text-violet-500 font-semibold" : "hover:bg-[var(--card-hover)]"}`}
              >
                {label} {sortBy === key && (sortDir === "desc" ? "↓" : "↑")}
              </button>
            ))}
            <span className="ml-auto">{total} {t("results")}</span>
          </div>

          {/* Result cards */}
          <div className="space-y-2">
            {results.map((row) => {
              const dots = getStatusDots(row);
              const vClass = VERDICT_COLORS[row.verdict] || "text-[var(--muted)] bg-[var(--card-hover)]";
              const valSignal = getValuationSignal(row.peRatio);
              return (
                <button
                  key={row.symbol}
                  onClick={() => router.push(`/stock/${encodeURIComponent(row.symbol)}/evaluation`)}
                  className="w-full text-left bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 hover:border-[var(--accent)] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Score badge */}
                    <div className={`text-lg font-bold tabular-nums leading-none pt-0.5 ${row.scorePct >= 70 ? "text-emerald-500" : row.scorePct >= 50 ? "text-blue-500" : row.scorePct >= 35 ? "text-amber-500" : "text-red-500"}`}>
                      {row.scorePct.toFixed(0)}%
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{row.symbol}</span>
                        <span className="text-[11px] text-[var(--muted)] truncate">{row.companyName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${vClass}`}>
                          {row.verdict.split(" — ")[0]}
                        </span>
                        {valSignal && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${
                            valSignal === "undervalued" ? "bg-emerald-500/10 text-emerald-500"
                              : valSignal === "overvalued" ? "bg-red-500/10 text-red-500"
                              : "bg-blue-500/10 text-blue-500"
                          }`}>
                            {valSignal === "undervalued" ? t("moatEvalUndervalued") : valSignal === "overvalued" ? t("moatEvalOvervalued") : t("moatEvalFairValue")}
                          </span>
                        )}
                        {row.price != null && (
                          <span className="text-[11px] text-[var(--muted)] tabular-nums">
                            {row.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {row.currency && <span className="ml-0.5">{row.currency}</span>}
                          </span>
                        )}
                        {row.peRatio != null && (
                          <span className={`text-[11px] tabular-nums ${row.peRatio >= 40 ? "text-red-500" : row.peRatio >= 25 ? "text-amber-500" : "text-[var(--muted)]"}`}>
                            P/E {row.peRatio.toFixed(1)}
                          </span>
                        )}
                        <span className="text-[11px] text-[var(--muted)]">{row.passedCount}/{row.criteriaCount}</span>
                      </div>
                      <div className="flex items-center gap-0.5 mt-1.5">
                        {dots.map((s, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full ${STATUS_DOT[s || ""] || "bg-gray-400"}`} title={CRITERIA_KEYS[i]?.label} />
                        ))}
                        <span className="text-[10px] text-[var(--muted)] ml-1">{row.sector}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => runSearch(page - 1)}
                disabled={page <= 1}
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--card-hover)] hover:bg-[var(--border)] disabled:opacity-30 transition-colors"
              >
                ←
              </button>
              <span className="text-xs text-[var(--muted)] tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => runSearch(page + 1)}
                disabled={page >= totalPages}
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--card-hover)] hover:bg-[var(--border)] disabled:opacity-30 transition-colors"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
