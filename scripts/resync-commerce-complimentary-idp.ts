#!/usr/bin/env npx tsx
/**
 * Retries the IdP sync step for users already granted commerce-complimentary
 * Pro whose initial sync failed. Does not touch plan/plan_expires_at — only
 * re-attempts syncCommerceComplimentaryToIdp so the IdP's record of their
 * entitlement matches trefolio's own users.plan.
 *
 * Usage: npx tsx scripts/resync-commerce-complimentary-idp.ts
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { ensureInitialized } from "../src/lib/db/client";
import { str } from "../src/lib/db/helpers";
import { syncCommerceComplimentaryToIdp } from "../src/lib/commerce-complimentary-pro";

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
    process.env[key] = val;
  }
}

async function main() {
  // Production-only script: load prod env, no .env.local fallback so a dev
  // IDP_BASE_URL/IDP_SERVICE_TOKEN can never shadow the real ones.
  loadEnvFile(".env.production.local");

  const client = await ensureInitialized();
  const result = await client.execute(
    `SELECT id, email, plan_expires_at FROM users
     WHERE commerce_complimentary_at != ''
       AND plan = 'pro'
       AND (stripe_subscription_id IS NULL OR stripe_subscription_id = '')`
  );

  console.log(`Found ${result.rows.length} complimentary-pro users to resync.`);

  let ok = 0;
  let failed = 0;
  for (const row of result.rows) {
    const userId = str(row.id);
    const email = str(row.email);
    const planExpiresAt = str(row.plan_expires_at);
    try {
      await syncCommerceComplimentaryToIdp(userId, email, planExpiresAt);
      ok++;
      console.log(`Synced: ${email} (${userId})`);
    } catch (err) {
      failed++;
      console.error(`Failed: ${email} (${userId})`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`Done. Synced ${ok}, failed ${failed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
