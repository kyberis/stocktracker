import { NextRequest } from "next/server";
import {
  clearSkippedRecommendationStates,
  getUserSettings,
  listCashEntries,
  listDistinctPortfolioIdsForUser,
  listHoldings,
  listRecommendationCronCandidates,
  upsertRecommendationCache,
} from "@/lib/db";
import { currentRecommendationWeekKey } from "@/lib/db/portfolio-recommendations";
import { buildPortfolioRecommendations } from "@/lib/homepage/build-portfolio-recommendations";
import { buildNeededFxPairs } from "@/lib/fx-pairs";
import { getQuotesWithCache, getRatesWithCache } from "@/lib/quote-cache";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { isTestAccountEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CONCURRENCY = 4;
/** Prefetch only recently active users; Home computes the rest on cache miss. */
const ACTIVE_WITHIN_DAYS = 7;

async function processPortfolio(
  userId: string,
  portfolioId: string,
  weekKey: string,
): Promise<"ok" | "empty" | "error"> {
  try {
    const [holdings, cashEntries, settings] = await Promise.all([
      listHoldings(userId, portfolioId || undefined),
      listCashEntries(userId, portfolioId || undefined),
      getUserSettings(userId),
    ]);
    if (holdings.length === 0) return "empty";

    const tickers = [...new Set(holdings.map((h) => h.ticker).filter(Boolean))];
    const quotes = tickers.length > 0 ? await getQuotesWithCache(tickers) : {};
    const currencies = new Set<string>();
    for (const h of holdings) {
      if (h.displayCurrency) currencies.add(h.displayCurrency);
    }
    for (const q of Object.values(quotes)) {
      if (q.currency) currencies.add(q.currency);
    }
    const rates = await getRatesWithCache(buildNeededFxPairs(currencies));

    const queue = buildPortfolioRecommendations({
      holdings,
      cashEntries,
      quotes,
      exchangeRates: rates,
      preferredCurrency: settings.defaultCurrency || "EUR",
    });

    await upsertRecommendationCache(userId, portfolioId, weekKey, queue);
    return "ok";
  } catch (err) {
    console.error(
      `[portfolio-recommendations] user=${userId} portfolio=${portfolioId}`,
      err instanceof Error ? err.message : err,
    );
    return "error";
  }
}

const runPortfolioRecommendations = withCronLogging(
  "portfolio-recommendations",
  async () => {
    const weekKey = currentRecommendationWeekKey();
    const candidates = await listRecommendationCronCandidates(ACTIVE_WITHIN_DAYS);

    let skippedTest = 0;
    const userIds: string[] = [];
    for (const c of candidates) {
      if (isTestAccountEmail(c.email)) {
        skippedTest += 1;
        continue;
      }
      userIds.push(c.userId);
    }

    let processed = 0;
    let emptied = 0;
    let errors = 0;
    let portfolios = 0;

    for (let i = 0; i < userIds.length; i += CONCURRENCY) {
      const batch = userIds.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (userId) => {
          const portfolioIds = await listDistinctPortfolioIdsForUser(userId);
          const targets = portfolioIds.length > 0 ? portfolioIds : [""];

          // New weekly run: allow previously skipped tips to resurface
          await clearSkippedRecommendationStates(userId);

          for (const portfolioId of targets) {
            portfolios += 1;
            const result = await processPortfolio(userId, portfolioId, weekKey);
            if (result === "ok") processed += 1;
            else if (result === "empty") emptied += 1;
            else errors += 1;
          }
        }),
      );
    }

    return {
      weekKey,
      candidates: candidates.length,
      skippedTest,
      skippedInactiveOrMissing: "filtered_in_sql",
      users: userIds.length,
      portfolios,
      processed,
      emptied,
      errors,
      activeWithinDays: ACTIVE_WITHIN_DAYS,
    };
  },
);

function authorize(req: NextRequest) {
  return verifyCronAuth("portfolio-recommendations", req);
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runPortfolioRecommendations();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runPortfolioRecommendations();
}
