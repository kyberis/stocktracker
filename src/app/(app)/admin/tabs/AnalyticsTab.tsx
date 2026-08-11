"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
} from "recharts";
import { StatCard, AnalyticsSummary, FunnelStage } from "../shared";

const FUNNEL_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#10b981"];

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function suggestApprovedValue(
  rawValue: string,
  approved: string[],
  aliases: Record<string, string>
): string | null {
  if (!rawValue || approved.length === 0) return null;
  const normalizedRaw = normalizeToken(rawValue);
  const approvedSet = new Set(approved.map((v) => v.toLowerCase()));

  // Direct alias map first for common campaign naming drift.
  if (aliases[normalizedRaw] && approvedSet.has(aliases[normalizedRaw])) {
    return aliases[normalizedRaw];
  }

  // Exact normalize match against approved list.
  for (const candidate of approved) {
    if (normalizeToken(candidate) === normalizedRaw) return candidate;
  }

  // Contains/starts-with heuristics for close variants.
  for (const candidate of approved) {
    const normalizedCandidate = normalizeToken(candidate);
    if (!normalizedCandidate) continue;
    if (normalizedRaw.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedRaw)) {
      return candidate;
    }
  }

  return null;
}

function ConversionFunnel({ stages }: { stages: FunnelStage[] }) {
  const hasData = stages.some((s) => s.count > 0);
  if (!hasData) return null;

  const funnelData = stages.map((s, i) => ({
    name: s.stage,
    value: s.count,
    fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
  }));

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Conversion Funnel</h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">Unique users at each stage of the free-to-paid journey</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual funnel bars */}
        <div className="space-y-2">
          {stages.map((stage, i) => {
            const widthPct = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 8) : 8;
            const prevCount = i > 0 ? stages[i - 1].count : 0;
            const dropoff = i > 0 && prevCount > 0
              ? `${((1 - stage.count / prevCount) * 100).toFixed(0)}% drop`
              : null;

            return (
              <div key={stage.stage} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{stage.stage}</span>
                  <div className="flex items-center gap-2">
                    {dropoff && (
                      <span className="text-[10px] text-red-400 dark:text-red-400/80">{dropoff}</span>
                    )}
                    <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums">{stage.count}</span>
                  </div>
                </div>
                <div className="relative h-7 w-full flex justify-center">
                  <div
                    className="h-full rounded-md transition-all duration-500"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                      opacity: 0.85,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Recharts funnel */}
        <div className="hidden lg:block">
          <ResponsiveContainer width="100%" height={220}>
            <FunnelChart>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value) => [value ?? 0, "Users"]}
              />
              <Funnel dataKey="value" data={funnelData} isAnimationActive>
                <LabelList
                  dataKey="name"
                  position="right"
                  fill="currentColor"
                  className="text-gray-600 dark:text-slate-300"
                  style={{ fontSize: 11 }}
                />
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stage-to-stage conversion rates */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-3">
          {stages.map((stage, i) => {
            if (i === 0) return null;
            const prev = stages[i - 1];
            const rate = prev.count > 0 ? ((stage.count / prev.count) * 100).toFixed(1) : "0.0";
            return (
              <div key={stage.stage} className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500 dark:text-slate-400">{prev.stage}</span>
                <svg className="w-3 h-3 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="text-gray-500 dark:text-slate-400">{stage.stage}</span>
                <span className={`font-bold tabular-nums ${
                  parseFloat(rate) >= 20 ? "text-emerald-600 dark:text-emerald-400" :
                  parseFloat(rate) >= 5 ? "text-amber-600 dark:text-amber-400" :
                  "text-red-500 dark:text-red-400"
                }`}>
                  {rate}%
                </span>
              </div>
            );
          })}
          {stages.length >= 2 && stages[0].count > 0 && (
            <div className="flex items-center gap-1.5 text-xs ml-auto">
              <span className="text-gray-500 dark:text-slate-400">Overall</span>
              <span className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                {((stages[stages.length - 1].count / stages[0].count) * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [copiedSuggestionKey, setCopiedSuggestionKey] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/analytics?days=${days}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <p className="text-gray-500 dark:text-slate-400">Loading analytics...</p>;
  if (!data) return <p className="text-red-500">Failed to load analytics.</p>;

  const activityData = data.dailyActivity.map((d) => ({
    date: d.date.slice(5),
    users: d.users,
    events: d.events,
  }));
  const attributionRows = data.attributionBySource ?? [];
  const attributionMediumRows = data.attributionByMedium ?? [];
  const totalAttributedSignups = attributionRows.reduce((sum, row) => sum + row.signups, 0);
  const knownAttributedSignups = attributionRows
    .filter((row) => row.source !== "unknown")
    .reduce((sum, row) => sum + row.signups, 0);
  const attributionCoverage = totalAttributedSignups > 0
    ? ((knownAttributedSignups / totalAttributedSignups) * 100).toFixed(1)
    : "0.0";

  const validation = data.utmValidation;
  const hasUtmWarnings =
    !!validation && (
      validation.unknown.sourcesSignups > 0 ||
      validation.unknown.mediumsSignups > 0 ||
      validation.nonApproved.sources.length > 0 ||
      validation.nonApproved.mediums.length > 0
    );

  const sourceAliases: Record<string, string> = {
    facebook: "meta",
    fb: "meta",
    metaads: "meta",
    metaad: "meta",
    instagram: "meta",
    googleads: "google",
    adwords: "google",
    gads: "google",
    linkedinads: "linkedin",
    linkedinin: "linkedin",
    newsletteremail: "newsletter",
  };
  const mediumAliases: Record<string, string> = {
    paidsocial: "paid_social",
    paidsocials: "paid_social",
    socialpaid: "paid_social",
    paidsocialmedia: "paid_social",
    ppc: "cpc",
    paidsearch: "cpc",
    emailmarketing: "email",
    mail: "email",
    referraltraffic: "affiliate",
    partner: "affiliate",
  };

  const getSourceSuggestion = (value: string): string | null =>
    validation
      ? suggestApprovedValue(value, validation.approved.sources, sourceAliases)
      : null;

  const getMediumSuggestion = (value: string): string | null =>
    validation
      ? suggestApprovedValue(value, validation.approved.mediums, mediumAliases)
      : null;

  const copySuggestion = async (
    kind: "source" | "medium",
    fromValue: string,
    toValue: string
  ) => {
    const text = `Use utm_${kind}=${toValue} (instead of ${fromValue})`;
    try {
      await navigator.clipboard.writeText(text);
      const key = `${kind}:${fromValue}`;
      setCopiedSuggestionKey(key);
      window.setTimeout(() => {
        setCopiedSuggestionKey((prev) => (prev === key ? null : prev));
      }, 1800);
    } catch {
      // no-op if clipboard access is blocked
    }
  };

  const allSuggestionLines = validation
    ? [
        ...validation.nonApproved.sources
          .map((row) => {
            const suggestion = getSourceSuggestion(row.value);
            return suggestion
              ? `Use utm_source=${suggestion} (instead of ${row.value})`
              : null;
          })
          .filter((line): line is string => Boolean(line)),
        ...validation.nonApproved.mediums
          .map((row) => {
            const suggestion = getMediumSuggestion(row.value);
            return suggestion
              ? `Use utm_medium=${suggestion} (instead of ${row.value})`
              : null;
          })
          .filter((line): line is string => Boolean(line)),
      ]
    : [];

  const copyAllSuggestions = async () => {
    if (allSuggestionLines.length === 0) return;
    try {
      await navigator.clipboard.writeText(allSuggestionLines.join("\n"));
      setCopiedSuggestionKey("all");
      window.setTimeout(() => {
        setCopiedSuggestionKey((prev) => (prev === "all" ? null : prev));
      }, 1800);
    } catch {
      // no-op if clipboard access is blocked
    }
  };

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => {
              if (days === d) return;
              setLoading(true);
              setDays(d);
            }}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              days === d
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={data.totalUsers} />
        <StatCard label="Active (7d)" value={data.activeUsers7d} />
        <StatCard label="Active (30d)" value={data.activeUsers30d} />
        <StatCard label="Events" value={data.totalEvents} />
      </div>

      {/* Conversion parity */}
      {data.conversionParity && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Ad Conversion Parity</h3>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
              data.conversionParity.overallMatchRate >= 85
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
            }`}>
              {data.conversionParity.overallMatchRate.toFixed(1)}% overall
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
            Match rate compares internal canonical conversions vs consent-safe ad-dispatched events.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium text-right">Internal</th>
                  <th className="px-3 py-2 font-medium text-right">Ad Dispatched</th>
                  <th className="px-3 py-2 font-medium text-right">Match Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.conversionParity.byEvent.map((row) => (
                  <tr key={row.event} className="border-b border-gray-50 dark:border-slate-700/50">
                    <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">{row.event}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">{row.internalCount}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">{row.adDispatchedCount}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${
                      row.matchRate >= 85
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}>
                      {row.matchRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily activity chart */}
      {activityData.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Daily Activity</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-slate-700" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Line type="monotone" dataKey="users" name="Active Users" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="events" name="Events" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Events by type */}
        {data.eventsByType.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Events by Type</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.eventsByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-slate-700" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
                <YAxis dataKey="event" type="category" tick={{ fontSize: 11 }} width={110} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top stocks */}
        {data.topStocks.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Top Viewed Stocks</h3>
            <div className="space-y-2">
              {data.topStocks.map((s, i) => (
                <div key={s.ticker} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-slate-200">
                    <span className="text-gray-400 dark:text-slate-500 mr-2">{i + 1}.</span>
                    {s.ticker}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">{s.views}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Signups over time */}
      {data.signupsByDay.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Signups</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.signupsByDay.map((d) => ({ date: d.date.slice(5), count: d.count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-slate-700" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" name="Signups" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Attribution by source */}
      {attributionRows.length > 0 && (
        <div className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Attribution by Source</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-slate-400">Known source coverage</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                Number(attributionCoverage) >= 90
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
              }`}>
                {attributionCoverage}%
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium text-right">Signups</th>
                  <th className="px-3 py-2 font-medium text-right">Paywall Shown</th>
                  <th className="px-3 py-2 font-medium text-right">Paid Conversions</th>
                  <th className="px-3 py-2 font-medium text-right">Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {attributionRows.map((row) => (
                  <tr key={row.source} className="border-b border-gray-50 dark:border-slate-700/50">
                    <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">{row.source}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">{row.signups}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">{row.paywallShown}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">{row.paidConversions}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                      {row.conversionRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attribution by medium */}
      {attributionMediumRows.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Attribution by Medium</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                  <th className="px-3 py-2 font-medium">Medium</th>
                  <th className="px-3 py-2 font-medium text-right">Signups</th>
                  <th className="px-3 py-2 font-medium text-right">Paywall Shown</th>
                  <th className="px-3 py-2 font-medium text-right">Paid Conversions</th>
                  <th className="px-3 py-2 font-medium text-right">Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {attributionMediumRows.map((row) => (
                  <tr key={row.medium} className="border-b border-gray-50 dark:border-slate-700/50">
                    <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">{row.medium}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">{row.signups}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">{row.paywallShown}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">{row.paidConversions}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                      {row.conversionRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* UTM quality warnings */}
      {validation && (
        <div className={`card p-4 ${hasUtmWarnings ? "border border-amber-200 dark:border-amber-500/30" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">UTM Quality</h3>
            <div className="flex items-center gap-2">
              {allSuggestionLines.length > 0 && (
                <button
                  onClick={copyAllSuggestions}
                  className="text-xs px-2 py-1 rounded border border-amber-300/70 dark:border-amber-500/40 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-slate-700"
                >
                  {copiedSuggestionKey === "all" ? "Copied all" : "Copy all fixes"}
                </button>
              )}
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                hasUtmWarnings
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
              }`}>
                {hasUtmWarnings ? "Warnings detected" : "All clear"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-gray-50 dark:bg-slate-800/60 p-3">
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Unknown values</p>
              <p className="text-gray-900 dark:text-white">
                Source: <span className="font-semibold tabular-nums">{validation.unknown.sourcesSignups}</span> signups
              </p>
              <p className="text-gray-900 dark:text-white">
                Medium: <span className="font-semibold tabular-nums">{validation.unknown.mediumsSignups}</span> signups
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-slate-800/60 p-3">
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Approved taxonomy</p>
              <p className="text-gray-900 dark:text-white text-xs">
                Sources: {validation.approved.sources.join(", ")}
              </p>
              <p className="text-gray-900 dark:text-white text-xs mt-1">
                Mediums: {validation.approved.mediums.join(", ")}
              </p>
            </div>
          </div>

          {(validation.nonApproved.sources.length > 0 || validation.nonApproved.mediums.length > 0) && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 p-3">
                <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">Non-approved sources</p>
                {validation.nonApproved.sources.length === 0 ? (
                  <p className="text-amber-700/80 dark:text-amber-400/80">None</p>
                ) : (
                  <div className="space-y-1">
                    {validation.nonApproved.sources.slice(0, 8).map((row) => {
                      const suggestion = getSourceSuggestion(row.value);
                      const itemKey = `source:${row.value}`;
                      return (
                        <div key={row.value} className="flex items-center justify-between gap-2">
                          <p className="text-amber-700 dark:text-amber-300">
                            {row.value} <span className="font-semibold">({row.signups})</span>
                            {suggestion && (
                              <span className="ml-2 text-[11px] text-amber-800 dark:text-amber-200">
                                → {suggestion}
                              </span>
                            )}
                          </p>
                          {suggestion && (
                            <button
                              onClick={() => copySuggestion("source", row.value, suggestion)}
                              className="text-[10px] px-2 py-0.5 rounded bg-white/70 dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-500/30 hover:bg-white dark:hover:bg-slate-700"
                            >
                              {copiedSuggestionKey === itemKey ? "Copied" : "Copy fix"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 p-3">
                <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">Non-approved mediums</p>
                {validation.nonApproved.mediums.length === 0 ? (
                  <p className="text-amber-700/80 dark:text-amber-400/80">None</p>
                ) : (
                  <div className="space-y-1">
                    {validation.nonApproved.mediums.slice(0, 8).map((row) => {
                      const suggestion = getMediumSuggestion(row.value);
                      const itemKey = `medium:${row.value}`;
                      return (
                        <div key={row.value} className="flex items-center justify-between gap-2">
                          <p className="text-amber-700 dark:text-amber-300">
                            {row.value} <span className="font-semibold">({row.signups})</span>
                            {suggestion && (
                              <span className="ml-2 text-[11px] text-amber-800 dark:text-amber-200">
                                → {suggestion}
                              </span>
                            )}
                          </p>
                          {suggestion && (
                            <button
                              onClick={() => copySuggestion("medium", row.value, suggestion)}
                              className="text-[10px] px-2 py-0.5 rounded bg-white/70 dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-500/30 hover:bg-white dark:hover:bg-slate-700"
                            >
                              {copiedSuggestionKey === itemKey ? "Copied" : "Copy fix"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conversion Funnel */}
      {data.funnel && <ConversionFunnel stages={data.funnel} />}

      {/* Screening entry funnel */}
      {data.screeningEntry &&
        (data.screeningEntry.live.some((s) => s.count > 0) ||
          data.screeningEntry.fixture.some((s) => s.count > 0)) && (
        <div className="mt-8">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
            Screening entry
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
            First-screen funnel for /screening. Live uses real portfolio state; fixture is
            design-preview traffic (?scenario=).
          </p>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Live</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {data.screeningEntry.live.map((stage) => (
              <StatCard key={`live-${stage.stage}`} label={stage.stage} value={stage.count} />
            ))}
          </div>
          {data.screeningEntry.fixture.some((s) => s.count > 0) && (
            <>
              <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-3">
                Fixture preview
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {data.screeningEntry.fixture.map((stage) => (
                  <StatCard key={`fixture-${stage.stage}`} label={stage.stage} value={stage.count} />
                ))}
              </div>
            </>
          )}
          {data.screeningEntry.byVariantLive.length > 0 && (
            <div className="card p-4 mt-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Entry views by variant (live)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {data.screeningEntry.byVariantLive.map((row) => (
                  <StatCard key={row.variant} label={row.variant} value={row.views} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Landing Page Analytics */}
      {data.landing && (data.landing.totalPageViews > 0 || data.landing.totalCtaClicks > 0) && (
        <>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mt-8 mb-4">Landing Page</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Page Views" value={data.landing.totalPageViews} />
            <StatCard label="CTA Clicks" value={data.landing.totalCtaClicks} />
            <StatCard
              label="Conversion Rate"
              value={
                data.landing.totalPageViews > 0
                  ? `${((data.landing.totalCtaClicks / data.landing.totalPageViews) * 100).toFixed(1)}%`
                  : "—"
              }
            />
            <StatCard label="Landing Events" value={data.landing.eventsByType.reduce((s, e) => s + e.count, 0)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.landing.dailyViews.length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Landing Daily Views</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.landing.dailyViews.map((d) => ({ date: d.date.slice(5), views: d.views }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-slate-700" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
                    <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="views" name="Views" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.landing.ctaBreakdown.length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">CTA Click Breakdown</h3>
                <div className="space-y-2">
                  {data.landing.ctaBreakdown.map((c, i) => (
                    <div key={c.cta} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-slate-200">
                        <span className="text-gray-400 dark:text-slate-500 mr-2">{i + 1}.</span>
                        {c.cta}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Referral Funnel */}
      {data.referralFunnel && (data.referralFunnel.signups > 0 || data.referralFunnel.linkViews > 0) && (
        <>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mt-8 mb-4">Referral Funnel</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Link Views", value: data.referralFunnel.linkViews },
              { label: "Copies / Shares", value: data.referralFunnel.linkCopiesOrShares },
              { label: "Signups", value: data.referralFunnel.signups },
              { label: "Accepted", value: data.referralFunnel.accepted },
              { label: "Rewarded", value: data.referralFunnel.rewarded },
              { label: "Rejected", value: data.referralFunnel.rejected },
            ].map(({ label, value }) => (
              <StatCard key={label} label={label} value={value} />
            ))}
          </div>

          {/* Stage-to-stage conversion rates */}
          {data.referralFunnel.linkViews > 0 && (
            <div className="card p-4 mt-3">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Stage Conversion Rates</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                {(() => {
                  const rf = data.referralFunnel;
                  const stages = [
                    { from: "Views", to: "Copies", rate: rf.linkViews > 0 ? ((rf.linkCopiesOrShares / rf.linkViews) * 100).toFixed(1) : "0" },
                    { from: "Copies", to: "Signups", rate: rf.linkCopiesOrShares > 0 ? ((rf.signups / rf.linkCopiesOrShares) * 100).toFixed(1) : "0" },
                    { from: "Signups", to: "Accepted", rate: rf.signups > 0 ? (((rf.accepted + rf.rewarded) / rf.signups) * 100).toFixed(1) : "0" },
                    { from: "Accepted", to: "Rewarded", rate: (rf.accepted + rf.rewarded) > 0 ? ((rf.rewarded / (rf.accepted + rf.rewarded)) * 100).toFixed(1) : "0" },
                  ];
                  return stages.map(({ from, to, rate }) => (
                    <div key={`${from}-${to}`} className="flex items-center gap-1.5">
                      <span className="text-gray-500 dark:text-slate-400">{from}</span>
                      <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                      <span className="text-gray-500 dark:text-slate-400">{to}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{rate}%</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Top Referrers */}
          {data.referralFunnel.topReferrers.length > 0 && (
            <div className="card overflow-x-auto mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                    <th className="px-4 py-2.5 font-medium">Referrer</th>
                    <th className="px-4 py-2.5 font-medium">Email</th>
                    <th className="px-4 py-2.5 font-medium text-right">Referrals</th>
                    <th className="px-4 py-2.5 font-medium text-right">Reward Days</th>
                  </tr>
                </thead>
                <tbody>
                  {data.referralFunnel.topReferrers.map((r) => (
                    <tr key={r.userId} className="border-b border-gray-50 dark:border-slate-700/50">
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{r.displayName || "—"}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-slate-300 truncate max-w-[200px]">{r.email}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-900 dark:text-white">{r.count}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">{r.rewardDays}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Rejection Reasons */}
          {data.referralFunnel.rejectionReasons.length > 0 && (
            <div className="card p-4 mt-3">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Rejection Reasons</h4>
              <div className="space-y-2">
                {data.referralFunnel.rejectionReasons.map((r) => (
                  <div key={r.reason} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-slate-200">{r.reason.replace(/_/g, " ")}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Notifications per Customer */}
      {data.notificationStats && data.notificationStats.length > 0 && (
        <>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mt-8 mb-4">Notifications per Customer</h3>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                  <th className="px-4 py-2.5 font-medium">User</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Plan</th>
                  <th className="px-4 py-2.5 font-medium text-right">Email</th>
                  <th className="px-4 py-2.5 font-medium text-right">Telegram</th>
                  <th className="px-4 py-2.5 font-medium text-right">Push</th>
                  <th className="px-4 py-2.5 font-medium text-right">Device</th>
                  <th className="px-4 py-2.5 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.notificationStats.map((row) => (
                  <tr key={row.userId} className="border-b border-gray-50 dark:border-slate-700/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{row.username}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-slate-300 truncate max-w-[200px]">{row.email}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        row.plan === "pro" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                          : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300"
                      }`}>
                        {row.plan}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">{row.emailSent || "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">{row.telegramSent || "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">{row.pushSent || "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">{row.deviceSent || "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-900 dark:text-white">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data.eventsByType.length === 0 && data.topStocks.length === 0 && activityData.length === 0 &&
       (!data.landing || data.landing.totalPageViews === 0) && (
        <p className="text-gray-500 dark:text-slate-400 text-sm text-center py-8">
          No analytics data yet. Events will appear as users interact with the app.
        </p>
      )}
    </div>
  );
}
