import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import { getUserSettings, isFeatureEnabledForUser, updateUserSettings } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  enabled: z.boolean(),
});

export const GET = withMetrics("/api/agent-board/settings", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const [platformEnabled, settings] = await Promise.all([
    isFeatureEnabledForUser("agent_board_enabled", session.userId),
    getUserSettings(session.userId),
  ]);

  return NextResponse.json({
    platformEnabled,
    enabled: platformEnabled && settings.agentBoardEnabled,
  });
});

export const PUT = withMetrics("/api/agent-board/settings", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const platformEnabled = await isFeatureEnabledForUser("agent_board_enabled", session.userId);
  if (!platformEnabled) {
    return NextResponse.json({ error: "Agent board is not available" }, { status: 403 });
  }

  const result = await parseBody(req, settingsSchema);
  if (!result.success) return result.error;

  await updateUserSettings(session.userId, { agentBoardEnabled: result.data.enabled });
  return NextResponse.json({ enabled: result.data.enabled });
});
