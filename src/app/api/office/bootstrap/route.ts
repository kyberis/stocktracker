export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";

import { requireTrefolioPro } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { listActiveAgentMissions, listOfficeMessages } from "@/lib/db/agent-office";
import { json401 } from "@/lib/log-unauthorized";

export const GET = withMetrics("/api/office/bootstrap", async (req: NextRequest) => {
  const { session, error } = await requireTrefolioPro(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/office/bootstrap", reason: "no_session" });

  const [messages, missions] = await Promise.all([
    listOfficeMessages(session.userId, 80),
    listActiveAgentMissions(session.userId),
  ]);

  return Response.json({
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
    missions,
  });
});
