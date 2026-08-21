import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  findUserByWidgetToken,
  findUserByDevicePasskey,
  markDeviceLinked,
  type DbUser,
} from "@/lib/db";
import { checkDeviceAuthRateLimit, getClientIp, type RateLimitResult } from "@/lib/rate-limit";

export type DeviceBearerMethod = "widget_token" | "device_passkey";

export type DeviceBearerAuthResult =
  | { status: "ok"; user: DbUser; method: DeviceBearerMethod }
  | { status: "missing_bearer" }
  | { status: "rate_limited"; retryAfterSec: number }
  | { status: "invalid_token" };

function retryAfterSeconds(rl: RateLimitResult): number {
  const ms = new Date(rl.resetAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return 900;
  return Math.max(1, Math.ceil(ms / 1000));
}

/**
 * Authenticate Scriptable widget / Leaf device Bearer tokens.
 * Distinguishes rate limits from bad tokens so callers can return 429 vs 401.
 */
export async function authenticateDeviceBearer(
  req: NextRequest,
): Promise<DeviceBearerAuthResult> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return { status: "missing_bearer" };

  const ip = getClientIp(req);
  const rl = await checkDeviceAuthRateLimit(ip);
  if (!rl.allowed) {
    return { status: "rate_limited", retryAfterSec: retryAfterSeconds(rl) };
  }

  const token = auth.slice(7).trim();
  if (!token) return { status: "invalid_token" };

  const widgetUser = await findUserByWidgetToken(token);
  if (widgetUser) {
    return { status: "ok", user: widgetUser, method: "widget_token" };
  }

  const deviceUser = await findUserByDevicePasskey(token);
  if (deviceUser) {
    markDeviceLinked(deviceUser.id).catch(() => {});
    return { status: "ok", user: deviceUser, method: "device_passkey" };
  }

  return { status: "invalid_token" };
}

export function deviceBearerRateLimitResponse(retryAfterSec = 900): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests. Try again shortly.",
      reason: "rate_limited",
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}
