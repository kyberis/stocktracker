"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useTrack } from "@/lib/use-track";
import type { AidFeedItem } from "@/lib/types";
import AidImpactBadge from "./AidImpactBadge";

function sourceLabel(source: AidFeedItem["source"], t: (k: string) => string): string {
  if (source === "finpulse") return t("aidPrioritySourceFinPulse");
  if (source === "earnings") return t("aidPrioritySourceEarnings");
  return t("aidPrioritySourceNews");
}

interface Props {
  hasHoldings: boolean;
}

export default function AidPriorityStrip({ hasHoldings }: Props) {
  const { t } = useI18n();
  const { activePortfolioId } = usePortfolio();
  const track = useTrack();
  const [items, setItems] = useState<AidFeedItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!hasHoldings) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activePortfolioId) params.set("portfolioId", activePortfolioId);
      const res = await fetch(`/api/aid/feed?${params}`, { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("feed failed");
      const data = (await res.json()) as { priority?: AidFeedItem[]; topImpactScore?: number };
      const priority = Array.isArray(data.priority) ? data.priority : [];
      setItems(priority);
      track("aid_feed_loaded", {
        count: String(priority.length),
        topScore: String(data.topImpactScore ?? priority[0]?.impactScore ?? 0),
      });
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [hasHoldings, activePortfolioId, track]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!hasHoldings) return null;
  if (!loading && items.length === 0) return null;

  const scrollTo = (anchorId: string) => {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    track("aid_priority_item_clicked", { anchor: anchorId });
  };

  return (
    <section id="aid-priority" className="card rounded-[var(--radius-card)] p-4" aria-label={t("aidPriorityTitle")}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[color:var(--foreground)]">{t("aidPriorityTitle")}</h2>
        <p className="text-[10px] text-[color:var(--muted)]">{t("aidPriorityDesc")}</p>
      </div>

      {loading && items.length === 0 && (
        <p className="text-sm text-[color:var(--muted)]" role="status">
          {t("loading")}
        </p>
      )}

      <ol className="space-y-2">
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => scrollTo(item.anchorId)}
              className="flex w-full items-start gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3 text-left transition-colors hover:border-emerald-500/25"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[11px] font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                    {sourceLabel(item.source, t)}
                  </span>
                  <span className="text-[10px] font-semibold text-[color:var(--foreground)]">{item.label}</span>
                  <AidImpactBadge impact="medium" impactScore={item.impactScore} />
                </div>
                <p className="line-clamp-2 text-sm font-medium text-[color:var(--foreground)]">{item.headline}</p>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
