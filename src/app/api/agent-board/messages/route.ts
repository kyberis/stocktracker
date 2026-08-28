import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  isFeatureEnabledForUser,
  listAgentBoardMessages,
  getUserSettings,
} from "@/lib/db";
import {
  authenticateDeviceBearer,
  deviceBearerRateLimitResponse,
} from "@/lib/device-bearer-auth";
import { json401 } from "@/lib/log-unauthorized";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

async function resolveUserId(req: NextRequest): Promise<{
  userId: string | null;
  rateLimited?: boolean;
  retryAfterSec?: number;
}> {
  const session = await getSessionFromRequest(req);
  if (session) return { userId: session.userId };

  const bearer = await authenticateDeviceBearer(req);
  if (bearer.status === "ok") return { userId: bearer.user.id };
  if (bearer.status === "rate_limited") {
    return { userId: null, rateLimited: true, retryAfterSec: bearer.retryAfterSec };
  }
  return { userId: null };
}

export const GET = withMetrics("/api/agent-board/messages", async (req: NextRequest) => {
  const auth = await resolveUserId(req);
  if (auth.rateLimited) {
    return deviceBearerRateLimitResponse(auth.retryAfterSec);
  }
  if (!auth.userId) {
    return json401(req, {
      source: "api/agent-board/messages",
      reason: "auth_failed",
      tags: { hasBearer: Boolean(req.headers.get("authorization")?.startsWith("Bearer ")) },
    });
  }

  const enabled = await isFeatureEnabledForUser("agent_board_enabled", auth.userId);
  if (!enabled) {
    return NextResponse.json({ enabled: false, messages: [] });
  }

  const settings = await getUserSettings(auth.userId);
  if (!settings.agentBoardEnabled) {
    return NextResponse.json({ enabled: false, messages: [] });
  }

  const messages = await listAgentBoardMessages(auth.userId, 15);
  return NextResponse.json({
    enabled: true,
    messages: messages.map((m) => ({
      id: m.id,
      agent: m.agent,
      kind: m.kind,
      body: m.body,
      chipLabel: m.chipLabel,
      chipPrompt: m.chipPrompt,
      priority: m.priority,
      readAt: m.readAt,
      createdAt: m.createdAt,
    })),
  });
});
