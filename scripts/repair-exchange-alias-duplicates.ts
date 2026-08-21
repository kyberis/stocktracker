/**
 * Collapse holdings/transactions that differ only by venue aliases
 * (CPH↔OMK, NYSEAM↔NYSE, 215.HK↔0215.HK, …) for one user or every affected user.
 *
 * Usage (production Turso):
 *   set -a && source .env.production.local && set +a
 *   npx tsx scripts/repair-exchange-alias-duplicates.ts --email=suarez84@gmail.com
 *   npx tsx scripts/repair-exchange-alias-duplicates.ts --all
 *   npx tsx scripts/repair-exchange-alias-duplicates.ts --all --dry-run
 */
import { readFileSync } from "fs";
import { createClient } from "@libsql/client";
import {
  listUserIdsWithExchangeAliasDuplicates,
  repairExchangeAliasDuplicatesForUser,
} from "../src/lib/repair-exchange-alias-duplicates";

function loadEnv(path: string) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // optional
  }
}

loadEnv(".env.production.local");
loadEnv(".env.local");

// Point the app DB client at production Turso when those vars are present.
if (process.env.stocktracker_TURSO_DATABASE_URL && !process.env.TREFOLIO_TURSO_DATABASE_URL) {
  process.env.TREFOLIO_TURSO_DATABASE_URL = process.env.stocktracker_TURSO_DATABASE_URL;
}
if (process.env.stocktracker_TURSO_AUTH_TOKEN && !process.env.TREFOLIO_TURSO_AUTH_TOKEN) {
  process.env.TREFOLIO_TURSO_AUTH_TOKEN = process.env.stocktracker_TURSO_AUTH_TOKEN;
}

function parseArgs() {
  let email: string | null = null;
  let all = false;
  let dryRun = false;
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") dryRun = true;
    else if (a === "--all") all = true;
    else if (a.startsWith("--email=")) email = a.slice("--email=".length);
  }
  return { email, all, dryRun };
}

async function resolveUserId(email: string): Promise<string> {
  const url =
    process.env.TREFOLIO_TURSO_DATABASE_URL ||
    process.env.stocktracker_TURSO_DATABASE_URL ||
    process.env.STOCKTRACKER_TURSO_DATABASE_URL!;
  const token =
    process.env.TREFOLIO_TURSO_AUTH_TOKEN ||
    process.env.stocktracker_TURSO_AUTH_TOKEN ||
    process.env.STOCKTRACKER_TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken: token });
  const user = await client.execute({
    sql: "SELECT id, email FROM users WHERE lower(email) = lower(?)",
    args: [email],
  });
  if (!user.rows.length) throw new Error(`User not found: ${email}`);
  return String(user.rows[0].id);
}

async function main() {
  const { email, all, dryRun } = parseArgs();
  if (!email && !all) {
    console.error("Usage: --email=user@example.com | --all [--dry-run]");
    process.exit(1);
  }

  let userIds: string[];
  if (all) {
    userIds = await listUserIdsWithExchangeAliasDuplicates();
    console.log(`Affected users: ${userIds.length}${dryRun ? " (dry-run)" : ""}`);
  } else {
    userIds = [await resolveUserId(email!)];
    console.log(`User: ${userIds[0]} ${email}${dryRun ? " (dry-run)" : ""}`);
  }

  let totalDeleted = 0;
  let totalTx = 0;
  for (const userId of userIds) {
    const summary = await repairExchangeAliasDuplicatesForUser(userId, { dryRun });
    if (summary.holdingsDeleted > 0 || summary.txCanonicalized > 0) {
      console.log(
        `  ${userId}: deleted=${summary.holdingsDeleted} txCanon=${summary.txCanonicalized} relinked=${summary.txsRelinked}`,
      );
    }
    totalDeleted += summary.holdingsDeleted;
    totalTx += summary.txCanonicalized;
  }
  console.log(`Done. holdingsDeleted=${totalDeleted} txCanonicalized=${totalTx}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
