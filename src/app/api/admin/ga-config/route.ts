import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getGaMeasurementId, setGaMeasurementId, getGoogleAdsId, setGoogleAdsId } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/ga-config", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const [gaId, googleAdsId] = await Promise.all([getGaMeasurementId(), getGoogleAdsId()]);
  return NextResponse.json({
    gaId,
    source: gaId === (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "") ? "env" : "database",
    googleAdsId,
    googleAdsSource: googleAdsId === (process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "") ? "env" : "database",
  });
});

export const PUT = withMetrics("/api/admin/ga-config", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Request body is required" }, { status: 400 });
  }

  if (typeof body.gaId === "string") {
    const gaId = body.gaId.trim();
    if (gaId && !/^G-[A-Z0-9]+$/.test(gaId) && !/^UA-\d+-\d+$/.test(gaId) && !/^GT-[A-Z0-9]+$/.test(gaId)) {
      return NextResponse.json({ error: "Invalid measurement ID format. Expected G-XXXXXXX, GT-XXXXXXX, or UA-XXXXXX-X." }, { status: 400 });
    }
    await setGaMeasurementId(gaId);
  }

  if (typeof body.googleAdsId === "string") {
    const adsId = body.googleAdsId.trim();
    if (adsId && !/^AW-\d+$/.test(adsId)) {
      return NextResponse.json({ error: "Invalid Google Ads ID format. Expected AW-XXXXXXXXXX." }, { status: 400 });
    }
    await setGoogleAdsId(adsId);
  }

  const [gaId, googleAdsId] = await Promise.all([getGaMeasurementId(), getGoogleAdsId()]);
  return NextResponse.json({ ok: true, gaId, googleAdsId });
});
