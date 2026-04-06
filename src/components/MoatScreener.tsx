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
  }, [scoreMin, sector, criteriaFilters, sortBy, sortDir]);

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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)]">
                  <th className="text-left py-2 px-2 font-semibold">Symbol</th>
                  <th className="text-left py-2 px-2 font-semibold hidden sm:table-cell">{t("sector")}</th>
                  <th className="text-center py-2 px-2 font-semibold">{t("moatReportSavedScore")}</th>
                  <th className="text-center py-2 px-2 font-semibold">{t("moatScreenerCriteria")}</th>
                  <th className="text-left py-2 px-2 font-semibold hidden md:table-cell">{t("moatScreenerVerdict")}</th>
                  <th className="text-right py-2 px-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => {
                  const dots = getStatusDots(row);
                  const vClass = VERDICT_COLORS[row.verdict] || "text-[var(--muted)] bg-[var(--card-hover)]";
                  return (
                    <tr key={row.symbol} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors">
                      <td className="py-2.5 px-2">
                        <div className="font-bold">{row.symbol}</div>
                        <div className="text-[11px] text-[var(--muted)] truncate max-w-[150px]">{row.companyName}</div>
                      </td>
                      <td className="py-2.5 px-2 text-[12px] text-[var(--muted)] hidden sm:table-cell">{row.sector}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`text-base font-bold tabular-nums ${row.scorePct >= 70 ? "text-emerald-500" : row.scorePct >= 50 ? "text-blue-500" : row.scorePct >= 35 ? "text-amber-500" : "text-red-500"}`}>
                          {row.scorePct.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center justify-center gap-0.5">
                          {dots.map((s, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${STATUS_DOT[s || ""] || "bg-gray-400"}`} title={CRITERIA_KEYS[i]?.label} />
                          ))}
                        </div>
                        <div className="text-[10px] text-[var(--muted)] text-center mt-0.5">{row.passedCount}/{row.criteriaCount}</div>
                      </td>
                      <td className="py-2.5 px-2 hidden md:table-cell">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${vClass}`}>
                          {row.verdict.split(" — ")[0]}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          onClick={() => router.push(`/stock/${encodeURIComponent(row.symbol)}/evaluation`)}
                          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 transition-colors"
                        >
                          {t("moatScreenerView")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
