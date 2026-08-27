"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import type { CompanyAnalysisReport as Report } from "@/lib/company-analysis/types";
import {
  applyWebNumericEnrichment,
  collectWebSources,
  type WebNumericEnrichment,
} from "@/lib/company-analysis/apply-web-enrichment";
import { formatAnalysisDateTime } from "@/lib/company-analysis/format";

export type CompanyAnalysisNarrative = WebNumericEnrichment & {
  description?: string;
  competitive?: string;
  sectorOutlook?: string;
  risks?: string;
  technicalReading?: string;
  insiderReading?: string;
};

/**
 * Fetches /api/company-analysis + the streamed AI narrative for a ticker, once,
 * regardless of which stock-page tab is active. Shared by SummaryPanel,
 * NewsPanel, AnalysisNarrativePanel and InsidersFlowPanel so switching tabs
 * never re-fetches or shows a duplicate loading skeleton.
 */
function hasLockedPaidSections(report: Report): boolean {
  return report.congress.status === "locked" || report.insiders.status === "locked";
}

export function useCompanyAnalysisReport(ticker: string) {
  const { t, language } = useI18n();
  const { user, isLoading: authLoading } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrative, setNarrative] = useState<CompanyAnalysisNarrative | null>(null);
  const freshNarrativeRef = useRef(false);
  const unlockAttemptedForTicker = useRef<string | null>(null);
  const [unlockingPaid, setUnlockingPaid] = useState(false);

  const load = useCallback(
    async (opts?: { fresh?: boolean; silent?: boolean }) => {
      const fresh = opts?.fresh === true;
      const silent = opts?.silent === true;
      if (fresh) {
        setRegenerating(true);
        setNarrative(null);
        freshNarrativeRef.current = true;
      } else if (!silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const qs = new URLSearchParams({ symbol: ticker });
        if (fresh) qs.set("fresh", "1");
        const res = await fetch(`/api/company-analysis?${qs.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t("companyAnalysisLoadError"));
          if (!fresh) setReport(null);
          freshNarrativeRef.current = false;
          return;
        }
        setReport(data as Report);
      } catch {
        setError(t("companyAnalysisLoadError"));
        if (!fresh) setReport(null);
        freshNarrativeRef.current = false;
      } finally {
        setLoading(false);
        if (!fresh) setRegenerating(false);
      }
    },
    [ticker, t],
  );

  useEffect(() => {
    unlockAttemptedForTicker.current = null;
    setUnlockingPaid(false);
    if (authLoading) return;
    load();
  }, [ticker, authLoading, load]);

  // Browser/CDN may still have a redacted anonymous body for this URL.
  useEffect(() => {
    if (authLoading || !user || !report || !hasLockedPaidSections(report)) return;
    if (unlockAttemptedForTicker.current === ticker) return;
    unlockAttemptedForTicker.current = ticker;
    setUnlockingPaid(true);
    void load({ silent: true }).finally(() => setUnlockingPaid(false));
  }, [authLoading, user, report, ticker, load]);

  useEffect(() => {
    if (!report) return;
    let cancelled = false;
    const fresh = freshNarrativeRef.current;
    freshNarrativeRef.current = false;
    (async () => {
      setNarrativeLoading(true);
      try {
        const res = await fetch("/api/company-analysis/narrative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language,
            ticker: report.ticker,
            fresh,
            instrumentKind: report.instrumentKind,
            profile: report.profile,
            quote: report.quote,
            fundamentals: report.fundamentals,
            technicals: report.technicals,
            insiders: report.insiders,
            alternative: report.alternative,
            etf: report.etf ?? null,
          }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setNarrative(data);
      } catch {
        /* narrative is optional */
      } finally {
        if (!cancelled) {
          setNarrativeLoading(false);
          setRegenerating(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [report, language]);

  const fundamentals = useMemo(
    () => (report ? applyWebNumericEnrichment(report.fundamentals, narrative) : null),
    [report, narrative],
  );

  const sources = useMemo(() => {
    if (!report) return [];
    const web = collectWebSources(narrative);
    const seen = new Set(report.sources.map((s) => s.url));
    const merged = [...report.sources];
    for (const s of web) {
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      merged.push(s);
    }
    return merged;
  }, [report, narrative]);

  const generatedAt = report
    ? formatAnalysisDateTime(report.generatedAt || report.updatedAt, language)
    : null;
  const narrativePending = narrativeLoading || regenerating;
  const unlockingPaidSections =
    unlockingPaid ||
    Boolean(
      user &&
        report &&
        hasLockedPaidSections(report) &&
        unlockAttemptedForTicker.current !== ticker,
    );

  return {
    report,
    narrative,
    error,
    loading,
    regenerating,
    narrativeLoading,
    narrativePending,
    fundamentals,
    sources,
    generatedAt,
    unlockingPaidSections,
    regenerate: () => load({ fresh: true }),
  };
}

export type CompanyAnalysisData = ReturnType<typeof useCompanyAnalysisReport>;
