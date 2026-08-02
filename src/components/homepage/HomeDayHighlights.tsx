"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import { formatPercent } from "@/lib/utils";
import type { HomeDayHighlight, HomeDayHighlightReason } from "@/lib/homepage/types";

function reasonLabel(r: HomeDayHighlightReason, t: (k: string) => string): string {
  switch (r.kind) {
    case "move":
      return `${r.pct >= 0 ? "▲" : "▼"} ${formatPercent(r.pct)}`;
    case "earnings":
      return r.when === "today"
        ? t("homeV2HighlightEarningsToday")
        : r.when === "tomorrow"
          ? t("homeV2HighlightEarningsTomorrow")
          : `${t("homeV2BadgeEarnings")} ${r.when}`;
    case "news":
      return r.headline;
    case "near_52w":
      return r.side === "high" ? t("homeV2HighlightNear52wHigh") : t("homeV2HighlightNear52wLow");
    case "alert":
      return r.label;
    case "ex_div":
      return `${t("homeV2BadgeDividend")} ${r.date}`;
    default:
      return "";
  }
}

export default function HomeDayHighlights() {
  const { t } = useI18n();
  const track = useTrack();
  const { activePortfolioId } = usePortfolio();
  const [highlights, setHighlights] = useState<HomeDayHighlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (activePortfolioId) params.set("portfolioId", activePortfolioId);
    fetch(`/api/home-v2/day-highlights?${params}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { highlights: [] }))
      .then((data) => {
        if (!cancelled) setHighlights(Array.isArray(data.highlights) ? data.highlights : []);
      })
      .catch(() => {
        if (!cancelled) setHighlights([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activePortfolioId]);

  if (loading) {
    return (
      <section className="card rounded-[var(--radius-card)] p-4" aria-busy="true">
        <p className="text-sm text-[color:var(--muted)]">{t("loading")}</p>
      </section>
    );
  }

  if (highlights.length === 0) return null;

  return (
    <section className="card rounded-[var(--radius-card)] p-4" aria-label={t("homeV2DayHighlightsTitle")}>
      <h2 className="text-sm font-semibold text-[color:var(--foreground)]">{t("homeV2DayHighlightsTitle")}</h2>
      <p className="mt-0.5 text-xs text-[color:var(--muted)]">{t("homeV2DayHighlightsSubtitle")}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {highlights.map((h) => {
          const primary = h.reasons[0];
          const extra = h.reasons.slice(1, 3);
          return (
            <li key={h.ticker}>
              <Link
                href={`/stock/${encodeURIComponent(h.ticker)}`}
                onClick={() =>
                  track("home_v2_highlight_clicked", {
                    ticker: h.ticker,
                    kind: primary?.kind ?? "unknown",
                  })
                }
                className="flex min-h-11 flex-wrap items-center gap-2 rounded-[var(--radius-control)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 transition-colors hover:border-emerald-500/30"
              >
                <span className="font-mono text-sm font-semibold text-[color:var(--foreground)]">{h.ticker}</span>
                {primary && (
                  <span className="text-xs font-medium text-[color:var(--foreground)]">{reasonLabel(primary, t)}</span>
                )}
                {extra.map((r, i) => (
                  <span
                    key={`${r.kind}-${i}`}
                    className="rounded-full bg-[color:var(--surface-highlight)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--muted)]"
                  >
                    {reasonLabel(r, t)}
                  </span>
                ))}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
