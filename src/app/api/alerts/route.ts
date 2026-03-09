import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, listAlerts, countActiveAlerts, createAlert, deleteAlert, toggleAlert, trackEvent, isFeatureEnabled } from "@/lib/db";
import { getAlertLimit } from "@/lib/subscription";
import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { createAlertSchema, toggleAlertSchema } from "@/lib/schemas";

export const GET = withMetrics("/api/alerts", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const enabled = await isFeatureEnabled("alerts_enabled");
  if (!enabled) {
    return NextResponse.json({ alerts: [], activeCount: 0, limit: 0, isPro: false, disabled: true });
  }

  const alerts = await listAlerts(session.userId);
  const user = await findUserById(session.userId);
  const plan = (user?.plan || session.plan) ?? "free";
  const alertLimit = getAlertLimit(plan);
  const activeCount = await countActiveAlerts(session.userId);
  const limit = alertLimit === Infinity ? null : alertLimit;

  return NextResponse.json({ alerts, activeCount, limit, isPro: alertLimit === Infinity });
});

export const POST = withMetrics("/api/alerts", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  if (!(await isFeatureEnabled("alerts_enabled"))) {
    return NextResponse.json({ error: "Price alerts are not enabled" }, { status: 403 });
  }

  const result = await parseBody(req, createAlertSchema);
  if (!result.success) return result.error;
  const data = result.data;

  const user = await findUserById(session.userId);
  const plan = (user?.plan || session.plan) ?? "free";
  const alertLimit = getAlertLimit(plan);

  if (alertLimit < Infinity) {
    const activeCount = await countActiveAlerts(session.userId);
    if (activeCount >= alertLimit) {
      trackEvent(session.userId, "alert_limit_reached", {
        activeCount: String(activeCount),
        limit: String(alertLimit),
      });
      return NextResponse.json(
        {
          error: "Alert limit reached",
          reason: "alert_limit_reached",
          limit: alertLimit,
          used: activeCount,
        },
        { status: 403 }
      );
    }
  }

  const ticker = data.isPortfolioWide ? "__PORTFOLIO__" : data.ticker.toUpperCase();

  const alert = await createAlert(session.userId, {
    ticker,
    name: data.name || (data.isPortfolioWide ? "Portfolio-wide" : ticker),
    condition: data.condition,
    threshold: data.threshold,
    currency: data.currency,
    alertType: data.alertType,
    percentBasis: data.percentBasis,
    percentValue: data.percentValue,
    isPortfolioWide: data.isPortfolioWide,
    portfolioId: data.portfolioId,
  });

  trackEvent(session.userId, "alert_created", {
    ticker: alert.ticker,
    alertType: alert.alertType,
    source: data.source,
    ...(alert.alertType === "percent_change" ? {
      percentBasis: alert.percentBasis,
      percentValue: String(alert.percentValue),
      portfolioWide: String(alert.isPortfolioWide),
    } : {
      condition: alert.condition,
      threshold: String(alert.threshold),
    }),
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

  const result = await parseBody(req, toggleAlertSchema);
  if (!result.success) return result.error;
  const { id, active } = result.data;

  if (active) {
    const user = await findUserById(session.userId);
    const plan = (user?.plan || session.plan) ?? "free";
    const alertLimit = getAlertLimit(plan);
    if (alertLimit < Infinity) {
      const activeCount = await countActiveAlerts(session.userId);
      if (activeCount >= alertLimit) {
        return NextResponse.json(
          { error: "Alert limit reached", reason: "alert_limit_reached", limit: alertLimit },
          { status: 403 }
        );
      }
    }
  }

  const toggled = await toggleAlert(session.userId, id, active);
  if (!toggled) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
});
