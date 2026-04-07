import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listCalendarEvents, listHoldings, findUserById } from "@/lib/db";
import { canAccessFeature } from "@/lib/subscription";
import { withMetrics } from "@/lib/with-metrics";
import type { CalendarEvent } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/events", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      requiredTier = "starter";
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

  let events: CalendarEvent[] = [];

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
      const otherEvents = await listCalendarEvents({
        types: otherTypes,
        from,
        to,
      });
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
