import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export const dynamic = "force-dynamic";

/**
 * GET /v1/telegram/by-id/:tgUserId
 * Service-to-service. Used by Telegram webhooks to resolve an incoming
 * message to the IdP `sub`.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tgUserId: string }> },
) {
  const auth = req.headers.get("authorization") || "";
  const [scheme, token] = auth.split(" ");
  const expected = process.env.IDP_SERVICE_TOKEN;
  if (!expected || scheme !== "Bearer" || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { tgUserId } = await params;
  let parsed: bigint;
  try {
    parsed = BigInt(tgUserId);
  } catch {
    return NextResponse.json({ error: "invalid_telegram_user_id" }, { status: 400 });
  }

  const link = await db.telegramLink.findUnique({
    where: { telegramUserId: parsed },
    include: { user: { select: { id: true, email: true, locale: true } } },
  });
  if (!link) {
    return NextResponse.json({ error: "not_linked" }, { status: 404 });
  }

  return NextResponse.json({
    sub: link.userId,
    email: link.user.email,
    locale: link.user.locale,
    appHint: link.appHint,
    verifiedAt: link.verifiedAt.toISOString(),
  });
}
