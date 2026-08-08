#!/usr/bin/env npx tsx
/**
 * Drain pending steps for one screening run against prod Turso.
 *
 * Usage:
 *   npx tsx scripts/drain-screening-run.ts <runId>
 */
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
    console.error("Usage: npx tsx scripts/drain-screening-run.ts <runId>");
    process.exit(1);
  }

  const envFile = loadDotEnv(".env.production.local");
  for (const [k, v] of Object.entries(envFile)) {
    if (!process.env[k]) process.env[k] = v;
  }
  // Prefer stocktracker_ aliases used in Vercel.
  if (!process.env.TURSO_DATABASE_URL && envFile.stocktracker_TURSO_DATABASE_URL) {
    process.env.TURSO_DATABASE_URL = envFile.stocktracker_TURSO_DATABASE_URL;
  }
  if (!process.env.TURSO_AUTH_TOKEN && envFile.stocktracker_TURSO_AUTH_TOKEN) {
    process.env.TURSO_AUTH_TOKEN = envFile.stocktracker_TURSO_AUTH_TOKEN;
  }
  // Scripts run with NODE_ENV=development under tsx; force remote Turso.
  process.env.STOCKTRACKER_USE_REMOTE_DB_IN_DEV = "true";

  const { recoverExpiredLeases } = await import("../src/lib/db");
  const { drainScreeningRun } = await import(
    "../src/lib/screening/orchestrator/drain-run"
  );
  // Register handlers.
  await import("../src/lib/screening/orchestrator/register");

  const recovered = await recoverExpiredLeases(new Date());
  console.log("recovered", recovered);

  let total = 0;
  for (let round = 0; round < 30; round++) {
    const { processed, moreWork } = await drainScreeningRun({
      runId,
      maxSteps: 4,
    });
    total += processed;
    console.log(`round ${round + 1}: processed=${processed} moreWork=${moreWork}`);
    if (!moreWork) break;
    if (processed === 0) {
      // Another lease may still be holding work; wait and reclaim.
      await recoverExpiredLeases(new Date());
      await new Promise((r) => setTimeout(r, 2000));
      const retry = await drainScreeningRun({ runId, maxSteps: 2 });
      total += retry.processed;
      console.log(`retry: processed=${retry.processed} moreWork=${retry.moreWork}`);
      if (retry.processed === 0) break;
    }
  }
  console.log(`done. totalProcessed=${total}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
