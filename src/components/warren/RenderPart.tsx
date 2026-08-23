"use client";

import {
  HoldingCard,
  AllocationCard,
  SummaryCard,
  StockPickCard,
  TradeGuidanceCard,
} from "@/components/chat-cards";
import MoatSummaryCard from "@/components/chat-cards/MoatSummaryCard";
import { formatChatCardNumber } from "@/components/chat-cards/types";
import type { WarrenPart } from "@/lib/ai/warren/types";

export default function RenderPart({ part }: { part: WarrenPart }) {
  switch (part.kind) {
    case "holding":
      return <HoldingCard data={part.data} />;
    case "allocation":
      return <AllocationCard data={part.data} />;
    case "summary":
      return <SummaryCard data={part.data} />;
    case "stockPick":
      return <StockPickCard data={part.data} />;
    case "moatSummary":
      return <MoatSummaryCard data={part.data} />;
    case "tradeGuidance":
      return <TradeGuidanceCard data={part.data} />;
    case "stockSnapshot":
      return <StockSnapshot data={part.data} />;
    default:
      return null;
  }
}

function StockSnapshot({
  data,
}: {
  data: import("@/lib/ai/warren/types").StockSnapshotData;
}) {
  const positive = (data.changePct ?? 0) >= 0;
  return (
    <div className="rounded-lg border border-amber-500/30 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 p-3 min-w-[220px] max-w-[280px]">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div className="font-semibold text-sm text-amber-700 dark:text-amber-200">{data.ticker}</div>
        {data.changePct != null && (
          <div
            className={`text-xs font-medium ${
              positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {positive ? "+" : ""}
            {data.changePct.toFixed(2)}%
          </div>
        )}
      </div>
      {data.name && (
        <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate mb-1">{data.name}</div>
      )}
      {data.price != null && (
        <div className="text-base font-bold tabular-nums">
          {formatChatCardNumber(data.price, data.currency)}
        </div>
      )}
      {data.fiftyTwoWeekHigh != null && data.fiftyTwoWeekLow != null && (
        <div className="mt-2">
          <div className="text-[10px] text-gray-500 dark:text-slate-500 uppercase tracking-wider mb-1">
            52w range
          </div>
          <div className="relative h-1 rounded-full bg-gray-200 dark:bg-white/[0.08] overflow-hidden">
            {data.price != null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 rounded-full bg-amber-500"
                style={{
                  left: `${Math.max(
                    0,
                    Math.min(
                      100,
                      ((data.price - data.fiftyTwoWeekLow) /
                        Math.max(0.0001, data.fiftyTwoWeekHigh - data.fiftyTwoWeekLow)) *
                        100,
                    ),
                  )}%`,
                }}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>{formatChatCardNumber(data.fiftyTwoWeekLow, data.currency)}</span>
            <span>{formatChatCardNumber(data.fiftyTwoWeekHigh, data.currency)}</span>
          </div>
        </div>
      )}
      <div className="mt-2 text-[10px] text-amber-600/70 dark:text-amber-300/60 uppercase tracking-wider">
        Snapshot
      </div>
    </div>
  );
}
