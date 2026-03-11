import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import path from "path";
import { createClient, type Client } from "@libsql/client";
import bcrypt from "bcryptjs";
import { runMigrations } from "./migrations";
import { ADMIN_DEFAULT_USERNAME, ADMIN_DEFAULT_PASSWORD, BCRYPT_ROUNDS } from "./helpers";
import { seedTransactionsForUser } from "./seed";

let _client: Client | null = null;
let _initialized = false;

function getClient(): Client {
  if (_client) return _client;

  const tursoUrl =
    process.env.TREFOLIO_TURSO_DATABASE_URL ||
    process.env.STOCKTRACKER_TURSO_DATABASE_URL ||
    process.env.stocktracker_TURSO_DATABASE_URL;
  const tursoToken =
    process.env.TREFOLIO_TURSO_AUTH_TOKEN ||
    process.env.STOCKTRACKER_TURSO_AUTH_TOKEN ||
    process.env.stocktracker_TURSO_AUTH_TOKEN;

  if (tursoUrl) {
    _client = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
  } else {
    const dataDir = path.join(process.cwd(), "data");
    mkdirSync(dataDir, { recursive: true });
    _client = createClient({
      url: `file:${path.join(dataDir, "trefolio.db")}`,
    });
  }

  return _client;
}

async function ensureAdminUser(client: Client) {
  const passwordHash = bcrypt.hashSync(ADMIN_DEFAULT_PASSWORD, BCRYPT_ROUNDS);
  const existing = await client.execute({
    sql: "SELECT id FROM users WHERE username = ?",
    args: [ADMIN_DEFAULT_USERNAME],
  });
  const isNew = existing.rows.length === 0;
  const adminId = (existing.rows[0]?.id as string) || randomUUID();

  await client.batch(
    [
      {
        sql: `INSERT OR IGNORE INTO users (id, username, password_hash, role, must_change_password, ai_calls_reset_at)
              VALUES (?, ?, ?, 'admin', 1, datetime('now'))`,
        args: [adminId, ADMIN_DEFAULT_USERNAME, passwordHash],
      },
      {
        sql: `INSERT OR IGNORE INTO user_settings (user_id, provider, alpha_vantage_api_key, language)
              VALUES (?, 'yahoo', '', 'en')`,
        args: [adminId],
      },
    ],
    "write"
  );

  if (isNew) {
    const pId = randomUUID();
    await client.execute({
      sql: "INSERT OR IGNORE INTO portfolios (id, user_id, name, is_default, sort_order) VALUES (?, ?, 'My Portfolio', 1, 0)",
      args: [pId, adminId],
    });
    const pRow = await client.execute({
      sql: "SELECT id FROM portfolios WHERE user_id = ? AND is_default = 1",
      args: [adminId],
    });
    const portfolioId = (pRow.rows[0]?.id as string) || pId;
    await seedTransactionsForUser(client, adminId, portfolioId);
  }
}

export async function ensureInitialized(): Promise<Client> {
  const client = getClient();
  if (_initialized) return client;
  await runMigrations(client);
  await ensureAdminUser(client);
  _initialized = true;
  return client;
}
