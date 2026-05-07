export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import { z } from "zod";

import { requireFeatureQuota } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { runWarrenTurn } from "@/lib/ai/warren/run-turn";
import type { WarrenStreamFrame } from "@/lib/ai/warren/types";
import { listPortfolios } from "@/lib/db";
import { warrenPortfolioSnapshotSchema } from "@/lib/ai/warren/portfolio-snapshot-zod";
import { sanitizeWarrenPortfolioLabel } from "@/lib/ai/prompt-safety";

const requestSchema = z
  .object({
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
    portfolioContext: warrenPortfolioSnapshotSchema,
  })
  .strict();

export const POST = withMetrics("/api/warren/chat", async (req: NextRequest) => {
  const { session, error } = await requireFeatureQuota(req, "ai_consult");
  if (error) return error;
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await req.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const portfolios = await listPortfolios(session.userId);
  let resolvedPortfolioId = body.activePortfolioId;
  if (resolvedPortfolioId && !portfolios.some((p) => p.id === resolvedPortfolioId)) {
    resolvedPortfolioId = undefined;
  }
  const active =
    portfolios.find((p) => p.id === resolvedPortfolioId) ||
    portfolios.find((p) => p.isDefault) ||
    portfolios[0];
  const serverPortfolioId = active?.id;
  const serverPortfolioName = sanitizeWarrenPortfolioLabel(active?.name ?? "");

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
          activePortfolioId: serverPortfolioId,
          activePortfolioName: serverPortfolioName,
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
