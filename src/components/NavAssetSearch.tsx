"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import type { ProviderSearchResult } from "@/lib/api-providers/types";
import { CRYPTO_PAGE_SUPPORTED_SYMBOLS, yahooCryptoSymbolToBase } from "@/lib/crypto-page-symbols";

type Variant = "default" | "studio" | "command";

const MAX_SUGGESTIONS = 8;
const DEBOUNCE_MS = 280;

function normalizeSearchResponse(data: unknown): ProviderSearchResult[] {
  if (Array.isArray(data)) return data as ProviderSearchResult[];
  if (data && typeof data === "object" && "results" in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: ProviderSearchResult[] }).results;
  }
  return [];
}

export default function NavAssetSearch({ variant = "default" }: { variant?: Variant }) {
  const { t } = useI18n();
  const router = useRouter();
  const listboxId = useId();
  const optionPrefix = `${listboxId}-opt`;
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [value, setValue] = useState("");
  const [results, setResults] = useState<ProviderSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [unsupportedCrypto, setUnsupportedCrypto] = useState<string | null>(null);
  /** True after a fetch completed with zero hits for the current trimmed query. */
  const [showEmpty, setShowEmpty] = useState(false);
  const [debouncing, setDebouncing] = useState(false);

  const trimmed = value.trim();

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      setShowEmpty(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setShowEmpty(false);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&includeCrypto=true`, { signal: controller.signal });
      if (!res.ok) {
        setResults([]);
        setShowEmpty(true);
        return;
      }
      const data = await res.json();
      const normalized = normalizeSearchResponse(data).slice(0, MAX_SUGGESTIONS);
      if (controller.signal.aborted) return;
      setResults(normalized);
      setHighlight(normalized.length > 0 ? 0 : -1);
      setShowEmpty(normalized.length === 0);
    } catch {
      if (controller.signal.aborted) return;
      setResults([]);
      setHighlight(-1);
      setShowEmpty(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setDebouncing(false);
      setPanelOpen(false);
      setHighlight(-1);
      setShowEmpty(false);
      abortRef.current?.abort();
      return;
    }
    setResults([]);
    setShowEmpty(false);
    setHighlight(-1);
    setDebouncing(true);
    debounceRef.current = setTimeout(() => {
      setDebouncing(false);
      void runSearch(trimmed);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmed, runSearch]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const navigateToResult = useCallback(
    (r: ProviderSearchResult) => {
      setUnsupportedCrypto(null);
      setPanelOpen(false);
      setValue("");
      setResults([]);
      if (r.quoteType === "CRYPTOCURRENCY") {
        const base = yahooCryptoSymbolToBase(r.symbol);
        if (!CRYPTO_PAGE_SUPPORTED_SYMBOLS.has(base)) {
          setUnsupportedCrypto(base);
          return;
        }
        router.push(`/crypto?symbol=${encodeURIComponent(base)}`);
        return;
      }
      router.push(`/stock/${encodeURIComponent(r.symbol)}?exchange=${encodeURIComponent(r.exchange)}`);
    },
    [router],
  );

  const submit = useCallback(() => {
    const q = value.trim();
    if (highlight >= 0 && results[highlight]) {
      navigateToResult(results[highlight]);
      return;
    }
    if (!q) {
      router.push("/explore");
      return;
    }
    router.push(`/explore?q=${encodeURIComponent(q)}`);
  }, [value, highlight, results, navigateToResult, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
        e.preventDefault();
        const el = document.getElementById("nav-asset-search-input") as HTMLInputElement | null;
        el?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shell =
    variant === "studio"
      ? "bg-zinc-900/90 border border-white/10 focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/20"
      : variant === "command"
        ? "border border-[color:var(--border)] bg-[color:var(--surface-strong)] focus-within:border-[color:var(--accent)] focus-within:ring-0"
        : "bg-gray-100 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-600 focus-within:border-emerald-400/60 dark:focus-within:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/15";

  const radiusClass = variant === "command" || variant === "studio" ? "rounded-xl" : "rounded-full";
  const verticalPad = variant === "command" ? "py-1.5" : variant === "studio" ? "py-2" : "py-1.5";

  const panelShell =
    variant === "studio"
      ? "border border-white/10 bg-zinc-950 shadow-xl"
      : variant === "command"
        ? "border border-[color:var(--border)] bg-[color:var(--surface-overlay)] shadow-xl"
        : "border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-lg";

  const showPanel =
    trimmed.length >= 1 &&
    panelOpen &&
    (debouncing || loading || results.length > 0 || showEmpty);

  const typeLabel = (qt: string) => {
    if (qt === "ETF") return t("exploreAssetTypeEtf");
    if (qt === "CRYPTOCURRENCY") return t("exploreAssetTypeCrypto");
    return t("exploreAssetTypeEquity");
  };

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <form
        role="search"
        aria-label={t("navAssetSearchAria")}
        className={`flex w-full min-w-0 items-center gap-1.5 px-2.5 sm:px-3 ${verticalPad} transition-shadow ${radiusClass} ${shell}`}
        style={variant === "command" ? { background: "var(--surface-strong)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" } : undefined}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <svg
          className={`h-4 w-4 shrink-0 ${variant === "studio" ? "text-zinc-500" : "text-gray-400 dark:text-slate-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          id="nav-asset-search-input"
          type="search"
          name="q"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={highlight >= 0 ? `${optionPrefix}-${highlight}` : undefined}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setPanelOpen(true);
            setUnsupportedCrypto(null);
          }}
          onFocus={() => {
            if (trimmed.length >= 1) setPanelOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              if (!showPanel && trimmed.length >= 1) setPanelOpen(true);
              if (results.length > 0) {
                e.preventDefault();
                setHighlight((h) => {
                  const next = h < 0 ? 0 : Math.min(h + 1, results.length - 1);
                  return next;
                });
              }
              return;
            }
            if (e.key === "ArrowUp") {
              if (results.length > 0) {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              }
              return;
            }
            if (e.key === "Escape") {
              setPanelOpen(false);
              return;
            }
            if (e.key === "Enter") {
              if (highlight >= 0 && results[highlight]) {
                e.preventDefault();
                navigateToResult(results[highlight]);
              }
            }
          }}
          placeholder={t("navAssetSearchPlaceholder")}
          autoComplete="off"
          className={`min-w-0 flex-1 border-0 bg-transparent shadow-none outline-none ring-0 focus:ring-0 appearance-none placeholder:text-gray-400 dark:placeholder:text-slate-500 [&::-webkit-search-cancel-button]:hidden ${
            variant === "studio"
              ? "text-sm text-white"
              : variant === "command"
                ? "text-base md:text-sm text-gray-900 dark:text-white"
                : "text-sm text-gray-900 dark:text-white"
          }`}
        />
        <button
          type="submit"
          className={`shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            variant === "studio"
              ? "bg-emerald-600 text-white hover:bg-emerald-500"
              : "bg-emerald-600 text-white hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          }`}
        >
          {t("navAssetSearchButton")}
        </button>
      </form>

      {unsupportedCrypto && (
        <div
          className={`mt-1 rounded-lg border px-2 py-1.5 text-xs ${
            variant === "studio"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
              : "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-950 dark:text-amber-100/95"
          }`}
          role="alert"
        >
          {t("exploreCryptoUnsupported").replace("{symbol}", unsupportedCrypto)}{" "}
          <button type="button" onClick={() => router.push("/crypto")} className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
            {t("exploreCryptoOpenMarket")}
          </button>
        </div>
      )}

      {showPanel && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t("exploreResultsHeading")}
          className={`absolute left-0 right-0 top-full z-[60] mt-1 max-h-[min(320px,70vh)] overflow-y-auto rounded-xl ${panelShell}`}
        >
          {(debouncing || loading) && (
            <li className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400" role="status">
              {t("exploreSearchLoading")}
            </li>
          )}
          {!debouncing && !loading && showEmpty && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400" role="presentation">
              {t("exploreSearchEmpty")}
            </li>
          )}
          {!debouncing &&
            !loading &&
            results.map((r, idx) => (
              <li key={`${r.symbol}-${r.exchange}-${idx}`} role="none">
                <button
                  type="button"
                  id={`${optionPrefix}-${idx}`}
                  role="option"
                  aria-selected={highlight === idx}
                  className={`flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    variant === "studio"
                      ? highlight === idx
                        ? "bg-white/10 text-white"
                        : "text-zinc-200 hover:bg-white/5"
                      : highlight === idx
                        ? "bg-[color:var(--surface-soft)] text-gray-900 dark:text-white"
                        : "text-gray-900 dark:text-white hover:bg-[color:var(--surface-soft)]"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => navigateToResult(r)}
                >
                  <span className="min-w-0">
                    <span className="font-semibold">{r.symbol}</span>
                    <span className="block truncate text-xs text-gray-500 dark:text-slate-400">{r.shortname}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="text-[10px] uppercase text-gray-400 dark:text-slate-500">{r.exchange || "—"}</span>
                    <span
                      className={`ml-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        r.quoteType === "ETF"
                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          : r.quoteType === "CRYPTOCURRENCY"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {typeLabel(r.quoteType)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

/** Icon-only link for narrow layouts (mobile header). */
export function NavAssetSearchIconLink({ className = "md:hidden" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <Link
      href="/explore"
      className={`flex shrink-0 items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors ${className}`}
      aria-label={t("navAssetSearchAria")}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    </Link>
  );
}
