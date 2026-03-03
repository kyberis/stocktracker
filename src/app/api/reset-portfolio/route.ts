import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { resetUserHoldings } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  try {
    const body = (await req.json()) as { mode?: "empty" | "seed" };
    const mode = body.mode === "seed" ? "seed" : "empty";
    const inserted = await resetUserHoldings(session.userId, mode === "seed");
    return NextResponse.json({ ok: true, inserted });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
