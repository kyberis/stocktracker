import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getLatestAnalyticsInteraction,
  getLatestCreatedUser,
  getLatestFeedbackEntries,
  getProdOpsConfig,
  getProdOpsSharedSecret,
  listExperimentAssignmentOverview,
} from "@/lib/db";
import { fetchIdpOpsDigest, IdpClientError } from "@/lib/idp/client";
import { classifyStaffQuery, type ProdOpsStaffIntent } from "@/lib/prodops-staff-query";
import { verifyProdOpsBodySignature, buildProdOpsAdminUrl } from "@/lib/prodops";
import { withMetrics } from "@/lib/with-metrics";

const prodOpsQuerySchema = z.object({
  chatId: z.string().min(1).max(120),
  queryType: z.enum([
    "latest_user_created",
    "latest_feedbacks",
    "latest_user_interaction",
    "ops_digest",
    "experiments_overview",
    "nl",
  ]),
  text: z.string().min(1).max(500).optional(),
  experimentKey: z.string().min(1).max(64).optional(),
});

async function jsonForIntent(
  intent: ProdOpsStaffIntent,
  experimentKey: string | null,
): Promise<NextResponse> {
  switch (intent) {
    case "help":
      return NextResponse.json({
        ok: true,
        queryType: "help" as const,
        adminUrl: buildProdOpsAdminUrl("/admin/settings"),
      });
    case "latest_user_created": {
      const user = await getLatestCreatedUser();
      return NextResponse.json({
        ok: true,
        queryType: "latest_user_created" as const,
        user,
        adminUrl: user ? buildProdOpsAdminUrl(`/admin/users/${user.id}`) : "",
      });
    }
    case "latest_feedbacks": {
      const items = await getLatestFeedbackEntries(5);
      return NextResponse.json({
        ok: true,
        queryType: "latest_feedbacks" as const,
        items,
        adminUrl: buildProdOpsAdminUrl("/admin/feedback"),
      });
    }
    case "latest_user_interaction": {
      const interaction = await getLatestAnalyticsInteraction();
      return NextResponse.json({
        ok: true,
        queryType: "latest_user_interaction" as const,
        interaction,
        adminUrl: interaction ? buildProdOpsAdminUrl(`/admin/users/${interaction.userId}`) : "",
      });
    }
    case "experiments_overview": {
      const experiments = await listExperimentAssignmentOverview(experimentKey || undefined);
      return NextResponse.json({
        ok: true,
        queryType: "experiments_overview" as const,
        experiments,
        adminUrl: buildProdOpsAdminUrl("/admin/experiments"),
      });
    }
    case "ops_digest": {
      try {
        const digest = await fetchIdpOpsDigest();
        return NextResponse.json({
          ok: true,
          queryType: "ops_digest" as const,
          markdown: digest.markdown,
          adminUrl: buildProdOpsAdminUrl("/admin/settings"),
        });
      } catch (error) {
        const status = error instanceof IdpClientError ? error.status : 502;
        console.warn("[prodops-query] ops_digest failed", status, error instanceof Error ? error.message : error);
        return NextResponse.json(
          { error: "idp_digest_unavailable" },
          { status: status >= 400 && status < 600 ? status : 502 },
        );
      }
    }
  }
}

export const POST = withMetrics("/api/internal/prodops-query", async (req: NextRequest) => {
  const secret = await getProdOpsSharedSecret();
  if (!secret.trim()) {
    return NextResponse.json({ error: "ProdOps shared secret is missing" }, { status: 503 });
  }

  const body = await req.text().catch(() => "");
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const timestamp = req.headers.get("x-prodops-timestamp") || "";
  const signature = req.headers.get("x-prodops-signature") || "";
  const verified = verifyProdOpsBodySignature({
    body,
    secret,
    timestamp,
    signature,
  });
  if (!verified) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const parsed = prodOpsQuerySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const config = await getProdOpsConfig();
  if (!config.recipient?.chatId || config.recipient.chatId !== parsed.data.chatId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.queryType === "nl") {
    const text = parsed.data.text?.trim() || "";
    if (!text) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const classified = await classifyStaffQuery(text);
    return jsonForIntent(classified.intent, classified.experimentKey);
  }

  if (parsed.data.queryType === "experiments_overview") {
    return jsonForIntent("experiments_overview", parsed.data.experimentKey || null);
  }

  return jsonForIntent(parsed.data.queryType, null);
});
