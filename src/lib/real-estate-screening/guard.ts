import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser } from "@/lib/db";

type SessionShape = { userId: string; role: string };
type GuardResult =
  | { session: SessionShape; error: null }
  | { session: null; error: NextResponse };

export async function requireRealEstateAccess(req: NextRequest): Promise<GuardResult> {
  const { session, error } = await requireSession(req);
  if (error || !session) {
    return { session: null, error: error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const enabled = await isFeatureEnabledForUser("real_estate_screening_enabled", session.userId);
  if (!enabled) {
    return { session: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { session: { userId: session.userId, role: session.role }, error: null };
}
