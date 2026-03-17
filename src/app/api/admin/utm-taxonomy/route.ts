import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getUtmTaxonomyConfig, resetUtmTaxonomyConfig, setUtmTaxonomyConfig } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

function parseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || ""));
}

export const GET = withMetrics("/api/admin/utm-taxonomy", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const config = await getUtmTaxonomyConfig();
  return NextResponse.json({ config });
});

export const PUT = withMetrics("/api/admin/utm-taxonomy", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.reset === true) {
    const config = await resetUtmTaxonomyConfig();
    return NextResponse.json({ ok: true, config });
  }

  const updates = {
    sources: body.sources !== undefined ? parseStringList(body.sources) : undefined,
    mediums: body.mediums !== undefined ? parseStringList(body.mediums) : undefined,
    campaigns: body.campaigns !== undefined ? parseStringList(body.campaigns) : undefined,
    notes: body.notes !== undefined ? String(body.notes) : undefined,
  };

  const config = await setUtmTaxonomyConfig(updates);
  return NextResponse.json({ ok: true, config });
});

