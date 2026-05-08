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
import { getTelegramBotUsername } from "@/lib/telegram/client";
import { json401 } from "@/lib/log-unauthorized";

/**
 * POST /api/integrations/telegram/link
 *
 * Generate a fresh one-time deep-link token for the signed-in user. The user
 * opens `https://t.me/<bot>?start=<token>` in Telegram, which sends `/start
 * <token>` to our bot, and the webhook handler binds their chat to this user.
 *
 * Returns 503 if the platform flag is off or the bot isn't configured —
 * exposing the deep link with no bot would be a dead end.
 */
export const POST = withMetrics("/api/integrations/telegram/link", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/integrations/telegram/link", reason: "no_session" }, { error: "Unauthorized" });

  if (!(await isFeatureEnabled("telegram_bot_enabled"))) {
    return NextResponse.json({ error: "Telegram integration is disabled" }, { status: 503 });
  }

  const botUsername = getTelegramBotUsername();
  if (!botUsername) {
    return NextResponse.json(
      { error: "Telegram bot is not configured" },
      { status: 503 },
    );
  }

  const token = await createLinkToken(session.userId);
  const deepLink = `https://t.me/${botUsername}?start=${encodeURIComponent(token.token)}`;

  return NextResponse.json({
    token: token.token,
    deepLink,
    botUsername,
    expiresAt: token.expiresAt,
  });
});

/**
 * GET /api/integrations/telegram/link
 *
 * Returns the current Telegram link state for the signed-in user. Used by
 * the profile page to render the "Connected" / "Connect" UI.
 */
export const GET = withMetrics("/api/integrations/telegram/link", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/integrations/telegram/link", reason: "no_session" }, { error: "Unauthorized" });

  const link = await getChatLinkByUserId(session.userId);
  return NextResponse.json({
    enabled: await isFeatureEnabled("telegram_bot_enabled"),
    botUsername: getTelegramBotUsername() || null,
    linked: !!link,
    linkedAt: link?.linkedAt || null,
    chatIdMasked: link ? maskChatId(link.chatId) : null,
    languageCode: link?.languageCode || null,
  });
});

/**
 * DELETE /api/integrations/telegram/link
 *
 * Unlink the user's Telegram chat (also wipes pending proposals + history).
 */
export const DELETE = withMetrics("/api/integrations/telegram/link", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error) return error;
  if (!session) return json401(req, { source: "api/integrations/telegram/link", reason: "no_session" }, { error: "Unauthorized" });

  await unlinkChatByUser(session.userId);
  return NextResponse.json({ ok: true });
});

function maskChatId(chatId: string): string {
  if (chatId.length <= 4) return "•".repeat(chatId.length);
  return `${chatId.slice(0, 2)}${"•".repeat(Math.max(2, chatId.length - 4))}${chatId.slice(-2)}`;
}
