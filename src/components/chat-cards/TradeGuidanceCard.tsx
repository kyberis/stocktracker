import { formatChatCardNumber, type TradeGuidanceCardData } from "./types";

const ACTION_LABEL: Record<TradeGuidanceCardData["action"], string> = {
  buy: "Buy",
  sell: "Sell",
  trim: "Trim",
  hold: "Hold",
};

const ACTION_STYLE: Record<TradeGuidanceCardData["action"], string> = {
  buy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  sell: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  trim: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
  hold: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25",
};

const VALUATION_LABEL: Record<NonNullable<TradeGuidanceCardData["valuationLabel"]>, string> = {
  expensive: "Expensive",
  fair: "Fair",
  cheap: "Cheap",
};

export default function TradeGuidanceCard({ data }: { data: TradeGuidanceCardData }) {
  const positive = (data.changePct ?? 0) >= 0;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 p-3 min-w-[240px] max-w-[320px]">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border ${ACTION_STYLE[data.action]}`}
        >
          {ACTION_LABEL[data.action]}
        </span>
        <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider">
          Guidance
        </span>
      </div>

      <div className="font-semibold text-sm text-amber-700 dark:text-amber-200">{data.ticker}</div>
      {data.name && (
        <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate mb-1">{data.name}</div>
      )}

      {data.currentPrice != null && (
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-base font-bold tabular-nums">
            {formatChatCardNumber(data.currentPrice, data.currency)}
          </span>
          {data.changePct != null && (
            <span
              className={`text-xs font-medium tabular-nums ${
                positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {positive ? "+" : ""}
              {data.changePct.toFixed(2)}%
            </span>
          )}
        </div>
      )}

      <div className="mt-2 space-y-1 text-xs">
        {data.valuationLabel && (
          <div className="flex justify-between gap-2">
            <span className="text-gray-500 dark:text-slate-400">Valuation</span>
            <span className="font-medium">{VALUATION_LABEL[data.valuationLabel]}</span>
          </div>
        )}
        {data.upsideToTargetPct != null && (
          <div className="flex justify-between gap-2">
            <span className="text-gray-500 dark:text-slate-400">Upside to target</span>
            <span className="font-medium tabular-nums">
              {data.upsideToTargetPct >= 0 ? "+" : ""}
              {data.upsideToTargetPct.toFixed(1)}%
            </span>
          </div>
        )}
        {data.suggestedShares != null && (
          <div className="flex justify-between gap-2">
            <span className="text-gray-500 dark:text-slate-400">Suggested size</span>
            <span className="font-medium tabular-nums">{data.suggestedShares} shares</span>
          </div>
        )}
        {data.suggestedAmount != null && (
          <div className="flex justify-between gap-2">
            <span className="text-gray-500 dark:text-slate-400">Est. value</span>
            <span className="font-medium tabular-nums">
              {formatChatCardNumber(data.suggestedAmount, data.currency)}
            </span>
          </div>
        )}
      </div>

      {data.rationale && (
        <div className="mt-2 text-xs text-gray-600 dark:text-slate-300 leading-snug">{data.rationale}</div>
      )}

      <div className="mt-2 text-[10px] text-gray-400 dark:text-slate-500 italic">
        Analysis only — trefolio does not execute trades.
      </div>
    </div>
  );
}
