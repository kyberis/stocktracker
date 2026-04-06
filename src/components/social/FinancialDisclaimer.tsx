"use client";

import { AlertTriangle } from "lucide-react";

export function FinancialDisclaimer({ tickers }: { tickers?: string[] }) {
  const tickerText = tickers?.length ? ` I hold a position in ${tickers.join(", ")}.` : "";
  return (
    <div className="my-5 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-4 text-sm text-[var(--accent)]">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <p>
          <strong>Disclaimer:</strong> This is not financial advice.{tickerText} Always do your own research before making investment decisions.
        </p>
      </div>
    </div>
  );
}
