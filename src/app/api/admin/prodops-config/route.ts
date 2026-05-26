import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/guards";
import type { ProdOpsConfig } from "@/lib/types";
import {
  getProdOpsConfig,
  getProdOpsSharedSecretMeta,
  setProdOpsConfig,
  setProdOpsSharedSecret,
} from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

function parseDestinations(value: unknown): ProdOpsConfig["destinations"] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  return value as ProdOpsConfig["destinations"];
}

function parseEventTypes(value: unknown): ProdOpsConfig["enabledEventTypes"] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "")) as ProdOpsConfig["enabledEventTypes"];
}

export const GET = withMetrics("/api/admin/prodops-config", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const [config, secretMeta] = await Promise.all([
    getProdOpsConfig(),
    getProdOpsSharedSecretMeta(),
  ]);

  return NextResponse.json({
    config,
    hasSharedSecret: secretMeta.hasSecret,
    maskedSharedSecret: secretMeta.maskedSecret,
    secretSource: secretMeta.source,
  });
});

export const PUT = withMetrics("/api/admin/prodops-config", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const updates: Partial<ProdOpsConfig> = {};

  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
    }
    updates.enabled = body.enabled;
  }

  if (body.baseUrl !== undefined) {
    if (typeof body.baseUrl !== "string") {
      return NextResponse.json({ error: "baseUrl must be a string" }, { status: 400 });
    }
    updates.baseUrl = body.baseUrl;
  }

  if (body.enabledEventTypes !== undefined) {
    updates.enabledEventTypes = parseEventTypes(body.enabledEventTypes);
  }

  if (body.destinations !== undefined) {
    updates.destinations = parseDestinations(body.destinations);
  }

  if (body.sharedSecret !== undefined) {
    if (typeof body.sharedSecret !== "string") {
      return NextResponse.json({ error: "sharedSecret must be a string" }, { status: 400 });
    }
    await setProdOpsSharedSecret(body.sharedSecret);
  }

  if (body.clearSharedSecret === true) {
    await setProdOpsSharedSecret("");
  }

  const [config, secretMeta] = await Promise.all([
    setProdOpsConfig(updates),
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
