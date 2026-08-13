import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getLatestAnalyticsInteraction,
  getLatestCreatedUser,
  getLatestFeedbackEntries,
  getProdOpsConfig,
  getProdOpsSharedSecret,
} from "@/lib/db";
import { fetchIdpOpsDigest, IdpClientError } from "@/lib/idp/client";
import { verifyProdOpsBodySignature, buildProdOpsAdminUrl } from "@/lib/prodops";
import { withMetrics } from "@/lib/with-metrics";

const prodOpsQuerySchema = z.object({
  chatId: z.string().min(1).max(120),
  queryType: z.enum([
    "latest_user_created",
    "latest_feedbacks",
    "latest_user_interaction",
    "ops_digest",
  ]),
});

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

  switch (parsed.data.queryType) {
    case "latest_user_created": {
      const user = await getLatestCreatedUser();
      return NextResponse.json({
        ok: true,
        queryType: parsed.data.queryType,
        user,
        adminUrl: user ? buildProdOpsAdminUrl(`/admin/users/${user.id}`) : "",
      });
    }

    case "latest_feedbacks": {
      const items = await getLatestFeedbackEntries(5);
      return NextResponse.json({
        ok: true,
        queryType: parsed.data.queryType,
        items,
        adminUrl: buildProdOpsAdminUrl("/admin/feedback"),
      });
    }

    case "latest_user_interaction": {
      const interaction = await getLatestAnalyticsInteraction();
      return NextResponse.json({
        ok: true,
        queryType: parsed.data.queryType,
        interaction,
        adminUrl: interaction ? buildProdOpsAdminUrl(`/admin/users/${interaction.userId}`) : "",
      });
    }
    case "ops_digest": {
      try {
        const digest = await fetchIdpOpsDigest();
        return NextResponse.json({
          ok: true,
          queryType: parsed.data.queryType,
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
});
