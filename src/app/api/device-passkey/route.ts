import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { generateDevicePasskey, revokeDevicePasskey, findUserById } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/device-passkey", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const passkey = await generateDevicePasskey(session.userId);
  return NextResponse.json({ passkey });
});

export const DELETE = withMetrics("/api/device-passkey", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  await revokeDevicePasskey(session.userId);
  return NextResponse.json({ ok: true });
});

export const GET = withMetrics("/api/device-passkey", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const user = await findUserById(session.userId);
  return NextResponse.json({ hasPasskey: !!user?.device_passkey_hash });
});
