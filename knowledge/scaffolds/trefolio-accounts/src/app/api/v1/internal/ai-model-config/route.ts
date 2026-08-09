import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const db = new PrismaClient();

export const dynamic = "force-dynamic";

const FLOW_KEYS = [
  "ai_analysis",
  "portfolio_chat",
  "chart_chat",
  "portfolio_review",
  "portfolio_score",
  "import_portfolio",
  "device_summary",
  "support_chat",
  "weekly_digest",
  "weekly_digest_admin",
  "digest_email",
  "digest_x_post",
  "news_article_summary",
  "holding_classification",
  "screening_intake",
  "screening_hard_data",
  "screening_ir_business",
  "screening_web_sentiment",
  "screening_portfolio_context",
  "screening_risk",
  "screening_compiler",
  "screening_qa",
] as const;

const ALLOWED_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-nano",
  "gpt-4.1-mini",
  "gpt-4.1",
  "o4-mini",
] as const;

function verifyServiceBearer(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") || "";
  const [scheme, token] = auth.split(" ");
  const expected =
    process.env.ACCOUNTS_AI_CONFIG_SECRET?.trim() || process.env.IDP_SERVICE_TOKEN?.trim();
  if (!expected || scheme !== "Bearer" || token !== expected) return false;
  return true;
}

const configBodySchema = z.object({
  config: z.record(z.string(), z.string()),
});

/**
 * GET/PUT /api/v1/internal/ai-model-config
 * Service-to-service. Canonical per-flow model map for trefolio + sister apps.
 *
 * Auth: Bearer ACCOUNTS_AI_CONFIG_SECRET or IDP_SERVICE_TOKEN.
 */
export async function GET(req: NextRequest) {
  if (!verifyServiceBearer(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const row = await db.platformAiModelConfig.findUnique({ where: { id: "singleton" } });
  let config: Record<string, string> = {};
  if (row?.configJson) {
    try {
      config = JSON.parse(row.configJson) as Record<string, string>;
    } catch {
      config = {};
    }
  }
  return NextResponse.json({ config });
}

export async function PUT(req: NextRequest) {
  if (!verifyServiceBearer(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = configBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const allowedModel = new Set<string>(ALLOWED_MODELS);
  const allowedFlow = new Set<string>(FLOW_KEYS);
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed.data.config)) {
    if (allowedFlow.has(k) && allowedModel.has(v)) {
      cleaned[k] = v;
    }
  }

  await db.platformAiModelConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", configJson: JSON.stringify(cleaned) },
    update: { configJson: JSON.stringify(cleaned) },
  });

  return NextResponse.json({ ok: true, config: cleaned });
}
