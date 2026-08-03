"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { usePortfolio } from "@/lib/portfolio-context";
import TierFeatureBadge from "./TierFeatureBadge";
import DataUpgradeNudge from "./DataUpgradeNudge";
import ProCompareCard from "./ProCompareCard";
import AiMarkdown from "./AiMarkdown";
import type {
  TaxReport as TaxReportType,
  TaxCountry,
  FormField,
  DataQualityCheck,
  TaxRealizedGain,
  TaxDividend,
  VorabpauschaleEntry,
  Box3Category,
  Modelo720Asset,
  WashSaleWarning,
  QuadroRWEntry,
  TobEntry,
  DeemedDisposalWarning,
  IskCalculation,
  MarkToMarketEntry,
} from "@/lib/tax/types";
import { TAX_COUNTRIES, TAX_COUNTRY_LABELS } from "@/lib/tax/types";

const COUNTRY_FLAGS: Record<TaxCountry, string> = {
  DE: "🇩🇪", FR: "🇫🇷", ES: "🇪🇸", NL: "🇳🇱", IT: "🇮🇹",
  GB: "🇬🇧", US: "🇺🇸", CH: "🇨🇭", AT: "🇦🇹", PT: "🇵🇹",
  BE: "🇧🇪", IE: "🇮🇪", SE: "🇸🇪", DK: "🇩🇰", NO: "🇳🇴", FI: "🇫🇮", PL: "🇵🇱",
};

const COST_BASIS_LABELS: Record<string, string> = {
  fifo: "FIFO",
  lifo: "LIFO",
  average: "Weighted Average",
};

function fmt(n: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export default function TaxReport() {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { portfolios } = usePortfolio();

  const [report, setReport] = useState<TaxReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(currentYear - 1);
  const [country, setCountry] = useState<TaxCountry>("DE");
  const [countryResolved, setCountryResolved] = useState(false);
  const [filingStatus, setFilingStatus] = useState<"single" | "joint">("single");
  const [italyRegime, setItalyRegime] = useState<"dichiarativo" | "amministrato">("dichiarativo");
  const [swedenAccountType, setSwedenAccountType] = useState<"isk" | "kf" | "regular">("regular");
  const [portugalNhr, setPortugalNhr] = useState(false);
  const [swissCanton, setSwissCanton] = useState("ZH");
  const [portfolioId, setPortfolioId] = useState<string>("all");

  // Resolve country from user's tax residency once profile loads, then mark resolved.
  // If user has no taxResidency, mark resolved after user loads (keeps DE default).
  useEffect(() => {
    if (countryResolved || !user) return;
    if (user.taxResidency) {
      const upper = user.taxResidency.toUpperCase() as TaxCountry;
      if (TAX_COUNTRIES.includes(upper)) {
        setCountry(upper);
      }
    }
    setCountryResolved(true);
  }, [user, countryResolved]);

  const [aiSummary, setAiSummary] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiAbortRef = useRef<AbortController | null>(null);

  const [showCsvMenu, setShowCsvMenu] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAiSummary("");
    try {
      const params = new URLSearchParams({
        year: String(taxYear),
        country,
        filingStatus,
        italyRegime,
        swedenAccountType,
        portugalNhr: String(portugalNhr),
        swissCanton,
      });
      if (portfolioId !== "all") {
        params.set("portfolioId", portfolioId);
      }
      const res = await fetch(`/api/tax/report?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data: TaxReportType = await res.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [taxYear, country, filingStatus, italyRegime, swedenAccountType, portugalNhr, swissCanton, portfolioId]);

  // Auto-fetch once country is resolved from profile (avoids the DE-default race)
  useEffect(() => {
    if ((user?.plan === "pro" || user?.role === "admin") && countryResolved) {
      fetchReport();
    }
  }, [fetchReport, user?.plan, user?.role, countryResolved]);

  /* ── AI Tax Assistant (Phase 4) ────────────────────────── */

  const requestAiSummary = useCallback(async () => {
    if (!report) return;
    aiAbortRef.current?.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;
    setAiLoading(true);
    setAiSummary("");

    try {
      const res = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisType: "tax_assistant",
          taxReport: report,
          language,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setAiSummary("Unable to generate AI analysis for this report.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAiSummary(text);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setAiSummary("AI analysis unavailable.");
      }
    } finally {
      setAiLoading(false);
    }
  }, [report, language]);

  /* ── CSV Export ─────────────────────────────────────────── */

  const exportCsv = useCallback((type: "gains" | "dividends" | "summary") => {
    if (!report) return;
    let csv = "";
    const esc = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;

    if (type === "gains") {
      csv = "Ticker,Name,Sell Date,Shares,Proceeds,Cost Basis,Gain/Loss,Taxable Gain,Adjustment\n";
      for (const g of report.realizedGains) {
        csv += [esc(g.ticker), esc(g.name), esc(g.sellDate), g.sharesSold, g.proceeds.toFixed(2), g.costBasis.toFixed(2), g.gain.toFixed(2), (g.taxableGain ?? g.gain).toFixed(2), esc(g.adjustmentLabel || "")].join(",") + "\n";
      }
    } else if (type === "dividends") {
      csv = "Ticker,Name,Date,Gross,Withholding Tax,Net,Source Country,Domestic\n";
      for (const d of report.dividends) {
        csv += [esc(d.ticker), esc(d.name), esc(d.date), d.grossAmount.toFixed(2), d.withholdingTax.toFixed(2), d.netAmount.toFixed(2), esc(d.sourceCountry || ""), d.isDomestic ? "Yes" : "No"].join(",") + "\n";
      }
    } else {
      csv = "Field,Reference,Value\n";
      for (const f of (report.formFields || [])) {
        csv += [esc(f.label), esc(f.reference), f.value.toFixed(2)].join(",") + "\n";
      }
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-report-${report.country}-${report.taxYear}-${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowCsvMenu(false);
  }, [report]);

  /* ── Paywall ───────────────────────────────────────────── */

  const hasTaxAccess = user?.plan === "pro" || user?.role === "admin";

  if (!hasTaxAccess) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            {t("taxReportsTitle")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t("taxReportsUpgradeDesc")}</p>
        </div>
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50 p-8 text-center">
          <p className="text-sm text-gray-600 dark:text-slate-300 max-w-md mx-auto">
            {t("taxReportsUpgradeDesc")}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-3 max-w-md mx-auto">
            {t("taxReportsDisclaimer")} {t("taxReportsDisclaimerText")}
          </p>
        </div>
        <div className="mt-6">
          <ProCompareCard surface="tax_report_locked" reason="upgrade_required" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
        <div><strong>{t("taxReportsDisclaimer")}</strong> {t("taxReportsDisclaimerText")}</div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("taxReportsTaxYear")}</label>
          <select value={taxYear} onChange={(e) => setTaxYear(Number(e.target.value))} className="text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-1.5">
            {Array.from({ length: 5 }, (_, i) => currentYear - 1 - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {portfolios.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("taxReportsPortfolio")}</label>
            <select value={portfolioId} onChange={(e) => setPortfolioId(e.target.value)} className="text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-1.5">
              <option value="all">{t("taxReportsAllPortfolios")}</option>
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("taxReportsCountry")}</label>
          <select value={country} onChange={(e) => setCountry(e.target.value as TaxCountry)} className="text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-1.5">
            {TAX_COUNTRIES.map((c) => (
              <option key={c} value={c}>{COUNTRY_FLAGS[c]} {TAX_COUNTRY_LABELS[c]}</option>
            ))}
          </select>
        </div>

        {country === "DE" && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("taxReportsFilingStatus")}</label>
            <select value={filingStatus} onChange={(e) => setFilingStatus(e.target.value as "single" | "joint")} className="text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-1.5">
              <option value="single">{t("taxReportsSingle")}</option>
              <option value="joint">{t("taxReportsJoint")}</option>
            </select>
          </div>
        )}

        {country === "IT" && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("taxReportsRegime")}</label>
            <select value={italyRegime} onChange={(e) => setItalyRegime(e.target.value as "dichiarativo" | "amministrato")} className="text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-1.5">
              <option value="dichiarativo">Dichiarativo (LIFO)</option>
              <option value="amministrato">Amministrato (Avg)</option>
            </select>
          </div>
        )}

        {country === "SE" && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("taxReportsAccountType")}</label>
            <select value={swedenAccountType} onChange={(e) => setSwedenAccountType(e.target.value as "isk" | "kf" | "regular")} className="text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-1.5">
              <option value="regular">{t("taxReportsRegularAccount")}</option>
              <option value="isk">ISK (Investeringssparkonto)</option>
              <option value="kf">KF (Kapitalförsäkring)</option>
            </select>
          </div>
        )}

        {country === "PT" && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("taxReportsNhrRegime")}</label>
            <button
              onClick={() => setPortugalNhr(!portugalNhr)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${portugalNhr ? "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400" : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400"}`}
            >
              NHR {portugalNhr ? "✓" : "OFF"}
            </button>
          </div>
        )}

        {country === "CH" && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("taxReportsCanton")}</label>
            <select value={swissCanton} onChange={(e) => setSwissCanton(e.target.value)} className="text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-1.5">
              {["ZH","BE","LU","UR","SZ","OW","NW","GL","ZG","FR","SO","BS","BL","SH","AR","AI","SG","GR","AG","TG","TI","VD","VS","NE","GE","JU"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex-1" />

        {/* CSV dropdown */}
        <div className="relative">
          <button onClick={() => setShowCsvMenu(!showCsvMenu)} className="text-xs text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            CSV
          </button>
          {showCsvMenu && report && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-10 py-1 min-w-[160px]">
              <button onClick={() => exportCsv("gains")} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">{t("taxReportsExportGains")}</button>
              <button onClick={() => exportCsv("dividends")} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">{t("taxReportsExportDividends")}</button>
              <button onClick={() => exportCsv("summary")} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">{t("taxReportsExportSummary")}</button>
            </div>
          )}
        </div>

        <button onClick={fetchReport} disabled={loading} className="text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50">
          {loading ? t("loading") : t("taxReportsGenerate")}
        </button>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Report content */}
      {report && !loading && (
        <>
          {/* AI Assistant */}
          <AiAssistantPanel
            aiSummary={aiSummary}
            aiLoading={aiLoading}
            onRequest={requestAiSummary}
            country={report.country}
          />

          {/* Data Quality */}
          {report.dataQuality && report.dataQuality.length > 0 && (
            <DataQualitySection checks={report.dataQuality} />
          )}

          {report.dataQuality && report.dataQuality.some((c) => c.status !== "ok") && (
            <DataUpgradeNudge
              variant="amber"
              titleKey="nudgeTaxTitle"
              descKey="nudgeTaxDesc"
              titleReplacements={{ count: String(report.dataQuality.filter((c) => c.status !== "ok").length) }}
              dismissKey="nudge_tax_dismissed"
              dismissMode="session"
            />
          )}

          {/* Summary Cards */}
          <SummaryCards report={report} />

          {/* Country-specific content */}
          {report.country === "NL" ? (
            <Box3Section report={report} />
          ) : report.country === "BE" ? (
            /* Belgium: no CGT — show TOB instead of gains table */
            report.beTob && report.beTob.length > 0 ? (
              <TobSection entries={report.beTob} total={report.beTobTotal || 0} />
            ) : null
          ) : report.country === "CH" ? (
            /* Switzerland: no CGT on private assets — skip gains table */
            null
          ) : (
            <GainsTable report={report} />
          )}

          {/* Vorabpauschale (DE only) */}
          {report.country === "DE" && report.vorabpauschale && report.vorabpauschale.length > 0 && (
            <VorabpauschaleSection entries={report.vorabpauschale} total={report.totalVorabpauschale || 0} />
          )}

          {/* Dividends */}
          {report.dividends.length > 0 && (
            <DividendsTable report={report} />
          )}

          {/* Modelo 720 (ES) */}
          {report.country === "ES" && report.modelo720 && report.modelo720.length > 0 && (
            <Modelo720Section assets={report.modelo720} />
          )}

          {/* Wash Sale Warnings (ES) */}
          {report.country === "ES" && report.washSaleWarnings && report.washSaleWarnings.length > 0 && (
            <WashSaleSection warnings={report.washSaleWarnings} />
          )}

          {/* Quadro RW (IT) */}
          {report.country === "IT" && report.quadroRW && report.quadroRW.length > 0 && (
            <QuadroRWSection entries={report.quadroRW} totalIVAFE={report.totalIVAFE || 0} />
          )}

          {/* Wash Sale Warnings (US) */}
          {report.country === "US" && report.washSaleWarnings && report.washSaleWarnings.length > 0 && (
            <WashSaleSection warnings={report.washSaleWarnings} />
          )}

          {/* US Short/Long Term Split */}
          {report.country === "US" && (report.usShortTermGain !== undefined || report.usLongTermGain !== undefined) && (
            <UsGainSplitSection shortTerm={report.usShortTermGain || 0} longTerm={report.usLongTermGain || 0} brackets={report.usBrackets} />
          )}

          {/* CH Wealth Tax */}
          {report.country === "CH" && report.chWealthTax !== undefined && (
            <ChWealthTaxSection wealthTax={report.chWealthTax} cantonRate={report.chCantonRate || 0} verrechnungssteuer={report.chVerrechnungssteuer || 0} canton={swissCanton} />
          )}

          {/* IE Deemed Disposal */}
          {report.country === "IE" && report.ieDeemedDisposal && report.ieDeemedDisposal.length > 0 && (
            <DeemedDisposalSection warnings={report.ieDeemedDisposal} />
          )}

          {/* SE ISK Calculation */}
          {report.country === "SE" && report.seIskCalculation && (
            <IskSection calculation={report.seIskCalculation} />
          )}

          {/* DK Mark-to-Market */}
          {report.country === "DK" && report.dkMarkToMarket && report.dkMarkToMarket.length > 0 && (
            <MarkToMarketSection entries={report.dkMarkToMarket} brackets={report.dkBrackets} />
          )}

          {/* NO Shielding Deduction */}
          {report.country === "NO" && report.noShieldingDeduction !== undefined && (
            <ShieldingSection deduction={report.noShieldingDeduction} upliftFactor={report.noUpliftFactor || 1.72} />
          )}

          {/* Form Field Mapping (Phase 3) */}
          {report.formFields && report.formFields.length > 0 && (
            <FormFieldSection fields={report.formFields} country={report.country} />
          )}
        </>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex ml-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-3.5 h-3.5 rounded-full bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-500 inline-flex items-center justify-center text-[8px] font-bold leading-none transition-colors"
        aria-label="More info"
      >
        ?
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 p-2 rounded-lg bg-gray-900 dark:bg-slate-950 text-white text-[10px] leading-relaxed shadow-lg z-50 normal-case tracking-normal font-normal">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-slate-950" />
        </div>
      )}
    </div>
  );
}

function SummaryCards({ report }: { report: TaxReportType }) {
  const { t } = useI18n();
  const cards: { label: string; value: string; sub?: string; color?: string; tip?: string }[] = [];

  if (report.country === "NL") {
    cards.push(
      { label: t("taxReportsWealth"), value: fmt(report.box3TotalWealth || 0), sub: report.box3WealthEstimated ? "Estimated from holdings" : "Jan 1 snapshot", tip: "Total value of your investments, bank deposits, and debts on January 1. The Dutch Box 3 wealth tax is based on this snapshot date." },
      { label: t("taxReportsThreshold"), value: fmt(report.box3Threshold || 0), tip: "Tax-free allowance (heffingsvrij vermogen). You only pay Box 3 tax on wealth above this amount." },
      { label: t("taxReportsDeemedReturn"), value: fmt(report.box3DeemedReturn || 0), tip: "Fictitious return the Dutch tax authority assumes you earned, calculated using deemed rates per asset category applied to wealth above the threshold." },
      { label: t("taxReportsEstTax"), value: fmt(report.estimatedTax), color: "text-red-500 dark:text-red-400", tip: "Estimated Box 3 tax: 36% of the deemed return. This is a wealth tax — you pay it regardless of actual gains or losses." },
    );
  } else {
    cards.push(
      { label: t("taxReportsRealizedGains"), value: fmt(report.netRealizedGain), color: report.netRealizedGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400", sub: `${report.realizedGains.length} ${t("taxReportsSellTxs")}`, tip: "Net profit or loss from securities you sold during this tax year. Calculated as proceeds minus cost basis using your country's required method." },
      { label: t("taxReportsDividends"), value: fmt(report.totalGrossDividends), sub: `${report.dividends.length} ${t("taxReportsPayments")}`, tip: "Total gross dividend income received during the tax year, before any withholding tax deductions." },
      { label: t("taxReportsWithholding"), value: fmt(-report.totalWithholdingTax), color: "text-red-500 dark:text-red-400", tip: "Tax already withheld at source by brokers or foreign governments on your dividends. This may be partially or fully creditable against your domestic tax." },
    );

    if (report.country === "DE" && report.sparerpauschbetrag !== undefined) {
      cards.push({ label: "Sparerpauschbetrag", value: fmt(report.sparerpauschbetrag), sub: report.sparerpauschbetrag >= 1000 ? "Fully used" : "Partially used", tip: "Annual tax-free allowance for investment income in Germany (€1,000 single / €2,000 joint). Capital gains, dividends, and Vorabpauschale are offset against this before being taxed." });
    }
    if (report.country === "DE" && report.totalVorabpauschale) {
      cards.push({ label: "Vorabpauschale", value: fmt(report.totalVorabpauschale), tip: "Annual deemed distribution tax on accumulating ETFs. Calculated as Jan 1 value × Basiszins × 0.7, capped at actual gain. 30% Teilfreistellung applies for equity ETFs." });
    }
    if (report.country === "IT" && report.totalIVAFE) {
      cards.push({ label: "IVAFE", value: fmt(report.totalIVAFE), color: "text-red-500 dark:text-red-400", tip: "Imposta sul Valore delle Attività Finanziarie Estere — Italian 0.2% annual tax on the value of foreign financial assets held abroad." });
    }
    if (report.country === "GB" && report.gbAnnualExemption !== undefined) {
      cards.push({ label: "Annual Exempt Amount", value: fmt(report.gbAnnualExemption, "GBP"), tip: `CGT annual exempt amount for ${report.taxYear}/${report.taxYear + 1}. Only gains above this threshold are taxed.` });
    }
    if (report.country === "US" && report.usShortTermGain !== undefined) {
      cards.push({ label: "Short-Term", value: fmt(report.usShortTermGain, "USD"), color: report.usShortTermGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400", tip: "Gains on assets held 1 year or less, taxed as ordinary income." });
      cards.push({ label: "Long-Term", value: fmt(report.usLongTermGain || 0, "USD"), color: (report.usLongTermGain || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400", tip: "Gains on assets held over 1 year, taxed at preferential LTCG rates (0%/15%/20%)." });
    }
    if (report.country === "AT") {
      cards.push({ label: "KESt Rate", value: pct(report.atKestRate || 0.275), tip: "Austrian flat tax on capital gains and investment income." });
    }
    if (report.country === "BE" && report.beTobTotal !== undefined) {
      cards.push({ label: "TOB Total", value: fmt(report.beTobTotal), color: "text-red-500 dark:text-red-400", tip: "Taks op Beursverrichtingen — Belgian transaction tax on every buy/sell order." });
    }
    if (report.country === "PT" && report.ptNhrApplied) {
      cards.push({ label: "NHR Regime", value: "Active", color: "text-emerald-600 dark:text-emerald-400", tip: "Non-Habitual Resident (NHR) 10-year regime — foreign dividends may be exempt." });
    }

    const taxTips: Record<string, string> = {
      DE: "Estimated tax on investment income after Sparerpauschbetrag. Germany applies a flat 26.375% (25% Abgeltungsteuer + 5.5% Solidaritätszuschlag).",
      FR: "Estimated tax under the Prélèvement Forfaitaire Unique (PFU/flat tax): 12.8% income tax + 17.2% social contributions = 30% total on gains and dividends.",
      ES: "Estimated tax using Spain's progressive savings tax brackets (19%–28%) applied to net capital gains and dividend income.",
      IT: "Estimated tax at Italy's 26% flat rate on capital gains and dividends (12.5% for government bonds). Losses can be carried forward up to 4 years.",
      GB: "Estimated UK Capital Gains Tax at 10%/20% (basic/higher rate) after annual exempt amount. Dividends taxed at 8.75%/33.75%.",
      US: "Estimated US tax: short-term at ordinary rates, long-term at 0%/15%/20%. Qualified dividends at preferential rates.",
      CH: "Switzerland: no federal capital gains tax on private securities. Dividends subject to 35% Verrechnungssteuer (reclaimable). Canton wealth tax applies.",
      AT: "Austrian KESt at 27.5% flat rate on capital gains and dividends, with Verlustausgleich (loss offset).",
      PT: "Portuguese IRS at 28% flat on capital gains and dividends. NHR regime may exempt foreign-source dividends.",
      BE: "Belgium: no CGT on normal stock sales. TOB transaction tax 0.12–1.32%. Dividends at 30% précompte mobilier.",
      IE: "Irish CGT at 33% after €1,270 annual exemption. ETFs/funds subject to deemed disposal every 8 years.",
      SE: "Sweden: ISK/KF accounts taxed on imputed income. Regular accounts at 30% on realized gains.",
      DK: "Denmark: Aktieindkomst at 27%/42% brackets. ETFs taxed as kapitalindkomst (mark-to-market).",
      NO: "Norway: 22% tax with 1.72× uplift factor (37.84% effective). Skjermingsfradrag (shielding deduction) reduces taxable gain.",
      FI: "Finland: 30% up to €30,000, 34% above. Hankintameno-olettama (presumptive acquisition cost) may lower taxable gain.",
      PL: "Poland: 19% Belka tax on all capital gains and dividends. FIFO mandatory, no annual exemption.",
    };

    cards.push(
      { label: t("taxReportsEstTaxable"), value: fmt(report.estimatedTaxableIncome), tip: "Total taxable investment income after deductions, allowances, and country-specific adjustments have been applied." },
      { label: t("taxReportsEstTax"), value: fmt(report.estimatedTax), color: "text-red-500 dark:text-red-400", tip: taxTips[report.country] || "Estimated tax liability on your investment income for this tax year." },
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {cards.map((c, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
          <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center">
            {c.label}
            {c.tip && <InfoTip text={c.tip} />}
          </div>
          <div className={`text-lg font-bold ${c.color || "text-gray-900 dark:text-white"}`}>{c.value}</div>
          {c.sub && <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function GainsTable({ report }: { report: TaxReportType }) {
  const { t } = useI18n();
  if (report.realizedGains.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 text-center text-sm text-gray-400 dark:text-slate-500">
        {t("taxReportsNoGains")}
      </div>
    );
  }

  return (
    <Section title={t("taxReportsRealizedGainsTitle")} badge={`${COST_BASIS_LABELS[report.costBasisMethod]} · ${report.country}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700">
              <th className="text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("ticker")}</th>
              <th className="text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("name")}</th>
              <th className="text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("taxReportsSellDate")}</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("shares")}</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("taxReportsProceeds")}</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("taxReportsCostBasis")}</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("gainLoss")}</th>
              {report.realizedGains.some((g) => g.adjustmentLabel) && (
                <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("taxReportsAdjustment")}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {report.realizedGains.map((g) => (
              <GainRow key={g.transactionId} gain={g} showAdjustment={report.realizedGains.some((x) => x.adjustmentLabel)} />
            ))}
            <tr className="border-t-2 border-gray-200 dark:border-slate-600 font-bold">
              <td colSpan={4} className="px-3 py-2 text-gray-900 dark:text-white">{t("taxReportsTotal")}</td>
              <td className="text-right px-3 py-2 text-gray-900 dark:text-white">{fmt(report.realizedGains.reduce((s, g) => s + g.proceeds, 0))}</td>
              <td className="text-right px-3 py-2 text-gray-900 dark:text-white">{fmt(report.realizedGains.reduce((s, g) => s + g.costBasis, 0))}</td>
              <td className={`text-right px-3 py-2 ${report.netRealizedGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>{fmt(report.netRealizedGain)}</td>
              {report.realizedGains.some((g) => g.adjustmentLabel) && <td />}
            </tr>
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function GainRow({ gain: g, showAdjustment }: { gain: TaxRealizedGain; showAdjustment: boolean }) {
  return (
    <tr className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
      <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{g.ticker}</td>
      <td className="px-3 py-2 text-gray-600 dark:text-slate-300 max-w-[140px] truncate">{g.name}</td>
      <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{g.sellDate}</td>
      <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{g.sharesSold}</td>
      <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(g.proceeds)}</td>
      <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(g.costBasis)}</td>
      <td className={`text-right px-3 py-2 font-medium ${g.gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>{fmt(g.gain)}</td>
      {showAdjustment && (
        <td className="text-right px-3 py-2 text-cyan-600 dark:text-cyan-400 text-[10px]">{g.adjustmentLabel || "—"}</td>
      )}
    </tr>
  );
}

function DividendsTable({ report }: { report: TaxReportType }) {
  const { t } = useI18n();
  return (
    <Section title={t("taxReportsDividendIncome")}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700">
              <th className="text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("ticker")}</th>
              <th className="text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("name")}</th>
              <th className="text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("taxReportsSource")}</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("taxReportsGross")}</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("taxReportsWHT")}</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("taxReportsNet")}</th>
            </tr>
          </thead>
          <tbody>
            {report.dividends.map((d) => (
              <tr key={d.transactionId} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{d.ticker}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-slate-300 max-w-[140px] truncate">{d.name}</td>
                <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{d.sourceCountry || "—"}</td>
                <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(d.grossAmount)}</td>
                <td className="text-right px-3 py-2 text-red-500 dark:text-red-400">{d.withholdingTax > 0 ? `-${fmt(d.withholdingTax)}` : "—"}</td>
                <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(d.netAmount)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 dark:border-slate-600 font-bold">
              <td colSpan={3} className="px-3 py-2 text-gray-900 dark:text-white">{t("taxReportsTotal")}</td>
              <td className="text-right px-3 py-2 text-gray-900 dark:text-white">{fmt(report.totalGrossDividends)}</td>
              <td className="text-right px-3 py-2 text-red-500 dark:text-red-400">-{fmt(report.totalWithholdingTax)}</td>
              <td className="text-right px-3 py-2 text-gray-900 dark:text-white">{fmt(report.totalNetDividends)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function VorabpauschaleSection({ entries, total }: { entries: VorabpauschaleEntry[]; total: number }) {
  return (
    <Section title="Vorabpauschale (Accumulating ETFs)" badge="Basiszins · Annual">
      <div className="p-3 mx-3 mb-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-[11px] leading-relaxed">
        The Vorabpauschale is a deemed tax on accumulating ETFs. Formula: Jan 1 value × Basiszins × 0.7, capped at actual gain. After 30% Teilfreistellung for equity ETFs, 70% is taxable.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700">
              <th className="text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">ETF</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Jan 1 Value</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Dec 31 Value</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Basisertrag</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Vorabpauschale</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} className="border-b border-gray-50 dark:border-slate-700/50">
                <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{e.ticker}</td>
                <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(e.jan1Value)}</td>
                <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(e.dec31Value)}</td>
                <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(e.basisertrag)}</td>
                <td className="text-right px-3 py-2 text-gray-900 dark:text-white">{fmt(e.vorabpauschale)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 dark:border-slate-600 font-bold">
              <td colSpan={4} className="px-3 py-2 text-gray-900 dark:text-white">Total</td>
              <td className="text-right px-3 py-2 text-gray-900 dark:text-white">{fmt(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Box3Section({ report }: { report: TaxReportType }) {
  const { t } = useI18n();
  if (!report.box3Categories) return null;

  return (
    <Section title="Box 3 — Vermogensrendementsheffing" badge={`Peildatum: 1 jan ${report.taxYear}`}>
      <div className="p-3 mx-3 mb-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-[11px] leading-relaxed">
        The Netherlands uses Box 3 — a wealth tax on a deemed return. You are not taxed on realized gains. Tax is based on the total value of your assets on January 1.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700">
              <th className="text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("taxReportsCategory")}</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("value")}</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("taxReportsDeemedRate")}</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">{t("taxReportsDeemedReturn")}</th>
            </tr>
          </thead>
          <tbody>
            {report.box3Categories.map((c, i) => (
              <tr key={i} className="border-b border-gray-50 dark:border-slate-700/50">
                <td className="px-3 py-2 text-gray-900 dark:text-white">{c.label}</td>
                <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(c.value)}</td>
                <td className="text-right px-3 py-2 text-gray-500 dark:text-slate-400">{pct(c.deemedReturnRate / 100)}</td>
                <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(c.deemedReturn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 space-y-1 text-xs">
        <div className="flex justify-between text-gray-500 dark:text-slate-400"><span>Totaal vermogen</span><span>{fmt(report.box3TotalWealth || 0)}</span></div>
        <div className="flex justify-between text-gray-500 dark:text-slate-400"><span>Heffingsvrij vermogen</span><span>−{fmt(report.box3Threshold || 0)}</span></div>
        <div className="flex justify-between font-semibold text-gray-900 dark:text-white"><span>Grondslag</span><span>{fmt(report.box3TaxableBase || 0)}</span></div>
        <div className="flex justify-between text-gray-500 dark:text-slate-400"><span>Forfaitair rendement</span><span>{fmt(report.box3DeemedReturn || 0)}</span></div>
        <div className="flex justify-between font-bold text-red-500 dark:text-red-400 pt-2 border-t border-gray-200 dark:border-slate-700"><span>Box 3 belasting (36%)</span><span>{fmt(report.estimatedTax)}</span></div>
      </div>
    </Section>
  );
}

function Modelo720Section({ assets }: { assets: Modelo720Asset[] }) {
  return (
    <Section title="Modelo 720 — Foreign Asset Declaration" badge="Action Required" badgeColor="amber">
      <div className="p-3 mx-3 mb-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed">
        Your foreign securities may exceed the €50,000 threshold. If so, you must file Modelo 720 between January 1 – March 31 of the following year.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700">
              <th className="text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Category</th>
              <th className="text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Broker</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Dec 31 Value</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Threshold</th>
              <th className="text-center font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a, i) => (
              <tr key={i} className="border-b border-gray-50 dark:border-slate-700/50">
                <td className="px-3 py-2 text-gray-900 dark:text-white">{a.category}</td>
                <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{a.broker}</td>
                <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(a.dec31Value)}</td>
                <td className="text-right px-3 py-2 text-gray-500 dark:text-slate-400">{fmt(a.threshold)}</td>
                <td className="text-center px-3 py-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${a.exceeds ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400" : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"}`}>
                    {a.exceeds ? "EXCEEDS" : "BELOW"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function WashSaleSection({ warnings }: { warnings: WashSaleWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <Section title="Wash Sale Warnings (Regla Antiaplicación)" badge="2-Month Rule" badgeColor="amber">
      <div className="p-3">
        {warnings.map((w, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 mb-2">
            <span>⚠</span>
            <span><strong>{w.ticker}</strong> — sold on {w.sellDate} with a loss of {fmt(w.lossAmount)}, but repurchased on {w.rebuyDate} ({w.daysApart} days apart). This loss may not be deductible.</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function QuadroRWSection({ entries, totalIVAFE }: { entries: QuadroRWEntry[]; totalIVAFE: number }) {
  return (
    <Section title="Quadro RW — Monitoraggio Fiscale" badge="Mandatory Filing" badgeColor="amber">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700">
              <th className="text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Asset</th>
              <th className="text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Broker</th>
              <th className="text-center font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Code</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Jan 1 Value</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Dec 31 Value</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">IVAFE (0.2%)</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} className="border-b border-gray-50 dark:border-slate-700/50">
                <td className="px-3 py-2 text-gray-900 dark:text-white">{e.description}</td>
                <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{e.broker}</td>
                <td className="text-center px-3 py-2 text-gray-500 dark:text-slate-400">{e.code}</td>
                <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(e.jan1Value)}</td>
                <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(e.dec31Value)}</td>
                <td className="text-right px-3 py-2 text-gray-900 dark:text-white">{fmt(e.ivafe)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 dark:border-slate-600 font-bold">
              <td colSpan={5} className="px-3 py-2 text-gray-900 dark:text-white">Total IVAFE</td>
              <td className="text-right px-3 py-2 text-gray-900 dark:text-white">{fmt(totalIVAFE)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function FormFieldSection({ fields, country }: { fields: FormField[]; country: TaxCountry }) {
  const { t } = useI18n();
  const formNames: Record<TaxCountry, string> = {
    DE: "Anlage KAP",
    FR: "Déclaration 2074",
    ES: "Modelo 100 (IRPF)",
    NL: "Aangifte Box 3",
    IT: "Modello Redditi PF",
    GB: "SA108 (CGT)",
    US: "Schedule D",
    CH: "Steuererklärung (DA-1)",
    AT: "Formular E1kv",
    PT: "Modelo 3 (Anexo J)",
    BE: "Déclaration TOB",
    IE: "Form CG1",
    SE: "Bilaga K4",
    DK: "Årsopgørelse",
    NO: "RF-1159",
    FI: "Lomake 9A",
    PL: "PIT-38",
  };

  return (
    <Section title={`${formNames[country]} — ${t("taxReportsFormMapping")}`} badge="Form Fields" badgeColor="orange">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100 dark:bg-slate-700">
        {fields.map((f, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-3 flex justify-between items-center">
            <div>
              <div className="text-[11px] text-gray-500 dark:text-slate-400">{f.label}</div>
              <span className="text-[10px] font-mono bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 rounded">{f.reference}</span>
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{fmt(f.value)}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function DataQualitySection({ checks }: { checks: DataQualityCheck[] }) {
  const { t } = useI18n();
  return (
    <Section title={t("taxReportsDataQuality")}>
      <div className="p-3 space-y-2">
        {checks.map((c, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className={`flex-shrink-0 ${c.status === "ok" ? "text-emerald-500" : c.status === "warning" ? "text-amber-500" : "text-red-500"}`}>
              {c.status === "ok" ? "✓" : c.status === "warning" ? "⚠" : "✗"}
            </span>
            <span className={c.status === "ok" ? "text-gray-600 dark:text-slate-400" : c.status === "warning" ? "text-amber-700 dark:text-amber-400" : "text-red-600 dark:text-red-400"}>
              {c.message}
              {c.actionUrl && c.actionLabel && (
                <>
                  {" "}
                  <Link href={c.actionUrl} className="underline font-medium hover:opacity-80">
                    {c.actionLabel} →
                  </Link>
                </>
              )}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function AiAssistantPanel({
  aiSummary,
  aiLoading,
  onRequest,
  country,
}: {
  aiSummary: string;
  aiLoading: boolean;
  onRequest: () => void;
  country: TaxCountry;
}) {
  const { t } = useI18n();

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/25 bg-indigo-50/50 dark:bg-indigo-500/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-200 dark:border-indigo-500/15">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>
          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">{t("taxReportsAiAssistant")}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded">PRO</span>
        </div>
        {!aiSummary && !aiLoading && (
          <button onClick={onRequest} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 px-3 py-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
            {t("taxReportsAnalyze")}
          </button>
        )}
      </div>
      {(aiSummary || aiLoading) && (
        <div className="p-4 text-gray-700 dark:text-slate-300 leading-relaxed">
          {aiLoading && !aiSummary && (
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs">
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current" />
              {t("taxReportsAnalyzing")}
            </div>
          )}
          {aiSummary && <AiMarkdown text={aiSummary} compact />}
        </div>
      )}
      {!aiSummary && !aiLoading && (
        <div className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">
          {t("taxReportsAiDesc")}
        </div>
      )}
    </div>
  );
}

/* ── New Country Sections ─────────────────────────────────── */

function TobSection({ entries, total }: { entries: TobEntry[]; total: number }) {
  return (
    <Section title="TOB — Taks op Beursverrichtingen" badge="Transaction Tax" badgeColor="orange">
      <div className="p-3 mx-3 mb-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-[11px] leading-relaxed">
        Belgium does not levy capital gains tax on normal stock transactions. Instead, a Transaction Tax (TOB) applies to every buy/sell order.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700">
              <th className="text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Ticker</th>
              <th className="text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Date</th>
              <th className="text-center font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Type</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Amount</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Rate</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">TOB</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} className="border-b border-gray-50 dark:border-slate-700/50">
                <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{e.ticker}</td>
                <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{e.date}</td>
                <td className="text-center px-3 py-2"><span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${e.type === "buy" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600" : "bg-red-100 dark:bg-red-500/20 text-red-600"}`}>{e.type.toUpperCase()}</span></td>
                <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(e.amount)}</td>
                <td className="text-right px-3 py-2 text-gray-500 dark:text-slate-400">{pct(e.tobRate)}</td>
                <td className="text-right px-3 py-2 text-gray-900 dark:text-white">{fmt(e.tobAmount)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 dark:border-slate-600 font-bold">
              <td colSpan={5} className="px-3 py-2 text-gray-900 dark:text-white">Total TOB</td>
              <td className="text-right px-3 py-2 text-gray-900 dark:text-white">{fmt(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function UsGainSplitSection({ shortTerm, longTerm, brackets }: { shortTerm: number; longTerm: number; brackets?: { from: number; to: number; rate: number; tax: number }[] }) {
  return (
    <Section title="Capital Gains Split" badge="Schedule D" badgeColor="blue">
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
            <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase mb-1">Short-Term (≤1 year)</div>
            <div className={`text-lg font-bold ${shortTerm >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>{fmt(shortTerm, "USD")}</div>
            <div className="text-[10px] text-gray-400 dark:text-slate-500">Ordinary income rates</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
            <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase mb-1">Long-Term (&gt;1 year)</div>
            <div className={`text-lg font-bold ${longTerm >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>{fmt(longTerm, "USD")}</div>
            <div className="text-[10px] text-gray-400 dark:text-slate-500">0% / 15% / 20%</div>
          </div>
        </div>
        {brackets && brackets.length > 0 && (
          <div>
            <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase mb-2">LTCG Bracket Breakdown</div>
            {brackets.map((b, i) => (
              <div key={i} className="flex justify-between text-xs text-gray-600 dark:text-slate-300 py-0.5">
                <span>{fmt(b.from, "USD")} – {b.to === Infinity ? "∞" : fmt(b.to, "USD")} @ {pct(b.rate)}</span>
                <span className="font-medium">{fmt(b.tax, "USD")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

function ChWealthTaxSection({ wealthTax, cantonRate, verrechnungssteuer, canton }: { wealthTax: number; cantonRate: number; verrechnungssteuer: number; canton: string }) {
  return (
    <Section title={`Vermögenssteuer — Canton ${canton}`} badge="Wealth Tax" badgeColor="amber">
      <div className="p-3 mx-3 mb-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-[11px] leading-relaxed">
        Switzerland has no federal capital gains tax on private securities. However, a canton-based wealth tax applies on total assets, and 35% Verrechnungssteuer on Swiss dividends is reclaimable.
      </div>
      <div className="p-4 space-y-2 text-xs">
        <div className="flex justify-between text-gray-600 dark:text-slate-300"><span>Canton wealth tax rate ({canton})</span><span>{pct(cantonRate)}</span></div>
        <div className="flex justify-between font-semibold text-gray-900 dark:text-white"><span>Estimated wealth tax</span><span>{fmt(wealthTax)}</span></div>
        <div className="flex justify-between text-gray-600 dark:text-slate-300 pt-2 border-t border-gray-100 dark:border-slate-700"><span>Verrechnungssteuer (reclaimable)</span><span>{fmt(verrechnungssteuer)}</span></div>
      </div>
    </Section>
  );
}

function DeemedDisposalSection({ warnings }: { warnings: DeemedDisposalWarning[] }) {
  return (
    <Section title="Deemed Disposal — 8-Year Rule" badge="ETFs/Funds" badgeColor="amber">
      <div className="p-3 mx-3 mb-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed">
        Ireland applies a deemed disposal every 8 years on ETFs and funds. You are taxed on unrealized gains at the 33% CGT rate.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700">
              <th className="text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Ticker</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Years Held</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Cost Basis</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Current Value</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Deemed Gain</th>
            </tr>
          </thead>
          <tbody>
            {warnings.map((w, i) => (
              <tr key={i} className="border-b border-gray-50 dark:border-slate-700/50">
                <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{w.ticker}</td>
                <td className="text-right px-3 py-2 text-amber-600 dark:text-amber-400 font-medium">{w.yearsHeld}y</td>
                <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(w.costBasis)}</td>
                <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(w.currentValue)}</td>
                <td className={`text-right px-3 py-2 font-medium ${w.deemedGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>{fmt(w.deemedGain)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function IskSection({ calculation: c }: { calculation: IskCalculation }) {
  return (
    <Section title={`${c.accountType.toUpperCase()} — Schablonbeskattning`} badge="Imputed Income" badgeColor="blue">
      <div className="p-3 mx-3 mb-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-[11px] leading-relaxed">
        {c.accountType === "isk" ? "ISK" : "KF"} accounts are taxed on imputed (fictional) income rather than actual gains. The rate is the gov borrowing rate + 1%, and the result is taxed at 30%.
      </div>
      <div className="p-4 space-y-2 text-xs">
        <div className="flex justify-between text-gray-600 dark:text-slate-300"><span>Average portfolio value</span><span>{fmt(c.averageValue, "SEK")}</span></div>
        <div className="flex justify-between text-gray-600 dark:text-slate-300"><span>Government borrowing rate</span><span>{c.govBorrowingRate.toFixed(2)}%</span></div>
        <div className="flex justify-between text-gray-600 dark:text-slate-300"><span>Imputed income rate</span><span>{c.imputedIncomeRate.toFixed(2)}%</span></div>
        <div className="flex justify-between font-semibold text-gray-900 dark:text-white"><span>Schablonintäkt (imputed income)</span><span>{fmt(c.imputedIncome, "SEK")}</span></div>
        <div className="flex justify-between font-bold text-red-500 dark:text-red-400 pt-2 border-t border-gray-100 dark:border-slate-700"><span>Tax (30%)</span><span>{fmt(c.tax, "SEK")}</span></div>
      </div>
    </Section>
  );
}

function MarkToMarketSection({ entries, brackets }: { entries: MarkToMarketEntry[]; brackets?: { from: number; to: number; rate: number; tax: number }[] }) {
  const totalUnrealized = entries.reduce((s, e) => s + e.unrealizedGain, 0);
  return (
    <Section title="ETF Mark-to-Market — Kapitalindkomst" badge="Unrealized" badgeColor="amber">
      <div className="p-3 mx-3 mb-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed">
        In Denmark, ETFs are taxed as kapitalindkomst using a mark-to-market method. You pay tax on unrealized gains each year.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700">
              <th className="text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">ETF</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Jan 1 Value</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Dec 31 Value</th>
              <th className="text-right font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">Unrealized Gain</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} className="border-b border-gray-50 dark:border-slate-700/50">
                <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{e.ticker}</td>
                <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(e.jan1Value, "DKK")}</td>
                <td className="text-right px-3 py-2 text-gray-600 dark:text-slate-300">{fmt(e.dec31Value, "DKK")}</td>
                <td className={`text-right px-3 py-2 font-medium ${e.unrealizedGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>{fmt(e.unrealizedGain, "DKK")}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 dark:border-slate-600 font-bold">
              <td colSpan={3} className="px-3 py-2 text-gray-900 dark:text-white">Total</td>
              <td className={`text-right px-3 py-2 ${totalUnrealized >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>{fmt(totalUnrealized, "DKK")}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {brackets && brackets.length > 0 && (
        <div className="p-4">
          <div className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase mb-2">Aktieindkomst Brackets</div>
          {brackets.map((b, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-600 dark:text-slate-300 py-0.5">
              <span>{fmt(b.from, "DKK")} – {b.to === Infinity ? "∞" : fmt(b.to, "DKK")} @ {pct(b.rate)}</span>
              <span className="font-medium">{fmt(b.tax, "DKK")}</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function ShieldingSection({ deduction, upliftFactor }: { deduction: number; upliftFactor: number }) {
  return (
    <Section title="Skjermingsfradrag (Shielding Deduction)" badge="Norway" badgeColor="blue">
      <div className="p-3 mx-3 mb-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-[11px] leading-relaxed">
        Norway applies a shielding deduction (skjermingsfradrag) based on the risk-free rate × cost basis of shares. Taxable income is then multiplied by {upliftFactor}× before applying the 22% tax rate.
      </div>
      <div className="p-4 space-y-2 text-xs">
        <div className="flex justify-between text-gray-600 dark:text-slate-300"><span>Shielding deduction</span><span className="text-emerald-600 dark:text-emerald-400 font-medium">−{fmt(deduction, "NOK")}</span></div>
        <div className="flex justify-between text-gray-600 dark:text-slate-300"><span>Uplift factor (oppjusteringsfaktor)</span><span>{upliftFactor}×</span></div>
        <div className="flex justify-between text-gray-500 dark:text-slate-400 text-[10px]"><span>Effective rate: 22% × {upliftFactor} = {pct(0.22 * upliftFactor)}</span></div>
      </div>
    </Section>
  );
}

/* ── Shared Layout ───────────────────────────────────────── */

function Section({ title, badge, badgeColor = "emerald", children }: {
  title: string;
  badge?: string;
  badgeColor?: "emerald" | "amber" | "orange" | "blue";
  children: React.ReactNode;
}) {
  const colors = {
    emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
    orange: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400",
    blue: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
  };
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-slate-700">
        <h3 className="text-xs font-semibold text-gray-900 dark:text-white">{title}</h3>
        {badge && <span className={`text-[9px] font-semibold px-2 py-0.5 rounded ${colors[badgeColor]}`}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}
