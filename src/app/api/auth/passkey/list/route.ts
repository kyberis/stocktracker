import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getPasskeysByUserId, mapPasskey } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/auth/passkey/list", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const passkeys = await getPasskeysByUserId(session.userId);
  return NextResponse.json({ passkeys: passkeys.map(mapPasskey) });
});
