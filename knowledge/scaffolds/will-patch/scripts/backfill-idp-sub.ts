/**
 * One-shot migration: provision every Will user in the trefolio-accounts IdP
 * and write the returned `sub` back to `User.idpSub`.
 *
 * Idempotent. Safe to re-run.
 *
 * Usage (in Will repo):
 *   IDP_BASE_URL=https://user.trefolio.com \
 *   IDP_SERVICE_TOKEN=... \
 *   npm run idp:migrate-users -- [--dry-run]
 */
import { db } from "@/lib/db";
import { importUser, IdpClientError } from "@/lib/idp-client";

interface CliOptions {
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  return { dryRun: argv.includes("--dry-run") };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!process.env.IDP_BASE_URL || !process.env.IDP_SERVICE_TOKEN) {
    console.error("Missing IDP_BASE_URL or IDP_SERVICE_TOKEN env vars.");
    process.exit(1);
  }

  const users = await db.user.findMany({
    where: { idpSub: null },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Found ${users.length} users to migrate to IdP${opts.dryRun ? " (DRY RUN)" : ""}.`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const u of users) {
    if (!u.email) {
      console.warn(`SKIP user ${u.id}: no email`);
      skipped++;
      continue;
    }

    if (opts.dryRun) {
      console.log(`DRY ${u.email} | limit=${u.dailyAgentMessageLimit}`);
      ok++;
      continue;
    }

    try {
      const res = await importUser({
        email: u.email,
        passwordHash: u.passwordHash ?? undefined,
        name: u.name ?? undefined,
        emailVerified: !!u.emailVerified,
        // Will has no paid tier today; everyone starts on the free plan in the IdP.
        plan: "free",
      });

      await db.user.update({
        where: { id: u.id },
        data: { idpSub: res.sub },
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
