import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/guards";
import { findUserById } from "@/lib/db";
import { getIdpServiceToken, isIdpEnabled } from "@/lib/idp/config";
import { revokePersonalAccessTokenForIdpSub } from "@/lib/idp/personal-access-tokens";
import { recordMcpPatRevoked } from "@/lib/mcp/record-mcp-analytics";
import { withMetrics } from "@/lib/with-metrics";

export const DELETE = withMetrics(
  "/api/mcp/personal-access-tokens/[id]",
  async (req: NextRequest, ctx?: unknown) => {
    const { session, error } = await requireSession(req);
    if (error || !session) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isIdpEnabled() || !getIdpServiceToken()) {
      return NextResponse.json({ error: "idp_unavailable" }, { status: 503 });
    }
    const user = await findUserById(session.userId);
    if (!user?.idp_sub) {
      return NextResponse.json({ error: "idp_link_required" }, { status: 403 });
    }
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    await revokePersonalAccessTokenForIdpSub(user.idp_sub, id);
    recordMcpPatRevoked(user.id, id);
    return NextResponse.json({ ok: true });
  },
);
