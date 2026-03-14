import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { isFeatureEnabled, setFeatureEnabled, type PlatformFeature } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { featureFlagSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";

const ALLOWED_FLAGS: PlatformFeature[] = [
  "alerts_enabled", "csv_export_enabled", "apple_signin_enabled", "device_enabled",
  "whatsapp_enabled",
  "tool_transactions_enabled", "tool_dividends_enabled", "tool_performance_enabled",
  "tool_taxonomy_enabled", "tool_rebalancing_enabled", "tool_accounts_enabled",
  "tool_watchlist_enabled",
  "support_chat_enabled",
];

export const GET = withMetrics("/api/admin/feature-flags", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const flags: Record<string, boolean> = {};
  for (const flag of ALLOWED_FLAGS) {
    flags[flag] = await isFeatureEnabled(flag);
  }
  return NextResponse.json({ flags });
});

export const PUT = withMetrics("/api/admin/feature-flags", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const result = await parseBody(req, featureFlagSchema);
  if (!result.success) return result.error;
  const { flag, enabled } = result.data;

  await setFeatureEnabled(flag, enabled);
  return NextResponse.json({ ok: true, flag, enabled });
});
