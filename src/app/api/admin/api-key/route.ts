import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getGlobalAlphaVantageApiKey, setGlobalAlphaVantageApiKey } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/api-key", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const key = await getGlobalAlphaVantageApiKey();
  return NextResponse.json({ hasKey: key.length > 0, maskedKey: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : "" });
});

export const PUT = withMetrics("/api/admin/api-key", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const { apiKey } = (await req.json()) as { apiKey: string };
    await setGlobalAlphaVantageApiKey(apiKey ?? "");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
});
