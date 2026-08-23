import { listHoldings, listCalendarEvents } from "@/lib/db";
import { getLastAidVisitAt } from "@/lib/db/aid-user-state";
import { listAidNewsCacheForUser } from "@/lib/db/aid-news-cache";
import { listAidSocialPostsSince } from "@/lib/db/aid-social-posts";
import { listAlerts } from "@/lib/db/alerts";
import { derivePortfolioNewsTickersFromHoldings } from "@/lib/portfolio-news-tickers";
import { summarizeAidBriefing } from "@/lib/aid/summarize-finpulse";
import { buildWarrenNudge } from "@/lib/aid/build-warren-nudge";
import { resolveAidMarketSession } from "@/lib/aid/resolve-market-session";
import { languageCodeToName } from "@/lib/languages";
import { getRedisClient } from "@/lib/upstash";
import type { AidStatusPayload, Holding, QuoteData } from "@/lib/types";

export type MarketSession = AidStatusPayload["marketSession"];

const DIGEST_WINDOW_MS = 48 * 3600 * 1000;
/** Cache LLM briefing per user+UTC day so Home revisits skip OpenAI. */
const BRIEFING_TTL_SEC = 6 * 3600;

function isWithinDigestWindow(iso: string): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= DIGEST_WINDOW_MS;
}

function briefingCacheKey(userId: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `aid:briefing:${userId}:${day}`;
}

async function getCachedBriefing(userId: string): Promise<string | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const v = await redis.get<string>(briefingCacheKey(userId));
    return typeof v === "string" && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

async function setCachedBriefing(userId: string, text: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis || !text) return;
  try {
    await redis.set(briefingCacheKey(userId), text, { ex: BRIEFING_TTL_SEC });
  } catch {
    /* non-critical */
  }
}

export async function buildAidStatus(args: {
  userId: string;
  portfolioId?: string;
  language: string;
  quotes: Record<string, QuoteData>;
  /** Preloaded holdings (home bootstrap) — skips a second listHoldings. */
  holdings?: Holding[];
  includeBriefing?: boolean;
  includeWarrenNudge?: boolean;
}): Promise<AidStatusPayload> {
  const since = (await getLastAidVisitAt(args.userId)) ?? new Date(0).toISOString();
  const holdings =
    args.holdings ?? (await listHoldings(args.userId, args.portfolioId));
  const tickers = derivePortfolioNewsTickersFromHoldings(holdings);

  const [digestRows, finPulseRows, alerts] = await Promise.all([
    listAidNewsCacheForUser(args.userId, 50),
    listAidSocialPostsSince(since, 50),
    listAlerts(args.userId),
  ]);

  const digestNew = digestRows.filter(
    (r) => r.fetchedAt > since && isWithinDigestWindow(r.fetchedAt),
  ).length;
  const finPulseNew = finPulseRows.length;
  const triggeredAlerts = alerts.filter((a) => a.active && a.triggered).length;

  const today = new Date().toISOString().slice(0, 10);
  const earningsToday = tickers.length
    ? (
        await listCalendarEvents({
          types: ["earnings"],
          from: today,
          to: today,
          symbols: tickers.map((t) => t.toUpperCase()),
        })
      ).length
    : 0;

  const earningsRecapNew = digestRows.filter(
    (r) => r.eventKey.startsWith("earnings:") && r.fetchedAt > since,
  ).length;

  const newCount = digestNew + finPulseNew + triggeredAlerts;

  let briefing: string | null = null;
  if (args.includeBriefing === true && holdings.length > 0) {
    briefing = await getCachedBriefing(args.userId);
    if (!briefing) {
      const contextLines: string[] = [];
      if (finPulseNew > 0) contextLines.push(`${finPulseNew} new FinPulse posts`);
      if (digestNew > 0) contextLines.push(`${digestNew} new portfolio news summaries`);
      if (earningsToday > 0) contextLines.push(`${earningsToday} earnings today`);
      if (triggeredAlerts > 0) contextLines.push(`${triggeredAlerts} price alerts triggered`);

      const topMover = holdings
        .map((h) => ({
          ticker: h.ticker,
          pct: args.quotes[h.ticker]?.regularMarketChangePercent ?? null,
        }))
        .filter((m) => m.pct != null)
        .sort((a, b) => Math.abs(b.pct!) - Math.abs(a.pct!))[0];
      if (topMover?.pct != null) {
        contextLines.push(
          `Top mover: ${topMover.ticker} ${topMover.pct >= 0 ? "+" : ""}${topMover.pct.toFixed(1)}%`,
        );
      }

      if (contextLines.length > 0) {
        briefing = await summarizeAidBriefing({
          language: languageCodeToName(args.language),
          contextLines,
        });
        if (briefing) await setCachedBriefing(args.userId, briefing);
      }
    }
  }

  const warrenNudge =
    args.includeWarrenNudge !== false
      ? await buildWarrenNudge({
          userId: args.userId,
          holdings,
          quotes: args.quotes,
        })
      : null;

  return {
    newCount,
    caughtUp: newCount === 0,
    breakdown: {
      finPulse: finPulseNew,
      digest: digestNew,
      earningsRecap: earningsRecapNew,
      alerts: triggeredAlerts,
    },
    briefing,
    marketSession: resolveAidMarketSession(holdings),
    warrenNudge,
  };
}
