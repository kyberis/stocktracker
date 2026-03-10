import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getGaMeasurementId, setGaMeasurementId } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/ga-config", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const gaId = await getGaMeasurementId();
  return NextResponse.json({
    gaId,
    source: gaId === (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "") ? "env" : "database",
  });
});

export const PUT = withMetrics("/api/admin/ga-config", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.gaId !== "string") {
    return NextResponse.json({ error: "gaId is required" }, { status: 400 });
  }

  const gaId = body.gaId.trim();
  if (gaId && !/^G-[A-Z0-9]+$/.test(gaId) && !/^UA-\d+-\d+$/.test(gaId) && !/^GT-[A-Z0-9]+$/.test(gaId)) {
    return NextResponse.json({ error: "Invalid measurement ID format. Expected G-XXXXXXX, GT-XXXXXXX, or UA-XXXXXX-X." }, { status: 400 });
  }

  await setGaMeasurementId(gaId);
  return NextResponse.json({ ok: true, gaId });
});
