import { buildPortfolioRecommendations } from "@/lib/homepage/build-portfolio-recommendations";
import { computeTopHoldingsConcentration } from "@/lib/aid/concentration";
import { computeDigestImpactScore } from "@/lib/aid/impact-score";
import { parseAidDigestSummary } from "@/lib/db/aid-news-cache";
import { fetchClaraSavingsSummary } from "@/lib/ai/office/clara-client";
import { fetchWillRecentTags } from "@/lib/ai/office/will-client";
import { resolveOfficeIdentity } from "@/lib/ai/office/office-identity";
import { listActiveAgentMissions } from "@/lib/db/agent-office";
import { listAidNewsCacheForUser } from "@/lib/db/aid-news-cache";
import { listAidSocialPostsSince } from "@/lib/db/aid-social-posts";
import { listAlerts, listCalendarEvents, listHoldings, listMarketDigests } from "@/lib/db";
import { getLatestDigest } from "@/lib/db/weekly-digest";
import { derivePortfolioNewsTickersFromHoldings } from "@/lib/portfolio-news-tickers";
import { getMarketStatus } from "@/lib/market-hours";
import { buildNeededFxPairs } from "@/lib/fx-pairs";
import { getQuotesWithCache, getRatesWithCache } from "@/lib/quote-cache";
import { remainingDaysInMonth } from "@/lib/clara-desk-status";
import { hasAgentBoardContextKey } from "@/lib/db/agent-board";
import type { AgentBoardSignal } from "@/lib/agent-board/types";
import type { CashEntry, ExchangeRates, Holding, QuoteData } from "@/lib/types";

const MOVER_THRESHOLD = 2.5;
const NEWS_IMPACT_MIN = 3;
const FINPULSE_LOOKBACK_MS = 24 * 3600 * 1000;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function expiresInHours(h: number): string {
  return new Date(Date.now() + h * 3600 * 1000).toISOString();
}

async function filterNewSignals(
  userId: string,
  signals: AgentBoardSignal[],
): Promise<AgentBoardSignal[]> {
  const out: AgentBoardSignal[] = [];
  for (const s of signals) {
    if (!(await hasAgentBoardContextKey(userId, s.contextKey))) {
      out.push(s);
    }
  }
  return out;
}

function collectMarketOpenSignals(
  holdings: Holding[],
  day: string,
): AgentBoardSignal[] {
  const exchanges = new Map<string, string>();
  for (const h of holdings) {
    if (h.assetType === "crypto") continue;
    const ex = h.exchange?.toUpperCase();
    if (!ex) continue;
    const status = getMarketStatus(ex);
    if (!status.isOpen) continue;
    const label = ex;
    if (!exchanges.has(ex)) exchanges.set(ex, label);
  }

  return [...exchanges.entries()].map(([ex, label]) => ({
    agent: "warren" as const,
    kind: "market_open" as const,
    contextKey: `market_open:${ex}:${day}`,
    priority: 2,
    payload: { exchange: ex, label },
    suggestedChipPrompt: `What should I watch today with ${label} now open?`,
  }));
}

function collectMoverSignals(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  day: string,
): AgentBoardSignal[] {
  const movers = holdings
    .map((h) => ({
      ticker: h.ticker,
      pct: quotes[h.ticker]?.regularMarketChangePercent ?? null,
    }))
    .filter((m) => m.pct != null && Math.abs(m.pct!) >= MOVER_THRESHOLD)
    .sort((a, b) => Math.abs(b.pct!) - Math.abs(a.pct!))
    .slice(0, 3);

  return movers.map((m) => ({
    agent: "warren" as const,
    kind: "mover" as const,
    contextKey: `mover:${m.ticker}:${day}`,
    priority: m.pct! >= 5 || m.pct! <= -5 ? 1 : 2,
    payload: { ticker: m.ticker, movePct: m.pct! },
    suggestedChipPrompt: `What should I know about ${m.ticker} today? It moved ${m.pct! >= 0 ? "+" : ""}${m.pct!.toFixed(1)}%.`,
  }));
}

function collectNear52wSignals(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  day: string,
): AgentBoardSignal[] {
  const signals: AgentBoardSignal[] = [];
  for (const h of holdings) {
    const q = quotes[h.ticker];
    const price = q?.regularMarketPrice;
    const high = q?.fiftyTwoWeekHigh;
    const low = q?.fiftyTwoWeekLow;
    if (price == null || high == null || low == null || high <= 0) continue;
    const nearHigh = price >= high * 0.97;
    const nearLow = price <= low * 1.03;
    if (!nearHigh && !nearLow) continue;
    signals.push({
      agent: "warren",
      kind: "near_52w",
      contextKey: `near52w:${h.ticker}:${nearHigh ? "high" : "low"}:${day}`,
      priority: 3,
      payload: {
        ticker: h.ticker,
        side: nearHigh ? "high" : "low",
        price,
        level: nearHigh ? high : low,
      },
      suggestedChipPrompt: nearHigh
        ? `${h.ticker} is near its 52-week high. What should I consider?`
        : `${h.ticker} is near its 52-week low. What context matters here?`,
    });
  }
  return signals.slice(0, 2);
}

async function collectCatalystSignals(
  tickers: string[],
  day: string,
): Promise<AgentBoardSignal[]> {
  if (tickers.length === 0) return [];
  const from = day;
  const toDate = new Date(day);
  toDate.setUTCDate(toDate.getUTCDate() + 3);
  const to = toDate.toISOString().slice(0, 10);

  const events = await listCalendarEvents({
    from,
    to,
    symbols: tickers.map((t) => t.toUpperCase()),
    types: ["earnings", "splits"],
  });

  return events.slice(0, 4).map((e) => {
    const sym = e.symbol ?? tickers[0] ?? "";
    const type = e.event_type ?? "event";
    return {
      agent: "warren" as const,
      kind: "catalyst" as const,
      contextKey: `catalyst:${type}:${sym}:${e.event_date}`,
      priority: type === "earnings" && e.event_date === day ? 1 : 2,
      payload: {
        ticker: sym,
        eventType: type,
        eventDate: e.event_date,
        name: e.name ?? "",
      },
      suggestedChipPrompt:
        type === "earnings"
          ? `Summarize what I should watch for ${sym} earnings on ${e.event_date}.`
          : `What does the upcoming ${type} for ${sym} mean for my portfolio?`,
    };
  });
}

function collectRecommendationSignals(
  recommendations: ReturnType<typeof buildPortfolioRecommendations>,
  weekKey: string,
): AgentBoardSignal[] {
  return recommendations.slice(0, 2).map((r, idx) => ({
    agent: "warren" as const,
    kind: "recommendation" as const,
    contextKey: `rec:${r.key}:${weekKey}`,
    priority: 3 + idx,
    payload: {
      kind: r.kind,
      key: r.key,
      ticker: r.ticker ?? "",
      pct: r.pct ?? 0,
      sectors: (r.sectors ?? []).join(", "),
    },
    suggestedChipPrompt: `Explain this portfolio tip: ${r.kind} (${r.key}).`,
  }));
}

function collectNewsSignals(
  newsRows: Awaited<ReturnType<typeof listAidNewsCacheForUser>>,
  quotes: Record<string, QuoteData>,
  day: string,
): AgentBoardSignal[] {
  const signals: AgentBoardSignal[] = [];
  for (const row of newsRows) {
    const summary = parseAidDigestSummary(row.summaryJson);
    if (!summary) continue;
    const impactScore = computeDigestImpactScore({
      impact: summary.impact,
      movePct: quotes[row.ticker]?.regularMarketChangePercent ?? null,
      filterTags: summary.filterTags ?? [],
    });
    if (impactScore < NEWS_IMPACT_MIN) continue;
    signals.push({
      agent: "warren",
      kind: summary.filterTags?.includes("earnings") ? "earnings" : "news",
      contextKey: `news:${row.eventKey}:${day}`,
      priority: impactScore <= 2 ? 1 : impactScore <= 3 ? 2 : 3,
      payload: {
        ticker: row.ticker,
        headline: row.headline || summary.headline,
        impact: summary.impact,
        bullets: summary.bullets.slice(0, 2).join(" | "),
      },
      suggestedChipPrompt: `Tell me more about this news for ${row.ticker}: ${summary.headline}`,
    });
    if (signals.length >= 5) break;
  }
  return signals;
}

function collectFinPulseSignals(
  posts: Awaited<ReturnType<typeof listAidSocialPostsSince>>,
  portfolioTickers: string[],
  day: string,
): AgentBoardSignal[] {
  const upper = new Set(portfolioTickers.map((t) => t.toUpperCase()));
  return posts
    .filter((p) => {
      try {
        const tickers = JSON.parse(p.tickersJson || "[]") as string[];
        return tickers.some((t) => upper.has(String(t).toUpperCase()));
      } catch {
        return false;
      }
    })
    .slice(0, 3)
    .map((p) => ({
      agent: "warren" as const,
      kind: "finpulse" as const,
      contextKey: `finpulse:${p.postKey}:${day}`,
      priority: 2,
      payload: {
        handle: p.handle,
        headline: p.headline,
        tickers: p.tickersJson,
      },
      suggestedChipPrompt: `How does this FinPulse post relate to my portfolio? ${p.headline}`,
    }));
}

function collectAlertSignals(
  alerts: Awaited<ReturnType<typeof listAlerts>>,
  day: string,
): AgentBoardSignal[] {
  return alerts
    .filter((a) => a.active && a.triggered && a.ticker)
    .slice(0, 3)
    .map((a) => ({
      agent: "warren" as const,
      kind: "alert" as const,
      contextKey: `alert:${a.id}:${a.triggeredAt?.slice(0, 10) ?? day}`,
      priority: 1,
      payload: {
        ticker: a.ticker,
        name: a.name,
        condition: a.condition,
        threshold: a.threshold,
      },
      suggestedChipPrompt: `My alert for ${a.ticker} just fired. What should I look at next?`,
    }));
}

function collectConcentrationSignal(
  holdings: Holding[],
  cashEntries: CashEntry[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  day: string,
): AgentBoardSignal | null {
  const c = computeTopHoldingsConcentration(holdings, cashEntries, quotes, exchangeRates, "EUR");
  if (c.topThreePercent < 45 || !c.topTickers[0]) return null;
  return {
    agent: "warren",
    kind: "concentration",
    contextKey: `concentration:${day}`,
    priority: 3,
    payload: {
      topTicker: c.topTickers[0],
      topThreePercent: c.topThreePercent,
    },
    suggestedChipPrompt: `Am I too concentrated? My top 3 holdings are ${c.topThreePercent.toFixed(0)}% of the portfolio.`,
  };
}

async function collectMarketDigestSignals(
  userId: string,
  tickers: string[],
  day: string,
): Promise<AgentBoardSignal[]> {
  if (tickers.length === 0) return [];
  const digests = await listMarketDigests({ status: "published", limit: 5 });
  const upper = new Set(tickers.map((t) => t.toUpperCase()));
  const signals: AgentBoardSignal[] = [];
  for (const d of digests) {
    const mentioned = (d.mentionedTickers ?? []).filter((t) => upper.has(t.toUpperCase()));
    if (mentioned.length === 0) continue;
    signals.push({
      agent: "warren",
      kind: "market_digest",
      contextKey: `market_digest:${d.id}:${day}`,
      priority: 3,
      payload: {
        title: d.originalSubject,
        summary: d.rawText?.slice(0, 200) ?? "",
        tickers: mentioned.join(", "),
      },
      suggestedChipPrompt: `How does today's market digest affect my holdings (${mentioned.join(", ")})?`,
    });
    if (signals.length >= 2) break;
  }
  return signals;
}

async function collectWeeklyDigestSignal(
  userId: string,
  weekKey: string,
): Promise<AgentBoardSignal | null> {
  const digest = await getLatestDigest(userId);
  if (!digest?.summaryText) return null;
  return {
    agent: "warren",
    kind: "weekly_digest",
    contextKey: `weekly_digest:${weekKey}`,
    priority: 4,
    payload: {
      summary: digest.summaryText.slice(0, 240),
      weekEnd: digest.weekEnd,
    },
    suggestedChipPrompt: "Summarize my week in the portfolio and what to watch next.",
  };
}

async function collectClaraSignals(
  userId: string,
  day: string,
): Promise<AgentBoardSignal[]> {
  const identity = await resolveOfficeIdentity(userId);
  if (!identity) return [];
  const clara = await fetchClaraSavingsSummary(identity);
  if (!clara.available) return [];

  const signals: AgentBoardSignal[] = [];
  const surplus = clara.surplusEur;
  const monthBalance = clara.monthBalance;
  const daysLeft = remainingDaysInMonth(clara.dayOfMonth, clara.daysInMonth);

  if (typeof surplus === "number" && surplus > 0) {
    signals.push({
      agent: "clara",
      kind: "clara_surplus",
      contextKey: `clara_surplus:${day}`,
      priority: 3,
      payload: { surplusEur: surplus, currency: clara.currency ?? "EUR" },
      suggestedChipPrompt: "I have monthly surplus in Clara. How could I put it to work?",
    });
  }

  if (
    typeof clara.emergencyBalanceEur === "number" &&
    typeof clara.emergencyTargetEur === "number" &&
    clara.emergencyBalanceEur < clara.emergencyTargetEur
  ) {
    signals.push({
      agent: "clara",
      kind: "clara_emergency",
      contextKey: `clara_emergency:${day}`,
      priority: 2,
      payload: {
        balance: clara.emergencyBalanceEur,
        target: clara.emergencyTargetEur,
      },
      suggestedChipPrompt: "My emergency fund is below target. What should I prioritize?",
    });
  }

  if (typeof monthBalance === "number" && monthBalance < 0) {
    signals.push({
      agent: "clara",
      kind: "clara_month",
      contextKey: `clara_month_negative:${day}`,
      priority: 2,
      payload: { monthBalance, currency: clara.currency ?? "EUR" },
      suggestedChipPrompt: "My month balance in Clara is negative. What should I adjust?",
    });
  }

  if (
    daysLeft != null &&
    daysLeft <= 5 &&
    typeof clara.remainingExpenses === "number" &&
    clara.remainingExpenses > (surplus ?? 0)
  ) {
    signals.push({
      agent: "clara",
      kind: "clara_end_month",
      contextKey: `clara_end_month:${day}`,
      priority: 2,
      payload: { daysLeft, remainingExpenses: clara.remainingExpenses },
      suggestedChipPrompt: `With ${daysLeft} days left in the month, help me plan remaining expenses.`,
    });
  }

  return signals;
}

async function collectWillSignals(userId: string, day: string): Promise<AgentBoardSignal[]> {
  const identity = await resolveOfficeIdentity(userId);
  if (!identity) return [];
  const will = await fetchWillRecentTags(identity);
  if (!will.available || !will.tags?.length) return [];
  return [
    {
      agent: "clara" as const,
      kind: "will_note" as const,
      contextKey: `will_tags:${day}`,
      priority: 4,
      payload: {
        tags: will.tags.slice(0, 5).map((t) => t.label).join(", "),
        excerpt: will.excerpt?.slice(0, 160) ?? "",
      },
      suggestedChipPrompt: "Summarize my recent Will notes related to money decisions.",
    },
  ];
}

async function collectOfficeMissionSignals(userId: string, day: string): Promise<AgentBoardSignal[]> {
  const missions = await listActiveAgentMissions(userId);
  const pending = missions.flatMap((m) =>
    m.steps
      .filter((s) => s.status === "pending" || s.status === "ready")
      .map((s) => ({ mission: m, step: s })),
  );
  return pending.slice(0, 2).map(({ mission, step }) => ({
    agent: step.agent === "clara" ? ("clara" as const) : ("warren" as const),
    kind: "office_mission" as const,
    contextKey: `mission:${mission.id}:step${step.step}:${day}`,
    priority: 2,
    payload: {
      missionTitle: mission.title,
      stepAction: step.action,
      stepKind: step.kind,
    },
    suggestedChipPrompt: `Help me with my Office mission step: ${step.action}`,
  }));
}

export async function collectAgentBoardSignals(args: {
  userId: string;
  portfolioId?: string;
}): Promise<AgentBoardSignal[]> {
  const day = todayKey();
  const weekKey = day.slice(0, 7);

  const [holdings, cashEntries, alerts, newsRows] = await Promise.all([
    listHoldings(args.userId, args.portfolioId),
    import("@/lib/db").then((m) => m.listCashEntries(args.userId, args.portfolioId)),
    listAlerts(args.userId),
    listAidNewsCacheForUser(args.userId, 30),
  ]);

  const tickers = derivePortfolioNewsTickersFromHoldings(holdings);
  const quotes =
    tickers.length > 0 ? await getQuotesWithCache(tickers) : {};
  const currencies = new Set<string>();
  for (const h of holdings) {
    if (h.displayCurrency) currencies.add(h.displayCurrency);
  }
  for (const q of Object.values(quotes)) {
    if (q.currency) currencies.add(q.currency);
  }
  const exchangeRates = await getRatesWithCache(buildNeededFxPairs(currencies));

  const sinceFin = new Date(Date.now() - FINPULSE_LOOKBACK_MS).toISOString();
  const finPosts = await listAidSocialPostsSince(sinceFin, 20);

  const recommendations = buildPortfolioRecommendations({
    holdings,
    cashEntries,
    quotes,
    exchangeRates,
    preferredCurrency: "EUR",
  });

  const raw: AgentBoardSignal[] = [
    ...collectMarketOpenSignals(holdings, day),
    ...collectMoverSignals(holdings, quotes, day),
    ...collectNear52wSignals(holdings, quotes, day),
    ...(await collectCatalystSignals(tickers, day)),
    ...collectRecommendationSignals(recommendations, weekKey),
    ...collectNewsSignals(newsRows, quotes, day),
    ...collectFinPulseSignals(finPosts, tickers, day),
    ...collectAlertSignals(alerts, day),
    ...(await collectMarketDigestSignals(args.userId, tickers, day)),
    ...(await collectClaraSignals(args.userId, day)),
    ...(await collectWillSignals(args.userId, day)),
    ...(await collectOfficeMissionSignals(args.userId, day)),
  ];

  const concentration = collectConcentrationSignal(holdings, cashEntries, quotes, exchangeRates, day);
  if (concentration) raw.push(concentration);

  const weekly = await collectWeeklyDigestSignal(args.userId, weekKey);
  if (weekly) raw.push(weekly);

  raw.sort((a, b) => a.priority - b.priority);

  return filterNewSignals(args.userId, raw);
}

export { expiresInHours, todayKey };
