import { formatChatCardNumber, type MoatSummaryCardData } from "./types";

function verdictTone(verdict: string): string {
  const v = verdict.toLowerCase();
  if (v.includes("wide") || v.includes("strong")) return "text-emerald-600 dark:text-emerald-400";
  if (v.includes("narrow") || v.includes("weak")) return "text-amber-600 dark:text-amber-400";
  return "text-gray-600 dark:text-slate-300";
}

export default function MoatSummaryCard({ data }: { data: MoatSummaryCardData }) {
  return (
    <div className="rounded-lg border border-indigo-500/30 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 p-3 min-w-[220px] max-w-[300px]">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div className="font-semibold text-sm text-indigo-700 dark:text-indigo-200">{data.ticker}</div>
        <div className="text-xs font-bold tabular-nums">{data.scorePct.toFixed(0)}%</div>
      </div>
      {data.companyName ? (
        <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate mb-2">{data.companyName}</div>
      ) : null}
      <div className={`text-xs font-medium mb-2 ${verdictTone(data.verdict)}`}>{data.verdict}</div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <div className="text-gray-500 dark:text-slate-500 uppercase tracking-wider">Criteria</div>
          <div className="font-medium tabular-nums">
            {data.passedCount}/{data.criteriaCount} pass
          </div>
        </div>
        {data.peRatio != null ? (
          <div>
            <div className="text-gray-500 dark:text-slate-500 uppercase tracking-wider">P/E</div>
            <div className="font-medium tabular-nums">{data.peRatio.toFixed(1)}</div>
          </div>
        ) : null}
      </div>
      {data.sector ? (
        <div className="mt-2 text-[10px] text-gray-400 dark:text-slate-500 truncate">{data.sector}</div>
      ) : null}
      <div className="mt-2 text-[10px] text-indigo-600/70 dark:text-indigo-300/60 uppercase tracking-wider">
        Moat summary
      </div>
    </div>
  );
}
