import { readFileSync } from "fs";
import { createClient } from "@libsql/client";

function load(path: string) {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

async function main() {
  const env = load(".env.production.local");
  const client = createClient({
    url: env.stocktracker_TURSO_DATABASE_URL || env.TURSO_DATABASE_URL,
    authToken: env.stocktracker_TURSO_AUTH_TOKEN || env.TURSO_AUTH_TOKEN,
  });
  const runId = process.argv[2] || "ec61addb-94e9-4ece-9b8e-fb17f5eeb552";

  const run = await client.execute({
    sql: "SELECT * FROM screening_runs WHERE id = ?",
    args: [runId],
  });
  console.log("RUN:", JSON.stringify(run.rows[0], null, 2));

  const steps = await client.execute({
    sql: "SELECT * FROM screening_run_steps WHERE run_id = ? ORDER BY created_at",
    args: [runId],
  });
  console.log("\nSTEPS:", JSON.stringify(steps.rows, null, 2));

  const events = await client.execute({
    sql: "SELECT * FROM screening_run_events WHERE run_id = ? ORDER BY created_at",
    args: [runId],
  });
  console.log("\nEVENTS:", JSON.stringify(events.rows, null, 2));

  const outputs = await client.execute({
    sql:
      "SELECT id, agent_kind, latency_ms, created_at, substr(output_json,1,120) preview FROM screening_agent_outputs WHERE run_id = ? ORDER BY created_at",
    args: [runId],
  });
  console.log("\nOUTPUTS:", JSON.stringify(outputs.rows, null, 2));

  const flag = await client.execute({
    sql: "SELECT key, value FROM platform_settings WHERE key LIKE 'screening%'",
    args: [],
  });
  console.log("\nFLAGS:", JSON.stringify(flag.rows, null, 2));

  const pending = await client.execute({
    sql: `SELECT id, run_id, agent_kind, status, attempts, lease_owner, lease_expires_at, created_at
          FROM screening_run_steps
          WHERE status IN ('pending','running')
          ORDER BY created_at DESC LIMIT 20`,
    args: [],
  });
  console.log("\nALL PENDING/RUNNING:", JSON.stringify(pending.rows, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
