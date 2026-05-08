import { NextRequest, NextResponse } from "next/server";
import { completeTelegramLink } from "@/lib/db";
import { sendTelegramWelcome } from "@/lib/telegram";
import { json401 } from "@/lib/log-unauthorized";

export const dynamic = "force-dynamic";

function verifySecret(req: NextRequest): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return true;
  return req.headers.get("x-telegram-bot-api-secret-token") === secret;
}

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return json401(req, { source: "api/webhooks/telegram", reason: "telegram_secret_mismatch" }, { error: "unauthorized" });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = (body as { message?: { chat?: { id: number }; text?: string } }).message;
  if (!msg?.chat?.id) return NextResponse.json({ ok: true });

  const text = (msg.text || "").trim();
  if (!text.startsWith("/start")) return NextResponse.json({ ok: true });

  const token = text.replace(/^\/start\s*/, "").trim();
  if (!token) return NextResponse.json({ ok: true });

  const chatId = String(msg.chat.id);
  const linked = await completeTelegramLink(token, chatId);
  if (linked) {
    sendTelegramWelcome(chatId, linked.language).catch((err) =>
      console.error("Telegram welcome failed:", err)
    );
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
