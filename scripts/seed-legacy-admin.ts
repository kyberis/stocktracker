/**
 * Seed a "legacy" admin user in the trefolio Turso/SQLite database for
 * testing the IdP migration flow.
 *
 *   username:  legacyadmin
 *   email:     legacyadmin@trefolio.test
 *   password:  LegacyAdminPass2026!
 *   role:      admin
 *   plan:      pro
 *   idp_sub:   '' (empty — not yet migrated)
 *
 * Idempotent. Re-running resets the password and clears `idp_sub` so the
 * user always looks pre-migration. It also wipes any matching row out of
 * the in-repo IdP SQLite DB (`external/accounts/idp-dev.db`) so the next
 * migration run will create a fresh IdP user.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { ensureInitialized } from "../src/lib/db/client";
import { hashPassword } from "../src/lib/auth/password";

const EMAIL = "legacyadmin@trefolio.test";
const PASSWORD = "LegacyAdminPass2026!";
const USERNAME = "legacyadmin";
const DISPLAY_NAME = "Legacy Admin";

async function main() {
  const client = await ensureInitialized();
  const passwordHash = await hashPassword(PASSWORD);

  const existing = await client.execute({
    sql: "SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1",
    args: [EMAIL, USERNAME],
  });

  if (existing.rows.length > 0) {
    const id = String(existing.rows[0].id);
    await client.execute({
      sql: `UPDATE users
              SET password_hash = ?,
                  role = 'admin',
                  plan = 'pro',
                  email = ?,
                  username = ?,
                  email_verified = 1,
                  auth_provider = 'credentials',
                  display_name = ?,
                  must_change_password = 0,
                  idp_sub = ''
              WHERE id = ?`,
      args: [passwordHash, EMAIL, USERNAME, DISPLAY_NAME, id],
    });
    console.log(`updated existing trefolio admin id=${id} email=${EMAIL} (idp_sub cleared)`);
  } else {
    const id = randomUUID();
    await client.execute({
      sql: `INSERT INTO users (
              id, username, password_hash, role, must_change_password,
              ai_calls_reset_at, email, display_name, avatar_url, auth_provider,
              google_id, apple_id, email_verified, plan, idp_sub
            ) VALUES (?, ?, ?, 'admin', 0, datetime('now'), ?, ?, '', 'credentials', '', '', 1, 'pro', '')`,
      args: [id, USERNAME, passwordHash, EMAIL, DISPLAY_NAME],
    });
    await client.execute({
      sql: `INSERT INTO user_settings (user_id, provider, alpha_vantage_api_key, language)
            VALUES (?, 'yahoo', '', 'en')`,
      args: [id],
    });
    console.log(`created trefolio admin id=${id} email=${EMAIL}`);
  }

  // Ensure the user is NOT yet in the in-repo IdP DB so a fresh migration
  // run actually creates them. This is dev-only; the file path matches the
  // SQLite fallback used by `external/accounts/src/lib/db.ts`. We shell out
  // to the `sqlite3` CLI to avoid taking on a `better-sqlite3` dep in trefolio.
  const idpDbPath = resolve(__dirname, "..", "external", "accounts", "idp-dev.db");
  if (existsSync(idpDbPath)) {
    const result = spawnSync(
      "sqlite3",
      [idpDbPath, `DELETE FROM users WHERE email = '${EMAIL.replace(/'/g, "''")}';`],
      { stdio: "pipe", encoding: "utf-8" },
    );
    if (result.status === 0) {
      console.log(`IdP DB: cleared any prior entry for ${EMAIL} so the migration creates a fresh user`);
    } else {
      console.warn(`IdP DB cleanup skipped (sqlite3 exit=${result.status}): ${result.stderr}`);
    }
  } else {
    console.log(`IdP DB not found at ${idpDbPath} — skipping (only matters in local dev)`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
