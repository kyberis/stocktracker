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
    console.error("Usage: npx tsx scripts/debug-screening-report.ts <runId>");
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

  const db = await import("../src/lib/db");
  const { composeScreeningReport } = await import(
    "../src/lib/screening/pipeline/build-report"
  );
  const {
    hardDataOutputSchema,
    compilerReportDraftSchema,
    screeningBriefSchema,
    qaOutputSchema,
  } = await import("../src/lib/screening/schemas");

  const row = await db.getScreeningRunUnscoped(runId);
  if (!row) {
    console.error("run not found");
    process.exit(1);
  }
  console.log("run", {
    id: row.id,
    userId: row.userId,
    status: row.status,
    intent: row.intent,
  });
  console.log("brief", row.briefJson.slice(0, 400));

  const outputs = await db.listScreeningAgentOutputsByRun(runId, row.userId);
  const latestByKind = new Map<string, (typeof outputs)[number]>();
  for (const o of outputs) {
    const prev = latestByKind.get(o.agentKind);
    if (!prev || Date.parse(o.createdAt) >= Date.parse(prev.createdAt)) {
      latestByKind.set(o.agentKind, o);
    }
  }
  console.log(
    "kinds",
    [...latestByKind.keys()].map((k) => `${k}:${latestByKind.get(k)!.outputJson.length}`),
  );

  const hardDataRow = latestByKind.get("hard_data");
  const compilerRow = latestByKind.get("compiler");
  if (!hardDataRow || !compilerRow) {
    console.error("missing hard_data or compiler");
    process.exit(1);
  }

  const qaVerdict = await db.getLatestQaVerdictForRun(runId);
  const qaRounds = await db.countQaRoundsForRun(runId);
  console.log("qa", { qaVerdict, qaRounds });

  const briefP = screeningBriefSchema.safeParse(JSON.parse(row.briefJson));
  console.log("briefParse", briefP.success, briefP.success ? "" : briefP.error.issues);
  const hdP = hardDataOutputSchema.safeParse(JSON.parse(hardDataRow.outputJson));
  console.log(
    "hardParse",
    hdP.success,
    hdP.success ? hdP.data.candidates.map((c) => c.ticker) : hdP.error.issues.slice(0, 10),
  );
  const cmpP = compilerReportDraftSchema.safeParse(JSON.parse(compilerRow.outputJson));
  console.log(
    "compilerParse",
    cmpP.success,
    cmpP.success
      ? { bullets: cmpP.data.candidateBullets.length, summary: cmpP.data.summary.slice(0, 80) }
      : cmpP.error.issues.slice(0, 10),
  );
  const qaRow = latestByKind.get("qa");
  if (qaRow) {
    const qaP = qaOutputSchema.safeParse(JSON.parse(qaRow.outputJson));
    console.log(
      "qaParse",
      qaP.success,
      qaP.success
        ? {
            verdict: qaP.data.verdict,
            degraded: qaP.data.degradedTickers,
            issues: qaP.data.issues.length,
          }
        : qaP.error.issues.slice(0, 10),
    );
  }

  const report = composeScreeningReport({
    run: row,
    hardDataRow,
    compilerRow,
    irAggregateRow: latestByKind.get("aggregate_ir_business") ?? null,
    webAggregateRow: latestByKind.get("aggregate_web_sentiment") ?? null,
    technicalsAggregateRow: latestByKind.get("aggregate_technicals") ?? null,
    portfolioContextRow: latestByKind.get("portfolio_context") ?? null,
    riskRow: latestByKind.get("risk") ?? null,
    qaRow: qaRow ?? null,
    shortlistResearchRow: latestByKind.get("shortlist_research") ?? null,
    candidateLimit: 1,
  });
  console.log(
    "report",
    report
      ? { cards: report.cards.length, tickers: report.cards.map((c) => c.ticker) }
      : null,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
