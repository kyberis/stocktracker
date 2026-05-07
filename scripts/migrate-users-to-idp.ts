/**
 * One-shot migration: provision every existing trefolio user in the
 * trefolio-accounts IdP and write the returned `sub` back to `users.idp_sub`.
 *
 * Idempotent. Safe to re-run; users that already have an `idp_sub` are skipped.
 *
 * Usage:
 *   IDP_BASE_URL=https://user.trefolio.com \
 *   IDP_SERVICE_TOKEN=... \
 *   npm run idp:migrate-users -- [--limit=100] [--dry-run]
 *
 * Notes:
 *  - Sends bcrypt password hashes verbatim (the IdP stores them in its own
 *    User table; users keep their existing passwords).
 *  - Sends current Stripe customer + subscription IDs so the IdP can attach
 *    them to its StripeCustomer table without re-checkout.
 *  - Sends the current effective plan + plan_expires_at so paid users keep
 *    Pro through the migration without a billing event.
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
  const where = ["(idp_sub = '' OR idp_sub IS NULL)"];
  const args: (string | number)[] = [];
  let sql = `SELECT * FROM users WHERE ${where.join(" AND ")} ORDER BY created_at ASC`;
  if (opts.limit) {
    sql += " LIMIT ?";
    args.push(opts.limit);
  }
  const result = await client.execute({ sql, args });
  const users = result.rows.map(rowToDbUser);

  console.log(`Found ${users.length} users to migrate to IdP${opts.dryRun ? " (DRY RUN)" : ""}.`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const u of users) {
    if (!u.email) {
      // Users without an email cannot be IdP-provisioned (email is the unique key).
      console.warn(`SKIP user ${u.id} (${u.username}): no email`);
      skipped++;
      continue;
    }

    const eff = effectivePlan(u.plan, u.plan_expires_at);

    if (opts.dryRun) {
      console.log(`DRY ${u.email} | plan=${eff} expires=${u.plan_expires_at || "-"} provider=${u.auth_provider}`);
      ok++;
      continue;
    }

    try {
      const res = await importUser({
        email: u.email,
        passwordHash: u.password_hash || undefined,
        name: u.display_name || u.username,
        locale: undefined, // pulled from user_settings if needed in a follow-up pass
        googleId: u.google_id || undefined,
        appleId: u.apple_id || undefined,
        emailVerified: u.email_verified === 1,
        plan: eff,
        proUntil: u.plan_expires_at || undefined,
        stripeCustomerId: u.stripe_customer_id || undefined,
        stripeSubscriptionId: u.stripe_subscription_id || undefined,
      });

      await client.execute({
        sql: "UPDATE users SET idp_sub = ? WHERE id = ?",
        args: [res.sub, u.id],
      });

      console.log(`OK  ${u.email} -> sub=${res.sub} (${res.created ? "created" : "linked"})`);
      ok++;
    } catch (err) {
      const status = err instanceof IdpClientError ? err.status : "n/a";
      console.error(`ERR ${u.email}: status=${status}`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\nDone: ${ok} migrated, ${skipped} skipped, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
