#!/usr/bin/env npx tsx
/**
 * Enable Investment Screening v2 flags globally in platform_settings.
 *
 * Usage:
 *   npx tsx scripts/enable-screening-v2.ts
 *   npx tsx scripts/enable-screening-v2.ts --off
 *
 * Reads TURSO credentials from `.env.production.local` (or process env).
 */
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

const FLAGS = [
  "investment_screening_enabled",
  "screening_pipeline_real_enabled",
  "screening_ir_agent_enabled",
  "screening_agents_v2_enabled",
] as const;

async function main() {
  const off = process.argv.includes("--off");
  const value = off ? "false" : "true";
  const envFile = loadDotEnv(".env.production.local");
  const url =
    process.env.TURSO_DATABASE_URL ||
    envFile.TURSO_DATABASE_URL ||
    envFile.stocktracker_TURSO_DATABASE_URL;
  const authToken =
    process.env.TURSO_AUTH_TOKEN ||
    envFile.TURSO_AUTH_TOKEN ||
    envFile.stocktracker_TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error("Missing Turso credentials (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN)");
  }

  const client = createClient({ url, authToken });
  for (const flag of FLAGS) {
    await client.execute({
      sql: `INSERT INTO platform_settings (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: [flag, value],
    });
    console.log(`${off ? "✗" : "✓"} ${flag} = ${value}`);
  }

  const check = await client.execute({
    sql: `SELECT key, value FROM platform_settings
          WHERE key IN (${FLAGS.map(() => "?").join(",")})
          ORDER BY key`,
    args: [...FLAGS],
  });
  console.log("\nVerified:");
  for (const row of check.rows) {
    console.log(`  ${row.key} = ${row.value}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
