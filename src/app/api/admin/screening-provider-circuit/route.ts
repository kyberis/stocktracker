import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { parseBody } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/guards";
import { getScreeningProviderCircuit } from "@/lib/db";
import {
  clearScreeningProviderCircuit,
  tripScreeningProviderCircuit,
} from "@/lib/screening/provider-circuit";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

export const GET = withMetrics(
  "/api/admin/screening-provider-circuit",
  async (req: NextRequest) => {
    const { error } = await requireAdmin(req);
    if (error) return error;

    const circuit = await getScreeningProviderCircuit();
    return NextResponse.json({ circuit });
  },
);

const actionSchema = z.object({
  action: z.enum(["pause", "resume"]),
  provider: z.enum(["fmp", "tavily", "serper", "jina", "openai", "unknown"]).optional(),
  detail: z.string().max(300).optional(),
});

export const POST = withMetrics(
  "/api/admin/screening-provider-circuit",
  async (req: NextRequest) => {
    const { session, error } = await requireAdmin(req);
    if (error || !session) return error;

    const parsed = await parseBody(req, actionSchema);
    if (!parsed.success) return parsed.error;

    const circuit =
      parsed.data.action === "resume"
        ? await clearScreeningProviderCircuit(session.userId)
        : await tripScreeningProviderCircuit({
            provider: parsed.data.provider ?? "unknown",
            detail: parsed.data.detail ?? "Paused manually from admin",
            trippedBy: "admin",
          });

    return NextResponse.json({ circuit });
  },
);
