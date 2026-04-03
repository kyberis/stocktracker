import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getAiModelConfig, setAiModelConfig } from "@/lib/db/settings";
import { parseBody } from "@/lib/api-response";
import { aiModelConfigSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";
import { ALLOWED_AI_MODELS, AI_FLOW_META, AI_MODEL_LABELS } from "@/lib/ai-models";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/admin/ai-models", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const config = await getAiModelConfig();

  return NextResponse.json({
    config,
    allowedModels: ALLOWED_AI_MODELS,
    modelLabels: AI_MODEL_LABELS,
    flowMeta: AI_FLOW_META,
  });
});

export const PUT = withMetrics("/api/admin/ai-models", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const result = await parseBody(req, aiModelConfigSchema);
  if (!result.success) return result.error;

  await setAiModelConfig(result.data as Record<string, string>);
  const config = await getAiModelConfig();
  return NextResponse.json({ ok: true, config });
});
