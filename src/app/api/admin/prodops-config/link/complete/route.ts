import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { completeProdOpsRecipientLink, getProdOpsSharedSecret } from "@/lib/db";
import { verifyProdOpsBodySignature } from "@/lib/prodops";
import { withMetrics } from "@/lib/with-metrics";

const completionSchema = z.object({
  token: z.string().min(1).max(80),
  chatId: z.string().min(1).max(120),
  telegramUserId: z.string().max(120).optional(),
  telegramUsername: z.string().max(120).optional(),
  telegramDisplayName: z.string().max(120).optional(),
});

export const POST = withMetrics(
  "/api/admin/prodops-config/link/complete",
  async (req: NextRequest) => {
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

    const parsed = completionSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const recipient = await completeProdOpsRecipientLink(parsed.data);
    if (!recipient) {
      return NextResponse.json({ error: "Link token is invalid or expired" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      recipient,
    });
  },
);
