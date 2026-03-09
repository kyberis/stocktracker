import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { findUserById, updateUserSettings, getUserSettings } from "@/lib/db";
import { canAccessFeature } from "@/lib/subscription";
import { parseBody } from "@/lib/api-response";
import { whatsappVerifySchema } from "@/lib/schemas";
import { sendWhatsAppVerification } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const user = await findUserById(session.userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const access = canAccessFeature("alerts-whatsapp", {
    plan: user.plan,
    aiCallsThisMonth: user.ai_calls_this_month,
  });
  if (!access.allowed) {
    return NextResponse.json({ error: "WhatsApp alerts require Pro plan" }, { status: 403 });
  }

  const result = await parseBody(req, whatsappVerifySchema);
  if (!result.success) return result.error;

  const { phone } = result.data;

  const sendResult = await sendWhatsAppVerification(phone);
  if (!sendResult.success) {
    return NextResponse.json({ error: sendResult.error }, { status: 500 });
  }

  const settings = await getUserSettings(session.userId);
  await updateUserSettings(session.userId, { ...settings, whatsappPhone: phone, whatsappVerified: false });

  return NextResponse.json({ ok: true });
}
