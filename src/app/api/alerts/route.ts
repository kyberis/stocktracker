import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, listAlerts, countActiveAlerts, createAlert, deleteAlert, toggleAlert, trackEvent, isFeatureEnabled } from "@/lib/db";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import { withMetrics } from "@/lib/with-metrics";
import type { AlertCondition } from "@/lib/types";

export const GET = withMetrics("/api/alerts", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const enabled = await isFeatureEnabled("alerts_enabled");
  if (!enabled) {
    return NextResponse.json({ alerts: [], activeCount: 0, limit: 0, isPro: false, disabled: true });
  }

  const alerts = await listAlerts(session.userId);
  const user = await findUserById(session.userId);
  const isPro = user?.plan === "pro";
  const activeCount = await countActiveAlerts(session.userId);
  const limit = isPro ? null : PLATFORM_LIMITS.FREE_ALERT_LIMIT;

  return NextResponse.json({ alerts, activeCount, limit, isPro });
});

export const POST = withMetrics("/api/alerts", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  if (!(await isFeatureEnabled("alerts_enabled"))) {
    return NextResponse.json({ error: "Price alerts are not enabled" }, { status: 403 });
  }

  let body: {
    ticker?: string;
    name?: string;
    condition?: AlertCondition;
    threshold?: number;
    currency?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.ticker || !body.condition || typeof body.threshold !== "number") {
    return NextResponse.json(
      { error: "ticker, condition, and threshold are required" },
      { status: 400 }
    );
  }

  if (body.condition !== "above" && body.condition !== "below") {
    return NextResponse.json({ error: "condition must be 'above' or 'below'" }, { status: 400 });
  }

  if (body.threshold <= 0) {
    return NextResponse.json({ error: "threshold must be positive" }, { status: 400 });
  }

  const user = await findUserById(session.userId);
  const isPro = user?.plan === "pro";

  if (!isPro) {
    const activeCount = await countActiveAlerts(session.userId);
    if (activeCount >= PLATFORM_LIMITS.FREE_ALERT_LIMIT) {
      trackEvent(session.userId, "alert_limit_reached", {
        activeCount: String(activeCount),
        limit: String(PLATFORM_LIMITS.FREE_ALERT_LIMIT),
      });
      return NextResponse.json(
        {
          error: "Free alert limit reached",
          reason: "alert_limit_reached",
          limit: PLATFORM_LIMITS.FREE_ALERT_LIMIT,
          used: activeCount,
        },
        { status: 403 }
      );
    }
  }

  const alert = await createAlert(session.userId, {
    ticker: body.ticker.toUpperCase(),
    name: body.name || body.ticker.toUpperCase(),
    condition: body.condition,
    threshold: body.threshold,
    currency: body.currency || "USD",
  });

  trackEvent(session.userId, "alert_created", {
    ticker: alert.ticker,
    condition: alert.condition,
    threshold: String(alert.threshold),
  });

  return NextResponse.json({ alert }, { status: 201 });
});

export const DELETE = withMetrics("/api/alerts", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const url = new URL(req.url);
  const alertId = url.searchParams.get("id");
  if (!alertId) {
    return NextResponse.json({ error: "Missing alert id" }, { status: 400 });
  }

  const deleted = await deleteAlert(session.userId, alertId);
  if (!deleted) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
});

export const PATCH = withMetrics("/api/alerts", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  let body: { id?: string; active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.id || typeof body.active !== "boolean") {
    return NextResponse.json({ error: "id and active are required" }, { status: 400 });
  }

  if (body.active) {
    const user = await findUserById(session.userId);
    const isPro = user?.plan === "pro";
    if (!isPro) {
      const activeCount = await countActiveAlerts(session.userId);
      if (activeCount >= PLATFORM_LIMITS.FREE_ALERT_LIMIT) {
        return NextResponse.json(
          { error: "Free alert limit reached", reason: "alert_limit_reached" },
          { status: 403 }
        );
      }
    }
  }

  const toggled = await toggleAlert(session.userId, body.id, body.active);
  if (!toggled) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
});
