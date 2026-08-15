import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { enrichEmailFlows } from "@/lib/email-flows/enrich";
import { findEmailNode } from "@/lib/email-flows/registry";
import { isEmailNodeEnabled, setEmailNodeEnabled } from "@/lib/email-flows/toggles";

export const GET = withMetrics("/api/admin/email-flows", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const payload = await enrichEmailFlows();
  return NextResponse.json(payload);
});

const toggleSchema = z.object({
  nodeId: z.string().min(1),
  enabled: z.boolean(),
});

export const PUT = withMetrics("/api/admin/email-flows", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const result = await parseBody(req, toggleSchema);
  if (!result.success) return result.error;

  const { nodeId, enabled } = result.data;
  if (!findEmailNode(nodeId)) {
    return NextResponse.json({ error: "Unknown email node" }, { status: 400 });
  }

  await setEmailNodeEnabled(nodeId, enabled);
  const current = await isEmailNodeEnabled(nodeId);
  return NextResponse.json({ ok: true, nodeId, enabled: current });
});
