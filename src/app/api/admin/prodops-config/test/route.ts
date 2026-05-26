import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/guards";
import { getProdOpsConfig, getProdOpsSharedSecret } from "@/lib/db";
import { enqueueProdOpsTestEvent } from "@/lib/prodops";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/admin/prodops-config/test", async (req: NextRequest) => {
  const { session, error } = await requireAdmin(req);
  if (error || !session) return error;

  const [config, secret] = await Promise.all([
    getProdOpsConfig(),
    getProdOpsSharedSecret(),
  ]);

  if (!config.enabled) {
    return NextResponse.json({ error: "ProdOps is disabled" }, { status: 400 });
  }
  if (!config.baseUrl.trim()) {
    return NextResponse.json({ error: "ProdOps base URL is missing" }, { status: 400 });
  }
  if (!secret.trim()) {
    return NextResponse.json({ error: "ProdOps shared secret is missing" }, { status: 400 });
  }
  if (!config.recipient?.chatId || config.recipient.enabled === false) {
    return NextResponse.json({ error: "Link a Telegram recipient first" }, { status: 400 });
  }

  await enqueueProdOpsTestEvent(session.userId);
  return NextResponse.json({ ok: true, queued: true });
});
