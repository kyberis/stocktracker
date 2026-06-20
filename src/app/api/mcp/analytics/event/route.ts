import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/guards";
import { recordMcpClientEvent } from "@/lib/mcp/record-mcp-analytics";
import { withMetrics } from "@/lib/with-metrics";

const schema = z.object({
  event: z.enum(["profile_view"]),
});

export const POST = withMetrics("/api/mcp/analytics/event", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (body.event === "profile_view") {
    recordMcpClientEvent(session.userId, "profile_view");
  }

  return NextResponse.json({ ok: true });
});
