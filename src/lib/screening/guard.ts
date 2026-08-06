import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser } from "@/lib/db";

type GuardResult =
  | { session: { userId: string }; error: null }
  | { session: null; error: NextResponse };

/**
 * Every screening route is gated the same way: authenticated plus per-user flag.
 * A disabled flag returns 404 rather than 403 so the feature is not discoverable
 * before launch.
 */
export async function requireScreeningAccess(req: NextRequest): Promise<GuardResult> {
  const { session, error } = await requireSession(req);
  if (error || !session) {
    return { session: null, error: error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const enabled = await isFeatureEnabledForUser("investment_screening_enabled", session.userId);
  if (!enabled) {
    return { session: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  return { session: { userId: session.userId }, error: null };
}
