export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";

import { requireTrefolioPro } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { confirmAgentMissionStep } from "@/lib/ai/office/dispatch-step";
import { resolveOfficeIdentity } from "@/lib/ai/office/office-identity";
import { listPortfolios } from "@/lib/db";
import { json401 } from "@/lib/log-unauthorized";

const bodySchema = z
  .object({
    activePortfolioId: z.string().optional(),
  })
  .strict();

export const POST = withMetrics(
  "/api/office/missions/[id]/steps/[step]/confirm",
  async (req: NextRequest, ctx?: unknown) => {
    const { session, error } = await requireTrefolioPro(req);
    if (error) return error;
    if (!session) return json401(req, { source: "api/office/missions/confirm", reason: "no_session" });

    const { id, step: stepRaw } = await (ctx as { params: Promise<{ id: string; step: string }> }).params;
    const stepNumber = Number.parseInt(stepRaw, 10);
    if (!Number.isFinite(stepNumber) || stepNumber < 1) {
      return Response.json({ error: "Invalid step" }, { status: 400 });
    }

    let body: z.infer<typeof bodySchema> = {};
    try {
      const raw = await req.json().catch(() => ({}));
      body = bodySchema.parse(raw);
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const identity = await resolveOfficeIdentity(session.userId);
    if (!identity) return Response.json({ error: "User not found" }, { status: 404 });

    const portfolios = await listPortfolios(session.userId).catch(() => []);
    let portfolioId = body.activePortfolioId;
    if (portfolioId && !portfolios.some((p) => p.id === portfolioId)) {
      portfolioId = undefined;
    }
    const active =
      portfolios.find((p) => p.id === portfolioId) ||
      portfolios.find((p) => p.isDefault) ||
      portfolios[0];

    const result = await confirmAgentMissionStep({
      userId: session.userId,
      identity,
      missionId: id,
      stepNumber,
      portfolioId: active?.id,
    });

    if (!result.ok) {
      return Response.json({ error: result.message }, { status: 400 });
    }

    return Response.json(result);
  },
);
