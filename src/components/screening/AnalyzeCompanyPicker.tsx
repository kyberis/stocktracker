"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProviderSearchResult } from "@/lib/api-providers/types";
import { parseTicker } from "@/lib/company-analysis/ticker";
import { fill } from "@/lib/screening/copy";
import { useScreeningCopy } from "./use-screening-copy";

function normalizeSearchResponse(data: unknown): ProviderSearchResult[] {
  if (Array.isArray(data)) return data as ProviderSearchResult[];
  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    return (data as { results: ProviderSearchResult[] }).results;
  }
  return [];
}

export type FocusListing = {
  ticker: string;
  exchange: string | null;
  companyName: string;
};

export function AnalyzeCompanyPicker({
  onSelect,
  disabled,
}: {
  onSelect: (listing: FocusListing) => void;
  disabled?: boolean;
}) {
  const { copy } = useScreeningCopy();
  const a = copy.intake.analyze;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProviderSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = await res.json();
      const list = normalizeSearchResponse(data).filter(
        (r) => r.quoteType !== "CRYPTOCURRENCY" && parseTicker(r.symbol),
      );
      setResults(list.slice(0, 12));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  function pick(r: ProviderSearchResult) {
    const ticker = parseTicker(r.symbol);
    if (!ticker) return;
    onSelect({
      ticker,
      exchange: r.exchange?.trim() || null,
      companyName: (r.shortname || ticker).slice(0, 200),
    });
  }

  return (
    <div className="mt-3 space-y-3">
      <label htmlFor="screening-analyze-search" className="sr-only">
        {a.searchPlaceholder}
      </label>
      <input
        id="screening-analyze-search"
        type="search"
        autoComplete="off"
        disabled={disabled}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={a.searchPlaceholder}
        className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted)]"
      />

      {loading ? (
        <p className="text-sm text-[color:var(--muted)]" role="status">
          {a.searching}
        </p>
      ) : null}

      {!loading && searched && query.trim() && results.length === 0 ? (
        <p className="text-sm text-[color:var(--muted)]">{a.noResults}</p>
      ) : null}

      {results.length > 1 ? (
        <p className="text-sm text-[color:var(--muted)]">{a.pickListing}</p>
      ) : null}

      {results.length > 0 ? (
        <ul className="list-none space-y-2 p-0" role="listbox" aria-label={a.searchPlaceholder}>
          {results.map((r) => (
            <li key={`${r.symbol}-${r.exchange}`}>
              <button
                type="button"
                role="option"
                disabled={disabled}
                onClick={() => pick(r)}
                className="card flex w-full items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] px-4 py-3 text-left transition hover:border-teal-500/50 disabled:opacity-60"
              >
                <span>
                  <span className="block text-sm font-semibold text-[color:var(--foreground)]">
                    {r.shortname || r.symbol}
                  </span>
                  <span className="mt-0.5 block text-xs text-[color:var(--muted)]">
                    {fill("{ticker} · {exchange}", {
                      ticker: r.symbol,
                      exchange: r.exchange || "—",
                    })}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
