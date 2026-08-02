import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listHoldings, listRecommendationStates, queryScreener } from "@/lib/db";
import { getQuotesWithCache } from "@/lib/quote-cache";
import {
  buildPortfolioRecommendations,
  filterRecommendationQueue,
  pickUnderweightSectors,
  computeSectorPercentsForRecommendations,
} from "@/lib/homepage/build-portfolio-recommendations";
import { withMetrics } from "@/lib/with-metrics";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/home-v2/diversify-research", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/home-v2/diversify-research", reason: "no_session" });

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;
  const holdings = await listHoldings(session.userId, portfolioId);
  if (holdings.length === 0) {
    return NextResponse.json({ sectors: [], recommendationKey: null });
  }

  const tickers = [...new Set(holdings.map((h) => h.ticker))];
  const quotes = tickers.length > 0 ? await getQuotesWithCache(tickers) : {};
  const owned = new Set(tickers.map((t) => t.toUpperCase()));

  const sectorAlloc = computeSectorPercentsForRecommendations(holdings, quotes, {});
  const under = pickUnderweightSectors(sectorAlloc, 2);

  // Prefer fingerprint from live diversify recommendation if still active
  const states = await listRecommendationStates(session.userId);
  const dismissed = new Set(states.map((s) => s.recommendationKey));
  const queue = buildPortfolioRecommendations({
    holdings,
    cashEntries: [],
    quotes,
    exchangeRates: {},
    preferredCurrency: "EUR",
  });
  const activeDiversify = filterRecommendationQueue(queue, dismissed).find(
    (r) => r.kind === "diversify",
  );
  const sectorsForResearch =
    activeDiversify?.sectors && activeDiversify.sectors.length >= 2
      ? activeDiversify.sectors.map((label, i) => ({
          label,
          pct: under.find((u) => u.label === label)?.pct ?? under[i]?.pct ?? 0,
        }))
      : under;

  const recommendationKey =
    activeDiversify?.key ??
    (sectorsForResearch.length >= 2
      ? `diversify:${sectorsForResearch[0]!.label}+${sectorsForResearch[1]!.label}`
      : null);

  const sectors = await Promise.all(
    sectorsForResearch.slice(0, 2).map(async (sector) => {
      const large = await queryScreener({
        sector: sector.label,
        marketCap: "large",
        sortBy: "marketCap",
        sortDir: "desc",
        limit: 12,
        page: 1,
      });
      let results = large.results.filter((r) => !owned.has(r.symbol.toUpperCase()));
      if (results.length < 3) {
        const mega = await queryScreener({
          sector: sector.label,
          marketCap: "mega",
          sortBy: "marketCap",
          sortDir: "desc",
          limit: 12,
          page: 1,
        });
        const extra = mega.results.filter(
          (r) =>
            !owned.has(r.symbol.toUpperCase()) &&
            !results.some((x) => x.symbol.toUpperCase() === r.symbol.toUpperCase()),
        );
        results = [...results, ...extra];
      }
      const candidates = results.slice(0, 3).map((r) => ({
        ticker: r.symbol,
        name: r.shortName || r.symbol,
        sector: r.sector || sector.label,
        marketCap: r.marketCap,
      }));
      return {
        label: sector.label,
        pct: Math.round(sector.pct),
        candidates,
      };
    }),
  );

  return NextResponse.json({ sectors, recommendationKey });
});
