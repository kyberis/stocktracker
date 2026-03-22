"use client";

import { useState, useEffect, useCallback } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

interface EarningsEvent {
  id: string;
  symbol: string | null;
  name: string;
  date: string;
  time: string | null;
  details: Record<string, unknown> | null;
  inPortfolio: boolean;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function timeLabel(time: string | null): string {
  if (!time) return "";
  if (time === "bmo") return "Pre-market";
  if (time === "amc") return "After close";
  if (time === "dmh" || time === "during") return "During hours";
  return "";
}

interface Props {
  onNavigateToEvents?: () => void;
}

export default function UpcomingEarnings({ onNavigateToEvents }: Props) {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { holdings, activePortfolioId } = usePortfolio();
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const isDemo = !user;
  const today = toISODate(new Date());

  const fetchEvents = useCallback(async () => {
    if (holdings.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (isDemo) {
        const demoData = await import("@/../data/demo-events.json");
        const all = (demoData.default || demoData) as EarningsEvent[];
        setEvents(all.filter((e) => e.inPortfolio));
      } else {
        const from = toISODate(new Date());
        const to = toISODate(addDays(new Date(), 14));
        const res = await fetch(
          `/api/events?type=earnings&holdings_only=true&from=${from}&to=${to}${activePortfolioId ? `&portfolioId=${encodeURIComponent(activePortfolioId)}` : ""}`
        );
        if (res.ok) {
          const data = await res.json();
          setEvents((data.events ?? []).filter((e: EarningsEvent) => e.inPortfolio));
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [holdings.length, isDemo, activePortfolioId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  if (loading) return null;
  if (events.length === 0) return null;

  const todayEvents = events.filter((e) => e.date === today);
  const endOfWeek = toISODate(addDays(new Date(), 7 - new Date().getDay()));
  const weekEvents = events.filter((e) => e.date > today && e.date <= endOfWeek);
  const laterEvents = events.filter((e) => e.date > endOfWeek);

  if (todayEvents.length === 0 && weekEvents.length === 0 && laterEvents.length === 0) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(language, { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 sm:px-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("upcomingEarningsTitle")}</h3>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
            {events.length}
          </span>
        </div>
        {onNavigateToEvents && (
          <button
            onClick={onNavigateToEvents}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
          >
            {t("viewAll")} →
          </button>
        )}
      </div>

      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="space-y-1">
          {todayEvents.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5">
                {t("today")}
              </p>
              {todayEvents.map((e) => (
                <EventRow key={e.id} event={e} formatDate={formatDate} isToday />
              ))}
            </div>
          )}

          {weekEvents.length > 0 && (
            <div className={todayEvents.length > 0 ? "pt-2 border-t border-gray-100 dark:border-slate-700/50" : ""}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">
                {t("thisWeek")}
              </p>
              {weekEvents.slice(0, 4).map((e) => (
                <EventRow key={e.id} event={e} formatDate={formatDate} />
              ))}
              {weekEvents.length > 4 && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  +{weekEvents.length - 4} {t("moreEvents")}
                </p>
              )}
            </div>
          )}

          {laterEvents.length > 0 && todayEvents.length === 0 && weekEvents.length === 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">
                {t("upcoming")}
              </p>
              {laterEvents.slice(0, 3).map((e) => (
                <EventRow key={e.id} event={e} formatDate={formatDate} />
              ))}
              {laterEvents.length > 3 && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  +{laterEvents.length - 3} {t("moreEvents")}
                </p>
              )}
            </div>
          )}

          {laterEvents.length > 0 && (todayEvents.length > 0 || weekEvents.length > 0) && (
            <div className="pt-2 border-t border-gray-100 dark:border-slate-700/50">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">
                {t("comingUp")}
              </p>
              {laterEvents.slice(0, 2).map((e) => (
                <EventRow key={e.id} event={e} formatDate={formatDate} />
              ))}
              {laterEvents.length > 2 && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  +{laterEvents.length - 2} {t("moreEvents")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventRow({ event, formatDate, isToday }: {
  event: EarningsEvent;
  formatDate: (d: string) => string;
  isToday?: boolean;
}) {
  const eps = event.details?.epsEstimated;

  return (
    <div className="flex items-center gap-3 py-1.5 group">
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isToday ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-emerald-400/60"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {event.symbol}
          </span>
          <span className="text-xs text-gray-500 dark:text-slate-400 truncate hidden sm:inline">
            {event.name}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 text-right">
        {eps != null && (
          <span className="text-xs text-gray-500 dark:text-slate-400 tabular-nums">
            Est. ${Number(eps).toFixed(2)}
          </span>
        )}
        <span className="text-xs text-gray-400 dark:text-slate-500 tabular-nums w-20 text-right">
          {isToday ? timeLabel(event.time) || formatDate(event.date) : formatDate(event.date)}
        </span>
      </div>
    </div>
  );
}
