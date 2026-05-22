export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";

import { requireTrefolioPro } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { cancelAgentMission } from "@/lib/ai/office/dispatch-step";
import { json401 } from "@/lib/log-unauthorized";

export const POST = withMetrics(
  "/api/office/missions/[id]/cancel",
  async (req: NextRequest, ctx?: unknown) => {
    const { session, error } = await requireTrefolioPro(req);
    if (error) return error;
    if (!session) return json401(req, { source: "api/office/missions/cancel", reason: "no_session" });

    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

    const result = await cancelAgentMission({
      userId: session.userId,
      missionId: id,
    });

    if (!result.ok) {
      return Response.json({ error: result.message }, { status: 400 });
    }

    return Response.json(result);
  },
);
