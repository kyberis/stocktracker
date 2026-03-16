import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { updateEmailSendStatus } from "@/lib/db";

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || "";

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    created_at?: string;
    to?: string[];
    [key: string]: unknown;
  };
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  if (WEBHOOK_SECRET) {
    const svixId = req.headers.get("svix-id") || "";
    const svixTimestamp = req.headers.get("svix-timestamp") || "";
    const svixSignature = req.headers.get("svix-signature") || "";

    try {
      const wh = new Webhook(WEBHOOK_SECRET);
      wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: ResendWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.type;
  const emailId = payload.data?.email_id;
  const timestamp = payload.created_at || new Date().toISOString();

  if (!emailId) {
    return NextResponse.json({ ok: true, skipped: "no email_id" });
  }

  const HANDLED_EVENTS = [
    "email.delivered",
    "email.opened",
    "email.clicked",
    "email.bounced",
    "email.failed",
    "email.complained",
  ];

  if (HANDLED_EVENTS.includes(eventType)) {
    await updateEmailSendStatus(emailId, eventType, timestamp);
  }

  return NextResponse.json({ ok: true });
}
