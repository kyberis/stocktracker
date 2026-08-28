import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  isFeatureEnabledForUser,
  listAgentBoardMessages,
  listAgentBoardMessagesForComposer,
  getUserSettings,
  updateUserSettings,
} from "@/lib/db";
import {
  authenticateDeviceBearer,
  deviceBearerRateLimitResponse,
} from "@/lib/device-bearer-auth";
import { json401 } from "@/lib/log-unauthorized";
import { withMetrics } from "@/lib/with-metrics";
import type { AgentBoardMessage } from "@/lib/agent-board/types";

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

function mapMessages(messages: AgentBoardMessage[]) {
  return messages.map((m) => ({
    id: m.id,
    agent: m.agent,
    kind: m.kind,
    body: m.body,
    priority: m.priority,
    createdAt: m.createdAt,
  }));
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

  const platformEnabled = await isFeatureEnabledForUser("agent_board_enabled", auth.userId);
  if (!platformEnabled) {
    return NextResponse.json({
      enabled: false,
      status: "unavailable",
      messages: [],
    });
  }

  // Installing the Scriptable widget is the opt-in — not Profile → Notifications.
  const settings = await getUserSettings(auth.userId);
  if (!settings.agentBoardEnabled) {
    await updateUserSettings(auth.userId, { agentBoardEnabled: true });
  }

  const active = await listAgentBoardMessages(auth.userId, 8);
  if (active.length > 0) {
    return NextResponse.json({
      enabled: true,
      status: "ok",
      messages: mapMessages(active),
    });
  }

  // Nothing new right now — show the last notes Warren/Clara left, if any.
  const latest = await listAgentBoardMessagesForComposer(auth.userId, 3);
  if (latest.length > 0) {
    return NextResponse.json({
      enabled: true,
      status: "stale",
      messages: mapMessages(latest),
    });
  }

  return NextResponse.json({
    enabled: true,
    status: "nothing_new",
    messages: [],
  });
});
