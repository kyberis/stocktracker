import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getAllStripePriceConfig, setStripePriceConfig } from "@/lib/db";
import type { StripePriceKey } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

const VALID_KEYS = new Set<StripePriceKey>([
  "stripe_price_pro_monthly",
  "stripe_price_pro_annual",
  "stripe_coupon_device_free_year",
]);

export const GET = withMetrics("/api/admin/stripe-prices", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const config = await getAllStripePriceConfig();
  return NextResponse.json(config);
});

export const PUT = withMetrics("/api/admin/stripe-prices", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  for (const [key, value] of Object.entries(body)) {
    if (!VALID_KEYS.has(key as StripePriceKey)) continue;
    if (typeof value !== "string") continue;
    await setStripePriceConfig(key as StripePriceKey, value.trim());
  }

  const config = await getAllStripePriceConfig();
  return NextResponse.json(config);
});
