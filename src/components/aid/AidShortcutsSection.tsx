"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface MoatRow {
  id: string;
  ticker: string;
  score?: number;
}

interface StrategyRow {
  id: string;
  symbol: string;
  name?: string;
}

export default function AidShortcutsSection({ hasHoldings }: { hasHoldings: boolean }) {
  const { t } = useI18n();
  const [moats, setMoats] = useState<MoatRow[]>([]);
  const [strategies, setStrategies] = useState<StrategyRow[]>([]);

  useEffect(() => {
    fetch("/api/moat-reports", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const rows = Array.isArray(data) ? data : Array.isArray(data.reports) ? data.reports : [];
        setMoats(
          rows.slice(0, 5).map((r: { id: string; symbol: string; totalScore?: number }) => ({
            id: r.id,
            ticker: r.symbol,
            score: r.totalScore,
          })),
        );
      })
      .catch(() => setMoats([]));

    fetch("/api/strategies", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { strategies: [] }))
      .then((data) => {
        const rows = Array.isArray(data.strategies) ? data.strategies : [];
        setStrategies(
          rows.slice(0, 5).map((s: { id: string; symbol: string; name?: string }) => ({
            id: s.id,
            symbol: s.symbol,
            name: s.name,
          })),
        );
      })
      .catch(() => setStrategies([]));
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section className="card rounded-[var(--radius-card)] p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{t("aidMoatsSaved")}</h3>
          <Link href="/tools/evaluation" className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {t("aidOpenTools")}
          </Link>
        </div>
        {moats.length === 0 ? (
          <p className="text-xs text-[color:var(--muted)]">{t("aidMoatsEmpty")}</p>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {moats.map((m) => (
              <li key={m.id}>
                <Link href={`/stock/${encodeURIComponent(m.ticker)}/evaluation`} className="flex justify-between hover:underline">
                  <span className="font-medium">{m.ticker}</span>
                  {m.score != null && <span className="text-[color:var(--muted)]">{m.score}/100</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card rounded-[var(--radius-card)] p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{t("aidStrategiesSaved")}</h3>
          <Link href="/tools/strategies" className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {t("aidOpenTools")}
          </Link>
        </div>
        {strategies.length === 0 ? (
          <p className="text-xs text-[color:var(--muted)]">{t("aidStrategiesEmpty")}</p>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {strategies.map((s) => (
              <li key={s.id} className="flex justify-between gap-2">
                <span className="font-medium text-[color:var(--foreground)]">{s.symbol}</span>
                <span className="truncate text-[color:var(--muted)]">{s.name ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
        {!hasHoldings && (
          <p className="mt-2 text-[10px] text-[color:var(--muted)]">{t("aidMoatWithoutHoldings")}</p>
        )}
      </section>
    </div>
  );
}
