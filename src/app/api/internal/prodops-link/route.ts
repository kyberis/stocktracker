import { NextRequest, NextResponse } from "next/server";

import {
  createProdOpsRecipientLink,
  getProdOpsConfig,
  getProdOpsSharedSecretMeta,
  unlinkProdOpsRecipient,
} from "@/lib/db";
import { verifyIdpServiceBearer } from "@/lib/idp/service-auth";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

/**
 * IdP `/agents` mints the same ProdOps Telegram recipient link as trefolio admin.
 * Auth: Bearer IDP_SERVICE_TOKEN.
 */
export async function GET(req: NextRequest) {
  if (!verifyIdpServiceBearer(req)) return unauthorized();
  const config = await getProdOpsConfig();
  return NextResponse.json({
    ok: true,
    linked: Boolean(config.recipient?.chatId),
    botUsername: config.botUsername || "",
    enabled: config.enabled,
  });
}

export async function POST(req: NextRequest) {
  if (!verifyIdpServiceBearer(req)) return unauthorized();
  try {
    const { deepLink, expiresAt } = await createProdOpsRecipientLink();
    console.info("[prodops-link] idp minted telegram link", { expiresAt });
    return NextResponse.json({
      ok: true,
      deep_link: deepLink,
      deepLink,
      expiresAt,
      expires_in_seconds: 15 * 60,
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
}

export async function DELETE(req: NextRequest) {
  if (!verifyIdpServiceBearer(req)) return unauthorized();
  const [config, secretMeta] = await Promise.all([
    unlinkProdOpsRecipient(),
    getProdOpsSharedSecretMeta(),
  ]);
  return NextResponse.json({
    ok: true,
    linked: Boolean(config.recipient?.chatId),
    botUsername: config.botUsername || "",
    hasSharedSecret: secretMeta.hasSecret,
  });
}
