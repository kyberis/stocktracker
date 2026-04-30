export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import { z } from "zod";

import { requireFeatureQuota } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { runWarrenTurn } from "@/lib/ai/warren/run-turn";
import type { PortfolioSnapshot } from "@/lib/ai/warren/tools";
import type { WarrenStreamFrame } from "@/lib/ai/warren/types";

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

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await req.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (frame: WarrenStreamFrame) => {
        controller.enqueue(encoder.encode(JSON.stringify(frame) + "\n"));
      };

      try {
        await runWarrenTurn({
          userId: session.userId,
          isDemo: !!body.isDemo,
          channel: "web",
          language: body.language,
          baseCurrency: body.baseCurrency,
          activePortfolioId: body.activePortfolioId,
          activePortfolioName: body.activePortfolioName,
          snapshot: body.portfolioContext,
          messages: body.messages,
          onFrame: send,
        });
      } catch {
        // runWarrenTurn already emitted an "error" frame and logged.
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
