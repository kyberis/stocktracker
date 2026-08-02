import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import {
  getUserSettings,
  listCashEntries,
  listHoldings,
  listRecommendationStates,
  trackEvent,
  upsertRecommendationState,
} from "@/lib/db";
import { getQuotesWithCache } from "@/lib/quote-cache";
import {
  buildPortfolioRecommendations,
  filterRecommendationQueue,
} from "@/lib/homepage/build-portfolio-recommendations";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";
import type { ExchangeRates } from "@/lib/types";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/home-v2/recommendations", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/home-v2/recommendations", reason: "no_session" });

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const [holdings, cashEntries, settings, states] = await Promise.all([
    listHoldings(session.userId, portfolioId),
    listCashEntries(session.userId, portfolioId),
    getUserSettings(session.userId),
    listRecommendationStates(session.userId),
  ]);

  if (holdings.length === 0) {
    return NextResponse.json({ current: null, remaining: 0, queue: [] });
  }

  const tickers = [...new Set(holdings.map((h) => h.ticker))];
  const quotes = tickers.length > 0 ? await getQuotesWithCache(tickers) : {};
  const rates: ExchangeRates = {};

  const queue = buildPortfolioRecommendations({
    holdings,
    cashEntries,
    quotes,
    exchangeRates: rates,
    preferredCurrency: settings.defaultCurrency || "EUR",
  });

  const dismissed = new Set(states.map((s) => s.recommendationKey));
  const active = filterRecommendationQueue(queue, dismissed);
  const current = active[0] ?? null;

  return NextResponse.json({
    current,
    remaining: Math.max(0, active.length - (current ? 1 : 0)),
    total: active.length,
    queue: active,
  });
});

const postSchema = z.object({
  key: z.string().min(1).max(200),
  action: z.enum(["skipped", "acted"]),
});

export const POST = withMetrics("/api/home-v2/recommendations", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/home-v2/recommendations", reason: "no_session" });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { key, action } = parsed.data;
  await upsertRecommendationState(session.userId, key, action);
  void trackEvent(session.userId, action === "acted" ? "home_rec_acted" : "home_rec_next", {
    key,
  });

  // Return next recommendation in the same response shape as GET
  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const [holdings, cashEntries, settings, states] = await Promise.all([
    listHoldings(session.userId, portfolioId),
    listCashEntries(session.userId, portfolioId),
    getUserSettings(session.userId),
    listRecommendationStates(session.userId),
  ]);

  const tickers = [...new Set(holdings.map((h) => h.ticker))];
  const quotes = tickers.length > 0 ? await getQuotesWithCache(tickers) : {};
  const queue = buildPortfolioRecommendations({
    holdings,
    cashEntries,
    quotes,
    exchangeRates: {},
    preferredCurrency: settings.defaultCurrency || "EUR",
  });
  const dismissed = new Set(states.map((s) => s.recommendationKey));
  const active = filterRecommendationQueue(queue, dismissed);
  const current = active[0] ?? null;

  return NextResponse.json({
    ok: true,
    current,
    remaining: Math.max(0, active.length - (current ? 1 : 0)),
    total: active.length,
    queue: active,
  });
});
