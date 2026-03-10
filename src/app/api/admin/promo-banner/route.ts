import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getPromoBannerConfig, setPromoBannerConfig } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/promo-banner", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const config = await getPromoBannerConfig();
  return NextResponse.json({ config });
});

export const PUT = withMetrics("/api/admin/promo-banner", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
  if (typeof body.title === "string") updates.title = body.title.slice(0, 120);
  if (typeof body.badge === "string") updates.badge = body.badge.slice(0, 40);
  if (typeof body.description === "string") updates.description = body.description.slice(0, 200);
  if (typeof body.ctaText === "string") updates.ctaText = body.ctaText.slice(0, 40);
  if (typeof body.ctaLink === "string") updates.ctaLink = body.ctaLink.slice(0, 200);

  const config = await setPromoBannerConfig(updates);
  return NextResponse.json({ config });
});
