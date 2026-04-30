"use client";

import { useState } from "react";
import type { WarrenProposal } from "@/lib/ai/warren/types";

interface Props {
  proposal: WarrenProposal;
  onConfirmed?: (entityId?: string, message?: string) => void;
}

const KIND_LABEL: Record<WarrenProposal["kind"], string> = {
  addHolding: "Add holding",
  removeHolding: "Remove holding",
  addCash: "Add cash",
  createAlert: "Create alert",
  addWatchlist: "Add to watchlist",
};

export default function ActionCard({ proposal, onConfirmed }: Props) {
  const [status, setStatus] = useState<"pending" | "submitting" | "confirmed" | "cancelled" | "error">(
    "pending",
  );
  const [message, setMessage] = useState<string>("");
  const destructive = proposal.destructive;

  const confirm = async () => {
    setStatus("submitting");
    try {
      const res = await fetch("/api/warren/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal.id,
          kind: proposal.kind,
          data: proposal.data,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setStatus("error");
        setMessage(json.error || `Server returned ${res.status}`);
        return;
      }
      setStatus("confirmed");
      setMessage(json.message || "Done.");
      onConfirmed?.(json.entityId, json.message);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Network error");
    }
  };

  if (status === "confirmed") {
    return (
      <div className="ml-9 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5 9-11" />
        </svg>
        {message || "Done."}
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="ml-9 text-xs italic text-gray-500 dark:text-slate-400">Cancelled.</div>
    );
  }

  return (
    <div
      className={`ml-9 rounded-2xl border p-3.5 max-w-[420px] ${
        destructive
          ? "border-red-400/45 bg-gradient-to-br from-red-500/[0.06] to-transparent"
          : "border-amber-400/40 bg-gradient-to-br from-amber-500/[0.07] to-transparent"
      }`}
    >
      <div
        className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] mb-2 ${
          destructive ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
        }`}
      >
        {destructive ? (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6v14a2 2 0 002 2h4a2 2 0 002-2V6" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
        )}
        {destructive ? "Destructive action" : "Proposal"} · {KIND_LABEL[proposal.kind]}
      </div>
      <div className="font-bold text-[15px] mb-2 leading-snug text-gray-900 dark:text-amber-50">
        {proposal.title}
      </div>
      {proposal.summary && (
        <div className="text-xs text-gray-600 dark:text-slate-400 mb-2">{proposal.summary}</div>
      )}
      <div className="space-y-1 mb-3">
        {proposal.rows.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-[110px_1fr] text-xs py-1 border-b border-amber-500/10 last:border-0"
          >
            <span className="text-gray-500 dark:text-slate-400">{row.label}</span>
            <span className="font-medium tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={status === "submitting"}
          onClick={() => setStatus("cancelled")}
          className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.12] text-gray-700 dark:text-slate-200 hover:border-amber-500/60 hover:text-amber-700 dark:hover:text-amber-300 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={status === "submitting"}
          onClick={confirm}
          className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg text-white transition-colors disabled:opacity-50 ${
            destructive
              ? "bg-red-500 hover:bg-red-600 border border-red-500"
              : "bg-amber-500 hover:bg-amber-600 border border-amber-500 text-amber-950"
          }`}
        >
          {status === "submitting"
            ? "Working…"
            : destructive
              ? "Yes, do it"
              : "Confirm"}
        </button>
      </div>
      {status === "error" && message && (
        <div className="mt-2 text-[11px] text-red-600 dark:text-red-400">{message}</div>
      )}
    </div>
  );
}
