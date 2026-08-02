"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import TierFeatureBadge from "./TierFeatureBadge";
import MoatScreener from "./MoatScreener";

interface SearchResult {
  symbol: string;
  shortname: string;
  exchange: string;
}

interface ReportSummary {
  id: string;
  symbol: string;
  companyName: string;
  totalScore: number;
  maxScore: number;
  verdict: string;
  hasAiNarrative: boolean;
  tags: string[];
  createdAt: string;
}

export default function MoatEvaluationPicker() {
  const { t } = useI18n();
  const router = useRouter();
  const { holdings } = usePortfolio();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [savedReports, setSavedReports] = useState<ReportSummary[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [distinctTags, setDistinctTags] = useState<string[]>([]);
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const [tagEditDraft, setTagEditDraft] = useState("");
  const [tagSavingId, setTagSavingId] = useState<string | null>(null);

  const [leftTab, setLeftTab] = useState<"search" | "screener">("search");
  const [portfolioRunning, setPortfolioRunning] = useState(false);
  const [portfolioDone, setPortfolioDone] = useState(0);
  const [portfolioTotal, setPortfolioTotal] = useState(0);

  const loadDistinctTags = useCallback(async () => {
    try {
      const res = await fetch("/api/moat-reports/tags");
      if (res.ok) {
        const data = (await res.json()) as { tags?: string[] };
        if (Array.isArray(data.tags)) setDistinctTags(data.tags);
      }
    } catch { /* ignore */ }
  }, []);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const params = new URLSearchParams();
      filterTags.forEach((tag) => params.append("tags", tag));
      const qs = params.toString();
      const res = await fetch(qs ? `/api/moat-reports?${qs}` : "/api/moat-reports");
      if (res.ok) {
        const list = (await res.json()) as ReportSummary[];
        setSavedReports(list.map((r) => ({ ...r, tags: Array.isArray(r.tags) ? r.tags : [] })));
      }
    } catch { /* ignore */ }
    setReportsLoading(false);
  }, [filterTags]);

  useEffect(() => { loadReports(); }, [loadReports]);

  useEffect(() => { loadDistinctTags(); }, [loadDistinctTags]);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&premiumSearch=1`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || data || []);
      }
    } catch { /* ignore */ }
    setSearching(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const handleSelect = (symbol: string, exchange: string) => {
    router.push(`/analisis/${encodeURIComponent(symbol)}?tab=evaluation${exchange ? `&exchange=${exchange}` : ""}`);
  };

  const handleOpenReport = (report: ReportSummary) => {
    router.push(`/analisis/${encodeURIComponent(report.symbol)}?tab=evaluation&reportId=${report.id}`);
  };

  const handleDeleteReport = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/moat-reports/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSavedReports((prev) => prev.filter((r) => r.id !== id));
        loadDistinctTags();
      }
    } catch { /* ignore */ }
    setDeletingId(null);
  };

  const toggleFilterTag = (tag: string) => {
    setFilterTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSaveRowTags = async (reportId: string) => {
    setTagSavingId(reportId);
    try {
      const tags = tagEditDraft.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await fetch(`/api/moat-reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
      if (res.ok) {
        setEditingTagsFor(null);
        await loadReports();
        loadDistinctTags();
      }
    } catch { /* ignore */ }
    setTagSavingId(null);
  };

  const onMoatReportSavedFromScreener = useCallback(() => {
    loadReports();
    loadDistinctTags();
  }, [loadReports, loadDistinctTags]);

  const handleEvaluatePortfolio = useCallback(async () => {
    const tickers = [...new Set(holdings.map((h) => h.ticker).filter(Boolean))];
    if (tickers.length === 0) return;

    setPortfolioRunning(true);
    setPortfolioTotal(tickers.length);
    setPortfolioDone(0);

    for (const ticker of tickers) {
      try {
        const res = await fetch(`/api/stock-evaluation?symbol=${encodeURIComponent(ticker)}`);
        if (res.ok) {
          const evalData = await res.json();
          await fetch("/api/moat-reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              symbol: evalData.symbol,
              companyName: evalData.companyName,
              evaluationJson: JSON.stringify(evalData),
              totalScore: evalData.totalScore,
              maxScore: evalData.maxScore,
              verdict: evalData.verdict,
            }),
          });
        }
      } catch { /* continue with next */ }
      setPortfolioDone((prev) => prev + 1);
    }

    setPortfolioRunning(false);
    loadReports();
    loadDistinctTags();
  }, [holdings, loadReports, loadDistinctTags]);

  const verdictColor = (verdict: string) => {
    if (verdict.toLowerCase().includes("strong")) return "text-emerald-500";
    if (verdict.toLowerCase().includes("narrow")) return "text-amber-500";
    return "text-red-500";
  };

  const reportsRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2">
          <svg className="w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h2 className="text-xl font-bold">{t("moatEvalTitle")}</h2>
          <TierFeatureBadge requiredPlan="pro" size="xs" />
        </div>
        <p className="text-sm text-[var(--muted)]">{t("moatEvalPickerDesc")}</p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── Left column: Tabbed Search / Screener ── */}
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-[var(--card)] border border-[var(--border)] rounded-xl p-1">
            <button
              onClick={() => setLeftTab("search")}
              className={`flex-1 flex items-center justify-center gap-1.5 text-[13px] font-semibold py-2 rounded-lg transition-colors ${
                leftTab === "search"
                  ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              {t("moatEvalSearchTab")}
            </button>
            <button
              onClick={() => setLeftTab("screener")}
              className={`flex-1 flex items-center justify-center gap-1.5 text-[13px] font-semibold py-2 rounded-lg transition-colors ${
                leftTab === "screener"
                  ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              {t("moatScreenerTitle")}
            </button>
          </div>

          {/* Search tab content */}
          {leftTab === "search" && (
            <div className="space-y-4">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-5 h-5 text-[var(--muted)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("moatEvalSearchPlaceholder")}
                    className="w-full bg-transparent border-none outline-none text-[var(--foreground)] text-[15px] placeholder:text-[var(--muted)]"
                    autoFocus
                  />
                  {searching && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500 flex-shrink-0" />}
                </div>

                {results.length > 0 && (
                  <div className="border-t border-[var(--border)] pt-2 space-y-0.5 max-h-80 overflow-y-auto">
                    {results.map((r) => (
                      <button
                        key={`${r.symbol}-${r.exchange}`}
                        onClick={() => handleSelect(r.symbol, r.exchange)}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--card-hover)] transition-colors flex items-center justify-between"
                      >
                        <div>
                          <span className="text-sm font-semibold">{r.symbol}</span>
                          <span className="text-xs text-[var(--muted)] ml-2">{r.shortname}</span>
                        </div>
                        <span className="text-[11px] text-[var(--muted)]">{r.exchange}</span>
                      </button>
                    ))}
                  </div>
                )}

                {query.length > 0 && results.length === 0 && !searching && (
                  <p className="text-center text-sm text-[var(--muted)] py-4">{t("moatEvalSearchNoResults")}</p>
                )}
              </div>

              {/* Portfolio CTA */}
              {holdings.length > 0 && (
                <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20 rounded-xl p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <svg className="w-4 h-4 text-violet-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        {t("moatReportEvaluatePortfolio")}
                      </h3>
                      <p className="text-[12px] text-[var(--muted)] mt-0.5">{t("moatReportEvaluatePortfolioDesc")}</p>
                    </div>
                    {portfolioRunning && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${portfolioTotal > 0 ? (portfolioDone / portfolioTotal) * 100 : 0}%` }} />
                        </div>
                        <span className="text-[11px] text-[var(--muted)] tabular-nums">
                          {t("moatReportPortfolioProgress").replace("{done}", String(portfolioDone)).replace("{total}", String(portfolioTotal))}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={handleEvaluatePortfolio}
                      disabled={portfolioRunning}
                      className="w-full inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50"
                    >
                      {portfolioRunning ? (
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      )}
                      {portfolioRunning ? t("moatReportEvaluatePortfolioRunning") : t("moatReportEvaluatePortfolio")}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-[var(--muted)] text-center">{t("moatEvalPickerNote")}</p>
            </div>
          )}

          {/* Screener tab content */}
          {leftTab === "screener" && <MoatScreener onReportSaved={onMoatReportSavedFromScreener} />}
        </div>

        {/* ── Right column: Saved Reports ── */}
        <div ref={reportsRef}>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {t("moatReportSavedTitle")}
            {!reportsLoading && savedReports.length > 0 && (
              <span className="text-[11px] font-normal text-[var(--muted)] tabular-nums">{savedReports.length}</span>
            )}
          </h3>

          {distinctTags.length > 0 && (
            <div className="mb-3 space-y-1.5">
              <div className="text-[11px] font-semibold text-[var(--muted)]">{t("moatReportFilterByTags")}</div>
              <p className="text-[10px] text-[var(--muted)]">{t("moatReportTagFilterHint")}</p>
              <div className="flex flex-wrap gap-1.5">
                {distinctTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleFilterTag(tag)}
                    className={`text-[11px] font-medium px-2 py-1 rounded-lg border transition-colors ${
                      filterTags.includes(tag)
                        ? "border-violet-500 bg-violet-500/15 text-violet-600 dark:text-violet-300"
                        : "border-[var(--border)] bg-[var(--card-hover)] text-[var(--foreground)] hover:border-[var(--accent)]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {filterTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterTags([])}
                  className="text-[11px] text-violet-500 hover:underline"
                >
                  {t("moatReportClearTagFilter")}
                </button>
              )}
            </div>
          )}

          {reportsLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500" />
            </div>
          ) : savedReports.length === 0 ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 text-center">
              <p className="text-sm text-[var(--muted)]">
                {filterTags.length > 0 ? t("moatReportNoTagMatches") : t("moatReportSavedEmpty")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 hover:border-[var(--accent)] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenReport(report)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{report.symbol}</span>
                        <span className="text-xs text-[var(--muted)] truncate">{report.companyName}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[var(--muted)] flex-wrap">
                        <span className={`font-semibold ${verdictColor(report.verdict)}`}>{report.verdict}</span>
                        <span>{t("moatReportSavedScore")}: {report.totalScore.toFixed(1)}/{report.maxScore}</span>
                        {report.hasAiNarrative && (
                          <span className="text-violet-500 flex items-center gap-0.5">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            {t("moatReportSavedAi")}
                          </span>
                        )}
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      {report.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {report.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--card-hover)] border border-[var(--border)] text-[var(--muted)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                    <div className="flex flex-col gap-1 flex-shrink-0 items-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTagsFor(report.id);
                          setTagEditDraft(report.tags.join(", "));
                        }}
                        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[var(--card-hover)] text-[var(--foreground)] hover:bg-[var(--border)] transition-colors"
                      >
                        {t("moatReportEditTags")}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }}
                        disabled={deletingId === report.id}
                        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        {deletingId === report.id ? t("moatReportDeleting") : t("moatReportDelete")}
                      </button>
                    </div>
                  </div>
                  {editingTagsFor === report.id && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={tagEditDraft}
                        onChange={(e) => setTagEditDraft(e.target.value)}
                        placeholder={t("moatReportTagsPlaceholder")}
                        className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)]"
                      />
                      <p className="text-[10px] text-[var(--muted)]">{t("moatReportTagsHint")}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingTagsFor(null)}
                          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--card-hover)]"
                          disabled={tagSavingId === report.id}
                        >
                          {t("moatReportSaveModalCancel")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveRowTags(report.id)}
                          disabled={tagSavingId === report.id}
                          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-violet-600 text-white disabled:opacity-50"
                        >
                          {tagSavingId === report.id ? t("moatReportSaving") : t("moatReportSave")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
