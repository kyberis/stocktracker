#!/usr/bin/env npx tsx
/**
 * One-time backfill: grant complimentary Pro to existing users who signed up
 * before the commerce-complimentary-pro mechanism existed. New signups
 * already get this via grantCommerceComplimentaryPro() at signup/login;
 * this catches accounts that predate that code path (verified 2026-08-11:
 * 177 of 236 production users are plan='free' with no Stripe subscription
 * and no commerce_complimentary_at marker).
 *
 * Usage:
 *   npx tsx scripts/backfill-commerce-complimentary-pro.ts --dry-run
 *   npx tsx scripts/backfill-commerce-complimentary-pro.ts
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { ensureInitialized } from "../src/lib/db/client";
import { str } from "../src/lib/db/helpers";
import { grantCommerceComplimentaryPro } from "../src/lib/commerce-complimentary-pro";

function loadEnvFile(name: string) {
  const envPath = resolve(process.cwd(), name);
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env.production.local");
  const dryRun = process.argv.includes("--dry-run");

  const client = await ensureInitialized();
  const result = await client.execute(
    `SELECT id, email FROM users
     WHERE plan = 'free'
       AND (stripe_subscription_id IS NULL OR stripe_subscription_id = '')
       AND commerce_complimentary_at = ''`
  );

  console.log(`Found ${result.rows.length} candidate users.`);
  if (dryRun) {
    console.log("Dry run — no changes made.");
    return;
  }

  let granted = 0;
  let skipped = 0;
  for (const row of result.rows) {
    const userId = str(row.id);
    const email = str(row.email);
    const outcome = await grantCommerceComplimentaryPro(userId);
    if (outcome.granted) {
      granted++;
      console.log(`Granted: ${email} (${userId}) until ${outcome.planExpiresAt}`);
    } else {
      skipped++;
      console.log(`Skipped: ${email} (${userId}) — ${outcome.reason}`);
    }
  }
  console.log(`Done. Granted ${granted}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
