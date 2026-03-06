import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getGlobalOpenAIApiKey, setGlobalOpenAIApiKey } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { apiKeySchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/openai-key", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const key = await getGlobalOpenAIApiKey();
  return NextResponse.json({
    hasKey: key.length > 0,
    maskedKey: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : "",
  });
});

export const PUT = withMetrics("/api/admin/openai-key", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const result = await parseBody(req, apiKeySchema);
  if (!result.success) return result.error;
  const { apiKey } = result.data;

  await setGlobalOpenAIApiKey(apiKey);
  return NextResponse.json({ ok: true });
});
