import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getDeviceTemplate, updateDeviceTemplate } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

const VALID_TEMPLATES = ["classic-dark", "wall-street", "minimal-light", "midnight-green"];
const PRO_ONLY_TEMPLATES = ["wall-street", "minimal-light", "midnight-green"];

export const GET = withMetrics("/api/device-passkey/template", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const templateId = await getDeviceTemplate(session.userId);
  return NextResponse.json({ templateId });
});

export const PUT = withMetrics("/api/device-passkey/template", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const body = await req.json().catch(() => null);
  const templateId = body?.templateId;

  if (!templateId || !VALID_TEMPLATES.includes(templateId)) {
    return NextResponse.json({ error: "Invalid template" }, { status: 400 });
  }

  if (PRO_ONLY_TEMPLATES.includes(templateId)) {
    const { findUserById } = await import("@/lib/db");
    const user = await findUserById(session.userId);
    if (user?.plan !== "pro") {
      return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });
    }
  }

  await updateDeviceTemplate(session.userId, templateId);
  return NextResponse.json({ templateId });
});
