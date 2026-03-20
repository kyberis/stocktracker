"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const CHECK = (
  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const VARIES = (
  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008" />
  </svg>
);

interface Row {
  labelKey: string;
  api: "check" | "varies" | string;
  csv: "check" | "varies" | string;
}

const ROWS: Row[] = [
  { labelKey: "importCompareFieldDates", api: "check", csv: "check" },
  { labelKey: "importCompareFieldFees", api: "check", csv: "check" },
  { labelKey: "importCompareFieldTaxes", api: "check", csv: "check" },
  { labelKey: "importCompareFieldFx", api: "check", csv: "varies" },
  { labelKey: "importCompareFieldDividends", api: "check", csv: "check" },
  { labelKey: "importCompareFieldIsin", api: "check", csv: "varies" },
  { labelKey: "importCompareFieldAutoSync", api: "importCompareApiAutoSync", csv: "importCompareCsvAutoSync" },
  { labelKey: "importCompareFieldBrokers", api: "importCompareApiBrokerCount", csv: "importCompareCsvBrokerCount" },
];

function CellValue({ value, t }: { value: string; t: (k: string) => string }) {
  if (value === "check") return <span className="flex justify-center">{CHECK}</span>;
  if (value === "varies") {
    return (
      <span className="flex items-center justify-center gap-1 text-amber-500 dark:text-amber-400 text-xs">
        {VARIES}
        <span>{t("importCompareVaries")}</span>
      </span>
    );
  }
  return <span className="text-xs text-gray-600 dark:text-slate-300">{t(value) || value}</span>;
}

export default function ImportCompareContent() {
  const { t } = useI18n();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/import"
          className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mb-4"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to import
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("importCompareTitle")}</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t("importCompareSubtitle")}</p>
      </div>

      {/* Two-card overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* API card */}
        <div className="card border-2 border-emerald-500/30 relative overflow-hidden">
          <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
            {t("importCompareRecommended")}
          </span>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.813a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.07" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("importCompareApiTitle")}</h2>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed mb-4">{t("importCompareApiDesc")}</p>
          <Link
            href="/import?method=snaptrade_api"
            className="btn-primary text-xs w-full text-center min-h-[40px] inline-flex items-center justify-center"
          >
            {t("importCompareGetStarted")}
          </Link>
        </div>

        {/* CSV card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-3 mt-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-700/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m0 0l2.25 2.25M9.75 15l2.25-2.25M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("importCompareCsvTitle")}</h2>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed mb-4">{t("importCompareCsvDesc")}</p>
          <Link
            href="/import?method=broker_csv"
            className="btn-secondary text-xs w-full text-center min-h-[40px] inline-flex items-center justify-center"
          >
            {t("importCompareGetStarted")}
          </Link>
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <caption className="sr-only">Feature comparison between Broker Sync and CSV Import</caption>
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                {/* empty */}
              </th>
              <th className="text-center py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[10px]">
                {t("importCompareApiTitle")}
              </th>
              <th className="text-center py-3 px-4 font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                {t("importCompareCsvTitle")}
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.labelKey} className="border-b border-gray-50 dark:border-slate-700/50 last:border-b-0">
                <td className="py-2.5 px-4 text-gray-700 dark:text-slate-300 font-medium">{t(row.labelKey)}</td>
                <td className="py-2.5 px-4 text-center">
                  <CellValue value={row.api} t={t} />
                </td>
                <td className="py-2.5 px-4 text-center">
                  <CellValue value={row.csv} t={t} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link
          href="/import?method=snaptrade_api"
          className="btn-primary text-sm flex-1 text-center min-h-[44px] inline-flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.813a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.07" />
          </svg>
          {t("nudgeCtaConnectBroker")}
        </Link>
        <Link
          href="/import?method=broker_csv"
          className="btn-secondary text-sm flex-1 text-center min-h-[44px] inline-flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m0 0l2.25 2.25M9.75 15l2.25-2.25M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          {t("nudgeCtaImportCsv")}
        </Link>
      </div>
    </div>
  );
}
