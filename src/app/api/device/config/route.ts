export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  findUserByWidgetToken,
  findUserByDevicePasskey,
  markDeviceLinked,
  getDeviceTemplate,
  isFeatureEnabled,
  isFeatureEnabledForUser,
  findPortfolioById,
} from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { deviceApiCalls } from "@/lib/metrics";
import { SOFT_CAPS } from "@/lib/platform-config";
import { parseSubscriptionPlan, planAtLeast, isPaidPlan, pickTierValue } from "@/lib/plan-rank";
import { json401 } from "@/lib/log-unauthorized";

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
    return json401(req, {
      source: "api/device/config",
      reason: "device_bearer_auth_failed",
      tags: { hasBearer: Boolean(req.headers.get("authorization")?.startsWith("Bearer ")) },
    });
  }

  if (!(await isFeatureEnabledForUser("device_enabled", user.id))) {
    return Response.json({ error: "Device features are not enabled" }, { status: 404 });
  }

  // Portfolio info for device display
  let portfolioName = "All Portfolios";
  if (user.device_portfolio_id) {
    const portfolio = await findPortfolioById(user.id, user.device_portfolio_id);
    if (portfolio) portfolioName = portfolio.name;
  }

  const plan = parseSubscriptionPlan(user.plan);
  const proPlus = planAtLeast(plan, "pro");
  const paid = isPaidPlan(plan);
  const templateId = user.device_template_id || "classic-dark";

  const freeTemplates = AVAILABLE_TEMPLATES.filter((t) => t.id === "classic-dark");
  const paidTemplates = AVAILABLE_TEMPLATES;

  return Response.json({
    plan,
    portfolioName,
    features: {
      aiSummary: proPlus,
      topHoldingsCount: paid ? 10 : 5,
      refreshIntervalSec: paid ? 60 : 120,
      templates: paid ? paidTemplates.map((t) => t.id) : freeTemplates.map((t) => t.id),
      holdingsLimit: pickTierValue(SOFT_CAPS.holdings, plan),
    },
    templateId,
    availableTemplates: paid ? paidTemplates : freeTemplates,
    firmwareVersion: "1.0.0",
  }, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
});
