import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { parseBody } from "@/lib/api-response";
import { findUserById, trackEvent } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { z } from "zod";
import { isCanonicalConversionEvent } from "@/lib/conversion-events";
import { createHash } from "crypto";
import { mapCanonicalToMetaEvent } from "@/lib/meta-conversions";

const conversionDispatchSchema = z.object({
  event: z.string(),
  eventId: z.string().max(128).optional(),
  platform: z.string().max(32).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

async function sendMetaCapiEvent(params: {
  event: string;
  eventId: string;
  req: NextRequest;
  userEmail: string;
  metadata?: Record<string, string>;
}) {
  const pixelId = process.env.META_CAPI_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN || "";
  if (!pixelId || !accessToken) return { sent: false as const, reason: "not_configured" as const };

  const ip = params.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  const ua = params.req.headers.get("user-agent") || undefined;

  const endpoint = `https://graph.facebook.com/v20.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        {
          event_name: mapCanonicalToMetaEvent(params.event as "signup_completed" | "checkout_started" | "checkout_completed"),
          event_time: Math.floor(Date.now() / 1000),
          event_id: params.eventId,
          action_source: "website",
          event_source_url: params.req.headers.get("referer") || undefined,
          user_data: {
            em: params.userEmail ? sha256(params.userEmail) : undefined,
            client_ip_address: ip,
            client_user_agent: ua,
          },
          custom_data: params.metadata || {},
        },
      ],
    }),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "Meta CAPI request failed");
    throw new Error(message);
  }
  return { sent: true as const };
}

export const POST = withMetrics("/api/analytics/conversions", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const body = await parseBody(req, conversionDispatchSchema);
  if (!body.success) return body.error;

  const { event, eventId, platform, metadata } = body.data;
  if (!isCanonicalConversionEvent(event)) {
    return NextResponse.json({ error: "Unsupported conversion event" }, { status: 400 });
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const resolvedEventId = eventId || `${event}_${Date.now()}`;

  let metaStatus: "not_configured" | "sent" | "failed" = "not_configured";
  try {
    const capi = await sendMetaCapiEvent({
      event,
      eventId: resolvedEventId,
      req,
      userEmail: user.email || "",
      metadata,
    });
    if (capi.sent) metaStatus = "sent";
  } catch {
    metaStatus = "failed";
  }

  trackEvent(session.userId, "ad_conversion_dispatched", {
    event,
    eventId: resolvedEventId,
    platform: platform || "gtag",
    metaStatus,
    ...(metadata || {}),
  });

  return NextResponse.json({ ok: true, metaStatus });
});

