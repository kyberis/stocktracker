import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import {
  updateBrokerIntegrationRequestStatus,
  type BrokerIntegrationRequestStatus,
} from "@/lib/db";
import { getAppRouteParam } from "@/lib/api-route-params";
import { withMetrics } from "@/lib/with-metrics";

const statusSchema = z.object({
  status: z.enum(["requested", "reviewing", "planned", "done", "rejected"]),
});

export const PUT = withMetrics("/api/admin/broker-integration-requests/[id]", async (
  req: NextRequest,
  ctx?: unknown,
) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const id = getAppRouteParam(req, ctx, "id");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await updateBrokerIntegrationRequestStatus(
    id,
    parsed.data.status as BrokerIntegrationRequestStatus
  );
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
});
