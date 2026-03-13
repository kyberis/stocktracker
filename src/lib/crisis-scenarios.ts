/**
 * Pre-built historical crisis scenarios with sector-level drawdown data.
 * Drawdown values represent peak-to-trough declines as decimals (0.58 = 58% loss).
 * Data sourced from S&P 500 sector indices during each crisis period.
 */

export interface CrisisScenario {
  id: string;
  name: string;
  /** i18n key for translated name */
  nameKey: string;
  dateRange: string;
  durationMonths: number;
  benchmarkIndex: string;
  benchmarkDrawdown: number;
  estimatedRecoveryYears: number;
  /** Sector → drawdown decimal */
  sectorDrawdowns: Record<string, number>;
  /** Default drawdown for unclassified holdings */
  defaultDrawdown: number;
}

export const CRISIS_SCENARIOS: CrisisScenario[] = [
  {
    id: "gfc-2008",
    name: "2008 Financial Crisis",
    nameKey: "crisisGfc2008",
    dateRange: "Sep 2008 – Mar 2009",
    durationMonths: 6,
    benchmarkIndex: "S&P 500",
    benchmarkDrawdown: 0.568,
    estimatedRecoveryYears: 4.5,
    sectorDrawdowns: {
      "Financial Services": 0.83,
      Financials: 0.83,
      "Real Estate": 0.72,
      Technology: 0.58,
      "Consumer Cyclical": 0.61,
      Industrials: 0.58,
      "Basic Materials": 0.56,
      Energy: 0.55,
      Communication: 0.50,
      "Communication Services": 0.50,
      "Consumer Defensive": 0.32,
      Healthcare: 0.32,
      Utilities: 0.38,
      Diversified: 0.45,
    },
    defaultDrawdown: 0.50,
  },
  {
    id: "covid-2020",
    name: "COVID-19 Crash",
    nameKey: "crisisCovid2020",
    dateRange: "Feb 2020 – Mar 2020",
    durationMonths: 1,
    benchmarkIndex: "S&P 500",
    benchmarkDrawdown: 0.339,
    estimatedRecoveryYears: 0.4,
    sectorDrawdowns: {
      Energy: 0.62,
      "Real Estate": 0.42,
      "Financial Services": 0.38,
      Financials: 0.38,
      Industrials: 0.40,
      "Consumer Cyclical": 0.36,
      "Basic Materials": 0.32,
      Technology: 0.28,
      Communication: 0.30,
      "Communication Services": 0.30,
      Healthcare: 0.25,
      "Consumer Defensive": 0.22,
      Utilities: 0.32,
      Diversified: 0.30,
    },
    defaultDrawdown: 0.33,
  },
  {
    id: "dotcom-2000",
    name: "Dot-com Bubble",
    nameKey: "crisisDotcom2000",
    dateRange: "Mar 2000 – Oct 2002",
    durationMonths: 31,
    benchmarkIndex: "Nasdaq",
    benchmarkDrawdown: 0.784,
    estimatedRecoveryYears: 7,
    sectorDrawdowns: {
      Technology: 0.82,
      Communication: 0.70,
      "Communication Services": 0.70,
      "Consumer Cyclical": 0.45,
      Industrials: 0.40,
      "Financial Services": 0.25,
      Financials: 0.25,
      Healthcare: 0.30,
      Energy: 0.20,
      "Basic Materials": 0.22,
      "Consumer Defensive": 0.15,
      Utilities: 0.52,
      "Real Estate": 0.12,
      Diversified: 0.40,
    },
    defaultDrawdown: 0.40,
  },
  {
    id: "rate-hike-2022",
    name: "2022 Rate Hike Sell-off",
    nameKey: "crisisRateHike2022",
    dateRange: "Jan 2022 – Oct 2022",
    durationMonths: 10,
    benchmarkIndex: "S&P 500",
    benchmarkDrawdown: 0.254,
    estimatedRecoveryYears: 1.2,
    sectorDrawdowns: {
      Technology: 0.35,
      "Communication Services": 0.40,
      Communication: 0.40,
      "Consumer Cyclical": 0.35,
      "Real Estate": 0.30,
      "Financial Services": 0.22,
      Financials: 0.22,
      Industrials: 0.18,
      Healthcare: 0.12,
      "Consumer Defensive": 0.08,
      Energy: -0.15, // Energy rallied during 2022
      Utilities: 0.10,
      "Basic Materials": 0.16,
      Diversified: 0.22,
    },
    defaultDrawdown: 0.22,
  },
  {
    id: "euro-debt-2010",
    name: "Euro Debt Crisis",
    nameKey: "crisisEuroDebt2010",
    dateRange: "Apr 2010 – Jun 2012",
    durationMonths: 26,
    benchmarkIndex: "Euro Stoxx 50",
    benchmarkDrawdown: 0.382,
    estimatedRecoveryYears: 3,
    sectorDrawdowns: {
      "Financial Services": 0.55,
      Financials: 0.55,
      "Real Estate": 0.35,
      Industrials: 0.30,
      "Basic Materials": 0.32,
      Energy: 0.28,
      Technology: 0.22,
      "Consumer Cyclical": 0.28,
      Communication: 0.25,
      "Communication Services": 0.25,
      Healthcare: 0.15,
      "Consumer Defensive": 0.12,
      Utilities: 0.30,
      Diversified: 0.28,
    },
    defaultDrawdown: 0.28,
  },
];

/** Sectors used across all scenarios for the custom scenario builder */
export const ALL_SECTORS = [
  "Technology",
  "Financial Services",
  "Healthcare",
  "Consumer Cyclical",
  "Consumer Defensive",
  "Industrials",
  "Energy",
  "Communication Services",
  "Real Estate",
  "Basic Materials",
  "Utilities",
  "Diversified",
] as const;
