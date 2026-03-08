export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  findUserByWidgetToken,
  findUserByDevicePasskey,
  markDeviceLinked,
  getDeviceTemplate,
  isFeatureEnabled,
} from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { deviceApiCalls } from "@/lib/metrics";
import { PLATFORM_LIMITS } from "@/lib/platform-config";

const AVAILABLE_TEMPLATES = [
  { id: "classic-dark", name: "Classic Dark" },
  { id: "minimal-light", name: "Minimal Light" },
  { id: "midnight-green", name: "Midnight Green" },
];

async function resolveUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const user = await findUserByWidgetToken(token) ?? await findUserByDevicePasskey(token);
  if (user) markDeviceLinked(user.id).catch(() => {});
  return user;
}

export const GET = withMetrics("/api/device/config", async (req: NextRequest) => {
  if (!(await isFeatureEnabled("device_enabled"))) {
    return Response.json({ error: "Device features are not enabled" }, { status: 404 });
  }

  const fwVersion = req.headers.get("x-firmware-version");
  if (fwVersion) deviceApiCalls.inc({ fw_version: fwVersion, route: "/api/device/config", status: "attempt" });

  const user = await resolveUser(req);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPro = user.plan === "pro";
  const templateId = user.device_template_id || "classic-dark";

  const freeTemplates = AVAILABLE_TEMPLATES.filter((t) => t.id === "classic-dark");
  const proTemplates = AVAILABLE_TEMPLATES;

  return Response.json({
    plan: user.plan,
    features: {
      aiSummary: isPro,
      topHoldingsCount: isPro ? 10 : 5,
      refreshIntervalSec: isPro ? 60 : 120,
      templates: isPro ? proTemplates.map((t) => t.id) : freeTemplates.map((t) => t.id),
      holdingsLimit: isPro ? -1 : PLATFORM_LIMITS.FREE_HOLDINGS_LIMIT,
    },
    templateId,
    availableTemplates: isPro ? proTemplates : freeTemplates,
    firmwareVersion: "1.0.0",
  }, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
});
