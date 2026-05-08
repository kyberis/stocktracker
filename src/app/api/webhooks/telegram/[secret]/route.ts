export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

import { withMetrics } from "@/lib/with-metrics";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/telegram/handler";
import { getTelegramWebhookSecret } from "@/lib/telegram/client";
import { json401 } from "@/lib/log-unauthorized";

/**
 * Receive Telegram bot updates.
 *
 * Path: `/api/webhooks/telegram/<secret>`
 *
 * Authenticity is verified two ways before any work happens:
 *   1. The path segment must match `TELEGRAM_WEBHOOK_SECRET`.
 *   2. Telegram echoes the secret back in `X-Telegram-Bot-Api-Secret-Token`
 *      when we configure `secret_token` on `setWebhook` — we require it.
 *
 * On any verification failure we return 401 fast. Always returns 200 for
 * legitimate updates, even if processing fails downstream — Telegram retries
 * non-2xx replies aggressively.
 */
export const POST = withMetrics(
  "/api/webhooks/telegram",
  async (req: NextRequest, ctx?: unknown) => {
    const expected = getTelegramWebhookSecret();
    if (!expected) {
      return NextResponse.json({ error: "Telegram webhook is not configured" }, { status: 503 });
    }

    const params = await resolveParams(ctx);
    const pathSecret = params.secret || "";
    const headerSecret = req.headers.get("x-telegram-bot-api-secret-token") || "";

    if (!constantTimeEqual(pathSecret, expected) || !constantTimeEqual(headerSecret, expected)) {
      return json401(req, { source: "api/webhooks/telegram/[secret]", reason: "path_or_header_secret_mismatch" }, {
        error: "Forbidden",
      });
    }

    let update: TelegramUpdate;
    try {
      update = (await req.json()) as TelegramUpdate;
    } catch {
      // A malformed body still gets a 200 — replying 400 would force Telegram
      // to retry indefinitely.
      return NextResponse.json({ ok: true });
    }

    // Process inline. Vercel functions kill background work after the response,
    // so awaiting here keeps the LLM call alive (maxDuration = 60s).
    await handleTelegramUpdate(update);
    return NextResponse.json({ ok: true });
  },
);

async function resolveParams(ctx: unknown): Promise<{ secret?: string }> {
  if (!ctx || typeof ctx !== "object") return {};
  const maybe = (ctx as { params?: unknown }).params;
  if (!maybe) return {};
  const resolved = await Promise.resolve(maybe);
  if (resolved && typeof resolved === "object") {
    const sec = (resolved as { secret?: unknown }).secret;
    return { secret: typeof sec === "string" ? sec : undefined };
  }
  return {};
}

function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  try {
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}
