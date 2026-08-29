/**
 * One-off: set local (non-Stripe) Pro users to expire in 7 days and email them.
 *
 *   npx tsx scripts/sunset-local-pro-to-free.ts --dry-run
 *   npx tsx scripts/sunset-local-pro-to-free.ts
 */
import { applyLocalProSunset, listLocalProSunsetCandidates } from "../src/lib/local-pro-sunset";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const candidates = await listLocalProSunsetCandidates();
  console.log(`Local Pro sunset candidates: ${candidates.length}`);
  for (const row of candidates.slice(0, 20)) {
    console.log(`  ${row.userId} ${row.email} expires=${row.planExpiresAt || "(none)"} notified=${row.planSunsetNotifiedAt || "no"}`);
  }
  if (candidates.length > 20) console.log(`  … +${candidates.length - 20} more`);

  const result = await applyLocalProSunset({ dryRun });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
