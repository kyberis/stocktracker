#!/usr/bin/env npx tsx
/**
 * One-off deploy script: zero out every per-feature quota counter in the
 * `rate_limits` table for the universal-access launch (subscription model v2).
 *
 * In v1 we kept counters on the `users` table; in v2 we use the `rate_limits`
 * table with provider keys prefixed by `quota:<feature>`. This script resets
 * any pre-existing rows under that prefix so that no user starts the new
 * model with an artificially-incremented counter.
 *
 * Usage:
 *   npx tsx scripts/reset-quota-counters.ts                # dry-run (default)
 *   npx tsx scripts/reset-quota-counters.ts --apply        # actually delete rows
 *
 * Idempotent. Safe to re-run.
 */

import { createClient } from "@libsql/client";

const QUOTA_PROVIDER_PREFIX = "quota:";

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    console.error("Missing TURSO_DATABASE_URL env var");
    process.exit(1);
  }
  const db = createClient({ url, authToken });

  const countResult = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM rate_limits WHERE provider LIKE ?",
    args: [`${QUOTA_PROVIDER_PREFIX}%`],
  });
  const count = Number((countResult.rows[0] as { n: number }).n ?? 0);
  console.log(`Found ${count} quota rows under provider prefix '${QUOTA_PROVIDER_PREFIX}'.`);

  if (count === 0) {
    console.log("Nothing to do.");
    return;
  }

  if (!apply) {
    console.log("Dry-run. Re-run with --apply to delete the rows above.");
    return;
  }

  const result = await db.execute({
    sql: "DELETE FROM rate_limits WHERE provider LIKE ?",
    args: [`${QUOTA_PROVIDER_PREFIX}%`],
  });
  console.log(`Deleted ${result.rowsAffected} rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
