#!/usr/bin/env npx tsx
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";

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
  const runId = process.argv[2];
  if (!runId) throw new Error("usage: inspect-screening-run.ts <runId>");
  const envFile = loadDotEnv(".env.production.local");
  const url =
    process.env.TURSO_DATABASE_URL ||
    envFile.TURSO_DATABASE_URL ||
    envFile.stocktracker_TURSO_DATABASE_URL;
  const authToken =
    process.env.TURSO_AUTH_TOKEN ||
    envFile.TURSO_AUTH_TOKEN ||
    envFile.stocktracker_TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error("Missing Turso credentials");
  const client = createClient({ url, authToken });

  const run = await client.execute({
    sql: `SELECT id, user_id, status, intent, pipeline_kind, mocked_pipeline,
                 cost_usd, created_at, updated_at,
                 substr(brief_json, 1, 2500) AS brief
          FROM screening_runs WHERE id = ?`,
    args: [runId],
  });
  console.log("=== RUN ===");
  console.log(JSON.stringify(run.rows[0] ?? null, null, 2));

  const steps = await client.execute({
    sql: `SELECT id, agent_kind, ticker, status, error_message, attempts,
                 created_at, updated_at, started_at, completed_at,
                 substr(depends_on, 1, 200) AS depends
          FROM screening_run_steps WHERE run_id = ? ORDER BY created_at, agent_kind`,
    args: [runId],
  });
  console.log("\n=== STEPS ===");
  for (const row of steps.rows) {
    console.log(
      `${row.status}\t${row.agent_kind}\t${row.ticker ?? "-"}\tattempts=${row.attempts}\t${row.error_message ?? ""}`,
    );
  }

  const outs = await client.execute({
    sql: `SELECT agent_kind, ticker, length(output_json) AS n, created_at,
                 substr(output_json, 1, 400) AS preview
          FROM screening_agent_outputs WHERE run_id = ? ORDER BY created_at`,
    args: [runId],
  });
  console.log("\n=== OUTPUTS ===");
  for (const row of outs.rows) {
    console.log(
      `${row.agent_kind}\t${row.ticker ?? "-"}\t${row.n} chars\t${row.created_at}`,
    );
  }

  const hd = await client.execute({
    sql: `SELECT output_json FROM screening_agent_outputs WHERE run_id = ? AND agent_kind = 'thesis_hard_data' ORDER BY created_at DESC LIMIT 1`,
    args: [runId],
  });
  const ev = await client.execute({
    sql: `SELECT output_json FROM screening_agent_outputs WHERE run_id = ? AND agent_kind = 'thesis_evaluate' ORDER BY created_at DESC LIMIT 1`,
    args: [runId],
  });
  const hdJson = JSON.parse(String(hd.rows[0]?.output_json ?? "{}"));
  const evJson = JSON.parse(String(ev.rows[0]?.output_json ?? "{}"));
  console.log("\n=== HARD DATA STATS ===");
  console.log({
    status: hdJson.status,
    tickers: hdJson.tickers,
    candidateKeys: hdJson.candidates?.[0] ? Object.keys(hdJson.candidates[0]) : [],
    country: hdJson.candidates?.[0]?.country,
    factCount: hdJson.facts?.length,
    fieldIds: (hdJson.facts ?? []).map((f: { field_id: string }) => f.field_id),
    gaps: hdJson.gaps,
  });
  console.log("\n=== EVALUATE ===");
  const e0 = evJson.evaluations?.[0];
  console.log({
    ticker: e0?.ticker,
    companyName: e0?.companyName,
    verdict: e0?.assessment?.verdict,
    total: e0?.assessment?.total,
    draftNull: e0?.thesis_draft == null,
    statementLen: e0?.thesis_draft?.statement?.length,
    kill: e0?.thesis_draft?.kill_criteria,
    gaps: e0?.thesis_draft?.gaps,
    narrativeLen: e0?.narrative?.length,
  });
  console.log(JSON.stringify(e0?.thesis_draft, null, 2)?.slice(0, 2500));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
