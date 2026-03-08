import { NextRequest, NextResponse } from "next/server";
import { listActiveAlertsForCron, markAlertTriggered, trackEvent, isFeatureEnabled } from "@/lib/db";
import { sendAlertEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isFeatureEnabled("alerts_enabled"))) {
    return NextResponse.json({ checked: 0, triggered: 0, disabled: true });
  }

  const alerts = await listActiveAlertsForCron();
  if (alerts.length === 0) {
    return NextResponse.json({ checked: 0, triggered: 0 });
  }

  const tickers = [...new Set(alerts.map((a) => a.ticker))];

  let quotes: Record<string, { regularMarketPrice: number; currency: string }> = {};
  try {
    const params = new URLSearchParams({ symbols: tickers.join(","), provider: "yahoo" });
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/quote?${params.toString()}`);
    if (res.ok) {
      quotes = await res.json();
    }
  } catch (err) {
    console.error("Failed to fetch quotes for alert check:", err);
    return NextResponse.json({ error: "Quote fetch failed" }, { status: 500 });
  }

  let triggered = 0;

  for (const alert of alerts) {
    const quote = quotes[alert.ticker];
    if (!quote) continue;

    const price = quote.regularMarketPrice;
    const shouldTrigger =
      (alert.condition === "above" && price >= alert.threshold) ||
      (alert.condition === "below" && price <= alert.threshold);

    if (!shouldTrigger) continue;

    await markAlertTriggered(alert.id);
    triggered++;

    trackEvent(alert.userId, "alert_triggered", {
      ticker: alert.ticker,
      condition: alert.condition,
      threshold: String(alert.threshold),
      price: String(price),
    });

    if (
      (alert.plan === "pro" || alert.plan === "starter") &&
      alert.email &&
      alert.emailVerified
    ) {
      await sendAlertEmail(alert.email, {
        ticker: alert.ticker,
        name: alert.name,
        condition: alert.condition,
        threshold: alert.threshold,
        currentPrice: price,
        currency: quote.currency || alert.currency,
      });

      trackEvent(alert.userId, "alert_email_sent", {
        ticker: alert.ticker,
      });
    }
  }

  return NextResponse.json({
    checked: alerts.length,
    triggered,
    tickers: tickers.length,
  });
}
