"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useTrack } from "@/lib/use-track";
import { usePortfolio } from "@/lib/portfolio-context";
import { canAccessFeature } from "@/lib/subscription";
import ProCompareCard from "@/components/ProCompareCard";
import TierFeatureBadge from "./TierFeatureBadge";
import EmptyState from "./EmptyState";

interface EventItem {
  id: string;
  type: "earnings" | "economic" | "ipo" | "splits";
  symbol: string | null;
  name: string;
  date: string;
  time: string | null;
  details: Record<string, unknown> | null;
  inPortfolio: boolean;
}

interface TierAccess {
  [key: string]: { allowed: boolean; requiredTier?: string };
}

type ViewMode = "calendar" | "list";
type EventFilter = "earnings" | "economic" | "ipo" | "splits";

const DOW_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isSameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

function formatEventDate(dateStr: string, lang: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(lang, { weekday: "long", month: "long", day: "numeric" });
}

function getMonthDays(year: number, month: number): { day: number; date: string }[] {
  const days: { day: number; date: string }[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push({
      day: d.getDate(),
      date: toISODate(d),
    });
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getStartDayOffset(year: number, month: number): number {
  const d = new Date(year, month, 1);
  const dow = d.getDay();
  return dow === 0 ? 6 : dow - 1;
}

export default function EventCalendar() {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { activePortfolioId } = usePortfolio();
  const track = useTrack();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [tierAccess, setTierAccess] = useState<TierAccess>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [filters, setFilters] = useState<Set<EventFilter>>(new Set(["earnings", "economic", "ipo", "splits"]));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayStr = toISODate(new Date());
  const [viewYear, viewMonth] = useMemo(() => {
    const now = new Date();
    return [now.getFullYear(), now.getMonth()];
  }, []);
  const [calYear, setCalYear] = useState(viewYear);
  const [calMonth, setCalMonth] = useState(viewMonth);

  const plan = user?.plan ?? "free";
  const entitlementInput = { plan, aiCallsThisMonth: 0 };

  const canEarnings = canAccessFeature("event-calendar-earnings", entitlementInput).allowed;
  const canEconomic = canAccessFeature("event-calendar-economic", entitlementInput).allowed;
  const canIpo = canAccessFeature("event-calendar-ipo", entitlementInput).allowed;
  const canSplits = canAccessFeature("event-calendar-splits", entitlementInput).allowed;

  const isDemo = !user;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemo) {
        const demoData = await import("@/../data/demo-events.json");
        const all = (demoData.default || demoData) as EventItem[];
        setEvents(all);
        setTierAccess({ earnings: { allowed: true }, economic: { allowed: true }, ipo: { allowed: true }, splits: { allowed: true } });
      } else {
        const from = new Date(calYear, calMonth, 1);
        const to = new Date(calYear, calMonth + 1, 0);
        const types = Array.from(filters).join(",");
        const res = await fetch(
          `/api/events?type=${types}&from=${toISODate(from)}&to=${toISODate(to)}${activePortfolioId ? `&portfolioId=${encodeURIComponent(activePortfolioId)}` : ""}`
        );
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events ?? []);
          setTierAccess(data.tierAccess ?? {});
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [calYear, calMonth, filters, isDemo, activePortfolioId]);

  useEffect(() => {
    fetchEvents();
    track("events_tab_viewed");
  }, [fetchEvents]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFilter = (f: EventFilter) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) {
        next.delete(f);
      } else {
        next.add(f);
      }
      return next;
    });
  };

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalYear((y) => y - 1);
      setCalMonth(11);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalYear((y) => y + 1);
      setCalMonth(0);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString(language, {
    month: "long",
    year: "numeric",
  });

  const filteredEvents = useMemo(
    () => events.filter((e) => filters.has(e.type)),
    [events, filters]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const e of filteredEvents) {
      const key = e.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [filteredEvents]);

  const earningsCount = events.filter((e) => e.type === "earnings").length;
  const economicCount = events.filter((e) => e.type === "economic").length;
  const ipoCount = events.filter((e) => e.type === "ipo").length;
  const splitsCount = events.filter((e) => e.type === "splits").length;

  const monthDays = getMonthDays(calYear, calMonth);
  const startOffset = getStartDayOffset(calYear, calMonth);

  const selectedDayEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  const groupedByDate = useMemo(() => {
    const dates = [...new Set(filteredEvents.map((e) => e.date.slice(0, 10)))].sort();
    return dates.map((d) => ({
      date: d,
      events: filteredEvents.filter((e) => e.date.slice(0, 10) === d),
    }));
  }, [filteredEvents]);

  const thisWeekCount = useMemo(() => {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    const endStr = toISODate(endOfWeek);
    return filteredEvents.filter((e) => e.date <= endStr && e.date >= todayStr).length;
  }, [filteredEvents, todayStr]);

  const portfolioCount = filteredEvents.filter((e) => e.inPortfolio).length;
  const highImpactCount = events.filter((e) => {
    if (e.type !== "economic" || !e.details) return false;
    return (e.details as Record<string, unknown>).impact === "High";
  }).length;

  function renderEventTime(e: EventItem): string {
    if (e.type !== "earnings") return "";
    const time = e.time;
    if (time === "bmo") return t("beforeMarketOpen");
    if (time === "amc") return t("afterMarketClose");
    if (time === "dmh") return t("duringMarketHours");
    return "";
  }

  function renderImpact(details: Record<string, unknown> | null): React.ReactNode {
    if (!details) return null;
    const impact = String(details.impact || "");
    if (impact === "High")
      return (
        <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          {t("impactHigh")}
        </span>
      );
    if (impact === "Medium")
      return (
        <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          {t("impactMedium")}
        </span>
      );
    if (impact === "Low")
      return (
        <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          {t("impactLow")}
        </span>
      );
    return null;
  }

  function renderEventCard(e: EventItem) {
    const typeColor = e.type === "earnings" ? "bg-emerald-500" : e.type === "economic" ? "bg-violet-500" : e.type === "splits" ? "bg-rose-500" : "bg-amber-500";

    return (
      <div key={e.id} className="flex items-start gap-3 py-2.5">
        <div className={`w-1 min-h-[36px] rounded-full flex-shrink-0 mt-0.5 ${typeColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{e.name}</span>
            {e.symbol && e.type === "earnings" && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {e.symbol}
              </span>
            )}
            {e.symbol && e.type === "ipo" && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                {e.symbol}
              </span>
            )}
            {e.symbol && e.type === "splits" && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                {e.symbol}
              </span>
            )}
            {e.inPortfolio && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 dark:text-sky-400 uppercase tracking-wide flex items-center gap-1">
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {t("inPortfolio")}
              </span>
            )}
          </div>

          {e.type === "earnings" && (
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex gap-3">
              {renderEventTime(e) && <span>{renderEventTime(e)}</span>}
              {e.details?.fiscalDateEnding ? <span>{String(e.details.fiscalDateEnding)}</span> : null}
            </div>
          )}

          {e.type === "economic" && e.details && (
            <div className="mt-1 flex items-center gap-4 flex-wrap">
              {renderImpact(e.details)}
              <div className="flex gap-3 text-xs text-gray-500 dark:text-slate-400">
                {e.details.previous != null && (
                  <span>
                    {t("previousValue")}: <strong className="text-gray-700 dark:text-slate-300">{String(e.details.previous)}</strong>
                  </span>
                )}
                {e.details.estimate != null && (
                  <span>
                    {t("forecastValue")}: <strong className="text-gray-700 dark:text-slate-300">{String(e.details.estimate)}</strong>
                  </span>
                )}
                {e.details.actual != null && (
                  <span>
                    {t("actualValue")}: <strong className="text-gray-700 dark:text-slate-300">{String(e.details.actual)}</strong>
                  </span>
                )}
              </div>
            </div>
          )}

          {e.type === "ipo" && e.details && (
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex gap-3">
              {e.details.exchange ? <span>{String(e.details.exchange)}</span> : null}
            </div>
          )}

          {e.type === "splits" && e.details && (
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                  e.details.isReverse
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                }`}
              >
                {e.details.isReverse ? t("reverseSplit") : t("forwardSplit")}
              </span>
              {e.details.ratio != null && (
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {t("splitRatio")}: <strong className="text-gray-700 dark:text-slate-300">{String(e.details.ratio)}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {e.type === "earnings" && e.details?.epsEstimated != null && (
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-semibold font-mono text-gray-700 dark:text-slate-300">
              ${String(e.details.epsEstimated)}
            </div>
            <div className="text-[10px] text-gray-400 dark:text-slate-500">{t("estimatedEPS")}</div>
          </div>
        )}

        {e.type === "ipo" && e.details?.priceRange != null && (
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-semibold font-mono text-amber-600 dark:text-amber-400">
              {String(e.details.priceRange)}
            </div>
            <div className="text-[10px] text-gray-400 dark:text-slate-500">{t("priceRange")}</div>
          </div>
        )}

        {e.type === "splits" && e.details?.ratio != null && (
          <div className="text-right flex-shrink-0">
            <div className={`text-sm font-semibold font-mono ${e.details.isReverse ? "text-red-600 dark:text-red-400" : "text-sky-600 dark:text-sky-400"}`}>
              {String(e.details.ratio)}
            </div>
            <div className="text-[10px] text-gray-400 dark:text-slate-500">{t("splitRatio")}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex-1">
          {t("eventCalendar")}
        </h2>
        <div className="flex gap-0.5 bg-gray-100 dark:bg-slate-700 rounded-full p-0.5">
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              viewMode === "calendar"
                ? "bg-emerald-500 text-white"
                : "text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {t("calendarView")}
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              viewMode === "list"
                ? "bg-emerald-500 text-white"
                : "text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {t("listView")}
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => toggleFilter("earnings")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filters.has("earnings")
              ? "bg-emerald-500 text-white"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${filters.has("earnings") ? "bg-white" : "bg-emerald-500"}`} />
          {t("earnings")} ({earningsCount})
        </button>
        <button
          onClick={() => canEconomic && toggleFilter("economic")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filters.has("economic") && canEconomic
              ? "bg-violet-500 text-white"
              : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
          } ${!canEconomic ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <span className={`w-2 h-2 rounded-full ${filters.has("economic") && canEconomic ? "bg-white" : "bg-violet-500"}`} />
          {t("economicEvents")}
          {!canEconomic && <TierFeatureBadge requiredPlan="pro" size="xs" className="ml-1" />}
          {canEconomic && <span className="opacity-70">({economicCount})</span>}
        </button>
        <button
          onClick={() => canIpo && toggleFilter("ipo")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filters.has("ipo") && canIpo
              ? "bg-amber-500 text-white"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          } ${!canIpo ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <span className={`w-2 h-2 rounded-full ${filters.has("ipo") && canIpo ? "bg-white" : "bg-amber-500"}`} />
          {t("ipoCalendar")}
          {!canIpo && <TierFeatureBadge requiredPlan="pro" size="xs" className="ml-1" />}
          {canIpo && <span className="opacity-70">({ipoCount})</span>}
        </button>
        <button
          onClick={() => canSplits && toggleFilter("splits")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filters.has("splits") && canSplits
              ? "bg-rose-500 text-white"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          } ${!canSplits ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <span className={`w-2 h-2 rounded-full ${filters.has("splits") && canSplits ? "bg-white" : "bg-rose-500"}`} />
          {t("stockSplits")}
          {!canSplits && <TierFeatureBadge requiredPlan="pro" size="xs" className="ml-1" />}
          {canSplits && <span className="opacity-70">({splitsCount})</span>}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card px-4 py-3">
          <div className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {t("thisWeek")}
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{thisWeekCount}</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {t("yourHoldings")}
          </div>
          <div className="text-2xl font-bold text-sky-500 dark:text-sky-400 tabular-nums">{portfolioCount}</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            {t("highImpact")}
          </div>
          <div className="text-2xl font-bold text-violet-600 dark:text-violet-400 tabular-nums">{highImpactCount}</div>
        </div>
      </div>

      {loading ? (
        <div className="card px-6 py-10 flex items-center justify-center gap-3 text-gray-400 dark:text-slate-500 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
        </div>
      ) : viewMode === "calendar" ? (
        /* ── Calendar View ── */
        <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] lg:grid-cols-[400px_1fr] gap-5">
          {/* Calendar grid */}
          <div className="card">
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <span className="text-lg font-bold text-gray-900 dark:text-white capitalize">{monthLabel}</span>
              <div className="flex gap-1">
                <button
                  onClick={prevMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Previous month"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  onClick={nextMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Next month"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 px-3 pb-3">
              {DOW_KEYS.map((d) => (
                <div key={d} className="text-center text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider py-1">
                  {d}
                </div>
              ))}

              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {monthDays.map(({ day, date }) => {
                const dayEvents = eventsByDate.get(date) ?? [];
                const isToday = date === todayStr;
                const isSelected = date === selectedDate;

                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(isSelected ? null : date)}
                    className={`aspect-square flex flex-col items-center justify-center gap-0.5 rounded-xl text-sm transition-colors relative ${
                      isToday ? "text-white font-bold" : "text-gray-500 dark:text-slate-400"
                    } ${isSelected ? "bg-gray-100 dark:bg-slate-700" : "hover:bg-gray-50 dark:hover:bg-slate-800"}`}
                  >
                    {isToday && (
                      <span className="absolute inset-0 m-auto w-7 h-7 rounded-full bg-emerald-500/20" />
                    )}
                    <span className="relative z-10">{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 relative z-10">
                        {dayEvents.some((e) => e.type === "earnings") && (
                          <span className="w-[5px] h-[5px] rounded-full bg-emerald-500" />
                        )}
                        {dayEvents.some((e) => e.type === "economic") && (
                          <span className="w-[5px] h-[5px] rounded-full bg-violet-500" />
                        )}
                        {dayEvents.some((e) => e.type === "ipo") && (
                          <span className="w-[5px] h-[5px] rounded-full bg-amber-500" />
                        )}
                        {dayEvents.some((e) => e.type === "splits") && (
                          <span className="w-[5px] h-[5px] rounded-full bg-rose-500" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Events list panel */}
          <div className="space-y-5">
            {/* Earnings section */}
            {canEarnings && (
              <>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  {t("earningsReports")}
                  <span className="text-[11px] font-bold bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                    {earningsCount} {t("upcoming")}
                  </span>
                </div>
                <div className="card divide-y divide-gray-100 dark:divide-slate-700">
                  {(selectedDate ? selectedDayEvents.filter((e) => e.type === "earnings") : filteredEvents.filter((e) => e.type === "earnings")).length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-slate-500">
                      {t("noUpcomingEvents")}
                    </div>
                  ) : (
                    groupedByDate
                      .filter((g) => g.events.some((e) => e.type === "earnings"))
                      .filter((g) => !selectedDate || g.date === selectedDate)
                      .map((group) => (
                        <div key={group.date} className="px-5 py-4">
                          <div className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                            {formatEventDate(group.date, language)}
                            {isSameDay(group.date, todayStr) && (
                              <span className="ml-2 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                                {t("today")}
                              </span>
                            )}
                          </div>
                          {group.events
                            .filter((e) => e.type === "earnings")
                            .map((e) => renderEventCard(e))}
                        </div>
                      ))
                  )}
                </div>
              </>
            )}

            {/* Economic events — gated */}
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              {t("economicEvents")}
              {!canEconomic && <TierFeatureBadge requiredPlan="pro" size="sm" />}
              {canEconomic && (
                <span className="text-[11px] font-bold bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                  {economicCount} {t("upcoming")}
                </span>
              )}
            </div>
            {canEconomic ? (
              <div className="card divide-y divide-gray-100 dark:divide-slate-700">
                {filteredEvents.filter((e) => e.type === "economic").length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-slate-500">
                    {t("noUpcomingEvents")}
                  </div>
                ) : (
                  groupedByDate
                    .filter((g) => g.events.some((e) => e.type === "economic"))
                    .filter((g) => !selectedDate || g.date === selectedDate)
                    .map((group) => (
                      <div key={group.date} className="px-5 py-4">
                        <div className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                          {formatEventDate(group.date, language)}
                        </div>
                        {group.events
                          .filter((e) => e.type === "economic")
                          .map((e) => renderEventCard(e))}
                      </div>
                    ))
                )}
              </div>
            ) : (
              <ProCompareCard surface="intelligence_locked" reason="upgrade_required" compact />
            )}

            {/* IPO — gated */}
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              {t("ipoCalendar")}
              {!canIpo && <TierFeatureBadge requiredPlan="pro" size="sm" />}
              {canIpo && (
                <span className="text-[11px] font-bold bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                  {ipoCount} {t("upcoming")}
                </span>
              )}
            </div>
            {canIpo ? (
              <div className="card divide-y divide-gray-100 dark:divide-slate-700">
                {filteredEvents.filter((e) => e.type === "ipo").length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-slate-500">
                    {t("noUpcomingEvents")}
                  </div>
                ) : (
                  groupedByDate
                    .filter((g) => g.events.some((e) => e.type === "ipo"))
                    .filter((g) => !selectedDate || g.date === selectedDate)
                    .map((group) => (
                      <div key={group.date} className="px-5 py-4">
                        <div className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                          {formatEventDate(group.date, language)}
                        </div>
                        {group.events
                          .filter((e) => e.type === "ipo")
                          .map((e) => renderEventCard(e))}
                      </div>
                    ))
                )}
              </div>
            ) : (
              <ProCompareCard surface="intelligence_locked" reason="upgrade_required" compact />
            )}

            {/* Stock Splits — gated */}
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              {t("stockSplits")}
              {!canSplits && <TierFeatureBadge requiredPlan="pro" size="sm" />}
              {canSplits && (
                <span className="text-[11px] font-bold bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                  {splitsCount} {t("upcoming")}
                </span>
              )}
            </div>
            {canSplits ? (
              <div className="card divide-y divide-gray-100 dark:divide-slate-700">
                {filteredEvents.filter((e) => e.type === "splits").length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-slate-500">
                    {t("noUpcomingEvents")}
                  </div>
                ) : (
                  groupedByDate
                    .filter((g) => g.events.some((e) => e.type === "splits"))
                    .filter((g) => !selectedDate || g.date === selectedDate)
                    .map((group) => (
                      <div key={group.date} className="px-5 py-4">
                        <div className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                          {formatEventDate(group.date, language)}
                        </div>
                        {group.events
                          .filter((e) => e.type === "splits")
                          .map((e) => renderEventCard(e))}
                      </div>
                    ))
                )}
              </div>
            ) : (
              <ProCompareCard surface="intelligence_locked" reason="upgrade_required" compact />
            )}
          </div>
        </div>
      ) : (
        /* ── List View ── */
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300 px-1">
            {t("eventCalendar")}
            <span className="text-[11px] font-bold bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
              {filteredEvents.length} {t("upcoming")}
            </span>
          </div>
          <div className="card divide-y divide-gray-100 dark:divide-slate-700">
            {filteredEvents.length === 0 ? (
              <EmptyState
                icon={<svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>}
                iconClassName="from-blue-400 to-blue-600 shadow-blue-500/20"
                title={t("noUpcomingEvents")}
                subtitle={t("noUpcomingEventsDesc")}
                className="border-0 shadow-none"
              />
            ) : (
              groupedByDate.map((group) => (
                <div key={group.date} className="px-5 py-4">
                  <div className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    {formatEventDate(group.date, language)}
                    {isSameDay(group.date, todayStr) && (
                      <span className="ml-2 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                        {t("today")}
                      </span>
                    )}
                  </div>
                  {group.events.map((e) => renderEventCard(e))}
                </div>
              ))
            )}
          </div>

          {/* Gated sections in list view */}
          {!canEconomic && (
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 px-1">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                {t("economicEvents")}
                <TierFeatureBadge requiredPlan="pro" size="sm" />
              </div>
              <ProCompareCard surface="intelligence_locked" reason="upgrade_required" compact />
            </div>
          )}
          {!canIpo && (
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 px-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                {t("ipoCalendar")}
                <TierFeatureBadge requiredPlan="pro" size="sm" />
              </div>
              <ProCompareCard surface="intelligence_locked" reason="upgrade_required" compact />
            </div>
          )}
          {!canSplits && (
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 px-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                {t("stockSplits")}
                <TierFeatureBadge requiredPlan="pro" size="sm" />
              </div>
              <ProCompareCard surface="intelligence_locked" reason="upgrade_required" compact />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
