export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { findUserByWidgetToken, findUserByDevicePasskey, isFeatureEnabled } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { deviceFirmwareChecks } from "@/lib/metrics";
import { json401 } from "@/lib/log-unauthorized";

interface FirmwareEntry {
  version: string;
  url: string;
  sha256: string;
  size: number;
  releaseNotes: string;
}

function getLatestFirmware(board: string): FirmwareEntry | null {
  if (board !== "t4s3") return null;

  const version = process.env.FIRMWARE_LATEST_VERSION ?? "";
  const url = process.env.FIRMWARE_LATEST_URL ?? "";
  if (!version || !url) return null;

  return {
    version,
    url,
    sha256: process.env.FIRMWARE_LATEST_SHA256 ?? "",
    size: parseInt(process.env.FIRMWARE_LATEST_SIZE ?? "0", 10),
    releaseNotes: process.env.FIRMWARE_LATEST_NOTES ?? "",
  };
}

function isInRollout(userId: string): boolean {
  const pct = parseInt(process.env.FIRMWARE_ROLLOUT_PERCENT ?? "100", 10);
  if (pct >= 100) return true;
  if (pct <= 0) return false;
  const hash = createHash("sha256").update(`fw-rollout:${userId}`).digest();
  const bucket = hash.readUInt16BE(0) % 100;
  return bucket < pct;
}

async function resolveUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  return await findUserByWidgetToken(token) ?? await findUserByDevicePasskey(token);
}

export const GET = withMetrics("/api/device/firmware", async (req: NextRequest) => {
  if (!(await isFeatureEnabled("device_enabled"))) {
    return Response.json({ error: "Device features are not enabled" }, { status: 404 });
  }

  const user = await resolveUser(req);
  if (!user) {
    return json401(req, {
      source: "api/device/firmware",
      reason: "device_bearer_auth_failed",
      tags: { hasBearer: Boolean(req.headers.get("authorization")?.startsWith("Bearer ")) },
    });
  }

  const { searchParams } = new URL(req.url);
  const currentVersion = searchParams.get("v") ?? "0.0.0";
  const board = searchParams.get("board") ?? "t4s3";

  deviceFirmwareChecks.inc({ current_version: currentVersion, board });

  const latest = getLatestFirmware(board);
  if (!latest) {
    return Response.json({ available: false });
  }

  const currentParts = currentVersion.split(".").map(Number);
  const latestParts = latest.version.split(".").map(Number);
  let updateAvailable = false;
  for (let i = 0; i < 3; i++) {
    if ((latestParts[i] ?? 0) > (currentParts[i] ?? 0)) {
      updateAvailable = true;
      break;
    }
    if ((latestParts[i] ?? 0) < (currentParts[i] ?? 0)) break;
  }

  if (!updateAvailable) {
    return Response.json({ available: false });
  }

  if (!isInRollout(user.id)) {
    return Response.json({ available: false });
  }

  return Response.json({
    available: true,
    version: latest.version,
    url: latest.url,
    sha256: latest.sha256,
    size: latest.size,
    releaseNotes: latest.releaseNotes,
  }, {
    headers: { "Cache-Control": "private, max-age=3600" },
  });
});
