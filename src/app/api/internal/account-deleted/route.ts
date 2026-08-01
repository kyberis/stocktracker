import { NextRequest, NextResponse } from "next/server";

import { deleteUser, findUserIdByIdpSub, trackEvent } from "@/lib/db";
import { authEventsTotal } from "@/lib/metrics";

export const dynamic = "force-dynamic";

/**
 * Service-to-service: IdP notifies trefolio that a unified account was deleted.
 * Tracks analytics, then removes the local product user (GDPR erasure).
 *
 * Auth: Bearer IDP_SERVICE_TOKEN.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const [scheme, token] = auth.split(" ");
  const expected = process.env.IDP_SERVICE_TOKEN?.trim();
  if (!expected || scheme !== "Bearer" || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const sub = typeof body.sub === "string" ? body.sub.trim() : "";
  if (!sub) {
    return NextResponse.json({ error: "sub_required" }, { status: 400 });
  }

  const userId = await findUserIdByIdpSub(sub);
  if (!userId) {
    return NextResponse.json({ ok: true, deleted: false, tracked: false });
  }

  await trackEvent(userId, "account_deleted", { source: "idp" });
  authEventsTotal.inc({ event: "account_delete" });

  try {
    await deleteUser(userId);
  } catch (err) {
    console.error("[internal/account-deleted] deleteUser failed:", err);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: true, tracked: true });
}
