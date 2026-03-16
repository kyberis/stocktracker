import type { Transaction, ExchangeRates, HoldingAssetType } from "@/lib/types";

/* ── Supported Countries ───────────────────────────────────── */

export type TaxCountry =
  | "DE" | "FR" | "ES" | "NL" | "IT"
  | "GB" | "US" | "CH" | "AT" | "PT"
  | "BE" | "IE" | "SE" | "DK" | "NO" | "FI" | "PL";

export const TAX_COUNTRIES: TaxCountry[] = [
  "DE", "FR", "ES", "NL", "IT",
  "GB", "US", "CH", "AT", "PT",
  "BE", "IE", "SE", "DK", "NO", "FI", "PL",
];

export const TAX_COUNTRY_LABELS: Record<TaxCountry, string> = {
  DE: "Germany",
  FR: "France",
  ES: "Spain",
  NL: "Netherlands",
  IT: "Italy",
  GB: "United Kingdom",
  US: "United States",
  CH: "Switzerland",
  AT: "Austria",
  PT: "Portugal",
  BE: "Belgium",
  IE: "Ireland",
  SE: "Sweden",
  DK: "Denmark",
  NO: "Norway",
  FI: "Finland",
  PL: "Poland",
};

/* ── Cost Basis Methods ────────────────────────────────────── */

export type CostBasisMethod = "fifo" | "lifo" | "average";

export const COUNTRY_COST_BASIS: Record<TaxCountry, CostBasisMethod> = {
  DE: "fifo",
  FR: "average",
  ES: "fifo",
  NL: "fifo",
  IT: "lifo",
  GB: "average", // Section 104 share pooling
  US: "fifo",
  CH: "fifo",
  AT: "average",
  PT: "fifo",
  BE: "fifo",
  IE: "fifo",
  SE: "average",
  DK: "average",
  NO: "average",
  FI: "fifo",
  PL: "fifo",
};

/* ── Engine Input / Output ─────────────────────────────────── */

export interface TaxReportInput {
  country: TaxCountry;
  taxYear: number;
  transactions: Transaction[];
  exchangeRates: ExchangeRates;
  baseCurrency: string;
  /** Jan 1 portfolio value (EUR) — for NL Box 3, DE Vorabpauschale */
  jan1ValueEUR?: number;
  /** Dec 31 portfolio value (EUR) — for DE Vorabpauschale, ES Modelo 720, IT Quadro RW */
  dec31ValueEUR?: number;
  /** Per-ticker Jan 1 values in EUR, keyed by uppercase ticker */
  jan1TickerValues?: Record<string, number>;
  /** Per-ticker Dec 31 values in EUR */
  dec31TickerValues?: Record<string, number>;
  /** User's broker/institution name (for Modelo 720, Quadro RW) */
  brokerName?: string;
  /** Broker country ISO code */
  brokerCountry?: string;
  /** Bank deposit value on Jan 1 (EUR) — NL Box 3 */
  bankDepositsJan1EUR?: number;
  /** Debts value on Jan 1 (EUR) — NL Box 3 */
  debtsJan1EUR?: number;
  /** IT regime: dichiarativo (LIFO, self-reported) or amministrato (avg, broker-reported) */
  italyRegime?: "dichiarativo" | "amministrato";
  /** DE: filing status for Sparerpauschbetrag */
  filingStatus?: "single" | "joint";
  /** True when jan1ValueEUR was estimated from current holdings (no snapshot found) */
  jan1Estimated?: boolean;
  /** True when dec31ValueEUR was estimated from current holdings (no snapshot found) */
  dec31Estimated?: boolean;
  /** SE: account type for Sweden */
  swedenAccountType?: "isk" | "kf" | "regular";
  /** PT: Non-Habitual Resident regime */
  portugalNhr?: boolean;
  /** CH: Swiss canton code (e.g. "ZH", "GE", "VD") */
  swissCanton?: string;
  /** Per-ticker buy dates for first acquisition (for IE deemed disposal) */
  tickerFirstBuyDates?: Record<string, string>;
}

/* ── Realized Gain/Loss per Sell ───────────────────────────── */

export interface TaxRealizedGain {
  transactionId: string;
  ticker: string;
  name: string;
  assetType?: HoldingAssetType;
  sellDate: string;
  buyDate?: string;
  holdingDays?: number;
  sharesSold: number;
  proceeds: number;
  costBasis: number;
  fees: number;
  gain: number;
  /** After country-specific adjustments (e.g. Teilfreistellung) */
  taxableGain?: number;
  /** Adjustment label (e.g. "Teilfreistellung 30%") */
  adjustmentLabel?: string;
}

/* ── Dividend Line Item ────────────────────────────────────── */

export interface TaxDividend {
  transactionId: string;
  ticker: string;
  name: string;
  date: string;
  grossAmount: number;
  withholdingTax: number;
  netAmount: number;
  /** Source country ISO code */
  sourceCountry?: string;
  /** Whether the dividend qualifies as domestic */
  isDomestic?: boolean;
}

/* ── Form Field Mapping (Phase 3) ──────────────────────────── */

export interface FormField {
  label: string;
  reference: string;
  value: number;
  note?: string;
}

/* ── Country-specific Sections ─────────────────────────────── */

export interface VorabpauschaleEntry {
  ticker: string;
  name: string;
  jan1Value: number;
  dec31Value: number;
  gain: number;
  basisertrag: number;
  teilfreistellung: number;
  vorabpauschale: number;
}

export interface Box3Category {
  label: string;
  value: number;
  deemedReturnRate: number;
  deemedReturn: number;
}

export interface Modelo720Asset {
  category: string;
  broker: string;
  country: string;
  dec31Value: number;
  threshold: number;
  exceeds: boolean;
}

export interface WashSaleWarning {
  ticker: string;
  sellDate: string;
  rebuyDate: string;
  lossAmount: number;
  daysApart: number;
}

export interface QuadroRWEntry {
  description: string;
  broker: string;
  country: string;
  code: string;
  jan1Value: number;
  dec31Value: number;
  ivafe: number;
}

export interface TobEntry {
  transactionId: string;
  ticker: string;
  name: string;
  date: string;
  type: "buy" | "sell";
  amount: number;
  tobRate: number;
  tobAmount: number;
}

export interface DeemedDisposalWarning {
  ticker: string;
  name: string;
  firstBuyDate: string;
  yearsHeld: number;
  currentValue: number;
  costBasis: number;
  deemedGain: number;
}

export interface IskCalculation {
  accountType: "isk" | "kf";
  averageValue: number;
  govBorrowingRate: number;
  imputedIncomeRate: number;
  imputedIncome: number;
  taxRate: number;
  tax: number;
}

export interface MarkToMarketEntry {
  ticker: string;
  name: string;
  jan1Value: number;
  dec31Value: number;
  unrealizedGain: number;
}

export interface ShieldingDeduction {
  costBasis: number;
  shieldingRate: number;
  deduction: number;
  sharesHeld: number;
}

/* ── Tax Optimization Suggestion (Phase 4) ─────────────────── */

export interface TaxOptimization {
  type: "loss_harvesting" | "allowance" | "withholding_recovery" | "structure" | "general";
  title: string;
  description: string;
  potentialSaving?: number;
  potentialSavingLabel?: string;
}

/* ── Data Quality Check (Phase 4) ──────────────────────────── */

export interface DataQualityCheck {
  status: "ok" | "warning" | "error";
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

/* ── Main Tax Report ───────────────────────────────────────── */

export interface TaxReport {
  country: TaxCountry;
  taxYear: number;
  baseCurrency: string;
  costBasisMethod: CostBasisMethod;
  generatedAt: string;

  /* Phase 1: Core summary */
  realizedGains: TaxRealizedGain[];
  totalRealizedGain: number;
  totalRealizedLoss: number;
  netRealizedGain: number;

  dividends: TaxDividend[];
  totalGrossDividends: number;
  totalWithholdingTax: number;
  totalNetDividends: number;

  estimatedTaxableIncome: number;
  estimatedTax: number;

  /* Phase 2: Country-specific */
  /** DE: Vorabpauschale entries */
  vorabpauschale?: VorabpauschaleEntry[];
  totalVorabpauschale?: number;
  /** DE: Sparerpauschbetrag (allowance used) */
  sparerpauschbetrag?: number;
  /** DE: Total after Teilfreistellung adjustments */
  teilfreistellungAdjustment?: number;

  /** FR: PFU breakdown */
  pfuIncomeTax?: number;
  pfuSocialContributions?: number;

  /** ES: Tax bracket breakdown */
  esBrackets?: { from: number; to: number; rate: number; tax: number }[];
  /** ES: Modelo 720 check */
  modelo720?: Modelo720Asset[];
  /** ES: Wash sale warnings */
  washSaleWarnings?: WashSaleWarning[];

  /** NL: Box 3 categories */
  box3Categories?: Box3Category[];
  box3TotalWealth?: number;
  /** True when box3TotalWealth was estimated from current holdings (no Jan 1 snapshot) */
  box3WealthEstimated?: boolean;
  box3Threshold?: number;
  box3TaxableBase?: number;
  box3DeemedReturn?: number;
  box3TaxRate?: number;

  /** IT: Quadro RW entries */
  quadroRW?: QuadroRWEntry[];
  totalIVAFE?: number;
  /** IT: Regime used */
  italyRegime?: "dichiarativo" | "amministrato";
  /** IT: Carryforward losses */
  carryForwardLosses?: number;

  /** GB: CGT annual exempt amount */
  gbAnnualExemption?: number;
  /** GB: CGT rate applied (basic or higher) */
  gbCgtRate?: number;
  /** GB: Dividend allowance */
  gbDividendAllowance?: number;

  /** US: Short-term gains (held <= 1 year) */
  usShortTermGain?: number;
  /** US: Long-term gains (held > 1 year) */
  usLongTermGain?: number;
  /** US: LTCG bracket breakdown */
  usBrackets?: { from: number; to: number; rate: number; tax: number }[];

  /** CH: Canton wealth tax rate */
  chCantonRate?: number;
  /** CH: Wealth tax amount */
  chWealthTax?: number;
  /** CH: Verrechnungssteuer (reclaimable) */
  chVerrechnungssteuer?: number;

  /** AT: KESt rate */
  atKestRate?: number;

  /** PT: NHR applied */
  ptNhrApplied?: boolean;

  /** BE: TOB transaction tax entries */
  beTob?: TobEntry[];
  /** BE: Total TOB */
  beTobTotal?: number;

  /** IE: Deemed disposal warnings */
  ieDeemedDisposal?: DeemedDisposalWarning[];
  /** IE: Annual exemption */
  ieAnnualExemption?: number;

  /** SE: ISK/KF calculation */
  seIskCalculation?: IskCalculation;
  /** SE: Account type used */
  seAccountType?: "isk" | "kf" | "regular";

  /** DK: Mark-to-market entries for ETFs */
  dkMarkToMarket?: MarkToMarketEntry[];
  /** DK: Aktieindkomst bracket breakdown */
  dkBrackets?: { from: number; to: number; rate: number; tax: number }[];

  /** NO: Shielding deduction total */
  noShieldingDeduction?: number;
  /** NO: Uplift factor */
  noUpliftFactor?: number;

  /** FI: Presumptive acquisition cost used */
  fiPresumptiveCostUsed?: boolean;

  /* Phase 3: Form field mapping */
  formFields?: FormField[];

  /* Phase 4: AI & quality */
  dataQuality?: DataQualityCheck[];
  optimizations?: TaxOptimization[];
}
