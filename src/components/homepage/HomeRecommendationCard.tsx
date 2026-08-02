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
};

function interpolate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] != null ? String(params[key]) : `{${key}}`,
  );
}

export default function HomeRecommendationCard() {
  const { t } = useI18n();
  const track = useTrack();
  const { activePortfolioId, demoMode, holdings } = usePortfolio();
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const viewedKey = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (demoMode || holdings.length === 0) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const qs = activePortfolioId
        ? `?portfolioId=${encodeURIComponent(activePortfolioId)}`
        : "";
      const res = await fetch(`/api/home-v2/recommendations${qs}`, { cache: "no-store" });
      if (!res.ok) {
        setData(null);
        return;
      }
      const json = (await res.json()) as ApiPayload;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activePortfolioId, demoMode, holdings.length]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = data?.current ?? null;

  useEffect(() => {
    if (!current?.key || viewedKey.current === current.key) return;
    viewedKey.current = current.key;
    track("home_rec_viewed", { kind: current.kind, key: current.key });
  }, [current, track]);

  async function postAction(action: "skipped" | "acted") {
    if (!current || busy) return;
    setBusy(true);
    try {
      const qs = activePortfolioId
        ? `?portfolioId=${encodeURIComponent(activePortfolioId)}`
        : "";
      const res = await fetch(`/api/home-v2/recommendations${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: current.key, action }),
      });
      if (!res.ok) return;
      const json = (await res.json()) as ApiPayload;
      setData({
        current: json.current,
        remaining: json.remaining,
        total: json.total,
      });
      track(action === "acted" ? "home_rec_acted" : "home_rec_next", {
        kind: current.kind,
        key: current.key,
      });
    } finally {
      setBusy(false);
    }
  }

  if (demoMode || loading || !current) return null;

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
  const body = interpolate(t(bodyKey), current.bodyParams);
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
      <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
        {t("homeRecEyebrow")}
      </p>
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
          disabled={busy}
          onClick={() => void postAction("acted")}
          className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
        >
          {t("homeRecTookAction")}
        </button>
        {hasNext && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void postAction("skipped")}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[color:var(--border)] px-4 text-sm font-semibold text-[color:var(--muted)] hover:text-[color:var(--foreground)] disabled:opacity-60"
          >
            {t("homeRecNext")}
          </button>
        )}
      </div>

      <p className="mt-3 text-[11px] text-[color:var(--muted)]">
        {positionLabel} · {t("homeRecDisclaimerShort")}
      </p>
    </section>
  );
}
