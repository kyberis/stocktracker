/**
 * Runs libsql migrations (same as app boot: runMigrations in src/lib/db/client.ts).
 * Invoked automatically before `npm run build` (Vercel production) so schema is current
 * before Next bundles. Also runs lazily on first DB connection in dev/prod.
 *
 * Usage: npm run db:migrate
 *   With Turso: set STOCKTRACKER_TURSO_DATABASE_URL + STOCKTRACKER_TURSO_AUTH_TOKEN (or TREFOLIO_*).
 *   Local file: no Turso env — uses data/trefolio.db
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
