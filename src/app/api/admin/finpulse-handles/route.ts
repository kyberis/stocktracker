import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import {
  isFinPulseHandlesCustomized,
  listFinPulseHandles,
  resetFinPulseHandles,
  setFinPulseHandles,
  type FinPulseHandle,
} from "@/lib/aid/finpulse-handles";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/admin/finpulse-handles", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const handles = await listFinPulseHandles();
  const customized = await isFinPulseHandlesCustomized();
  return NextResponse.json({ handles, customized });
});

export const PUT = withMetrics("/api/admin/finpulse-handles", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  let body: { handles?: FinPulseHandle[]; reset?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.reset) {
    const handles = await resetFinPulseHandles();
    return NextResponse.json({ ok: true, handles, customized: false });
  }

  if (!Array.isArray(body.handles)) {
    return NextResponse.json({ error: "handles must be an array" }, { status: 400 });
  }

  const handles = await setFinPulseHandles(body.handles);
  return NextResponse.json({ ok: true, handles, customized: true });
});
