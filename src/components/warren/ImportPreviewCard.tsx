"use client";

import { useMemo, useState } from "react";
import type { WarrenProposal } from "@/lib/ai/warren/types";
import { useI18n } from "@/lib/i18n";

interface Props {
  proposal: Extract<WarrenProposal, { kind: "importTransactions" }>;
  onConfirmed?: (entityId?: string, message?: string) => void;
}

export default function ImportPreviewCard({ proposal, onConfirmed }: Props) {
  const { t } = useI18n();
  const [rows, setRows] = useState(proposal.data.transactions);
  const [status, setStatus] = useState<"pending" | "submitting" | "confirmed" | "cancelled" | "error">(
    "pending",
  );
  const [message, setMessage] = useState("");

  const summary = useMemo(() => {
    return {
      total: rows.length,
      buys: rows.filter((r) => r.type === "buy").length,
      sells: rows.filter((r) => r.type === "sell").length,
      dividends: rows.filter((r) => r.type === "dividend").length,
    };
  }, [rows]);

  const confirm = async () => {
    if (rows.length === 0) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/warren/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal.id,
          kind: proposal.kind,
          data: { ...proposal.data, transactions: rows, summary: { ...proposal.data.summary, ...summary } },
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setStatus("error");
        setMessage(json.error || `Server returned ${res.status}`);
        return;
      }
      setStatus("confirmed");
      setMessage(json.message || t("warrenImportDone"));
      onConfirmed?.(json.entityId, json.message);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : t("warrenImportNetworkError"));
    }
  };

  if (status === "confirmed") {
    return (
      <div className="ml-9 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300">
        {message || t("warrenImportDone")}
      </div>
    );
  }

  if (status === "cancelled") {
    return <div className="ml-9 text-xs italic text-gray-500 dark:text-slate-400">{t("warrenImportCancelled")}</div>;
  }

  return (
    <div
      className="ml-9 max-w-[440px] rounded-2xl border border-amber-400/40 bg-white p-3.5 text-gray-900 dark:bg-slate-800/50 dark:text-slate-100"
      data-testid="warren-import-preview"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-400">
        {t("warrenImportPreviewEyebrow")}
      </p>
      <p className="mb-1 text-[15px] font-bold leading-snug">{proposal.title}</p>
      {proposal.summary && (
        <p className="mb-2 text-xs text-gray-600 dark:text-slate-400">{proposal.summary}</p>
      )}
      <div className="mb-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <span className="text-gray-500 dark:text-slate-400">{t("warrenImportTxCount")}</span>
        <span className="font-medium tabular-nums">{summary.total}</span>
        <span className="text-gray-500 dark:text-slate-400">{t("warrenImportBuys")}</span>
        <span className="font-medium tabular-nums">{summary.buys}</span>
        <span className="text-gray-500 dark:text-slate-400">{t("warrenImportSells")}</span>
        <span className="font-medium tabular-nums">{summary.sells}</span>
      </div>
      <ul className="mb-3 max-h-40 overflow-y-auto rounded-lg border border-amber-500/15 text-[11px]">
        {rows.slice(0, 40).map((row, idx) => (
          <li
            key={`${row.ticker}-${row.date}-${idx}`}
            className="flex items-center justify-between gap-2 border-b border-amber-500/10 px-2 py-1 last:border-0"
          >
            <span className="min-w-0 truncate">
              <span className="font-medium">{row.ticker}</span>{" "}
              <span className="text-gray-500 dark:text-slate-400">
                {row.type} · {row.date}
              </span>
            </span>
            <button
              type="button"
              className="shrink-0 text-gray-400 hover:text-red-500"
              aria-label={t("warrenImportRemoveRow")}
              onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
            >
              ×
            </button>
          </li>
        ))}
        {rows.length > 40 && (
          <li className="px-2 py-1 text-gray-500 dark:text-slate-400">
            +{rows.length - 40} {t("warrenImportMoreRows")}
          </li>
        )}
      </ul>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={status === "submitting"}
          onClick={() => setStatus("cancelled")}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-amber-500/60 dark:border-white/[0.12] dark:text-slate-200"
        >
          {t("warrenImportCancel")}
        </button>
        <button
          type="button"
          disabled={status === "submitting" || rows.length === 0}
          onClick={() => void confirm()}
          className="flex-1 rounded-lg border border-amber-500 bg-amber-500 px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-600 disabled:opacity-50"
        >
          {status === "submitting" ? t("warrenImportWorking") : t("warrenImportConfirm")}
        </button>
      </div>
      {status === "error" && message && (
        <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">{message}</p>
      )}
    </div>
  );
}
