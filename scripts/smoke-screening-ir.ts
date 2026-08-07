/**
 * Smoke test for screening E4 (IR / Business fan-out).
 *
 * 1. Enable screening_pipeline_real_enabled + screening_ir_agent_enabled.
 * 2. Insert a run with hard_data + compiler steps (Hard Data will fan-out IR).
 * 3. Kick the worker and poll until compiler is terminal.
 * 4. Assert >=1 ir_business steps done and an aggregate_ir_business output.
 *
 * Usage:
 *   PROD_BASE_URL=https://trefolio.com \
 *   TARGET_EMAIL=suarez84@gmail.com \
 *   npx tsx scripts/smoke-screening-ir.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";
import { randomUUID } from "crypto";

function loadDotEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw = readFileSync(resolve(path), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      out[key] = val;
    }
  } catch {
    // ignore
  }
  return out;
}

async function main() {
  const envFile = loadDotEnv(".env.production.local");
  const url =
    process.env.TURSO_DATABASE_URL ||
    envFile.TURSO_DATABASE_URL ||
    envFile.stocktracker_TURSO_DATABASE_URL;
  const authToken =
    process.env.TURSO_AUTH_TOKEN ||
    envFile.TURSO_AUTH_TOKEN ||
    envFile.stocktracker_TURSO_AUTH_TOKEN;
  const cronSecret = process.env.CRON_SECRET || envFile.CRON_SECRET;
  const baseUrl = (process.env.PROD_BASE_URL || "https://trefolio.com").replace(
    /\/+$/,
    "",
  );
  const targetEmail = process.env.TARGET_EMAIL || "suarez84@gmail.com";

  if (!url || !authToken) throw new Error("Missing Turso credentials");
  if (!cronSecret) throw new Error("Missing CRON_SECRET");

  const client = createClient({ url, authToken });
  console.log(`→ base=${baseUrl} email=${targetEmail}`);

  for (const flag of [
    "screening_pipeline_real_enabled",
    "screening_ir_agent_enabled",
  ]) {
    await client.execute({
      sql: `INSERT INTO platform_settings (key, value)
            VALUES (?, 'true')
            ON CONFLICT(key) DO UPDATE SET value='true'`,
      args: [flag],
    });
    console.log(`✓ flag ${flag} = true`);
  }

  const userRow = await client.execute({
    sql: "SELECT id FROM users WHERE email = ? LIMIT 1",
    args: [targetEmail],
  });
  if (userRow.rows.length === 0) throw new Error(`User not found: ${targetEmail}`);
  const userId = String(userRow.rows[0].id);

  const runId = randomUUID();
  const hardDataStepId = randomUUID();
  const compilerStepId = randomUUID();
  const brief = {
    intent: "explore",
    includeSectors: ["Technology"],
    excludeSectors: [],
    regions: ["us_canada"],
    candidateCount: 3,
    criteria: [{ key: "marketCap", condition: "> 10B", source: "preset" }],
    endedEarly: false,
    locale: "en",
  };

  await client.execute({
    sql: `INSERT INTO screening_runs
            (id, user_id, status, intent, brief_json, mocked_pipeline, created_at, updated_at)
          VALUES (?, ?, 'authorized', 'explore', ?, 0, datetime('now'), datetime('now'))`,
    args: [runId, userId, JSON.stringify(brief)],
  });

  await client.execute({
    sql: `INSERT INTO screening_run_steps
            (id, run_id, agent_kind, ticker, status, attempts, depends_on, created_at, updated_at)
          VALUES
            (?, ?, 'hard_data', NULL, 'pending', 0, '[]', datetime('now'), datetime('now')),
            (?, ?, 'compiler', NULL, 'pending', 0, ?, datetime('now'), datetime('now'))`,
    args: [
      hardDataStepId,
      runId,
      compilerStepId,
      runId,
      JSON.stringify([hardDataStepId]),
    ],
  });
  console.log(`✓ run ${runId} queued (hard_data → compiler; IR fan-out on HD done)`);

  const kick = await fetch(`${baseUrl}/api/internal/screening/worker`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cronSecret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ runId }),
  });
  console.log(`✓ worker kick status=${kick.status}`);

  const deadline = Date.now() + 8 * 60_000;
  let compilerStatus = "pending";
  while (Date.now() < deadline) {
    const steps = await client.execute({
      sql: `SELECT agent_kind, ticker, status FROM screening_run_steps WHERE run_id = ?`,
      args: [runId],
    });
    const rows = steps.rows.map((r) => ({
      kind: String(r.agent_kind),
      ticker: r.ticker == null ? null : String(r.ticker),
      status: String(r.status),
    }));
    const irDone = rows.filter(
      (r) => r.kind === "ir_business" && r.status === "done",
    ).length;
    const irTotal = rows.filter((r) => r.kind === "ir_business").length;
    const agg = rows.find((r) => r.kind === "aggregate_ir_business");
    const compiler = rows.find((r) => r.kind === "compiler");
    compilerStatus = compiler?.status ?? "missing";
    console.log(
      `… ir=${irDone}/${irTotal} agg=${agg?.status ?? "-"} compiler=${compilerStatus}`,
    );
    if (
      compilerStatus === "done" ||
      compilerStatus === "failed" ||
      compilerStatus === "skipped"
    ) {
      break;
    }
    // Keep kicking while work remains (self-invoke can drop under load).
    await fetch(`${baseUrl}/api/internal/screening/worker`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${cronSecret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ runId }),
    }).catch(() => null);
    await new Promise((r) => setTimeout(r, 5000));
  }

  const finalSteps = await client.execute({
    sql: `SELECT agent_kind, ticker, status FROM screening_run_steps WHERE run_id = ? ORDER BY created_at`,
    args: [runId],
  });
  console.log("final steps:");
  for (const r of finalSteps.rows) {
    console.log(`  ${r.agent_kind}${r.ticker ? `:${r.ticker}` : ""} → ${r.status}`);
  }

  const irDoneCount = finalSteps.rows.filter(
    (r) => String(r.agent_kind) === "ir_business" && String(r.status) === "done",
  ).length;
  const aggOut = await client.execute({
    sql: `SELECT COUNT(*) AS c FROM screening_agent_outputs
          WHERE run_id = ? AND agent_kind = 'aggregate_ir_business'`,
    args: [runId],
  });
  const aggCount = Number(aggOut.rows[0]?.c ?? 0);

  if (irDoneCount < 1) {
    throw new Error(`Expected >=1 ir_business done, got ${irDoneCount}`);
  }
  if (aggCount < 1) {
    throw new Error("Expected aggregate_ir_business output row");
  }
  if (compilerStatus !== "done") {
    throw new Error(`Compiler not done: ${compilerStatus}`);
  }

  console.log(`✓ smoke OK runId=${runId} irDone=${irDoneCount}`);
}

main().catch((err) => {
  console.error("✗", err instanceof Error ? err.message : err);
  process.exit(1);
});
