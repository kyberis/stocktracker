import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const db = new PrismaClient();

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  telegramUserId: z.union([z.number(), z.string()]).transform((v) => BigInt(v)),
  telegramUsername: z.string().optional(),
  /// Single-use code issued by the calling app's `/settings/telegram` page.
  /// The IdP forwards the code to the issuing app for validation OR
  /// the IdP issues codes itself. v1 implements the latter.
  code: z.string().min(8),
  /// Diagnostic only. Records which bot the user used last.
  appHint: z.enum(["trefolio", "clara", "will"]),
});

/**
 * POST /v1/telegram/link
 * Called by any of the three product-app Telegram webhooks on `/start <code>`.
 * Auth: Bearer IDP_SERVICE_TOKEN.
 *
 * Validates the deep-link code (issued by the IdP at /account/telegram), looks
 * up the user it belongs to, and creates/updates the TelegramLink row.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const [scheme, token] = auth.split(" ");
  const expected = process.env.IDP_SERVICE_TOKEN;
  if (!expected || scheme !== "Bearer" || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }
  const { telegramUserId, telegramUsername, code, appHint } = parsed.data;

  const link = await db.telegramLinkCode.findUnique({ where: { code } });
  if (!link || link.expiresAt < new Date() || link.consumedAt) {
    return NextResponse.json({ error: "invalid_or_expired_code" }, { status: 400 });
  }

  await db.$transaction([
    db.telegramLink.upsert({
      where: { telegramUserId },
      create: { telegramUserId, userId: link.userId, telegramUsername, appHint },
      update: { userId: link.userId, telegramUsername, appHint },
    }),
    db.telegramLinkCode.update({
      where: { code },
      data: { consumedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ sub: link.userId, linkedAt: new Date().toISOString() });
}
