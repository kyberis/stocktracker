"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";

interface EarningsEvent {
  ticker: string;
  name?: string;
  date: string;
  timing?: string;
}

interface Props {
  onNavigateToEvents?: () => void;
}

export default function CompactEarningsCard({ onNavigateToEvents }: Props) {
  const { t } = useI18n();
  const { holdings, demoMode, activePortfolioId } = usePortfolio();
  const { user } = useAuth();
  const [events, setEvents] = useState<EarningsEvent[]>([]);

  useEffect(() => {
    if (demoMode || !user) {
      setEvents([
        { ticker: "ADBE", name: "Adobe Inc", date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), timing: "AMC" },
        { ticker: "GOOGL", name: "Alphabet Inc", date: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10), timing: "BMO" },
        { ticker: "PFE", name: "Pfizer Inc", date: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10), timing: "BMO" },
      ]);
      return;
    }
    if (holdings.length === 0) return;

    const portfolioParam = activePortfolioId ? `&portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
    fetch(`/api/events?type=earnings&holdings_only=true&limit=4${portfolioParam}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const items = Array.isArray(data) ? data : data?.events ?? [];
        setEvents(items.slice(0, 4));
      })
      .catch(() => {});
  }, [holdings, demoMode, user, activePortfolioId]);

  if (events.length === 0) return null;

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]">{t("v2UpcomingEarnings")}</p>
        {onNavigateToEvents && (
          <button onClick={onNavigateToEvents} className="text-[11px] font-medium text-emerald-400 hover:underline">
            {t("v2ViewAll")}
          </button>
        )}
      </div>
      <div className="space-y-0">
        {events.map((e) => {
          const d = new Date(e.date);
          const day = d.getDate();
          const month = d.toLocaleString("en", { month: "short" });
          const isBMO = e.timing?.toUpperCase() === "BMO";
          return (
            <div key={`${e.ticker}-${e.date}`} className="flex items-center gap-2 border-b border-[color:var(--border)] py-1.5 last:border-b-0">
              <div className="w-9 text-center shrink-0">
                <p className="text-sm font-bold leading-none text-[color:var(--foreground)]">{day}</p>
                <p className="text-[9px] font-semibold uppercase text-[color:var(--muted)]">{month}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[color:var(--foreground)]">{e.ticker}</p>
                {e.name && (
                  <p className="truncate text-[10px] text-[color:var(--muted)]">{e.name}</p>
                )}
              </div>
              {e.timing && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                    isBMO
                      ? "border border-amber-500/16 bg-amber-500/10 text-amber-300"
                      : "border border-blue-500/16 bg-blue-500/10 text-blue-300"
                  }`}
                >
                  {e.timing.toUpperCase()}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
