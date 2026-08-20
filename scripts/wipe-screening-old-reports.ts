#!/usr/bin/env npx tsx
/**
 * Optional ops wipe of old screening reports/runs before the thesis bake-off.
 *
 * Default: delete checklist runs (including NULL pipeline_kind, treated as
 * checklist). Thesis runs are kept so you can compare.
 *
 * Usage:
 *   npx tsx scripts/wipe-screening-old-reports.ts --dry-run
 *   npx tsx scripts/wipe-screening-old-reports.ts --confirm
 *   npx tsx scripts/wipe-screening-old-reports.ts --confirm --all
 *
 * --all also deletes thesis runs. Research cache is never wiped.
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
  const dryRun = process.argv.includes("--dry-run") || !process.argv.includes("--confirm");
  const all = process.argv.includes("--all");

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

  const where = all
    ? "1=1"
    : "(pipeline_kind IS NULL OR pipeline_kind = '' OR pipeline_kind = 'checklist')";

  const count = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM screening_runs WHERE ${where}`,
    args: [],
  });
  const n = Number(count.rows[0]?.n ?? 0);
  console.log(
    `${dryRun ? "Would delete" : "Deleting"} ${n} screening run(s) (${all ? "all pipelines" : "checklist / NULL only"}).`,
  );
  console.log("Compare bake-off by launching the same ticker twice: Checklist then Thesis.");

  if (dryRun) {
    console.log("Dry run. Pass --confirm to delete.");
    process.exit(0);
  }

  const ids = await db.execute({
    sql: `SELECT id FROM screening_runs WHERE ${where}`,
    args: [],
  });
  const runIds = ids.rows.map((r) => String(r.id));
  for (const id of runIds) {
    await db.execute({
      sql: "DELETE FROM screening_agent_outputs WHERE run_id = ?",
      args: [id],
    });
  }
  await db.execute({
    sql: `DELETE FROM screening_runs WHERE ${where}`,
    args: [],
  });
  console.log(`Deleted ${runIds.length} run(s). Steps/events/QA rows cascade with the run.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
