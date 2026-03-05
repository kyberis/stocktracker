import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { isFeatureEnabled, setFeatureEnabled, type PlatformFeature } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

const ALLOWED_FLAGS: PlatformFeature[] = ["alerts_enabled", "csv_export_enabled"];

export const GET = withMetrics("/api/admin/feature-flags", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const flags: Record<string, boolean> = {};
  for (const flag of ALLOWED_FLAGS) {
    flags[flag] = await isFeatureEnabled(flag);
  }
  return NextResponse.json({ flags });
});

export const PUT = withMetrics("/api/admin/feature-flags", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const body = (await req.json()) as { flag: string; enabled: boolean };

    if (!ALLOWED_FLAGS.includes(body.flag as PlatformFeature)) {
      return NextResponse.json({ error: `Unknown flag: ${body.flag}` }, { status: 400 });
    }

    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
    }

    await setFeatureEnabled(body.flag as PlatformFeature, body.enabled);
    return NextResponse.json({ ok: true, flag: body.flag, enabled: body.enabled });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
});
