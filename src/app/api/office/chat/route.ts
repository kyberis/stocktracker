export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import { z } from "zod";

import { requireTrefolioPro } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { runOfficeOrchestration } from "@/lib/ai/office/orchestrator";
import type { OfficeStreamFrame } from "@/lib/ai/office/types";
import { findUserById, listPortfolios } from "@/lib/db";
import { json401 } from "@/lib/log-unauthorized";

const requestSchema = z
  .object({
    message: z.string().min(1).max(4_000),
    language: z.string().optional(),
    activePortfolioId: z.string().optional(),
    baseCurrency: z.string().default("EUR"),
  })
  .strict();

export const POST = withMetrics("/api/office/chat", async (req: NextRequest) => {
  const { session, error } = await requireTrefolioPro(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/office/chat", reason: "no_session" });

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await req.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const portfolios = await listPortfolios(session.userId).catch(() => []);
  let resolvedPortfolioId = body.activePortfolioId;
  if (resolvedPortfolioId && !portfolios.some((p) => p.id === resolvedPortfolioId)) {
    resolvedPortfolioId = undefined;
  }
  const active =
    portfolios.find((p) => p.id === resolvedPortfolioId) ||
    portfolios.find((p) => p.isDefault) ||
    portfolios[0];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (frame: OfficeStreamFrame) => {
        controller.enqueue(encoder.encode(JSON.stringify(frame) + "\n"));
      };

      try {
        await runOfficeOrchestration({
          userId: session.userId,
          idpSub: user.idp_sub || "",
          portfolioId: active?.id,
          baseCurrency: body.baseCurrency,
          language: body.language,
          userMessage: body.message.trim(),
          onFrame: send,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Office orchestration failed";
        send({ kind: "error", message });
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
