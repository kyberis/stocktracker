import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyIdpServiceBearer } from "@/lib/idp/service-auth";
import { enqueueProdOpsIngestEvent } from "@/lib/prodops";

export const dynamic = "force-dynamic";

const ingestSchema = z.object({
  eventType: z.enum(["user_registered", "membership_paid", "ops_digest"]),
  userId: z.string().min(1).max(120),
  dedupeKey: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  adminUrl: z.string().url().max(500),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * IdP enqueues staff ops events into the trefolio outbox (same ProdOps bot).
 * Auth: Bearer IDP_SERVICE_TOKEN.
 */
export async function POST(req: NextRequest) {
  if (!verifyIdpServiceBearer(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = ingestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const metadata = parsed.data.metadata ?? {};
  if (parsed.data.eventType === "ops_digest") {
    const body = typeof metadata.body === "string" ? metadata.body : "";
    if (!body.trim() || body.length > 4000) {
      return NextResponse.json({ error: "invalid_digest_body" }, { status: 400 });
    }
  }

  const result = await enqueueProdOpsIngestEvent({
    eventType: parsed.data.eventType,
    userId: parsed.data.userId,
    dedupeKey: parsed.data.dedupeKey,
    summary: parsed.data.summary,
    adminUrl: parsed.data.adminUrl,
    metadata,
    sourceApp: "accounts",
  });

  return NextResponse.json({ ok: true, id: result.id, deduped: result.deduped });
}
