import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { deletePasskey, renamePasskey } from "@/lib/db";
import { getAppRouteParam } from "@/lib/api-route-params";
import { withMetrics } from "@/lib/with-metrics";

export const DELETE = withMetrics("/api/auth/passkey/[id]", async (
  req: NextRequest,
  ctx: unknown,
) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const id = getAppRouteParam(req, ctx, "id");
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

  const id = getAppRouteParam(req, ctx, "id");
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await renamePasskey(decodeURIComponent(id), session.userId, name);
  return NextResponse.json({ ok: true });
});
