import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getUserSettings, markWhatsAppVerified } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { whatsappConfirmSchema } from "@/lib/schemas";
import { confirmWhatsAppVerification } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, whatsappConfirmSchema);
  if (!result.success) return result.error;

  const settings = await getUserSettings(session.userId);
  if (!settings.whatsappPhone) {
    return NextResponse.json({ error: "No phone number to verify" }, { status: 400 });
  }

  const confirmResult = await confirmWhatsAppVerification(settings.whatsappPhone, result.data.code);
  if (!confirmResult.success) {
    return NextResponse.json({ error: confirmResult.error }, { status: 400 });
  }

  await markWhatsAppVerified(session.userId, settings.whatsappPhone);

  return NextResponse.json({ ok: true, verified: true });
}
