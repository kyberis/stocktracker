import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/guards";
import { findUserById } from "@/lib/db";
import { getIdpServiceToken, isIdpEnabled } from "@/lib/idp/config";
import {
  createPersonalAccessTokenForIdpSub,
  listPersonalAccessTokensForIdpSub,
} from "@/lib/idp/personal-access-tokens";
import { withMetrics } from "@/lib/with-metrics";

async function requireLinkedIdpUser(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return { error: error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!isIdpEnabled() || !getIdpServiceToken()) {
    return { error: NextResponse.json({ error: "idp_unavailable" }, { status: 503 }) };
  }
  const user = await findUserById(session.userId);
  if (!user?.idp_sub) {
    return { error: NextResponse.json({ error: "idp_link_required" }, { status: 403 }) };
  }
  return { user, session };
}

export const GET = withMetrics("/api/mcp/personal-access-tokens", async (req: NextRequest) => {
  const ctx = await requireLinkedIdpUser(req);
  if ("error" in ctx && ctx.error) return ctx.error;
  const data = await listPersonalAccessTokensForIdpSub(ctx.user!.idp_sub!);
  return NextResponse.json(data);
});

export const POST = withMetrics("/api/mcp/personal-access-tokens", async (req: NextRequest) => {
  const ctx = await requireLinkedIdpUser(req);
  if ("error" in ctx && ctx.error) return ctx.error;
  let body: { name?: string } = {};
  try {
    body = (await req.json()) as { name?: string };
  } catch {
    // empty ok
  }
  const data = await createPersonalAccessTokenForIdpSub(ctx.user!.idp_sub!, body);
  return NextResponse.json(data);
});
