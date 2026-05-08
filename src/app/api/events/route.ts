import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listCalendarEvents, listHoldings, findUserById } from "@/lib/db";
import { canAccessFeature } from "@/lib/subscription";
import { withMetrics } from "@/lib/with-metrics";
import type { CalendarEvent } from "@/lib/db";
import { syncFmpCalendarEventTypes, type FmpCalendarSyncType } from "@/lib/market-data/fmp-calendar-sync";
import { json401 } from "@/lib/log-unauthorized";

/** Avoid calling FMP on every request when a range truly has no IPO/split rows (empty API result). */
const FMP_HYDRATE_COOLDOWN_MS = 60 * 60 * 1000;
const fmpHydrateCooldownUntil = new Map<string, number>();

function fmpHydrateCacheKey(types: FmpCalendarSyncType[], from: string, to: string): string {
  return `${[...types].sort().join(",")}|${from}|${to}`;
}

function shouldSkipFmpHydrate(key: string): boolean {
  const until = fmpHydrateCooldownUntil.get(key);
  return until != null && Date.now() < until;
}

function markFmpHydrateCooldown(key: string): void {
  fmpHydrateCooldownUntil.set(key, Date.now() + FMP_HYDRATE_COOLDOWN_MS);
}

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/events", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;

  const user = await findUserById(session.userId);
  if (!user) {
    return json401(req, { source: "api/events", reason: "user_row_missing" });
  }

  const url = new URL(req.url);
  const typesParam = url.searchParams.get("type") || "earnings,economic,ipo,splits";
  const requestedTypes = typesParam.split(",").map((t) => t.trim()).filter(Boolean);
  const from = url.searchParams.get("from") || new Date().toISOString().slice(0, 10);
  const to = url.searchParams.get("to") || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })();
  const holdingsOnly = url.searchParams.get("holdings_only") === "true";
  const portfolioId = url.searchParams.get("portfolioId") || undefined;

  const plan = user.plan || "free";
  const aiCalls = user.ai_calls_this_month ?? 0;
  const entitlementInput = { plan, aiCallsThisMonth: aiCalls };

  const allowedTypes: string[] = [];
  const tierInfo: Record<string, { allowed: boolean; requiredTier?: string }> = {};

  for (const type of requestedTypes) {
    let feature: "event-calendar-earnings" | "event-calendar-economic" | "event-calendar-ipo" | "event-calendar-splits";
    let requiredTier: string;
    if (type === "earnings") {
      feature = "event-calendar-earnings";
      requiredTier = "free";
    } else if (type === "economic") {
      feature = "event-calendar-economic";
      requiredTier = "pro";
    } else if (type === "ipo") {
      feature = "event-calendar-ipo";
      requiredTier = "pro";
    } else if (type === "splits") {
      feature = "event-calendar-splits";
      requiredTier = "pro";
    } else {
      continue;
    }

    const result = canAccessFeature(feature, entitlementInput);
    if (result.allowed) {
      allowedTypes.push(type);
      tierInfo[type] = { allowed: true };
    } else {
      tierInfo[type] = { allowed: false, requiredTier };
    }
  }

  let userSymbols: string[] | undefined;
  if (holdingsOnly || (plan === "free" && allowedTypes.includes("earnings"))) {
    const holdings = await listHoldings(session.userId, portfolioId);
    userSymbols = [...new Set(holdings.map((h) => h.ticker.toUpperCase()))];
  }

  const events: CalendarEvent[] = [];

  if (allowedTypes.length > 0) {
    const earningsTypes = allowedTypes.filter((t) => t === "earnings");
    const otherTypes = allowedTypes.filter((t) => t !== "earnings");

    // Free users only see earnings for their holdings
    if (earningsTypes.length > 0 && plan === "free" && userSymbols) {
      const earningsEvents = await listCalendarEvents({
        types: ["earnings"],
        from,
        to,
        symbols: userSymbols.length > 0 ? userSymbols : ["__NONE__"],
      });
      events.push(...earningsEvents);
    } else if (earningsTypes.length > 0) {
      if (holdingsOnly && userSymbols) {
        const earningsEvents = await listCalendarEvents({
          types: ["earnings"],
          from,
          to,
          symbols: userSymbols.length > 0 ? userSymbols : ["__NONE__"],
        });
        events.push(...earningsEvents);
      } else {
        const earningsEvents = await listCalendarEvents({
          types: ["earnings"],
          from,
          to,
        });
        events.push(...earningsEvents);
      }
    }

    if (otherTypes.length > 0) {
      let otherEvents = await listCalendarEvents({
        types: otherTypes,
        from,
        to,
      });
      const fmpSyncable: FmpCalendarSyncType[] = ["economic", "ipo", "splits"];
      const missingFmpTypes = fmpSyncable.filter(
        (t) => otherTypes.includes(t) && !otherEvents.some((e) => e.event_type === t)
      );
      if (missingFmpTypes.length > 0 && process.env.FMP_API_KEY) {
        const hydrateKey = fmpHydrateCacheKey(missingFmpTypes, from, to);
        if (!shouldSkipFmpHydrate(hydrateKey)) {
          try {
            const fromDate = new Date(`${from}T12:00:00.000Z`);
            const toDate = new Date(`${to}T12:00:00.000Z`);
            await syncFmpCalendarEventTypes(fromDate, toDate, missingFmpTypes);
            otherEvents = await listCalendarEvents({
              types: otherTypes,
              from,
              to,
            });
            markFmpHydrateCooldown(hydrateKey);
          } catch {
            /* keep DB-backed rows only; no cooldown so the next request may retry */
          }
        }
      }
      events.push(...otherEvents);
    }
  }

  events.sort((a, b) => a.event_date.localeCompare(b.event_date));

  const holdingsSet = userSymbols ? new Set(userSymbols) : undefined;

  const mapped = events.map((e) => ({
    id: e.id,
    type: e.event_type,
    symbol: e.symbol,
    name: e.name,
    date: e.event_date,
    time: e.event_time,
    details: e.details ? JSON.parse(e.details) : null,
    inPortfolio: e.symbol ? holdingsSet?.has(e.symbol.toUpperCase()) ?? false : false,
  }));

  return NextResponse.json({
    events: mapped,
    tierAccess: tierInfo,
    holdingsSymbols: userSymbols?.length ?? 0,
  });
});
