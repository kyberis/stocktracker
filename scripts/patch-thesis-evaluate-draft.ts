#!/usr/bin/env npx tsx
/**
 * Rebuild thesis_evaluate.thesis_draft from stored hard_data + assessment
 * using the locale-safe fallback (no buy/sell/hold / mantener).
 *
 * Usage:
 *   npx tsx scripts/patch-thesis-evaluate-draft.ts <runId>
 *
 * Reads Turso from `.env.production.local`. Does not print secrets.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";
import { fallbackThesisDraft } from "../src/lib/screening/thesis/fallback-draft";
import { scoreThesisAssessment } from "../src/lib/screening/thesis/score-assessment";
import {
  thesisEvaluateOutputSchema,
  thesisHardDataOutputSchema,
} from "../src/lib/screening/thesis/schemas";

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
  if (!runId) throw new Error("usage: patch-thesis-evaluate-draft.ts <runId>");
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

  const hd = await client.execute({
    sql: `SELECT output_json FROM screening_agent_outputs
          WHERE run_id = ? AND agent_kind = 'thesis_hard_data'
          ORDER BY created_at DESC LIMIT 1`,
    args: [runId],
  });
  const ev = await client.execute({
    sql: `SELECT id, output_json FROM screening_agent_outputs
          WHERE run_id = ? AND agent_kind = 'thesis_evaluate'
          ORDER BY created_at DESC LIMIT 1`,
    args: [runId],
  });
  const hdParsed = thesisHardDataOutputSchema.safeParse(
    JSON.parse(String(hd.rows[0]?.output_json ?? "{}")),
  );
  const evRow = ev.rows[0];
  const evParsed = thesisEvaluateOutputSchema.safeParse(
    JSON.parse(String(evRow?.output_json ?? "{}")),
  );
  if (!hdParsed.success || !evParsed.success || !evRow?.id) {
    throw new Error("hard_data or thesis_evaluate missing/invalid");
  }

  const locale = evParsed.data.locale || "en";
  let patched = 0;
  const evaluations = evParsed.data.evaluations.map((row) => {
    if (row.thesis_draft != null) return row;
    const facts = hdParsed.data.facts.filter(
      (f) => f.asset_id.toUpperCase() === row.ticker.toUpperCase(),
    );
    const assessment = row.assessment ?? scoreThesisAssessment({ facts, soft: [] });
    const draft =
      fallbackThesisDraft(row.ticker, locale, assessment, facts) ??
      fallbackThesisDraft(row.ticker, "en", assessment, facts);
    if (!draft) return row;
    patched += 1;
    return {
      ...row,
      thesis_draft: draft,
      narrative: `${draft.statement}\n\n${draft.premortem}`,
    };
  });
  if (patched === 0) {
    console.log(`run ${runId}: no null drafts to patch`);
    return;
  }

  const next = thesisEvaluateOutputSchema.parse({
    ...evParsed.data,
    evaluations,
  });
  await client.execute({
    sql: `UPDATE screening_agent_outputs SET output_json = ? WHERE id = ?`,
    args: [JSON.stringify(next), String(evRow.id)],
  });
  console.log(
    `run ${runId}: patched ${patched} draft(s); tickers=${evaluations
      .map((e) => `${e.ticker}:${e.thesis_draft == null ? "null" : e.thesis_draft.status}`)
      .join(",")}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
