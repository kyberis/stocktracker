import { NextRequest, NextResponse } from "next/server";
import { addDeviceInterest, listDeviceInterest, countDeviceInterest } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { isFeatureEnabled } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { z } from "zod";

const enrollSchema = z.object({
  email: z.string().email().max(254),
});

export const POST = withMetrics("/api/device-interest", async (req: NextRequest) => {
  if (!(await isFeatureEnabled("device_enabled"))) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const added = await addDeviceInterest(parsed.data.email);
  return NextResponse.json({ ok: true, alreadyEnrolled: !added });
});

export const GET = withMetrics("/api/device-interest", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const [entries, total] = await Promise.all([
    listDeviceInterest(),
    countDeviceInterest(),
  ]);

  return NextResponse.json({ entries, total });
});
