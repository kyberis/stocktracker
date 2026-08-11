"use client";

import React, { useState, useEffect, useCallback } from "react";
import { StatCard } from "../shared";

interface ChannelSpendCap {
  id: string;
  channel: string;
  capAmountEur: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

interface ChannelSpendEntry {
  id: string;
  channel: string;
  amountEur: number;
  spentOn: string;
  note: string;
  createdAt: string;
}

interface ChannelSpendSummary {
  channel: string;
  totalSpentEur: number;
  activeCap: ChannelSpendCap | null;
  utilizationPct: number | null;
}

interface ChannelPerformance {
  channel: string;
  spendEur: number;
  signups: number;
  paywallShown: number;
  paidConversions: number;
  cacEur: number | null;
  spendPerSignupEur: number | null;
  retention7dPct: number | null;
  retention14dPct: number | null;
}

interface AcquisitionDecisionMemo {
  id: string;
  periodStart: string;
  periodEnd: string;
  decision: "scale" | "iterate" | "stop";
  notes: string;
  nextCycleKpiTargets: string;
  budgetReallocation: string;
  createdBy: string;
  createdAt: string;
}

const APPROVED_SOURCES_FALLBACK = ["google", "meta", "linkedin", "newsletter", "referral"];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function UtilizationBar({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-xs text-gray-400 dark:text-slate-500">No active cap</span>;
  }
  const color = pct >= 100
    ? "bg-red-500"
    : pct >= 80
    ? "bg-amber-500"
    : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${
        pct >= 100 ? "text-red-600 dark:text-red-400" :
        pct >= 80 ? "text-amber-600 dark:text-amber-400" :
        "text-emerald-600 dark:text-emerald-400"
      }`}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export default function AcquisitionTab() {
  const [days, setDays] = useState(45);
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState<ChannelPerformance[]>([]);
  const [commerceEnabled, setCommerceEnabled] = useState(false);
  const [summary, setSummary] = useState<ChannelSpendSummary[]>([]);
  const [entries, setEntries] = useState<ChannelSpendEntry[]>([]);
  const [memos, setMemos] = useState<AcquisitionDecisionMemo[]>([]);
  const [approvedSources, setApprovedSources] = useState<string[]>(APPROVED_SOURCES_FALLBACK);

  const [entryForm, setEntryForm] = useState({ channel: "", amountEur: "", spentOn: todayIso(), note: "" });
  const [capForm, setCapForm] = useState({ channel: "", capAmountEur: "", periodStart: daysAgoIso(0), periodEnd: daysAgoIso(-45) });
  const [memoForm, setMemoForm] = useState({
    periodStart: daysAgoIso(45),
    periodEnd: todayIso(),
    decision: "iterate" as "scale" | "iterate" | "stop",
    notes: "",
    nextCycleKpiTargets: "",
    budgetReallocation: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [perfRes, entriesRes, memosRes, taxonomyRes] = await Promise.all([
        fetch(`/api/admin/channel-spend/performance?days=${days}`, { cache: "no-store" }),
        fetch(`/api/admin/channel-spend/entries`, { cache: "no-store" }),
        fetch(`/api/admin/acquisition-memos`, { cache: "no-store" }),
        fetch(`/api/admin/utm-taxonomy`, { cache: "no-store" }),
      ]);
      const perfData = await perfRes.json();
      const entriesData = await entriesRes.json();
      const memosData = await memosRes.json();
      const taxonomyData = await taxonomyRes.json();

      setPerformance(perfData.performance ?? []);
      setCommerceEnabled(!!perfData.commerceEnabled);
      setEntries(entriesData.entries ?? []);
      setSummary(entriesData.summary ?? []);
      setMemos(memosData.memos ?? []);
      if (taxonomyData?.config?.sources?.length) {
        setApprovedSources(taxonomyData.config.sources);
      }
    } catch {
      // leave prior state on transient fetch failure
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const submitEntry = async () => {
    const amountEur = Number(entryForm.amountEur);
    if (!entryForm.channel || !Number.isFinite(amountEur) || amountEur <= 0 || !entryForm.spentOn) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/channel-spend/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...entryForm, amountEur }),
      });
      setEntryForm({ channel: entryForm.channel, amountEur: "", spentOn: todayIso(), note: "" });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const submitCap = async () => {
    const capAmountEur = Number(capForm.capAmountEur);
    if (!capForm.channel || !Number.isFinite(capAmountEur) || capAmountEur <= 0) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/channel-spend/caps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...capForm, capAmountEur }),
      });
      setCapForm({ channel: capForm.channel, capAmountEur: "", periodStart: daysAgoIso(0), periodEnd: daysAgoIso(-45) });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const submitMemo = async () => {
    if (!memoForm.periodStart || !memoForm.periodEnd) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/acquisition-memos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memoForm),
      });
      setMemoForm({ ...memoForm, notes: "", nextCycleKpiTargets: "", budgetReallocation: "" });
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading && performance.length === 0) {
    return <p className="text-gray-500 dark:text-slate-400">Loading acquisition data...</p>;
  }

  const totalSpend = summary.reduce((sum, s) => sum + s.totalSpentEur, 0);
  const totalSignups = performance.reduce((sum, p) => sum + p.signups, 0);
  const totalPaid = performance.reduce((sum, p) => sum + p.paidConversions, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[30, 45, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
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
        {!commerceEnabled && (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
            commerce_enabled is off — CAC reads as spend/signup proxy until billing goes live
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Spend" value={`€${totalSpend.toFixed(2)}`} />
        <StatCard label="Signups (window)" value={totalSignups} />
        <StatCard label="Paid Conversions" value={totalPaid} />
        <StatCard label="Channels Tracked" value={performance.length} />
      </div>

      {/* Per-channel performance */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Channel Performance</h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
          Signup → paywall_shown → paid, by first-touch utm_source. CAC and retention are the
          founder&apos;s numbers to judge — no pass/fail thresholds are baked in here.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium text-right">Spend</th>
                <th className="px-3 py-2 font-medium text-right">Signups</th>
                <th className="px-3 py-2 font-medium text-right">Paywall Shown</th>
                <th className="px-3 py-2 font-medium text-right">Paid</th>
                <th className="px-3 py-2 font-medium text-right">CAC</th>
                <th className="px-3 py-2 font-medium text-right">Spend/Signup</th>
                <th className="px-3 py-2 font-medium text-right">7d Retention</th>
                <th className="px-3 py-2 font-medium text-right">14d Retention</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((row) => (
                <tr key={row.channel} className="border-b border-gray-50 dark:border-slate-700/50">
                  <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">{row.channel}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">€{row.spendEur.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">{row.signups}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">{row.paywallShown}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">{row.paidConversions}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                    {row.cacEur !== null ? `€${row.cacEur.toFixed(2)}` : "— (awaiting commerce_enabled)"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">
                    {row.spendPerSignupEur !== null ? `€${row.spendPerSignupEur.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">
                    {row.retention7dPct !== null ? `${row.retention7dPct.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">
                    {row.retention14dPct !== null ? `${row.retention14dPct.toFixed(1)}%` : "—"}
                  </td>
                </tr>
              ))}
              {performance.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-gray-400 dark:text-slate-500">
                    No signups with UTM attribution in this window yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spend caps */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Spend Caps</h3>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium text-right">Cap</th>
                <th className="px-3 py-2 font-medium text-right">Spent</th>
                <th className="px-3 py-2 font-medium text-right">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.channel} className="border-b border-gray-50 dark:border-slate-700/50">
                  <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">{row.channel}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">
                    {row.activeCap ? `€${row.activeCap.capAmountEur.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">€{row.totalSpentEur.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right"><UtilizationBar pct={row.utilizationPct} /></td>
                </tr>
              ))}
              {summary.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400 dark:text-slate-500">
                    No spend recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-2 items-end border-t border-gray-100 dark:border-slate-700 pt-4">
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">Channel</label>
            <select
              value={capForm.channel}
              onChange={(e) => setCapForm({ ...capForm, channel: e.target.value })}
              className="text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="">Select…</option>
              {approvedSources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">Cap (€)</label>
            <input
              type="number" min="0" step="0.01"
              value={capForm.capAmountEur}
              onChange={(e) => setCapForm({ ...capForm, capAmountEur: e.target.value })}
              className="text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-24"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">Period start</label>
            <input
              type="date"
              value={capForm.periodStart}
              onChange={(e) => setCapForm({ ...capForm, periodStart: e.target.value })}
              className="text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">Period end</label>
            <input
              type="date"
              value={capForm.periodEnd}
              onChange={(e) => setCapForm({ ...capForm, periodEnd: e.target.value })}
              className="text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <button
            onClick={submitCap}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Set cap
          </button>
        </div>
      </div>

      {/* Spend entries */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Spend Entries</h3>
        <div className="flex flex-wrap gap-2 items-end mb-4">
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">Channel</label>
            <select
              value={entryForm.channel}
              onChange={(e) => setEntryForm({ ...entryForm, channel: e.target.value })}
              className="text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="">Select…</option>
              {approvedSources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">Amount (€)</label>
            <input
              type="number" min="0" step="0.01"
              value={entryForm.amountEur}
              onChange={(e) => setEntryForm({ ...entryForm, amountEur: e.target.value })}
              className="text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-24"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">Spent on</label>
            <input
              type="date"
              value={entryForm.spentOn}
              onChange={(e) => setEntryForm({ ...entryForm, spentOn: e.target.value })}
              className="text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">Note</label>
            <input
              type="text"
              value={entryForm.note}
              onChange={(e) => setEntryForm({ ...entryForm, note: e.target.value })}
              className="text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-full"
            />
          </div>
          <button
            onClick={submitEntry}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Add spend
          </button>
        </div>
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium text-right">Amount</th>
                <th className="px-3 py-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 dark:border-slate-700/50">
                  <td className="px-3 py-2.5 text-gray-700 dark:text-slate-300">{e.spentOn}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">{e.channel}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-slate-300">€{e.amountEur.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-gray-500 dark:text-slate-400">{e.note}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400 dark:text-slate-500">
                    No spend entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gate 4 decision memo */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Gate 4 Decision</h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
          Record the 45-day scale/iterate/stop decision against the performance table above.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">Period start</label>
            <input
              type="date"
              value={memoForm.periodStart}
              onChange={(e) => setMemoForm({ ...memoForm, periodStart: e.target.value })}
              className="text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-full"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">Period end</label>
            <input
              type="date"
              value={memoForm.periodEnd}
              onChange={(e) => setMemoForm({ ...memoForm, periodEnd: e.target.value })}
              className="text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-full"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">Decision</label>
            <select
              value={memoForm.decision}
              onChange={(e) => setMemoForm({ ...memoForm, decision: e.target.value as "scale" | "iterate" | "stop" })}
              className="text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-full"
            >
              <option value="scale">Scale</option>
              <option value="iterate">Iterate</option>
              <option value="stop">Stop</option>
            </select>
          </div>
          <div />
          <div className="md:col-span-2">
            <label className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">Notes</label>
            <textarea
              value={memoForm.notes}
              onChange={(e) => setMemoForm({ ...memoForm, notes: e.target.value })}
              className="text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-full"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">Next-cycle KPI targets</label>
            <textarea
              value={memoForm.nextCycleKpiTargets}
              onChange={(e) => setMemoForm({ ...memoForm, nextCycleKpiTargets: e.target.value })}
              className="text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-full"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-slate-400 mb-1">Budget reallocation</label>
            <textarea
              value={memoForm.budgetReallocation}
              onChange={(e) => setMemoForm({ ...memoForm, budgetReallocation: e.target.value })}
              className="text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-full"
              rows={2}
            />
          </div>
        </div>
        <button
          onClick={submitMemo}
          disabled={saving}
          className="text-xs px-3 py-1.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Save decision
        </button>

        {memos.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                  <th className="px-3 py-2 font-medium">Period</th>
                  <th className="px-3 py-2 font-medium">Decision</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                  <th className="px-3 py-2 font-medium">Recorded</th>
                </tr>
              </thead>
              <tbody>
                {memos.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 dark:border-slate-700/50 align-top">
                    <td className="px-3 py-2.5 text-gray-700 dark:text-slate-300 whitespace-nowrap">{m.periodStart} → {m.periodEnd}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        m.decision === "scale" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" :
                        m.decision === "stop" ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" :
                        "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                      }`}>
                        {m.decision}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 dark:text-slate-400 max-w-xs">{m.notes}</td>
                    <td className="px-3 py-2.5 text-gray-500 dark:text-slate-400 whitespace-nowrap">{m.createdAt.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
