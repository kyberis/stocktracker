#!/usr/bin/env npx tsx
import { readFileSync } from "fs";
import { resolve } from "path";

function loadDotEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw = readFileSync(resolve(path), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      let val = m[2];
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      out[m[1]] = val;
    }
  } catch {
    // ignore
  }
  return out;
}

async function main() {
  const runId = process.argv[2]?.trim();
  if (!runId) {
    console.error("Usage: npx tsx scripts/force-expire-screening-leases.ts <runId>");
    process.exit(1);
  }

  const envFile = loadDotEnv(".env.production.local");
  for (const [k, v] of Object.entries(envFile)) {
    if (!process.env[k]) process.env[k] = v;
  }
  if (!process.env.TURSO_DATABASE_URL && envFile.stocktracker_TURSO_DATABASE_URL) {
    process.env.TURSO_DATABASE_URL = envFile.stocktracker_TURSO_DATABASE_URL;
  }
  if (!process.env.TURSO_AUTH_TOKEN && envFile.stocktracker_TURSO_AUTH_TOKEN) {
    process.env.TURSO_AUTH_TOKEN = envFile.stocktracker_TURSO_AUTH_TOKEN;
  }
  process.env.STOCKTRACKER_USE_REMOTE_DB_IN_DEV = "true";

  const { ensureInitialized } = await import("../src/lib/db/client");
  const db = await ensureInitialized();
  const result = await db.execute({
    sql: `UPDATE screening_run_steps
           SET lease_expires_at = ?
           WHERE run_id = ? AND status = 'running'`,
    args: ["2020-01-01T00:00:00.000Z", runId],
  });
  console.log("force-expired", result.rowsAffected);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
