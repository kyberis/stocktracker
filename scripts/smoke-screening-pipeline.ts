/**
 * Smoke test for the screening real pipeline (E3).
 *
 * Talks directly to the production Turso DB to:
 *  1. Enable the `screening_pipeline_real_enabled` flag.
 *  2. Insert a synthetic screening run for a target user with a small brief.
 *  3. Insert hard_data + compiler steps.
 *  4. Kick the deployed internal worker (Bearer CRON_SECRET).
 *  5. Poll until hard_data reaches a terminal state (`done`/`failed`).
 *
 * Usage:
 *   PROD_BASE_URL=https://trefolio.com \
 *   TARGET_EMAIL=suarez84@gmail.com \
 *   npx tsx scripts/smoke-screening-pipeline.ts
 *
 * Reads TURSO_DATABASE_URL / TURSO_AUTH_TOKEN and CRON_SECRET from
 * `.env.production.local` (falls back to plain env vars).
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

  // 1. Enable the flag globally so isFeatureEnabledForUser returns true.
  await client.execute({
    sql: `INSERT INTO platform_settings (key, value)
          VALUES (?, 'true')
          ON CONFLICT(key) DO UPDATE SET value='true'`,
    args: ["screening_pipeline_real_enabled"],
  });
  console.log("✓ flag screening_pipeline_real_enabled = true");

  // 2. Look up user id.
  const userRow = await client.execute({
    sql: "SELECT id FROM users WHERE email = ? LIMIT 1",
    args: [targetEmail],
  });
  if (userRow.rows.length === 0)
    throw new Error(`user not found: ${targetEmail}`);
  const userId = String(userRow.rows[0].id);
  console.log(`✓ user id ${userId}`);

  // 3. Insert a synthetic run.
  const runId = randomUUID();
  const nowIso = new Date().toISOString();
  const brief = {
    intent: "explore",
    includeSectors: ["Technology"],
    excludeSectors: [],
    regions: ["us_canada"],
    candidateCount: 5,
    criteria: [
      { key: "marketCap", condition: "10 – 300B USD", source: "chat" },
    ],
    endedEarly: false,
    locale: "en",
  };
  await client.execute({
    sql: `INSERT INTO screening_runs (id, user_id, status, intent, brief_json, mocked_pipeline, created_at, updated_at)
          VALUES (?, ?, 'authorized', 'explore', ?, 0, ?, ?)`,
    args: [runId, userId, JSON.stringify(brief), nowIso, nowIso],
  });
  console.log(`✓ inserted screening_runs id=${runId}`);

  // 4. Insert steps: hard_data (no deps) → compiler (depends on hard_data).
  const hardDataId = randomUUID();
  const compilerId = randomUUID();
  await client.batch(
    [
      {
        sql: `INSERT INTO screening_run_steps (id, run_id, agent_kind, ticker, status, attempts, depends_on, created_at, updated_at)
              VALUES (?, ?, 'hard_data', NULL, 'pending', 0, '[]', ?, ?)`,
        args: [hardDataId, runId, nowIso, nowIso],
      },
      {
        sql: `INSERT INTO screening_run_steps (id, run_id, agent_kind, ticker, status, attempts, depends_on, created_at, updated_at)
              VALUES (?, ?, 'compiler', NULL, 'pending', 0, ?, ?, ?)`,
        args: [compilerId, runId, JSON.stringify([hardDataId]), nowIso, nowIso],
      },
    ],
    "write",
  );
  console.log(`✓ inserted 2 steps (hard_data=${hardDataId}, compiler=${compilerId})`);

  // 5. Kick the worker on production.
  const workerUrl = `${baseUrl}/api/internal/screening/worker`;
  console.log(`→ POST ${workerUrl}`);
  const workerRes = await fetch(workerUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cronSecret}`,
    },
    body: JSON.stringify({ runId }),
  });
  const workerText = await workerRes.text();
  console.log(`← worker ${workerRes.status}: ${workerText.slice(0, 200)}`);
  if (!workerRes.ok) {
    console.error("worker call failed, aborting");
    process.exit(1);
  }

  // 6. Poll steps until hard_data reaches a terminal state (max ~90s).
  const deadline = Date.now() + 90_000;
  let hardStatus = "pending";
  while (Date.now() < deadline) {
    const stepRows = await client.execute({
      sql: `SELECT id, agent_kind, status, attempts, error_message
              FROM screening_run_steps
             WHERE run_id = ?
             ORDER BY created_at ASC`,
      args: [runId],
    });
    const lines = stepRows.rows.map((r) => {
      const o = r as Record<string, unknown>;
      return `  · ${o.agent_kind} status=${o.status} attempts=${o.attempts}${o.error_message ? ` err=${String(o.error_message).slice(0, 60)}` : ""}`;
    });
    console.log(`[${new Date().toISOString()}] steps:\n${lines.join("\n")}`);
    const hardRow = stepRows.rows.find(
      (r) => String((r as Record<string, unknown>).agent_kind) === "hard_data",
    );
    if (hardRow) {
      hardStatus = String((hardRow as Record<string, unknown>).status);
      if (hardStatus === "done" || hardStatus === "failed") break;
    }
    await new Promise((res) => setTimeout(res, 3000));
  }

  // 7. Read hard_data output payload if present.
  const outputRows = await client.execute({
    sql: `SELECT agent_kind, latency_ms, substr(output_json, 1, 400) AS preview, created_at
            FROM screening_agent_outputs
           WHERE run_id = ?
           ORDER BY created_at ASC`,
    args: [runId],
  });
  console.log("\n→ agent outputs:");
  for (const raw of outputRows.rows) {
    const r = raw as Record<string, unknown>;
    console.log(
      `  · ${r.agent_kind} latency=${r.latency_ms}ms preview=${String(r.preview).slice(0, 200)}`,
    );
  }

  // 8. Read events for the run.
  const eventRows = await client.execute({
    sql: `SELECT event_type, substr(payload_json, 1, 200) AS payload, created_at
            FROM screening_run_events
           WHERE run_id = ?
           ORDER BY created_at ASC`,
    args: [runId],
  });
  console.log("\n→ events:");
  for (const raw of eventRows.rows) {
    const r = raw as Record<string, unknown>;
    console.log(`  · ${r.event_type} ${r.payload}`);
  }

  console.log(`\n=== FINAL hard_data status: ${hardStatus} ===`);
  if (hardStatus === "done") {
    console.log("SMOKE PASS ✓");
    process.exit(0);
  } else {
    console.error(`SMOKE FAIL — hard_data ended as '${hardStatus}'`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(3);
});
