export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import { dispatchProposal } from "@/lib/ai/warren/dispatch";
import { withMetrics } from "@/lib/with-metrics";

const confirmSchema = z.object({
  proposalId: z.string().min(1),
  kind: z.enum([
    "addHolding",
    "removeHolding",
    "recordTransaction",
    "addCash",
    "createAlert",
    "addWatchlist",
    "importTransactions",
  ]),
  data: z.record(z.string(), z.unknown()),
});

export const POST = withMetrics("/api/warren/confirm", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  let body: z.infer<typeof confirmSchema>;
  try {
    body = confirmSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = await dispatchProposal(session.userId, body.kind, body.data);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, reason: result.reason },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    proposalId: body.proposalId,
    entityId: result.entityId,
    message: result.message,
  });
});
