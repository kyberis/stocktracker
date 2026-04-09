/**
 * Runs libsql migrations (same as app boot: runMigrations in src/lib/db/client.ts).
 * Usage: node --env-file=.env.local npx tsx scripts/run-migrations.ts
 * Or: npx tsx scripts/run-migrations.ts (uses local file DB if no Turso env)
 */
import { ensureInitialized } from "../src/lib/db/client";

async function main() {
  await ensureInitialized();
  console.log("Database migrations finished successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
