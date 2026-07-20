import type {
  CompanyOverview,
  EarningsReport,
  FundamentalData,
  IncomeStatementReport,
  InsiderTransaction,
  NewsArticle,
  ProviderHistoricalPoint,
  ProviderQuoteResult,
} from "@/lib/api-providers/types";
import type { FmpCongressTrade } from "@/lib/api-providers/fmp";
import { classifyInsiderTransaction } from "./insider-tags";
import type { NextQuarterConsensus } from "./next-quarter";
import { computeTechnicalLevels, yoyChange } from "./technicals";
import { sanitizeHttpUrl } from "./urls";
import type {
  CompanyAnalysisAlternative,
  CompanyAnalysisCongressItem,
  CompanyAnalysisFundamentals,
  CompanyAnalysisInsiderItem,
  CompanyAnalysisNewsItem,
  CompanyAnalysisPeer,
  CompanyAnalysisProfile,
  CompanyAnalysisQuote,
  CompanyAnalysisReport,
  CompanyAnalysisSource,
  CompanyAnalysisTechnicals,
  FundamentalRow,
} from "./types";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function grossMargin(income: IncomeStatementReport | undefined): number | null {
  if (!income?.totalRevenue || income.grossProfit == null) return null;
  if (income.totalRevenue === 0) return null;
  return (income.grossProfit / income.totalRevenue) * 100;
}

export function mapQuote(
  q: ProviderQuoteResult | null,
  overview: CompanyOverview | null,
): CompanyAnalysisQuote | null {
  if (!q && !overview) return null;
  return {
    price: q?.regularMarketPrice ?? null,
    change: q?.regularMarketChange ?? null,
    changePercent: q?.regularMarketChangePercent ?? null,
    dayHigh: null,
    dayLow: null,
    marketCap: q?.marketCap ?? null,
    fiftyTwoWeekHigh: q?.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: q?.fiftyTwoWeekLow ?? null,
    ma50: overview?.fiftyDayMA ?? null,
    ma200: overview?.twoHundredDayMA ?? null,
    currency: q?.currency ?? overview?.currency ?? null,
  };
}

export function mapProfile(overview: CompanyOverview | null): CompanyAnalysisProfile | null {
  if (!overview) return null;
  return {
    name: overview.name || overview.symbol || null,
    sector: overview.sector || null,
    industry: overview.industry || null,
    description: overview.description || null,
    exchange: overview.exchange || null,
    ipoDate: null,
  };
}

export function buildFundamentals(
  income: FundamentalData<IncomeStatementReport> | null,
  earnings: FundamentalData<EarningsReport> | null,
  nextQuarter?: NextQuarterConsensus | null,
): CompanyAnalysisFundamentals {
  const unavailable: CompanyAnalysisFundamentals = {
    status: "unavailable",
    lastQuarterLabel: null,
    lastReportDate: null,
    rows: [],
    nextQuarterLabel: null,
    nextReportDate: null,
    companyGuidanceRevenue: null,
    companyGuidanceRevenueVarPct: null,
    consensusRevenue: null,
    consensusRevenueVarPct: null,
    consensusEps: null,
    consensusEpsVarPct: null,
    lastEps: null,
    lastEpsVsConsensusPct: null,
    lastRevenue: null,
    lastRevenueYoyPct: null,
  };

  const quarterly = income?.quarterly ?? [];
  if (quarterly.length < 1) {
    // Still surface next-quarter consensus when income statement failed.
    if (
      nextQuarter &&
      (nextQuarter.consensusEps != null ||
        nextQuarter.consensusRevenue != null ||
        nextQuarter.nextReportDate)
    ) {
      return {
        ...unavailable,
        status: "ok",
        nextQuarterLabel: nextQuarter.nextQuarterLabel,
        nextReportDate: nextQuarter.nextReportDate,
        consensusRevenue: nextQuarter.consensusRevenue,
        consensusRevenueVarPct: nextQuarter.consensusRevenueVarPct,
        consensusEps: nextQuarter.consensusEps,
        consensusEpsVarPct: nextQuarter.consensusEpsVarPct,
      };
    }
    return unavailable;
  }

  const latest = quarterly[0]!;
  const priorYear = quarterly.find((r) => {
    const a = parseDate(r.fiscalDateEnding);
    const b = parseDate(latest.fiscalDateEnding);
    if (!a || !b) return false;
    const months = Math.abs(
      (a.getUTCFullYear() - b.getUTCFullYear()) * 12 + (a.getUTCMonth() - b.getUTCMonth()),
    );
    return months >= 11 && months <= 13;
  });

  const rows: FundamentalRow[] = [
    {
      label: "revenue",
      value: latest.totalRevenue,
      yoyPct: yoyChange(latest.totalRevenue, priorYear?.totalRevenue),
      unit: "currency",
    },
    {
      label: "operatingIncome",
      value: latest.operatingIncome,
      yoyPct: yoyChange(latest.operatingIncome, priorYear?.operatingIncome),
      unit: "currency",
    },
    {
      label: "netIncome",
      value: latest.netIncome,
      yoyPct: yoyChange(latest.netIncome, priorYear?.netIncome),
      unit: "currency",
    },
    {
      label: "ebitda",
      value: latest.ebitda,
      yoyPct: yoyChange(latest.ebitda, priorYear?.ebitda),
      unit: "currency",
    },
    {
      label: "grossMargin",
      value: grossMargin(latest),
      yoyPct: yoyChange(grossMargin(latest), grossMargin(priorYear)),
      unit: "percent",
    },
  ];

  const earnQ = earnings?.quarterly ?? [];
  const lastEarn = earnQ[0] ?? null;
  const priorEarn = earnQ.length > 4 ? earnQ[4]! : null;
  if (lastEarn) {
    rows.unshift({
      label: "eps",
      value: lastEarn.reportedEPS,
      yoyPct: yoyChange(lastEarn.reportedEPS, priorEarn?.reportedEPS),
      unit: "eps",
    });
  }

  let lastEpsVsConsensusPct: number | null = null;
  if (
    lastEarn?.reportedEPS != null &&
    lastEarn.estimatedEPS != null &&
    lastEarn.estimatedEPS !== 0
  ) {
    lastEpsVsConsensusPct =
      ((lastEarn.reportedEPS - lastEarn.estimatedEPS) / Math.abs(lastEarn.estimatedEPS)) * 100;
  }

  // Next quarter consensus: prefer explicit outlook overlay (Yahoo 0q / FMP unreported),
  // then fall back to an unreported earnings history row. Never use last quarter's estimate
  // as "next quarter" consensus — that mislabels past consensus as a forecast.
  const nextEarn = earnQ.find(
    (e) => e.estimatedEPS != null && e.reportedEPS == null,
  );

  const consensusEps =
    nextQuarter?.consensusEps ?? nextEarn?.estimatedEPS ?? null;
  const consensusRevenue = nextQuarter?.consensusRevenue ?? null;
  const nextReportDate =
    nextQuarter?.nextReportDate ?? nextEarn?.fiscalDateEnding ?? null;
  const nextQuarterLabel =
    nextQuarter?.nextQuarterLabel ?? nextEarn?.fiscalDateEnding ?? null;

  return {
    status: "ok",
    lastQuarterLabel: latest.fiscalDateEnding || null,
    lastReportDate: latest.fiscalDateEnding || null,
    rows,
    nextQuarterLabel,
    nextReportDate,
    companyGuidanceRevenue: null,
    companyGuidanceRevenueVarPct: null,
    consensusRevenue,
    consensusRevenueVarPct: nextQuarter?.consensusRevenueVarPct ?? null,
    consensusEps,
    consensusEpsVarPct: nextQuarter?.consensusEpsVarPct ?? null,
    lastEps: lastEarn?.reportedEPS ?? null,
    lastEpsVsConsensusPct,
    lastRevenue: latest.totalRevenue,
    lastRevenueYoyPct: yoyChange(latest.totalRevenue, priorYear?.totalRevenue),
  };
}

export function buildTechnicals(
  history: ProviderHistoricalPoint[] | null,
  quote: CompanyAnalysisQuote | null,
  nextReportDate: string | null,
): CompanyAnalysisTechnicals {
  if (!history?.length) {
    return {
      status: "unavailable",
      closeHigh12m: null,
      closeHigh12mDate: null,
      distanceToCloseHigh12mPct: null,
      fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: quote?.fiftyTwoWeekLow ?? null,
      ma50: quote?.ma50 ?? null,
      ma200: quote?.ma200 ?? null,
      support: null,
      resistance: null,
      latestVolume: null,
      avgVolume: null,
      nextCatalystDate: nextReportDate,
    };
  }
  const levels = computeTechnicalLevels(history, quote?.price ?? null);
  return {
    status: "ok",
    closeHigh12m: levels.closeHigh,
    closeHigh12mDate: levels.closeHighDate,
    distanceToCloseHigh12mPct: levels.distanceToCloseHighPct,
    fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: quote?.fiftyTwoWeekLow ?? null,
    ma50: quote?.ma50 ?? levels.ma50,
    ma200: quote?.ma200 ?? levels.ma200,
    support: levels.support,
    resistance: levels.resistance,
    latestVolume: levels.latestVolume,
    avgVolume: levels.avgVolume,
    nextCatalystDate: nextReportDate,
  };
}

function newsRelevanceOk(article: NewsArticle, ticker: string, companyName: string | null): boolean {
  const hay = `${article.title} ${article.summary}`.toLowerCase();
  const t = ticker.toLowerCase();
  if (article.tickerSentiment?.some((ts) => ts.ticker.toUpperCase() === ticker && ts.relevance >= 0.2)) {
    return true;
  }
  if (hay.includes(t)) return true;
  if (companyName) {
    const parts = companyName.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (parts.some((p) => hay.includes(p))) return true;
  }
  return false;
}

export function buildNews(
  articles: NewsArticle[] | null,
  ticker: string,
  companyName: string | null,
  fundamentals: CompanyAnalysisFundamentals,
): { status: "ok" | "unavailable"; items: CompanyAnalysisNewsItem[] } {
  if (!articles) return { status: "unavailable", items: [] };

  const filtered = articles
    .filter((a) => newsRelevanceOk(a, ticker, companyName))
    .slice(0, 12);

  const earningsItem: CompanyAnalysisNewsItem = {
    kind: "earnings",
    title: `${companyName ?? ticker}: latest reported results`,
    summary: [
      fundamentals.lastRevenue != null
        ? `Revenue (last reported period): ${fundamentals.lastRevenue}`
        : null,
      fundamentals.lastRevenueYoyPct != null
        ? `Revenue YoY: ${fundamentals.lastRevenueYoyPct.toFixed(1)}%`
        : null,
      fundamentals.lastEps != null ? `EPS: ${fundamentals.lastEps}` : null,
      fundamentals.lastEpsVsConsensusPct != null
        ? `EPS vs consensus: ${fundamentals.lastEpsVsConsensusPct.toFixed(1)}%`
        : null,
      fundamentals.nextReportDate
        ? `Next report date (if known): ${fundamentals.nextReportDate}`
        : null,
    ]
      .filter(Boolean)
      .join(". "),
    date: fundamentals.lastReportDate,
    source: "Company fundamentals",
    url: null,
  };

  const others: CompanyAnalysisNewsItem[] = filtered.slice(0, 2).map((a) => ({
    kind: "news" as const,
    title: a.title,
    summary: a.summary,
    date: a.publishedAt || null,
    source: a.source || null,
    url: sanitizeHttpUrl(a.url),
  }));

  // Prefer filling with more news if we have fewer than 2 impact items
  while (others.length < 2 && filtered.length > others.length) {
    const next = filtered[others.length];
    if (!next) break;
    others.push({
      kind: "news",
      title: next.title,
      summary: next.summary,
      date: next.publishedAt || null,
      source: next.source || null,
      url: sanitizeHttpUrl(next.url),
    });
  }

  return { status: "ok", items: [earningsItem, ...others].slice(0, 3) };
}

export function buildInsiders(
  rows: InsiderTransaction[] | null,
): { status: "ok" | "unavailable"; items: CompanyAnalysisInsiderItem[] } {
  if (!rows) return { status: "unavailable", items: [] };
  const cutoff = daysAgo(90);
  const items = rows
    .filter((r) => {
      const d = parseDate(r.transactionDate);
      return d != null && d >= cutoff;
    })
    .slice(0, 8)
    .map((r) => {
      const tag = classifyInsiderTransaction(r.transactionType);
      const detailParts = [
        r.shares ? `${r.shares} shares` : null,
        r.sharePrice ? `@ ${r.sharePrice}` : null,
        r.transactionType || null,
      ].filter(Boolean);
      return {
        name: r.fullName || "Unknown",
        role: r.title || "",
        date: r.transactionDate,
        transactionType: r.transactionType,
        tag,
        detail: detailParts.join(" · "),
        shares: Number.isFinite(r.shares) ? r.shares : null,
        price: Number.isFinite(r.sharePrice) ? r.sharePrice : null,
        url: null as string | null,
      };
    });
  return { status: "ok", items };
}

export function buildCongress(
  trades: FmpCongressTrade[] | null,
): { status: "ok" | "unavailable"; items: CompanyAnalysisCongressItem[] } {
  if (trades == null) return { status: "unavailable", items: [] };
  const cutoff = daysAgo(365);
  const items = trades
    .filter((t) => {
      const d = parseDate(t.transactionDate) ?? parseDate(t.disclosureDate);
      return d != null && d >= cutoff;
    })
    .slice(0, 12)
    .map((t) => ({
      name: t.name,
      chamber: t.chamber,
      officeOrDistrict: t.officeOrDistrict,
      date: t.transactionDate || t.disclosureDate || "",
      transactionType: t.transactionType,
      amountRange: t.amountRange,
      url: sanitizeHttpUrl(t.url),
    }));
  return { status: "ok", items };
}

export function pickSectorAlternative(
  subjectTicker: string,
  subjectDist: number | null,
  peers: CompanyAnalysisPeer[],
): CompanyAnalysisAlternative {
  const ranked = peers
    .filter((p) => p.ticker !== subjectTicker && p.distanceTo52wHighPct != null)
    .sort((a, b) => (b.distanceTo52wHighPct ?? -999) - (a.distanceTo52wHighPct ?? -999));

  // Prefer a peer closer to its 52w high than the subject (better relative momentum).
  const winner =
    ranked.find((p) => {
      if (subjectDist == null) return true;
      return (p.distanceTo52wHighPct ?? -999) > subjectDist;
    }) ?? ranked[0] ?? null;

  if (!winner) {
    return {
      status: "unavailable",
      ticker: null,
      name: null,
      tagline: null,
      why: null,
      distanceTo52wHighPct: null,
      price: null,
      peersConsidered: peers,
    };
  }

  const distLabel =
    winner.distanceTo52wHighPct != null
      ? `${winner.distanceTo52wHighPct.toFixed(1)}% from 52-week high`
      : "52-week distance unavailable";

  return {
    status: "ok",
    ticker: winner.ticker,
    name: winner.name,
    tagline: distLabel,
    why: `Selected from sector peers using objective momentum (price vs 52-week high). ${winner.ticker} ranks ahead of ${subjectTicker} on that metric among the peers considered.`,
    distanceTo52wHighPct: winner.distanceTo52wHighPct,
    price: winner.price,
    peersConsidered: peers,
  };
}

export function peerDistanceTo52wHigh(
  price: number | null,
  high52: number | null,
): number | null {
  if (price == null || high52 == null || high52 === 0) return null;
  return ((price - high52) / high52) * 100;
}

export function collectSources(parts: {
  usedYahoo: boolean;
  usedFmp: boolean;
  newsUrls: (string | null)[];
  congressUrls: (string | null)[];
}): CompanyAnalysisSource[] {
  const sources: CompanyAnalysisSource[] = [];
  if (parts.usedYahoo) {
    sources.push({ name: "Yahoo Finance", url: "https://finance.yahoo.com" });
  }
  if (parts.usedFmp) {
    sources.push({
      name: "Financial Modeling Prep",
      url: "https://financialmodelingprep.com",
    });
  }
  sources.push({ name: "SEC EDGAR", url: "https://www.sec.gov/edgar" });
  for (const u of [...parts.newsUrls, ...parts.congressUrls]) {
    const clean = sanitizeHttpUrl(u);
    if (!clean) continue;
    if (sources.some((s) => s.url === clean)) continue;
    try {
      const host = new URL(clean).hostname.replace(/^www\./, "");
      sources.push({ name: host, url: clean });
    } catch {
      /* skip */
    }
  }
  return sources;
}

export function assembleReport(input: {
  ticker: string;
  updatedAt: string;
  cached: boolean;
  quote: ProviderQuoteResult | null;
  overview: CompanyOverview | null;
  history: ProviderHistoricalPoint[] | null;
  income: FundamentalData<IncomeStatementReport> | null;
  earnings: FundamentalData<EarningsReport> | null;
  nextQuarter?: NextQuarterConsensus | null;
  news: NewsArticle[] | null;
  insiders: InsiderTransaction[] | null;
  congress: FmpCongressTrade[] | null;
  peers: CompanyAnalysisPeer[];
  usedYahoo: boolean;
  usedFmp: boolean;
}): CompanyAnalysisReport {
  const quote = mapQuote(input.quote, input.overview);
  const profile = mapProfile(input.overview);
  const fundamentals = buildFundamentals(input.income, input.earnings, input.nextQuarter);
  const technicals = buildTechnicals(input.history, quote, fundamentals.nextReportDate);
  const news = buildNews(
    input.news,
    input.ticker,
    profile?.name ?? null,
    fundamentals,
  );
  const insiders = buildInsiders(input.insiders);
  const congress = buildCongress(input.congress);
  const subjectDist =
    peerDistanceTo52wHigh(quote?.price ?? null, quote?.fiftyTwoWeekHigh ?? null) ??
    technicals.distanceToCloseHigh12mPct;
  const alternative = pickSectorAlternative(input.ticker, subjectDist, input.peers);

  return {
    ticker: input.ticker,
    updatedAt: input.updatedAt,
    cached: input.cached,
    quote,
    profile,
    fundamentals,
    technicals,
    news,
    insiders,
    congress,
    alternative,
    sources: collectSources({
      usedYahoo: input.usedYahoo,
      usedFmp: input.usedFmp,
      newsUrls: news.items.map((n) => n.url),
      congressUrls: congress.items.map((c) => c.url),
    }),
  };
}
