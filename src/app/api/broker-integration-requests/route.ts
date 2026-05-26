import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guards";
import {
  createBrokerIntegrationRequest,
  findUserById,
  getUserSettings,
} from "@/lib/db";
import { sendBrokerIntegrationRequestReceivedEmail } from "@/lib/broker-integration-request-email";
import { withMetrics } from "@/lib/with-metrics";
import { enqueueProdOpsBrokerRequestCreatedEvent } from "@/lib/prodops";

const requestSchema = z.object({
  brokerName: z.string().trim().min(2).max(100),
  note: z.string().trim().max(800).optional(),
});

export const POST = withMetrics("/api/broker-integration-requests", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid broker request data" }, { status: 400 });
  }

  const created = await createBrokerIntegrationRequest({
    userId: session.userId,
    brokerName: parsed.data.brokerName,
    note: parsed.data.note || "",
  });
  await enqueueProdOpsBrokerRequestCreatedEvent({
    requestId: created.id,
    userId: session.userId,
    brokerName: created.brokerName,
  });

  const [user, settings] = await Promise.all([
    findUserById(session.userId),
    getUserSettings(session.userId),
  ]);

  if (user?.email) {
    sendBrokerIntegrationRequestReceivedEmail({
      userId: session.userId,
      email: user.email,
      displayName: user.display_name || user.username,
      language: settings.language || "en",
      brokerName: created.brokerName,
      requestId: created.id,
    }).catch((err) => {
      console.error("Failed to send broker request confirmation email:", err);
    });
  }

  return NextResponse.json({ ok: true, requestId: created.id });
});
