import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { deletePasskey, renamePasskey } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const DELETE = withMetrics("/api/auth/passkey/[id]", async (
  req: NextRequest,
  ctx: unknown,
) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const { id } = (ctx as { params: { id: string } }).params;
  const deleted = await deletePasskey(decodeURIComponent(id), session.userId);
  if (!deleted) {
    return NextResponse.json({ error: "Passkey not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
});

export const PATCH = withMetrics("/api/auth/passkey/[id]", async (
  req: NextRequest,
  ctx: unknown,
) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const { id } = (ctx as { params: { id: string } }).params;
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await renamePasskey(decodeURIComponent(id), session.userId, name);
  return NextResponse.json({ ok: true });
});
