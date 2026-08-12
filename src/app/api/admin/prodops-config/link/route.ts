import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/guards";
import {
  createProdOpsRecipientLink,
  getProdOpsSharedSecretMeta,
  unlinkProdOpsRecipient,
} from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/admin/prodops-config/link", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const { deepLink, expiresAt } = await createProdOpsRecipientLink();
    console.info("[prodops-link] admin minted telegram link", { expiresAt });
    return NextResponse.json({
      ok: true,
      deepLink,
      expiresAt,
    });
  } catch (routeError) {
    return NextResponse.json(
      {
        error:
          routeError instanceof Error
            ? routeError.message
            : "Failed to create ProdOps Telegram link",
      },
      { status: 400 },
    );
  }
});

export const DELETE = withMetrics("/api/admin/prodops-config/link", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const [config, secretMeta] = await Promise.all([
    unlinkProdOpsRecipient(),
    getProdOpsSharedSecretMeta(),
  ]);

  return NextResponse.json({
    ok: true,
    config,
    hasSharedSecret: secretMeta.hasSecret,
    maskedSharedSecret: secretMeta.maskedSecret,
    secretSource: secretMeta.source,
  });
});
