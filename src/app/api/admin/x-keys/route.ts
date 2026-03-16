import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getXKeys, setXKey } from "@/lib/db";
import type { XKeyName } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

const VALID_KEYS = new Set<XKeyName>(["x_api_key", "x_api_secret", "x_access_token", "x_access_token_secret"]);

export const GET = withMetrics("/api/admin/x-keys", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const keys = await getXKeys();
  return NextResponse.json(keys);
});

export const PUT = withMetrics("/api/admin/x-keys", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  for (const [key, value] of Object.entries(body)) {
    if (!VALID_KEYS.has(key as XKeyName)) continue;
    await setXKey(key as XKeyName, String(value).trim());
  }

  return NextResponse.json({ ok: true });
});
