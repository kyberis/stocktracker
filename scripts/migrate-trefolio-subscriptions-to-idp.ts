/**
 * Copies Stripe billing linkage from trefolio (Warren) into the IdP for users
 * who already have idp_sub. Only trefolio holds subscriptions today.
 *
 * Calls POST /v1/admin/users/import with stripeCustomerId / stripeSubscriptionId
 * so the IdP persists stripe_customers + entitlements.source = stripe.
 *
 * Requires IdP deploy that persists Stripe fields on import (see external/accounts
 * src/app/api/v1/admin/users/import/route.ts).
 *
 * Usage:
 *   IDP_BASE_URL=https://user.trefolio.com \
 *   IDP_SERVICE_TOKEN=... \
 *   npm run idp:migrate-subscriptions -- [--limit=500] [--dry-run]
 */
import { ensureInitialized } from "../src/lib/db/client";
import { rowToDbUser } from "../src/lib/db/helpers";
import { effectivePlan } from "../src/lib/subscription";
import { importUser, IdpClientError } from "../src/lib/idp/client";

interface CliOptions {
  limit: number | null;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { limit: null, dryRun: false };
  for (const arg of argv) {
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg.startsWith("--limit=")) opts.limit = Number(arg.slice("--limit=".length)) || null;
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!process.env.IDP_BASE_URL || !process.env.IDP_SERVICE_TOKEN) {
    console.error("Missing IDP_BASE_URL or IDP_SERVICE_TOKEN env vars.");
    process.exit(1);
  }

  const client = await ensureInitialized();
  const args: (string | number)[] = [];
  let sql = `
    SELECT * FROM users
    WHERE idp_sub IS NOT NULL AND idp_sub != ''
      AND stripe_customer_id IS NOT NULL AND stripe_customer_id != ''
    ORDER BY created_at ASC
  `;
  if (opts.limit) {
    sql += " LIMIT ?";
    args.push(opts.limit);
  }

  const result = await client.execute({ sql, args });
  const users = result.rows.map(rowToDbUser);

  console.log(
    `Found ${users.length} trefolio users with idp_sub + Stripe customer id${opts.dryRun ? " (DRY RUN)" : ""}.`,
  );

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const u of users) {
    if (!u.email) {
      console.warn(`SKIP user ${u.id}: no email`);
      skipped++;
      continue;
    }

    const eff = effectivePlan(u.plan, u.plan_expires_at);

    if (opts.dryRun) {
      console.log(
        `DRY ${u.email} | sub=${u.idp_sub} customer=${u.stripe_customer_id} sub=${u.stripe_subscription_id || "-"} plan=${eff}`,
      );
      ok++;
      continue;
    }

    try {
      await importUser({
        email: u.email,
        passwordHash: u.password_hash || undefined,
        name: u.display_name || u.username,
        locale: undefined,
        googleId: u.google_id || undefined,
        appleId: u.apple_id || undefined,
        emailVerified: u.email_verified === 1,
        plan: eff,
        proUntil: u.plan_expires_at || undefined,
        stripeCustomerId: u.stripe_customer_id || undefined,
        stripeSubscriptionId: u.stripe_subscription_id || undefined,
      });

      console.log(`OK  ${u.email} (idp_sub=${u.idp_sub})`);
      ok++;
    } catch (err) {
      const status = err instanceof IdpClientError ? err.status : "n/a";
      console.error(`ERR ${u.email}: status=${status}`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\nDone: ${ok} synced, ${skipped} skipped, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
