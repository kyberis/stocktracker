"use client";

import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n";

export default function ChartGuideModal({
  mode,
  onClose,
}: {
  mode: "value" | "performance";
  onClose: () => void;
}) {
  const { t } = useI18n();
  const sections = [
    {
      icon: "📊",
      title: mode === "value" ? "Value mode" : "Performance mode",
      text:
        mode === "value"
          ? "Shows your total portfolio value over time. A rising line doesn\u2019t necessarily mean positive returns \u2014 it may reflect deposits."
          : "Shows your investment returns as a percentage, with deposits and withdrawals factored out so you see true performance.",
    },
    {
      icon: "📅",
      title: "Time ranges",
      text: "1D shows intraday snapshots (every 5 min). 1W\u20131Y show daily closing values. Longer ranges are available on the Pro plan.",
    },
    {
      icon: "🟦",
      title: "Colored bands",
      text: "Each colored band marks when a stock exchange is open for trading. The legend below the chart shows which color belongs to which exchange.",
    },
    {
      icon: "▨",
      title: "Hatched zones",
      text: "Diagonal-line zones indicate periods when all your markets are closed \u2014 before open, between sessions, or after close.",
    },
    {
      icon: "⚡",
      title: "Spike indicators",
      text: "Green or red pulsing rings highlight points where your portfolio moved \u22650.3% between consecutive snapshots. Hover to see which asset types and individual holdings likely drove the move.",
    },
    {
      icon: "🔵",
      title: "Transaction markers",
      text: "Small green (buy) and red (sell) dots on the line mark where you executed trades. Hover for transaction details.",
    },
    {
      icon: "📈",
      title: "Benchmark comparison",
      text: "In Performance mode, use the Compare button to overlay index benchmarks (S&P 500, NASDAQ, etc.) as dashed lines and see how your returns stack up.",
    },
    {
      icon: "💡",
      title: "Hover for details",
      text: "Hover anywhere on the chart to see a detailed tooltip with your portfolio value, daily change, market session status, and any spike or transaction information for that point.",
    },
  ];

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md max-h-[80vh] rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t("chartGuide")}</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t("chartGuideSubtitle")}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
            aria-label={t("closeGuide")}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {sections.map((s) => (
            <div key={s.title} className="flex gap-3">
              <span className="text-base mt-0.5 shrink-0 w-6 text-center">{s.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{s.title}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
