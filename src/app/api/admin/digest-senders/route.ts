import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getDigestSenderDomains, setDigestSenderDomains } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/admin/digest-senders", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const domains = await getDigestSenderDomains();
  return NextResponse.json({ domains });
});

export const PUT = withMetrics("/api/admin/digest-senders", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  let body: { domains?: { value: string; label: string; color: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!Array.isArray(body.domains)) {
    return NextResponse.json({ error: "domains must be an array" }, { status: 400 });
  }

  const saved = await setDigestSenderDomains(body.domains);
  return NextResponse.json({ ok: true, domains: saved });
});
