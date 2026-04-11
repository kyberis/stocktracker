import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getUserSettings, updateUserSettings } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { favoriteToolIdsBodySchema } from "@/lib/schemas";
import type { ToolTabId } from "@/lib/tools-registry";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/favorite-tools", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const settings = await getUserSettings(session.userId);
  return NextResponse.json({ favoriteToolIds: settings.favoriteToolIds });
});

export const PUT = withMetrics("/api/favorite-tools", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, favoriteToolIdsBodySchema);
  if (!result.success) return result.error;

  const next = await updateUserSettings(session.userId, {
    favoriteToolIds: result.data.favoriteToolIds as ToolTabId[],
  });
  return NextResponse.json({ favoriteToolIds: next.favoriteToolIds });
});
