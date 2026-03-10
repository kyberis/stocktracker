import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getAdConfig, setAdConfig } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/ad-config", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const config = await getAdConfig();
  return NextResponse.json(config);
});

export const PUT = withMetrics("/api/admin/ad-config", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.clientId !== undefined && typeof body.clientId !== "string") {
    return NextResponse.json({ error: "clientId must be a string" }, { status: 400 });
  }

  if (body.clientId && !/^ca-pub-\d+$/.test(body.clientId.trim())) {
    return NextResponse.json(
      { error: "Invalid publisher ID format. Expected ca-pub-XXXXXXXXXX." },
      { status: 400 },
    );
  }

  const updated = await setAdConfig({
    clientId: body.clientId?.trim(),
    globalEnabled: body.globalEnabled,
    slots: body.slots,
  });

  return NextResponse.json({ ok: true, config: updated });
});
