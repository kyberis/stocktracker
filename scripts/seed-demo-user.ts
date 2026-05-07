/**
 * Seed (or refresh) a known demo user across the trefolio Turso database.
 *
 *   email:    demo@trefolio.test
 *   password: DemoPass2026!
 *   plan:     pro
 *
 * Idempotent. Safe to re-run. Used to test the unified-accounts OIDC flow:
 * after seeding the same email in Clara and Will and running
 * `npm run idp:migrate-all-users`, the IdP collapses all three product rows
 * into one `sub` and the user can sign in once at user.trefolio.com.
 */
import { randomUUID } from "node:crypto";
import { ensureInitialized } from "../src/lib/db/client";
import { hashPassword } from "../src/lib/auth/password";

const EMAIL = "demo@trefolio.test";
const PASSWORD = "DemoPass2026!";
const USERNAME = "demo_trefolio";
const DISPLAY_NAME = "Demo Trefolio";

async function main() {
  const client = await ensureInitialized();
  const passwordHash = await hashPassword(PASSWORD);

  const existing = await client.execute({
    sql: "SELECT id, email, plan FROM users WHERE email = ? LIMIT 1",
    args: [EMAIL],
  });

  if (existing.rows.length > 0) {
    const id = String(existing.rows[0].id);
    await client.execute({
      sql: `UPDATE users
              SET password_hash = ?,
                  plan = 'pro',
                  email_verified = 1,
                  auth_provider = 'credentials',
                  display_name = ?,
                  must_change_password = 0
              WHERE id = ?`,
      args: [passwordHash, DISPLAY_NAME, id],
    });
    console.log(`updated existing trefolio user id=${id} email=${EMAIL} plan=pro`);
    return;
  }

  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO users (
            id, username, password_hash, role, must_change_password,
            ai_calls_reset_at, email, display_name, avatar_url, auth_provider,
            google_id, apple_id, email_verified, plan
          ) VALUES (?, ?, ?, 'user', 0, datetime('now'), ?, ?, '', 'credentials', '', '', 1, 'pro')`,
    args: [id, USERNAME, passwordHash, EMAIL, DISPLAY_NAME],
  });
  await client.execute({
    sql: `INSERT INTO user_settings (user_id, provider, alpha_vantage_api_key, language)
          VALUES (?, 'yahoo', '', 'en')`,
    args: [id],
  });
  console.log(`created trefolio user id=${id} email=${EMAIL} plan=pro`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
