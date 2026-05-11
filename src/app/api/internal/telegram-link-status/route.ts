import { NextRequest, NextResponse } from "next/server";

import { findUserIdByIdpSub, getChatLinkByUserId } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Service-to-service: whether the trefolio user tied to this IdP `sub` has
 * linked Telegram (integration chat row). Used by user.trefolio.com account hub.
 *
 * Auth: Bearer IDP_SERVICE_TOKEN (same as `/api/internal/ops-metrics`).
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const [scheme, token] = auth.split(" ");
  const expected = process.env.IDP_SERVICE_TOKEN?.trim();
  if (!expected || scheme !== "Bearer" || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sub = (req.nextUrl.searchParams.get("sub") || "").trim();
  if (!sub) {
    return NextResponse.json({ error: "sub_required" }, { status: 400 });
  }

  const userId = await findUserIdByIdpSub(sub);
  if (!userId) {
    return NextResponse.json({
      product: "trefolio" as const,
      hasAccount: false,
      linked: false,
    });
  }

  const link = await getChatLinkByUserId(userId);
  return NextResponse.json({
    product: "trefolio" as const,
    hasAccount: true,
    linked: Boolean(link),
  });
}
