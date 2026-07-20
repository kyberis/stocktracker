"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import type { ProviderSearchResult } from "@/lib/api-providers/types";
import { parseTicker } from "@/lib/company-analysis/ticker";

function normalizeSearchResponse(data: unknown): ProviderSearchResult[] {
  if (Array.isArray(data)) return data as ProviderSearchResult[];
  if (data && typeof data === "object" && "results" in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: ProviderSearchResult[] }).results;
  }
  return [];
}

export default function CompanyAnalysisSearch() {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProviderSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = await res.json();
      const list = normalizeSearchResponse(data).filter(
        (r) => r.quoteType !== "CRYPTOCURRENCY" && parseTicker(r.symbol),
      );
      setResults(list);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  const handleSelect = (r: ProviderSearchResult) => {
    const ticker = parseTicker(r.symbol);
    if (!ticker) return;
    router.push(`/analisis/${encodeURIComponent(ticker)}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--foreground)]">
          {t("companyAnalysisNav")}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">{t("companyAnalysisSubtitle")}</p>
      </div>

      <div className="relative">
        <label htmlFor="company-analysis-search" className="sr-only">
          {t("companyAnalysisSearchLabel")}
        </label>
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          id="company-analysis-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("companyAnalysisSearchPlaceholder")}
          className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] py-3 pl-10 pr-4 text-[color:var(--foreground)] placeholder:text-[color:var(--muted)]"
        />
      </div>

      {loading && (
        <p className="text-sm text-[color:var(--muted)]" role="status">
          {t("loading")}
        </p>
      )}

      {!loading && query.length > 0 && results.length === 0 && (
        <p className="text-sm text-[color:var(--muted)]">{t("companyAnalysisNoResults")}</p>
      )}

      <ul className="space-y-2" role="listbox" aria-label={t("companyAnalysisSearchLabel")}>
        {results.map((r) => (
          <li key={`${r.symbol}-${r.exchange}`}>
            <button
              type="button"
              role="option"
              className="card flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:border-[color:var(--accent)]"
              onClick={() => handleSelect(r)}
            >
              <span>
                <span className="block font-semibold text-[color:var(--foreground)]">{r.symbol}</span>
                <span className="block text-sm text-[color:var(--muted)]">{r.shortname}</span>
              </span>
              <span className="rounded border border-[color:var(--border)] px-2 py-0.5 text-xs text-[color:var(--muted)]">
                {r.exchange}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="text-xs text-[color:var(--muted)]">{t("financialDataDisclaimer")}</p>
    </div>
  );
}
