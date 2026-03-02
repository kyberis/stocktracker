import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "./session";

export async function requireSession(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, error: null };
}

export async function requireAdmin(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return { session: null, error: error! };
  if (session.role !== "admin") {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session, error: null };
}
