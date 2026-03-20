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
  const { holdings, demoMode } = usePortfolio();
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

    fetch("/api/events?type=earnings&holdings_only=true&limit=4")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const items = Array.isArray(data) ? data : data?.events ?? [];
        setEvents(items.slice(0, 4));
      })
      .catch(() => {});
  }, [holdings, demoMode, user]);

  if (events.length === 0) return null;

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-900 dark:text-white">{t("v2UpcomingEarnings")}</p>
        {onNavigateToEvents && (
          <button onClick={onNavigateToEvents} className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
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
            <div key={`${e.ticker}-${e.date}`} className="flex items-center gap-2 py-1.5 border-b border-gray-100 dark:border-white/[0.04] last:border-b-0">
              <div className="w-9 text-center shrink-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{day}</p>
                <p className="text-[9px] font-semibold uppercase text-gray-500 dark:text-slate-500">{month}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{e.ticker}</p>
                {e.name && (
                  <p className="text-[10px] text-gray-500 dark:text-slate-500 truncate">{e.name}</p>
                )}
              </div>
              {e.timing && (
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                    isBMO
                      ? "bg-amber-500/15 text-amber-500"
                      : "bg-indigo-500/15 text-indigo-400"
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
