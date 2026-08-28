export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import {
  createLinkToken,
  getChatLinkByUserId,
  unlinkChatByUser,
  isFeatureEnabled,
} from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import {
  getCloverTelegramBotUsername,
  isCloverTelegramConfigured,
} from "@/lib/telegram/clover-client";
import { json401 } from "@/lib/log-unauthorized";

function maskChatId(chatId: string): string {
  if (chatId.length <= 4) return "•".repeat(chatId.length);
  return `${chatId.slice(0, 2)}${"•".repeat(Math.max(2, chatId.length - 4))}${chatId.slice(-2)}`;
}

export const POST = withMetrics("/api/integrations/telegram/clover/link", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) {
    return json401(req, { source: "api/integrations/telegram/clover/link", reason: "no_session" }, { error: "Unauthorized" });
  }

  if (!(await isFeatureEnabled("clover_assistant")) || !isCloverTelegramConfigured()) {
    return NextResponse.json({ error: "Clover Telegram is not configured" }, { status: 503 });
  }

  const botUsername = getCloverTelegramBotUsername();
  const token = await createLinkToken(session.userId);
  const deepLink = `https://t.me/${botUsername}?start=${encodeURIComponent(token.token)}`;

  return NextResponse.json({
    token: token.token,
    deepLink,
    botUsername,
    expiresAt: token.expiresAt,
  });
});

export const GET = withMetrics("/api/integrations/telegram/clover/link", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) {
    return json401(req, { source: "api/integrations/telegram/clover/link", reason: "no_session" }, { error: "Unauthorized" });
  }

  const configured =
    (await isFeatureEnabled("clover_assistant")) && isCloverTelegramConfigured();
  const link = await getChatLinkByUserId(session.userId);
  return NextResponse.json({
    enabled: configured,
    botUsername: getCloverTelegramBotUsername() || null,
    linked: !!link,
    linkedAt: link?.linkedAt || null,
    chatIdMasked: link ? maskChatId(link.chatId) : null,
    languageCode: link?.languageCode || null,
  });
});

export const DELETE = withMetrics("/api/integrations/telegram/clover/link", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) {
    return json401(req, { source: "api/integrations/telegram/clover/link", reason: "no_session" }, { error: "Unauthorized" });
  }

  await unlinkChatByUser(session.userId);
  return NextResponse.json({ ok: true });
});
