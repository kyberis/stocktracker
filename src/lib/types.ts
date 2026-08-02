export type ApiProviderName = "yahoo" | "alphavantage";
export type SubscriptionPlan = "free" | "pro";
export type LayoutTheme = "default" | "terminal" | "canvas" | "studio";
export type BillingInterval = "monthly" | "annual";
export type SubscriptionFeature =
  | "yahoo"
  | "charts"
  | "cash"
  | "benchmarks"
  | "alphavantage"
  | "fundamentals"
  | "intelligence"
  | "economic-indicators"
  | "ai"
  | "alerts-email"
  | "alerts-push"
  | "alerts-telegram"
  | "alerts-device"
  | "metrics"
  | "portfolio-history-full"
  | "portfolio-sharing"
  | "csv-export"
  | "crypto"
  | "crypto-pro"
  | "crypto-portfolio"
  | "event-calendar-earnings"
  | "event-calendar-economic"
  | "event-calendar-ipo"
  | "event-calendar-splits"
  | "net-worth"
  | "screener"
  | "tax-reports"
  | "simulator"
  | "planning"
  | "stock-evaluation"
  | "support-chat";

export type AlertCondition = "above" | "below";
export type AlertType = "threshold" | "percent_change";
export type PercentBasis = "daily" | "purchase";
export type NotificationChannel = "email" | "push" | "telegram" | "device";
export type ProdOpsEventType =
  | "user_registered"
  | "membership_paid"
  | "feedback_received"
  | "broker_request_created"
  | "trial_activated"
  | "test_notification";

export type ProdOpsRecipientSource = "telegram_link" | "legacy_manual";

export interface ProdOpsRecipient {
  id: string;
  label: string;
  type: "telegram_dm";
  source: ProdOpsRecipientSource;
  chatId: string;
  messageThreadId?: number;
  enabled: boolean;
  enabledEventTypes: ProdOpsEventType[];
  telegramUserId?: string;
  telegramUsername?: string;
  telegramDisplayName?: string;
  linkedAt?: string;
}

export interface ProdOpsPendingLink {
  tokenHash: string;
  tokenIssuedAt: string;
  tokenExpiresAt: string;
}

export interface ProdOpsConfig {
  enabled: boolean;
  baseUrl: string;
  botUsername: string;
  enabledEventTypes: ProdOpsEventType[];
  recipient: ProdOpsRecipient | null;
  pendingLink: ProdOpsPendingLink | null;
}

export type ProdOpsOutboxStatus = "pending" | "sent" | "dropped" | "dead";

export interface ProdOpsOutboxEvent {
  id: string;
  eventType: ProdOpsEventType;
  userId: string;
  dedupeKey: string;
  sourceApp: "trefolio";
  summary: string;
  adminUrl: string;
  payloadJson: string;
  status: ProdOpsOutboxStatus;
  attempts: number;
  nextAttemptAt: string;
  lastAttemptedAt: string;
  lastError: string;
  sentAt: string;
  createdAt: string;
}

export interface PriceAlert {
  id: string;
  ticker: string;
  name: string;
  condition: AlertCondition;
  threshold: number;
  currency: string;
  active: boolean;
  triggered: boolean;
  triggeredAt: string;
  createdAt: string;
  alertType: AlertType;
  percentBasis: PercentBasis | "";
  percentValue: number;
  isPortfolioWide: boolean;
  portfolioId: string;
}

/** Saved row from Tools → Strategies (reference prices + links to threshold alerts). */
export interface InvestmentStrategy {
  id: string;
  userId: string;
  ticker: string;
  exchange: string;
  name: string;
  purchasePrice: number;
  currency: string;
  targetPrice: number;
  stopLossPrice: number;
  targetAlertId: string;
  stopAlertId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
  createdAt: string;
}

export interface DeviceNotification {
  id: string;
  title: string;
  message: string;
  ticker: string;
  read: boolean;
  createdAt: string;
}

export type NotificationType = "welcome" | "upgrade" | "downgrade" | "admin" | "info";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  titleEs: string;
  message: string;
  messageEs: string;
  link: string;
  linkLabel: string;
  linkLabelEs: string;
  read: boolean;
  createdAt: string;
}

export type ManualAssetType = "cash" | "real_estate" | "savings" | "pension" | "fixed_return";

export type HoldingAssetType = "stock" | "etf" | "crypto" | "fund";

export interface Holding {
  id: string;
  name: string;
  ticker: string;
  isin: string;
  assetType?: HoldingAssetType;
  shares: number;
  purchasePrice: number;
  displayCurrency: string;
  exchange: string;
  valueInEUR: number;
  accountId?: string;
  sector?: string;
  region?: string;
  assetClass?: string;
  /** User-defined labels for stock/ETF positions; JSON array in DB */
  tags?: string[];
}

export interface CashEntry {
  id: string;
  name: string;
  amountEUR: number;
  type?: ManualAssetType;
  source?: string;
  displayCurrency?: string;
  displayAmount?: number;
  notes?: string;
  valuationDate?: string;
  /** Fixed-return: ISO start date YYYY-MM-DD */
  startDate?: string;
  /** Fixed-return: term length in whole months */
  termMonths?: number;
  /** Fixed-return: total return over the full term, percent (e.g. 25) */
  totalReturnPct?: number;
}

/* ── Transaction Ledger ──────────────────────────────────── */

export type TransactionType = "buy" | "sell" | "dividend" | "fee";

export interface Transaction {
  id: string;
  holdingId: string;
  ticker: string;
  name?: string;
  exchange?: string;
  isin?: string;
  assetType?: HoldingAssetType;
  accountId?: string;
  type: TransactionType;
  date: string;
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  fees: number;
  taxes: number;
  currency: string;
  displayCurrency?: string;
  exchangeRateEur?: number;
  notes: string;
  sourceRef?: string;
  brokerName?: string;
  createdAt: string;
}

/* ── Watchlist ────────────────────────────────────────────── */

export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  exchange: string;
  addedAt: string;
}

/* ── Accounts / Portfolios ────────────────────────────────── */

export interface Account {
  id: string;
  name: string;
  broker: string;
  currency: string;
  createdAt: string;
}

/* ── Taxonomy / Classification ────────────────────────────── */

export interface TaxonomyAllocation {
  label: string;
  valueEUR: number;
  percent: number;
  color: string;
}

/* ── Rebalancing ──────────────────────────────────────────── */

export interface RebalanceTarget {
  id: string;
  category: string;
  label: string;
  targetPercent: number;
}

export interface RebalanceDrift {
  label: string;
  targetPercent: number;
  actualPercent: number;
  driftPercent: number;
  valueEUR: number;
  actionEUR: number;
}

export interface RebalanceMove {
  id: string;
  sourceLabel: string;
  destLabel: string;
  amountEUR: number;
}

export interface RebalancePlan {
  mode: "add_money" | "move_funds";
  newCapitalEUR?: number;
  allocations: { label: string; amountEUR: number; holdings: { ticker: string; amountEUR: number }[] }[];
  moves: RebalanceMove[];
}

/* ── Goals ────────────────────────────────────────────────── */

export type GoalType = "retirement" | "fire" | "house" | "education" | "emergency_fund" | "vacation" | "custom";

export interface GoalMilestone {
  percent: number;
  label: string;
  reachedAt: string | null;
}

export interface Goal {
  id: string;
  userId: string;
  portfolioId: string;
  name: string;
  goalType: GoalType;
  targetAmount: number;
  currency: string;
  growthRate: number;
  yearlyContribution: number;
  monthlyContribution: number;
  contributionMode: "monthly" | "yearly";
  reinvestDividends: boolean;
  horizon: number;
  targetDate: string | null;
  priority: number;
  milestones: GoalMilestone[];
  notes: string;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteData {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  currency: string;
  regularMarketPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap?: number;
  trailingAnnualDividendRate?: number;
  trailingAnnualDividendYield?: number;
  /** Yahoo / provider instrument class (e.g. EQUITY, ETF) — used for classification hints */
  quoteType?: string;
  providerUsed?: string;
  fetchedAt?: number;
}

export interface CompanyOverview {
  symbol: string;
  name: string;
  description: string;
  exchange: string;
  currency: string;
  sector: string;
  industry: string;
  peRatio: number | null;
  pegRatio: number | null;
  eps: number | null;
  dividendPerShare: number | null;
  dividendYield: number | null;
  beta: number | null;
  profitMargin: number | null;
  returnOnEquity: number | null;
  revenueTTM: number | null;
  analystTargetPrice: number | null;
  analystRatings: {
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
  } | null;
  fiftyDayMA: number | null;
  twoHundredDayMA: number | null;
  sharesOutstanding: number | null;
  forwardPE: number | null;
}

export interface IncomeStatementReport {
  fiscalDateEnding: string;
  reportedCurrency: string;
  totalRevenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingExpenses: number | null;
  operatingIncome: number | null;
  incomeBeforeTax: number | null;
  incomeTaxExpense: number | null;
  netIncome: number | null;
  ebitda: number | null;
  researchAndDevelopment: number | null;
  sellingGeneralAndAdmin: number | null;
  interestExpense: number | null;
}

export interface BalanceSheetReport {
  fiscalDateEnding: string;
  reportedCurrency: string;
  totalAssets: number | null;
  totalCurrentAssets: number | null;
  cashAndEquivalents: number | null;
  totalNonCurrentAssets: number | null;
  totalLiabilities: number | null;
  totalCurrentLiabilities: number | null;
  totalNonCurrentLiabilities: number | null;
  totalShareholderEquity: number | null;
  retainedEarnings: number | null;
  longTermDebt: number | null;
  shortTermDebt: number | null;
  commonStockSharesOutstanding: number | null;
}

export interface CashFlowReport {
  fiscalDateEnding: string;
  reportedCurrency: string;
  operatingCashflow: number | null;
  capitalExpenditures: number | null;
  changeInCash: number | null;
  freeCashFlow: number | null;
  dividendPayout: number | null;
  shareRepurchase: number | null;
  proceedsFromIssuanceOfDebt: number | null;
  paymentsForRepurchaseOfEquity: number | null;
}

export interface EarningsReport {
  fiscalDateEnding: string;
  reportedEPS: number | null;
  estimatedEPS: number | null;
  surprise: number | null;
  surprisePercentage: number | null;
}

export interface FundamentalData<T> {
  annual: T[];
  quarterly: T[];
}

export interface ETFHoldingEntry {
  symbol: string;
  name: string;
  weight: number;
}

export interface ETFSectorWeight {
  sector: string;
  weight: number;
}

export interface ETFHoldingsData {
  holdings: ETFHoldingEntry[];
  sectorWeightings: ETFSectorWeight[];
  category: string;
  fundFamily: string;
  legalType: string;
}

export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PortfolioSummary {
  totalValueEUR: number;
  totalCostEUR: number;
  totalGainLossEUR: number;
  totalGainLossPercent: number;
  holdingsCount: number;
  /** Base currency of the portfolio (defaults to EUR for backward compat) */
  currency?: string;
}

export interface SearchResult {
  symbol: string;
  shortname: string;
  exchange: string;
  quoteType: string;
}

export type ExchangeRates = Record<string, number>;

export type TimePeriod = "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | "all";

export type Language =
  | "en" | "es" | "fr" | "de" | "it" | "pt" | "nl" | "pl"
  | "cs" | "sk" | "hu" | "ro" | "bg" | "hr" | "sl" | "el"
  | "sv" | "da" | "fi" | "et" | "lv" | "lt" | "ga" | "mt"
  | "nb" | "uk" | "tr" | "sr" | "is" | "sq" | "bs" | "mk"
  | "be" | "ca" | "cy";

export type ExperienceLevel = "" | "beginner" | "intermediate" | "experienced" | "professional";

export type RefreshInterval = 15 | 30 | 60;

/* ── Moat Evaluation types ─────────────────────────────────── */

export type CriterionStatus = "pass" | "warning" | "fail";

export interface CriterionResult {
  key: string;
  name: string;
  status: CriterionStatus;
  value: string;
  numericValue: number | null;
  benchmark: string;
  score: number;
  maxScore: number;
  trend: number[];
}

export interface MoatEvaluation {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  totalScore: number;
  maxScore: number;
  verdict: string;
  criteriaCount: number;
  passedCount: number;
  criteria: CriterionResult[];
  valuation: {
    peRatio: number | null;
    forwardPE: number | null;
    pegRatio: number | null;
    augmentedPayoutRatio: number | null;
    sellTrigger: boolean;
  };
  overview: Record<string, unknown>;
  income: Record<string, unknown>;
  balance: Record<string, unknown>;
  cashflow: Record<string, unknown>;
  earnings: Record<string, unknown>;
}

/* ── AID digest ─────────────────────────────────────────────── */

export type AidNewsImpact = "high" | "medium" | "low";
export type AidNewsFilterTag = "earnings" | "move" | "news";
export type AidImpactScore = 1 | 2 | 3 | 4 | 5;
export type AidFeedSource = "digest" | "finpulse" | "earnings";

export interface AidFeedItem {
  id: string;
  source: AidFeedSource;
  impactScore: AidImpactScore;
  headline: string;
  sortDate: string;
  anchorId: string;
  label: string;
}

export interface AidDigestSummary {
  headline: string;
  bullets: string[];
  impact: AidNewsImpact;
  filterTags: AidNewsFilterTag[];
}

export interface AidDigestItem {
  id: string;
  ticker: string;
  movePct: number | null;
  headline: string;
  bullets: string[];
  impact: AidNewsImpact;
  impactScore: AidImpactScore;
  filterTags: AidNewsFilterTag[];
  usedWeb: boolean;
  cachedAt: string;
  eventKey: string;
}

export interface AidNewsCacheRow {
  id: string;
  userId: string;
  ticker: string;
  eventKey: string;
  headline: string;
  summaryJson: string;
  sourcesJson: string;
  usedWeb: boolean;
  fetchedAt: string;
  expiresAt: string;
}

export interface AidFinPulseSummary {
  headline: string;
  bullets: string[];
  impact: AidNewsImpact;
}

export interface AidFinPulseItem {
  id: string;
  handle: string;
  displayName: string;
  sourceUrl: string;
  publishedAt: string;
  headline: string;
  bullets: string[];
  impact: AidNewsImpact;
  impactScore: AidImpactScore;
  tickers: string[];
  tags: string[];
  cachedAt: string;
  portfolioRelevant: boolean;
}

export interface AidFinPulseFollowedAccount {
  handle: string;
  displayName: string;
}

export interface AidSocialPostRow {
  id: string;
  handle: string;
  postKey: string;
  sourceUrl: string;
  publishedAt: string;
  headline: string;
  summaryJson: string;
  tickersJson: string;
  tagsJson: string;
  fetchedAt: string;
  expiresAt: string;
}

export type {
  AidLayoutOrder,
  AidMainSectionId,
  AidSidebarSectionId,
} from "@/lib/aid/layout-sections";

export interface AidStatusPayload {
  newCount: number;
  caughtUp: boolean;
  breakdown: {
    finPulse: number;
    digest: number;
    earningsRecap: number;
    alerts: number;
  };
  briefing: string | null;
  marketSession: "pre" | "open" | "after" | "closed";
  warrenNudge: {
    kind: "mover" | "earnings" | "concentration";
    ticker: string;
    movePct?: number;
    concentrationPct?: number;
    prompt: string;
  } | null;
}

/* ── Alpha Intelligence types ──────────────────────────────── */

export type {
  NewsArticle,
  InsiderTransaction,
  InstitutionalHolder,
  EarningsTranscript,
  EconDataPoint,
  EconIndicatorResult,
} from "./api-providers/types";
