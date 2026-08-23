"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import type { PortfolioRecommendation } from "@/lib/homepage/build-portfolio-recommendations";

type ApiPayload = {
  current: PortfolioRecommendation | null;
  remaining: number;
  total: number;
  rawTotal?: number;
  refreshed?: boolean;
  cooldownMs?: number;
  canManualRefresh?: boolean;
  nextManualRefreshAt?: string | null;
  error?: string;
};

function interpolate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] != null ? String(params[key]) : `{${key}}`,
  );
}

type Props = {
  /**
   * Bootstrap cache-only tip. When present with a current tip, skip the live
   * recommendations fetch on first paint. When null/empty, fall back to GET.
   */
  initialRecommendation?: ApiPayload | null;
  bootstrapSettled?: boolean;
};

export default function HomeRecommendationCard({
  initialRecommendation,
  bootstrapSettled = true,
}: Props = {}) {
  const { t } = useI18n();
  const track = useTrack();
  const { activePortfolioId, demoMode, holdings } = usePortfolio();
  const [data, setData] = useState<ApiPayload | null>(initialRecommendation ?? null);
  const [loading, setLoading] = useState(!initialRecommendation?.current);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const viewedKey = useRef<string | null>(null);

  const qs = activePortfolioId
    ? `?portfolioId=${encodeURIComponent(activePortfolioId)}`
    : "";

  const applyPayload = useCallback((json: ApiPayload) => {
    setData({
      current: json.current,
      remaining: json.remaining,
      total: json.total,
      rawTotal: json.rawTotal,
      canManualRefresh: json.canManualRefresh !== false,
      nextManualRefreshAt: json.nextManualRefreshAt ?? null,
      cooldownMs: json.cooldownMs,
    });
  }, []);

  const load = useCallback(async (opts?: { cacheOnly?: boolean }) => {
    if (demoMode || holdings.length === 0) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activePortfolioId) params.set("portfolioId", activePortfolioId);
      if (opts?.cacheOnly) params.set("cacheOnly", "1");
      const res = await fetch(`/api/home-v2/recommendations?${params}`, { cache: "no-store" });
      if (!res.ok) {
        setData(null);
        return;
      }
      applyPayload((await res.json()) as ApiPayload);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [applyPayload, demoMode, holdings.length, activePortfolioId]);

  useEffect(() => {
    if (initialRecommendation?.current) {
      applyPayload(initialRecommendation);
      setLoading(false);
      return;
    }
    if (!bootstrapSettled) return;
    // Cold Home: cache-only — never live-recompute quotes on mount.
    void load({ cacheOnly: true });
  }, [load, initialRecommendation, bootstrapSettled, applyPayload]);

  const current = data?.current ?? null;
  const canManualRefresh = data?.canManualRefresh !== false;

  useEffect(() => {
    if (!current?.key || viewedKey.current === current.key) return;
    viewedKey.current = current.key;
    track("home_rec_viewed", { kind: current.kind, key: current.key });
  }, [current, track]);

  async function postAction(action: "skipped" | "acted") {
    if (!current || busy) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/home-v2/recommendations${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: current.key, action }),
      });
      if (!res.ok) return;
      applyPayload((await res.json()) as ApiPayload);
      track(action === "acted" ? "home_rec_acted" : "home_rec_next", {
        kind: current.kind,
        key: current.key,
      });
    } finally {
      setBusy(false);
    }
  }

  async function runAnalysis() {
    if (refreshing || busy || demoMode || holdings.length === 0 || !canManualRefresh) return;
    setRefreshing(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/home-v2/recommendations${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      const json = (await res.json()) as ApiPayload;
      applyPayload(json);
      viewedKey.current = null;
      track("home_rec_manual_refresh", {
        refreshed: res.status === 429 || json.refreshed === false ? "cooldown" : "ok",
        total: String(json.total ?? 0),
      });
      if (res.status === 429 || json.refreshed === false || json.error === "manual_refresh_cooldown") {
        setStatusMsg(t("homeRecRefreshCooldown"));
      } else if (!res.ok) {
        setStatusMsg(t("homeRecRefreshError"));
      } else if (!json.current) {
        setStatusMsg(
          (json.rawTotal ?? 0) > 0
            ? t("homeRecRefreshAllDone")
            : t("homeRecRefreshEmpty"),
        );
      } else {
        setStatusMsg(t("homeRecRefreshDone"));
      }
    } catch {
      setStatusMsg(t("homeRecRefreshError"));
    } finally {
      setRefreshing(false);
    }
  }

  if (demoMode || holdings.length === 0) return null;
  if (loading) return null;

  const refreshButton = (
    <button
      type="button"
      disabled={refreshing || busy || !canManualRefresh}
      onClick={() => void runAnalysis()}
      aria-busy={refreshing}
      title={!canManualRefresh ? t("homeRecRefreshCooldown") : undefined}
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[color:var(--border)] px-4 text-sm font-semibold text-[color:var(--muted)] hover:text-[color:var(--foreground)] disabled:opacity-60"
    >
      {refreshing
        ? t("homeRecRefreshing")
        : !canManualRefresh
          ? t("homeRecRunAnalysisLocked")
          : t("homeRecRunAnalysis")}
    </button>
  );

  if (!current) {
    return (
      <section
        className="card rounded-[20px] border border-[color:var(--border)] p-4 sm:p-5"
        aria-labelledby="home-rec-empty-title"
        data-testid="home-recommendation-empty"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
          {t("homeRecEyebrow")}
        </p>
        <h2
          id="home-rec-empty-title"
          className="mt-1 text-base font-bold text-[color:var(--foreground)]"
        >
          {(data?.rawTotal ?? 0) > 0 ? t("homeRecEmptyDismissedTitle") : t("homeRecEmptyTitle")}
        </h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {(data?.rawTotal ?? 0) > 0 ? t("homeRecEmptyDismissedBody") : t("homeRecEmptyBody")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">{refreshButton}</div>
        {statusMsg && (
          <p className="mt-2 text-[11px] text-[color:var(--muted)]" role="status">
            {statusMsg}
          </p>
        )}
        <p className="mt-3 text-[11px] text-[color:var(--muted)]">{t("homeRecDisclaimerShort")}</p>
      </section>
    );
  }

  const titleKey: TranslationKey =
    current.kind === "diversify"
      ? "homeRecDiversifyTitle"
      : current.kind === "concentration"
        ? "homeRecConcentrationTitle"
        : current.kind === "cash_idle"
          ? "homeRecCashTitle"
          : "homeRecFxTitle";
  const bodyKey: TranslationKey =
    current.kind === "diversify"
      ? "homeRecDiversifyBody"
      : current.kind === "concentration"
        ? "homeRecConcentrationBody"
        : current.kind === "cash_idle"
          ? "homeRecCashBody"
          : "homeRecFxBody";

  const title = interpolate(t(titleKey), current.titleParams);
  const body =
    current.kind === "diversify" && current.bodyParams.reason === "unclassified"
      ? interpolate(t("homeRecDiversifyUnclassifiedBody"), current.bodyParams)
      : interpolate(t(bodyKey), current.bodyParams);
  const hasNext = (data?.remaining ?? 0) > 0;
  const positionLabel = interpolate(t("homeRecPosition"), {
    current: 1,
    total: data?.total ?? 1,
  });

  return (
    <section
      className="card rounded-[20px] border border-[color:var(--border)] p-4 sm:p-5"
      aria-labelledby="home-rec-title"
      data-testid="home-recommendation-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
          {t("homeRecEyebrow")}
        </p>
        {refreshButton}
      </div>
      <h2 id="home-rec-title" className="mt-1 text-base font-bold text-[color:var(--foreground)] sm:text-lg">
        {title}
      </h2>
      <p className="mt-1 text-sm text-[color:var(--muted)]">{body}</p>

      {current.chips.length > 0 && (
        <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
          {current.chips.map((chip) => (
            <li
              key={chip.label}
              className={
                chip.tone === "warn"
                  ? "rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
                  : "rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-xs font-medium text-teal-700 dark:text-teal-300"
              }
            >
              {chip.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {current.kind === "diversify" && (
          <Link
            href="/recommendations/diversify"
            onClick={() =>
              track("home_rec_diversify_opened", { key: current.key })
            }
            className="btn-primary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold"
          >
            {t("homeRecInvestigateCta")}
          </Link>
        )}
        {current.kind === "concentration" && current.ticker && (
          <Link
            href={`/analisis/${encodeURIComponent(current.ticker)}`}
            className="btn-primary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold"
          >
            {interpolate(t("homeRecAnalyzeTicker"), { ticker: current.ticker })}
          </Link>
        )}
        <button
          type="button"
          disabled={busy || refreshing}
          onClick={() => void postAction("acted")}
          className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
        >
          {t("homeRecTookAction")}
        </button>
        {hasNext && (
          <button
            type="button"
            disabled={busy || refreshing}
            onClick={() => void postAction("skipped")}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[color:var(--border)] px-4 text-sm font-semibold text-[color:var(--muted)] hover:text-[color:var(--foreground)] disabled:opacity-60"
          >
            {t("homeRecNext")}
          </button>
        )}
      </div>

      {statusMsg && (
        <p className="mt-2 text-[11px] text-[color:var(--muted)]" role="status">
          {statusMsg}
        </p>
      )}

      <p className="mt-3 text-[11px] text-[color:var(--muted)]">
        {positionLabel} · {t("homeRecDisclaimerShort")}
      </p>
    </section>
  );
}
