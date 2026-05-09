import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { parseBody } from "@/lib/api-response";
import { aiCompareSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";
import { fetchGatewayChatCompletions, resolveGatewayApiKey } from "@/lib/ai/gateway";
import { insertAiLog } from "@/lib/db";
import { AI_FLOW_META, type AiFlowKey } from "@/lib/ai-models";

export const dynamic = "force-dynamic";

interface CompareResult {
  model: string;
  response: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  costUsd: number;
  durationMs: number;
  error?: string;
}

async function callModel(
  model: string,
  flowKey: AiFlowKey,
  promptSystem: string,
  promptUser: string,
  gatewayHeaders: Headers,
  adminUserId: string,
): Promise<CompareResult> {
  const meta = AI_FLOW_META[flowKey];
  const start = Date.now();

  try {
    const body: Record<string, unknown> = {
      model,
      max_tokens: meta.maxTokens,
      temperature: meta.temperature,
      messages: [
        { role: "system", content: promptSystem },
        { role: "user", content: promptUser },
      ],
    };

    if (meta.responseFormat === "json_object") {
      body.response_format = { type: "json_object" };
    }

    const res = await fetchGatewayChatCompletions(
      body as Parameters<typeof fetchGatewayChatCompletions>[0],
      { headers: gatewayHeaders },
    );

    const durationMs = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text();
      insertAiLog({
        userId: adminUserId,
        source: "admin_compare",
        model,
        promptSystem,
        promptUser,
        durationMs,
        status: "error",
        errorMessage: errText.slice(0, 2000),
      }).catch(() => {});

      return {
        model,
        response: "",
        tokensInput: 0,
        tokensOutput: 0,
        tokensTotal: 0,
        costUsd: 0,
        durationMs,
        error: `AI Gateway ${res.status}: ${errText.slice(0, 500)}`,
      };
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "";
    const tokensInput = json.usage?.prompt_tokens ?? 0;
    const tokensOutput = json.usage?.completion_tokens ?? 0;
    const tokensTotal = json.usage?.total_tokens ?? tokensInput + tokensOutput;

    insertAiLog({
      userId: adminUserId,
      source: "admin_compare",
      model,
      promptSystem,
      promptUser,
      response: content,
      tokensUsed: tokensTotal,
      tokensInput,
      tokensOutput,
      durationMs,
    }).catch(() => {});

    return {
      model,
      response: content,
      tokensInput,
      tokensOutput,
      tokensTotal,
      costUsd: 0,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    return {
      model,
      response: "",
      tokensInput: 0,
      tokensOutput: 0,
      tokensTotal: 0,
      costUsd: 0,
      durationMs,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export const POST = withMetrics("/api/admin/ai-compare", async (req: NextRequest) => {
  const { session, error } = await requireAdmin(req);
  if (error) return error;

  const result = await parseBody(req, aiCompareSchema);
  if (!result.success) return result.error;

  const { promptSystem, promptUser, flowKey, models } = result.data;

  if (!(await resolveGatewayApiKey(req.headers))) {
    return NextResponse.json(
      { error: "AI Gateway not configured" },
      { status: 501 },
    );
  }

  const results = await Promise.all(
    models.map((model) =>
      callModel(model, flowKey as AiFlowKey, promptSystem, promptUser, req.headers, session!.userId),
    ),
  );

  return NextResponse.json({ results });
});
