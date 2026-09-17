#!/usr/bin/env npx tsx
/**
 * Disconnect SnapTrade for users idle longer than N days (default 30).
 * Mirrors /api/snaptrade disconnect-all: detach holdings source, deregister
 * SnapTrade user, delete local connection + broker portfolio maps.
 *
 * Usage:
 *   npx tsx scripts/cleanup-idle-snaptrade.ts              # dry-run
 *   npx tsx scripts/cleanup-idle-snaptrade.ts --apply      # write
 *   npx tsx scripts/cleanup-idle-snaptrade.ts --apply --days=60
 *
 * Reads Turso + SnapTrade from `.env.production.local`.
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
    /* ignore */
  }
  return out;
}

const envFile = {
  ...loadDotEnv(".env.production.local"),
  ...loadDotEnv(".env.local"),
};

for (const [k, v] of Object.entries(envFile)) {
  if (!process.env[k]) process.env[k] = v;
}

// Prefer production Turso aliases used in this monorepo.
const tursoUrl =
  process.env.stocktracker_TURSO_DATABASE_URL ||
  process.env.TREFOLIO_TURSO_DATABASE_URL ||
  process.env.STOCKTRACKER_TURSO_DATABASE_URL ||
  process.env.TURSO_DATABASE_URL;
const tursoToken =
  process.env.stocktracker_TURSO_AUTH_TOKEN ||
  process.env.TREFOLIO_TURSO_AUTH_TOKEN ||
  process.env.STOCKTRACKER_TURSO_AUTH_TOKEN ||
  process.env.TURSO_AUTH_TOKEN;

if (tursoUrl) {
  process.env.stocktracker_TURSO_DATABASE_URL = tursoUrl;
  process.env.STOCKTRACKER_TURSO_DATABASE_URL = tursoUrl;
  process.env.TREFOLIO_TURSO_DATABASE_URL = tursoUrl;
}
if (tursoToken) {
  process.env.stocktracker_TURSO_AUTH_TOKEN = tursoToken;
  process.env.STOCKTRACKER_TURSO_AUTH_TOKEN = tursoToken;
  process.env.TREFOLIO_TURSO_AUTH_TOKEN = tursoToken;
}
// Allow @/lib/db ensureInitialized to hit remote Turso from a local script.
process.env.STOCKTRACKER_USE_REMOTE_DB_IN_DEV = "true";
process.env.TREFOLIO_USE_REMOTE_DB_IN_DEV = "true";
process.env.NODE_ENV = process.env.NODE_ENV || "production";

const apply = process.argv.includes("--apply");
const daysArg = process.argv.find((a) => a.startsWith("--days="));
const idleDays = daysArg ? Math.max(1, parseInt(daysArg.split("=")[1]!, 10) || 30) : 30;

async function main() {
  const { createClient } = await import("@libsql/client");
  const url = tursoUrl;
  const authToken = tursoToken;
  if (!url || !authToken) throw new Error("Missing Turso credentials");
  if (!process.env.SNAPTRADE_CLIENT_ID || !process.env.SNAPTRADE_CONSUMER_KEY) {
    throw new Error("Missing SNAPTRADE_CLIENT_ID / SNAPTRADE_CONSUMER_KEY");
  }

  const c = createClient({ url, authToken });
  const listed = await c.execute({
    sql: `SELECT c.user_id, c.snaptrade_user_id, u.email, u.plan, u.last_active_at,
            CASE WHEN u.last_active_at = '' OR u.last_active_at IS NULL THEN 9999
                 ELSE CAST((julianday('now') - julianday(u.last_active_at)) AS INTEGER) END AS idle_days
          FROM snaptrade_connections c
          JOIN users u ON u.id = c.user_id
          WHERE (u.deleted_at IS NULL OR u.deleted_at = '')
            AND (u.last_active_at = '' OR datetime(u.last_active_at) < datetime('now', ?))
          ORDER BY idle_days DESC`,
    args: [`-${idleDays} days`],
  });

  console.log(
    `${apply ? "APPLY" : "DRY-RUN"}: ${listed.rows.length} SnapTrade connection(s) idle >${idleDays}d`,
  );
  for (const r of listed.rows) {
    console.log(
      `  - ${r.email} (${r.plan}) idle=${r.idle_days}d last_active=${r.last_active_at || "(never)"} st=${r.snaptrade_user_id}`,
    );
  }

  if (!apply || listed.rows.length === 0) {
    if (!apply) console.log("\nRe-run with --apply to disconnect.");
    return;
  }

  // Point app DAL at the same Turso before importing modules that call ensureInitialized.
  const {
    detachSnapTradeHoldings,
    deleteSnapTradeConnection,
    removeAllBrokerPortfolioMappings,
    trackEvent,
  } = await import("@/lib/db");
  const { deleteUser } = await import("@/lib/snaptrade-client");

  let ok = 0;
  let failed = 0;
  for (const r of listed.rows) {
    const userId = String(r.user_id);
    const snapTradeUserId = String(r.snaptrade_user_id);
    const email = String(r.email);
    try {
      await detachSnapTradeHoldings(userId);
      try {
        await deleteUser(snapTradeUserId);
      } catch (err) {
        console.warn(
          `  [warn] deregister SnapTrade user failed for ${email}:`,
          err instanceof Error ? err.message : err,
        );
      }
      await deleteSnapTradeConnection(userId);
      await removeAllBrokerPortfolioMappings(userId);
      trackEvent(userId, "snaptrade_auto_disconnected", {
        reason: "idle_inactive",
        idleDays: String(r.idle_days),
      });
      console.log(`  deleted ${email}`);
      ok++;
    } catch (err) {
      failed++;
      console.error(`  FAILED ${email}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nDone. deleted=${ok} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
