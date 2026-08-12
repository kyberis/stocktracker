#!/usr/bin/env npx tsx
/**
 * Enable portfolio_anomaly_agent globally and add portfolio_anomaly to ProdOps
 * enabled event types (global + linked recipient filters when present).
 *
 * Usage:
 *   npx tsx scripts/enable-portfolio-anomaly-agent.ts
 *   npx tsx scripts/enable-portfolio-anomaly-agent.ts --off
 *
 * Reads Turso credentials from `.env.production.local` (or process env).
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

function withEvent(types: string[], event: string, enabled: boolean): string[] {
  const set = new Set(types.map(String));
  if (enabled) set.add(event);
  else set.delete(event);
  return [...set];
}

async function main() {
  const off = process.argv.includes("--off");
  const enable = !off;
  const value = enable ? "true" : "false";

  const envFile = loadDotEnv(".env.production.local");
  const url =
    process.env.TURSO_DATABASE_URL ||
    process.env.TREFOLIO_TURSO_DATABASE_URL ||
    process.env.STOCKTRACKER_TURSO_DATABASE_URL ||
    envFile.TURSO_DATABASE_URL ||
    envFile.TREFOLIO_TURSO_DATABASE_URL ||
    envFile.STOCKTRACKER_TURSO_DATABASE_URL ||
    envFile.stocktracker_TURSO_DATABASE_URL;
  const authToken =
    process.env.TURSO_AUTH_TOKEN ||
    process.env.TREFOLIO_TURSO_AUTH_TOKEN ||
    process.env.STOCKTRACKER_TURSO_AUTH_TOKEN ||
    envFile.TURSO_AUTH_TOKEN ||
    envFile.TREFOLIO_TURSO_AUTH_TOKEN ||
    envFile.STOCKTRACKER_TURSO_AUTH_TOKEN ||
    envFile.stocktracker_TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error("Missing Turso credentials (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN)");
  }

  const client = createClient({ url, authToken });

  await client.execute({
    sql: `INSERT INTO platform_settings (key, value)
          VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: ["portfolio_anomaly_agent", value],
  });
  console.log(`${enable ? "✓" : "✗"} portfolio_anomaly_agent = ${value}`);

  const cfgRow = await client.execute({
    sql: `SELECT value FROM platform_settings WHERE key = ?`,
    args: ["prodops_config"],
  });
  if (cfgRow.rows.length > 0) {
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(String(cfgRow.rows[0].value || "{}")) as Record<string, unknown>;
    } catch {
      config = {};
    }
    const enabledEventTypes = withEvent(
      Array.isArray(config.enabledEventTypes) ? (config.enabledEventTypes as string[]) : [],
      "portfolio_anomaly",
      enable,
    );
    const recipient =
      config.recipient && typeof config.recipient === "object"
        ? {
            ...(config.recipient as Record<string, unknown>),
            enabledEventTypes: withEvent(
              Array.isArray((config.recipient as { enabledEventTypes?: unknown }).enabledEventTypes)
                ? ((config.recipient as { enabledEventTypes: string[] }).enabledEventTypes)
                : [],
              "portfolio_anomaly",
              enable,
            ),
          }
        : config.recipient;
    const next = { ...config, enabledEventTypes, recipient };
    await client.execute({
      sql: `INSERT INTO platform_settings (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: ["prodops_config", JSON.stringify(next)],
    });
    console.log(
      `${enable ? "✓" : "✗"} prodops_config.enabledEventTypes includes portfolio_anomaly=${enable}`,
    );
    console.log(`  types=${enabledEventTypes.join(",")}`);
  } else {
    console.log("! prodops_config not set yet — enable portfolio_anomaly in Admin → Settings after linking ProdOps");
  }

  const check = await client.execute({
    sql: `SELECT key, value FROM platform_settings WHERE key IN (?, ?) ORDER BY key`,
    args: ["portfolio_anomaly_agent", "prodops_config"],
  });
  console.log("\nVerified:");
  for (const row of check.rows) {
    const key = String(row.key);
    const raw = String(row.value);
    if (key === "prodops_config") {
      try {
        const parsed = JSON.parse(raw) as { enabledEventTypes?: string[] };
        console.log(`  ${key}.enabledEventTypes = ${(parsed.enabledEventTypes || []).join(",")}`);
      } catch {
        console.log(`  ${key} = (unparseable)`);
      }
    } else {
      console.log(`  ${key} = ${raw}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
