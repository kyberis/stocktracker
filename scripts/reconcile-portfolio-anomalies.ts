#!/usr/bin/env npx tsx
/**
 * Reconcile open/acked portfolio_anomalies against a live rescan.
 * - No remaining findings → mark fixed
 * - Still findings → refresh the newest open row; mark older duplicates fixed
 *
 * Usage:
 *   npx tsx scripts/reconcile-portfolio-anomalies.ts           # dry-run
 *   npx tsx scripts/reconcile-portfolio-anomalies.ts --apply   # write
 *
 * Reads Turso from `.env.production.local` (stocktracker_TURSO_*).
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

const envFile = {
  ...loadDotEnv(".env.production.local"),
  ...loadDotEnv(".env.local"),
};
for (const [from, to] of [
  ["stocktracker_TURSO_DATABASE_URL", "STOCKTRACKER_TURSO_DATABASE_URL"],
  ["stocktracker_TURSO_DATABASE_URL", "TREFOLIO_TURSO_DATABASE_URL"],
  ["stocktracker_TURSO_AUTH_TOKEN", "STOCKTRACKER_TURSO_AUTH_TOKEN"],
  ["stocktracker_TURSO_AUTH_TOKEN", "TREFOLIO_TURSO_AUTH_TOKEN"],
  ["TREFOLIO_TURSO_DATABASE_URL", "STOCKTRACKER_TURSO_DATABASE_URL"],
  ["TREFOLIO_TURSO_AUTH_TOKEN", "STOCKTRACKER_TURSO_AUTH_TOKEN"],
] as const) {
  const val = envFile[from] || process.env[from];
  if (val) {
    process.env[from] = process.env[from] || val;
    process.env[to] = process.env[to] || val;
  }
}
// Allow scripts to hit remote Turso from local Node (see turso-env.ts).
process.env.TREFOLIO_USE_REMOTE_DB_IN_DEV = "1";
process.env.STOCKTRACKER_USE_REMOTE_DB_IN_DEV = "1";

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(`mode=${apply ? "APPLY" : "DRY-RUN"}`);

  const { createClient } = await import("@libsql/client");
  const { getEffectiveTursoDatabaseUrl } = await import("../src/lib/db/turso-env");
  const url = getEffectiveTursoDatabaseUrl();
  const token =
    process.env.TREFOLIO_TURSO_AUTH_TOKEN ||
    process.env.STOCKTRACKER_TURSO_AUTH_TOKEN ||
    process.env.stocktracker_TURSO_AUTH_TOKEN;
  if (!url || !token) {
    console.error("Missing Turso credentials (need remote URL + token + USE_REMOTE_DB_IN_DEV)");
    process.exit(1);
  }
  const client = createClient({ url, authToken: token });

  const { scanUserPortfolioAnomalies } = await import("../src/lib/portfolio-anomaly");
  const {
    updatePortfolioAnomalyFindings,
    setPortfolioAnomalyStatus,
  } = await import("../src/lib/db/portfolio-anomalies");

  const openRows = await client.execute({
    sql: `SELECT id, user_id, status, codes_json, updated_at
          FROM portfolio_anomalies
          WHERE status IN ('open', 'acked')
          ORDER BY updated_at DESC`,
    args: [],
  });

  const byUser = new Map<string, Array<{ id: string; status: string; codes: string[] }>>();
  for (const row of openRows.rows) {
    const userId = String(row.user_id);
    let codes: string[] = [];
    try {
      codes = JSON.parse(String(row.codes_json || "[]")) as string[];
    } catch {
      codes = [];
    }
    const list = byUser.get(userId) || [];
    list.push({ id: String(row.id), status: String(row.status), codes });
    byUser.set(userId, list);
  }

  console.log(`users_with_open=${byUser.size} open_rows=${openRows.rows.length}`);

  let markedFixed = 0;
  let refreshed = 0;
  let stillOpen = 0;

  for (const [userId, rows] of byUser) {
    let scan: Awaited<ReturnType<typeof scanUserPortfolioAnomalies>> = null;
    try {
      scan = await scanUserPortfolioAnomalies(userId);
    } catch (err) {
      console.log(
        JSON.stringify({
          userId,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      stillOpen += rows.length;
      continue;
    }

    if (!scan || scan.findings.length === 0) {
      console.log(
        JSON.stringify({
          userId,
          action: "mark_fixed",
          reason: "no_remaining_findings",
          rows: rows.length,
          oldCodes: rows.flatMap((r) => r.codes),
        }),
      );
      if (apply) {
        for (const r of rows) {
          await setPortfolioAnomalyStatus(r.id, "fixed", "system");
          markedFixed += 1;
        }
      } else {
        markedFixed += rows.length;
      }
      continue;
    }

    // Keep newest row (already sorted DESC), refresh it; fix older duplicates.
    const [newest, ...older] = rows;
    console.log(
      JSON.stringify({
        userId,
        action: "refresh_open",
        anomalyId: newest.id,
        oldCodes: newest.codes,
        newCodes: scan.codes,
        olderFixed: older.length,
      }),
    );

    if (apply) {
      await updatePortfolioAnomalyFindings(newest.id, {
        severity: scan.severity,
        codes: scan.codes,
        findings: scan.findings,
      });
      // Ensure status stays open (or acked stays acked)
      if (newest.status === "acked") {
        await setPortfolioAnomalyStatus(newest.id, "acked", "");
      } else {
        await client.execute({
          sql: `UPDATE portfolio_anomalies
                SET status = 'open',
                    fingerprint = ?,
                    resolved_at = '',
                    resolved_by = '',
                    updated_at = datetime('now')
                WHERE id = ?`,
          args: [scan.fingerprint, newest.id],
        });
      }
      for (const r of older) {
        await setPortfolioAnomalyStatus(r.id, "fixed", "system");
        markedFixed += 1;
      }
    } else {
      markedFixed += older.length;
    }
    refreshed += 1;
    stillOpen += 1;
  }

  console.log("\n=== SUMMARY ===");
  console.log(
    JSON.stringify({
      apply,
      markedFixed,
      refreshedOpen: refreshed,
      stillOpenUsers: stillOpen,
    }),
  );
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
