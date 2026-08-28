export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

import { withMetrics } from "@/lib/with-metrics";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/telegram/handler";
import { getCloverTelegramWebhookSecret, isCloverTelegramConfigured } from "@/lib/telegram/clover-client";
import { json401 } from "@/lib/log-unauthorized";

/**
 * Clover Telegram webhook: `/api/webhooks/telegram/clover/<secret>`
 */
export const POST = withMetrics(
  "/api/webhooks/telegram/clover",
  async (req: NextRequest, ctx?: unknown) => {
    if (!isCloverTelegramConfigured()) {
      return NextResponse.json({ error: "Clover Telegram is not configured" }, { status: 503 });
    }

    const expected = getCloverTelegramWebhookSecret();
    if (!expected) {
      return NextResponse.json({ error: "Clover Telegram webhook is not configured" }, { status: 503 });
    }

    const params = await resolveParams(ctx);
    const pathSecret = params.secret || "";
    const headerSecret = req.headers.get("x-telegram-bot-api-secret-token") || "";

    if (!constantTimeEqual(pathSecret, expected) || !constantTimeEqual(headerSecret, expected)) {
      return json401(
        req,
        { source: "api/webhooks/telegram/clover/[secret]", reason: "path_or_header_secret_mismatch" },
        { error: "Forbidden" },
      );
    }

    let update: TelegramUpdate;
    try {
      update = (await req.json()) as TelegramUpdate;
    } catch {
      return NextResponse.json({ ok: true });
    }

    try {
      await handleTelegramUpdate(update, { bot: "clover" });
    } catch (err) {
      console.error("[telegram/clover] update processing failed", err);
    }

    return NextResponse.json({ ok: true });
  },
);

async function resolveParams(ctx: unknown): Promise<{ secret?: string }> {
  if (!ctx || typeof ctx !== "object") return {};
  const params = (ctx as { params?: Promise<{ secret?: string }> | { secret?: string } }).params;
  if (!params) return {};
  return typeof (params as Promise<unknown>).then === "function"
    ? await (params as Promise<{ secret?: string }>)
    : (params as { secret?: string });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
