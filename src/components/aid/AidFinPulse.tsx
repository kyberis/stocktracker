"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useTrack } from "@/lib/use-track";
import type { AidFinPulseFollowedAccount, AidFinPulseItem } from "@/lib/types";
import AidImpactBadge from "./AidImpactBadge";

type Tab = "foryou" | "market_voices";

function displayHandle(handle: string): string {
  return handle.startsWith("@") ? handle : `@${handle}`;
}

interface Props {
  hasHoldings: boolean;
  showForYou?: boolean;
}

export default function AidFinPulse({ hasHoldings, showForYou = true }: Props) {
  const { t } = useI18n();
  const { activePortfolioId } = usePortfolio();
  const track = useTrack();
  const [tab, setTab] = useState<Tab>(showForYou && hasHoldings ? "foryou" : "market_voices");
  const [items, setItems] = useState<AidFinPulseItem[]>([]);
  const [followedAccounts, setFollowedAccounts] = useState<AidFinPulseFollowedAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const tabs = useMemo(() => {
    const list: { id: Tab; label: string }[] = [{ id: "market_voices", label: t("aidFinPulseMarketVoices") }];
    if (showForYou && hasHoldings) {
      list.unshift({ id: "foryou", label: t("aidFinPulseForYou") });
    }
    return list;
  }, [hasHoldings, showForYou, t]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ tab });
      if (activePortfolioId) params.set("portfolioId", activePortfolioId);
      const res = await fetch(`/api/aid/finpulse?${params}`, { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("finpulse failed");
      const data = (await res.json()) as {
        items?: AidFinPulseItem[];
        followedAccounts?: AidFinPulseFollowedAccount[];
      };
      setItems(Array.isArray(data.items) ? data.items : []);
      setFollowedAccounts(Array.isArray(data.followedAccounts) ? data.followedAccounts : []);
      track("aid_finpulse_tab", { tab });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [tab, activePortfolioId, track]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section id="aid-finpulse" className="card rounded-[var(--radius-card)] p-4" aria-label={t("aidFinPulseTitle")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{t("aidFinPulseTitle")}</h3>
          <p className="text-[10px] text-[color:var(--muted)]">{t("aidFinPulseDesc")}</p>
          {followedAccounts.length > 0 ? (
            <div className="mt-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
                {t("aidFinPulseFollowing")}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {followedAccounts.map((account) => (
                  <span
                    key={account.handle}
                    title={account.displayName}
                    className="inline-flex max-w-full items-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--foreground)]"
                  >
                    <span className="truncate">{displayHandle(account.handle)}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-3 flex gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-0.5">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 min-h-9 rounded-full px-2 text-[11px] font-semibold ${
              tab === id
                ? "bg-[color:var(--surface-highlight)] text-[color:var(--foreground)]"
                : "text-[color:var(--muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mb-3 text-[10px] text-[color:var(--muted)]">{t("aidFinPulseDisclaimer")}</p>

      {loading && items.length === 0 && (
        <p className="text-sm text-[color:var(--muted)]" role="status">
          {t("loading")}
        </p>
      )}

      {error && !loading && <p className="text-sm text-red-500">{t("aidFinPulseError")}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-[color:var(--muted)]">
          {tab === "foryou" ? t("aidFinPulseEmptyForYou") : t("aidFinPulseEmptyVoices")}
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[color:var(--foreground)]">{displayHandle(item.handle)}</span>
              <span className="text-[10px] text-[color:var(--muted)]">
                {item.publishedAt ? item.publishedAt.slice(0, 10) : ""}
              </span>
              <AidImpactBadge impact={item.impact} impactScore={item.impactScore} />
              {item.portfolioRelevant && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {t("aidFinPulsePortfolioTag")}
                </span>
              )}
              {item.tickers.slice(0, 3).map((tk) => (
                <span
                  key={tk}
                  className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                >
                  {tk}
                </span>
              ))}
            </div>
            <p className="text-sm font-semibold text-[color:var(--foreground)]">{item.headline}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[color:var(--muted)]">
              {item.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            {item.sourceUrl && (
              <Link
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("aid_finpulse_post_clicked", { handle: item.handle })}
                className="mt-2 inline-block text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
              >
                {t("aidFinPulseViewPost")}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
