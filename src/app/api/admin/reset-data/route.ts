import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { findUserById, resetUserHoldings } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const body = (await req.json()) as { userId?: string; mode?: "seed" | "empty" };
    if (!body.userId || !body.mode) {
      return NextResponse.json({ error: "userId and mode are required." }, { status: 400 });
    }
    if (body.mode !== "seed" && body.mode !== "empty") {
      return NextResponse.json({ error: "mode must be seed or empty." }, { status: 400 });
    }

    const user = await findUserById(body.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const inserted = await resetUserHoldings(user.id, body.mode === "seed");
    return NextResponse.json({ ok: true, inserted });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
