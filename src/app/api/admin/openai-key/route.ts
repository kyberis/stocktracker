import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getPlatformSetting, setPlatformSetting } from "@/lib/db/settings";
import { parseBody } from "@/lib/api-response";
import { apiKeySchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";

const SETTING_KEY = "openai_api_key";

export const GET = withMetrics("/api/admin/openai-key", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const key = (await getPlatformSetting(SETTING_KEY)) || process.env.STOCKTRACKER_OPENAI_API_KEY || "";
  return NextResponse.json({
    hasKey: key.length > 0,
    maskedKey: key.length > 4 ? `${key.slice(0, 4)}...${key.slice(-4)}` : "",
  });
});

export const PUT = withMetrics("/api/admin/openai-key", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const result = await parseBody(req, apiKeySchema);
  if (!result.success) return result.error;
  const { apiKey } = result.data;

  await setPlatformSetting(SETTING_KEY, apiKey);
  return NextResponse.json({ ok: true });
});
