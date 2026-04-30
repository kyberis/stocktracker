export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import { z } from "zod";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

import { requireFeatureQuota } from "@/lib/auth/guards";
import {
  getGlobalOpenAIApiKey,
  getAiModelForFlow,
  insertAiLog,
} from "@/lib/db";
import { AI_FLOW_META } from "@/lib/ai-models";
import { aiCallsTotal, aiRequestDuration } from "@/lib/metrics";
import { withMetrics } from "@/lib/with-metrics";
import { buildWarrenSystemPrompt } from "@/lib/ai/warren/system-prompt";
import {
  buildWarrenTools,
  type PortfolioSnapshot,
  type WarrenToolContext,
} from "@/lib/ai/warren/tools";
import type {
  WarrenPart,
  WarrenProposal,
  WarrenStreamFrame,
} from "@/lib/ai/warren/types";

const portfolioSnapshotSchema: z.ZodType<PortfolioSnapshot | undefined> = z
  .object({
    baseCurrency: z.string(),
    totals: z.object({
      value: z.number(),
      cost: z.number(),
      gainLoss: z.number(),
      gainLossPct: z.number(),
      dayChange: z.number(),
    }),
    holdingsCount: z.number(),
    topHoldings: z.array(z.unknown()),
    allocation: z.array(z.unknown()),
    cashSummary: z.record(z.string(), z.number()),
  })
  .partial({ allocation: true, cashSummary: true })
  .passthrough()
  .optional() as unknown as z.ZodType<PortfolioSnapshot | undefined>;

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .min(1)
    .max(40),
  language: z.string().optional(),
  activePortfolioId: z.string().optional(),
  activePortfolioName: z.string().optional(),
  baseCurrency: z.string().default("EUR"),
  isDemo: z.boolean().optional(),
  portfolioContext: portfolioSnapshotSchema,
});

export const POST = withMetrics("/api/warren/chat", async (req: NextRequest) => {
  // Free tier currently maps to ai_consult quota; we plan to add a dedicated
  // "warren_chat" quota in a follow-up. Reuse ai_consult so we don't ship a
  // schema-less limit on day one.
  const { session, error } = await requireFeatureQuota(req, "ai_consult");
  if (error) return error;
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = getGlobalOpenAIApiKey();
  if (!apiKey) {
    return Response.json(
      { error: "OpenAI API key is not configured. Ask your admin to set it in the Admin panel." },
      { status: 501 },
    );
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await req.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const activePortfolioId = body.activePortfolioId;

  const model = await getAiModelForFlow("portfolio_chat");
  const flowMeta = AI_FLOW_META.portfolio_chat;
  const provider = createOpenAI({ apiKey });

  const systemPrompt = buildWarrenSystemPrompt({
    language: body.language,
    baseCurrency: body.baseCurrency,
    activePortfolioId,
    activePortfolioName: body.activePortfolioName,
    isDemoMode: !!body.isDemo,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (frame: WarrenStreamFrame) => {
        controller.enqueue(encoder.encode(JSON.stringify(frame) + "\n"));
      };

      const ctx: WarrenToolContext = {
        userId: session.userId,
        isDemo: !!body.isDemo,
        activePortfolioId: activePortfolioId,
        baseCurrency: body.baseCurrency,
        snapshot: body.portfolioContext,
        emitPart: (part: WarrenPart) => send({ kind: "part", part }),
        emitProposal: (proposal: WarrenProposal) => send({ kind: "proposal", proposal }),
        emitStep: (label: string) => send({ kind: "tool_step", label }),
      };

      const tools = buildWarrenTools(ctx);
      const endTimer = aiRequestDuration.startTimer({ analysis_type: "warren" });
      const aiLogStart = Date.now();
      const lastUserMsg = body.messages[body.messages.length - 1]?.content || "";

      try {
        const result = streamText({
          model: provider(model),
          system: systemPrompt,
          messages: body.messages.map((m) => ({ role: m.role, content: m.content })),
          tools,
          temperature: flowMeta.temperature,
          stopWhen: ({ steps }) => steps.length >= 6,
          maxOutputTokens: flowMeta.maxTokens,
        });

        for await (const chunk of result.fullStream) {
          if (chunk.type === "text-delta") {
            send({ kind: "text", delta: chunk.text });
          } else if (chunk.type === "error") {
            console.error("[warren/chat] stream error", chunk.error);
            send({
              kind: "error",
              message: chunk.error instanceof Error ? chunk.error.message : "AI stream error",
            });
          }
        }

        let totalTokens = 0;
        try {
          const usage = await result.usage;
          totalTokens = usage?.totalTokens ?? 0;
        } catch {
          // ignore usage retrieval errors
        }

        endTimer();
        aiCallsTotal.inc({ status: "success", analysis_type: "warren" });

        insertAiLog({
          userId: session.userId,
          source: "warren_chat",
          model,
          promptSystem: systemPrompt,
          promptUser: lastUserMsg,
          durationMs: Date.now() - aiLogStart,
          tokensUsed: totalTokens,
        }).catch(() => {});

        send({ kind: "done" });
      } catch (err) {
        endTimer();
        aiCallsTotal.inc({ status: "error", analysis_type: "warren" });
        console.error("[warren/chat] failed", err);
        const message = err instanceof Error ? err.message : "Failed to contact AI service";
        send({ kind: "error", message });
        insertAiLog({
          userId: session.userId,
          source: "warren_chat",
          model,
          promptSystem: systemPrompt,
          promptUser: lastUserMsg,
          durationMs: Date.now() - aiLogStart,
          status: "error",
          errorMessage: message.slice(0, 2000),
        }).catch(() => {});
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
});
