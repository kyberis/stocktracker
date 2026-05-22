export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";

import { requireTrefolioPro } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { skipAgentMissionStep } from "@/lib/ai/office/dispatch-step";
import { json401 } from "@/lib/log-unauthorized";

export const POST = withMetrics(
  "/api/office/missions/[id]/steps/[step]/skip",
  async (req: NextRequest, ctx?: unknown) => {
    const { session, error } = await requireTrefolioPro(req);
    if (error) return error;
    if (!session) return json401(req, { source: "api/office/missions/skip", reason: "no_session" });

    const { id, step: stepRaw } = await (ctx as { params: Promise<{ id: string; step: string }> }).params;
    const stepNumber = Number.parseInt(stepRaw, 10);
    if (!Number.isFinite(stepNumber) || stepNumber < 1) {
      return Response.json({ error: "Invalid step" }, { status: 400 });
    }

    const result = await skipAgentMissionStep({
      userId: session.userId,
      missionId: id,
      stepNumber,
    });

    if (!result.ok) {
      return Response.json({ error: result.message }, { status: 400 });
    }

    return Response.json(result);
  },
);
