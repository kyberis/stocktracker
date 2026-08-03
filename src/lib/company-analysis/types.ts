import type { InsiderSignalTag } from "./insider-tags";

export type SectionStatus = "ok" | "unavailable";

/**
 * Sections backed by FMP's paid/restricted endpoints (insider + congress
 * trading). "locked" means the data exists in the shared cache but was
 * stripped from an anonymous response — distinct from "unavailable", which
 * means the data genuinely couldn't be fetched for anyone.
 */
export type PaidSectionStatus = SectionStatus | "locked";

export interface CompanyAnalysisQuote {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  marketCap: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  ma50: number | null;
  ma200: number | null;
  currency: string | null;
}

export interface CompanyAnalysisProfile {
  name: string | null;
  sector: string | null;
  industry: string | null;
  description: string | null;
  exchange: string | null;
  ipoDate: string | null;
}

export interface FundamentalRow {
  label: string;
  value: number | null;
  yoyPct: number | null;
  unit: "currency" | "eps" | "percent" | "raw";
}

export interface CompanyAnalysisFundamentals {
  status: SectionStatus;
  lastQuarterLabel: string | null;
  lastReportDate: string | null;
  rows: FundamentalRow[];
  nextQuarterLabel: string | null;
  nextReportDate: string | null;
  companyGuidanceRevenue: number | null;
  companyGuidanceRevenueVarPct: number | null;
  /** Present only when guidance came from a citable web/API source. */
  companyGuidanceSourceUrl: string | null;
  consensusRevenue: number | null;
  consensusRevenueVarPct: number | null;
  consensusEps: number | null;
  consensusEpsVarPct: number | null;
  lastEps: number | null;
  lastEpsVsConsensusPct: number | null;
  /** Present when last EPS was filled from a citable web fallback. */
  lastEpsSourceUrl: string | null;
  lastRevenue: number | null;
  lastRevenueYoyPct: number | null;
}

export interface CompanyAnalysisTechnicals {
  status: SectionStatus;
  /** Max close in the ~12m window — label as such in UI. */
  closeHigh12m: number | null;
  closeHigh12mDate: string | null;
  distanceToCloseHigh12mPct: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  ma50: number | null;
  ma200: number | null;
  support: number | null;
  resistance: number | null;
  latestVolume: number | null;
  avgVolume: number | null;
  nextCatalystDate: string | null;
}

export interface CompanyAnalysisNewsItem {
  kind: "earnings" | "news";
  title: string;
  summary: string;
  date: string | null;
  source: string | null;
  url: string | null;
}

export interface CompanyAnalysisInsiderItem {
  name: string;
  role: string;
  date: string;
  transactionType: string;
  tag: InsiderSignalTag;
  detail: string;
  shares: number | null;
  price: number | null;
  url: string | null;
}

export interface CompanyAnalysisCongressItem {
  name: string;
  chamber: "senate" | "house";
  officeOrDistrict: string;
  date: string;
  transactionType: string;
  amountRange: string | null;
  url: string | null;
}

export interface CompanyAnalysisPeer {
  ticker: string;
  name: string | null;
  price: number | null;
  distanceTo52wHighPct: number | null;
  ma50: number | null;
  ma200: number | null;
}

export interface CompanyAnalysisAlternative {
  status: SectionStatus;
  ticker: string | null;
  name: string | null;
  tagline: string | null;
  why: string | null;
  distanceTo52wHighPct: number | null;
  price: number | null;
  peersConsidered: CompanyAnalysisPeer[];
}

export interface CompanyAnalysisSource {
  name: string;
  url: string;
}

export interface CompanyAnalysisReport {
  ticker: string;
  /** When this analysis payload was first successfully generated (stable across day cache). */
  generatedAt: string;
  /** Last time any section was written (full build or gap fill). */
  updatedAt: string;
  cached: boolean;
  /**
   * When the provider resolved via a cross-listing alias (e.g. W9C.DE → CSU.TO),
   * this is the actual symbol used to fetch fundamentals/quote data.
   * Undefined when it matches `ticker`.
   */
  symbolUsed?: string;
  quote: CompanyAnalysisQuote | null;
  profile: CompanyAnalysisProfile | null;
  fundamentals: CompanyAnalysisFundamentals;
  technicals: CompanyAnalysisTechnicals;
  news: { status: SectionStatus; items: CompanyAnalysisNewsItem[] };
  insiders: { status: PaidSectionStatus; items: CompanyAnalysisInsiderItem[] };
  congress: { status: PaidSectionStatus; items: CompanyAnalysisCongressItem[] };
  alternative: CompanyAnalysisAlternative;
  sources: CompanyAnalysisSource[];
}
