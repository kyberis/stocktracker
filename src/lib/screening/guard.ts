import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser } from "@/lib/db";

type SessionShape = { userId: string; role: string };
type GuardResult =
  | { session: SessionShape; error: null }
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

  return { session: { userId: session.userId, role: session.role }, error: null };
}

/**
 * Extra gate for the temporary Dev log endpoints. Admins always pass; other
 * users need the `screening_dev_lab_enabled` flag on. In `NODE_ENV=development`
 * any signed-in user with screening access is allowed so local QA can iterate
 * without wiring flags for every test account.
 */
export async function requireScreeningDevAccess(req: NextRequest): Promise<GuardResult> {
  const base = await requireScreeningAccess(req);
  if (base.error || !base.session) return base;

  if (base.session.role === "admin") return base;
  if (process.env.NODE_ENV === "development") return base;

  const devEnabled = await isFeatureEnabledForUser(
    "screening_dev_lab_enabled",
    base.session.userId,
  );
  if (!devEnabled) {
    return { session: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return base;
}
