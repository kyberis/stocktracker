import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import path from "path";
import { createClient, type Client } from "@libsql/client";
import bcrypt from "bcryptjs";
import { runMigrations } from "./migrations";
import { ADMIN_DEFAULT_USERNAME, ADMIN_DEFAULT_PASSWORD, BCRYPT_ROUNDS } from "./helpers";
import { seedTransactionsForUser } from "./seed";

let _client: Client | null = null;
let _initPromise: Promise<Client> | null = null;
let _isLocal = false;

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
    _isLocal = true;
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

async function initWithRetry(client: Client, retries = 4): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (_isLocal) {
        await client.execute("PRAGMA busy_timeout=10000");
        await client.execute("PRAGMA journal_mode=WAL");
      }
      await runMigrations(client);
      await ensureAdminUser(client);
      return;
    } catch (err: unknown) {
      const isBusy = err instanceof Error && err.message.includes("SQLITE_BUSY");
      if (!isBusy || attempt === retries) throw err;
      const delay = 500 * Math.pow(2, attempt); // 500, 1000, 2000, 4000ms
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export async function ensureInitialized(): Promise<Client> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const client = getClient();
    try {
      await initWithRetry(client);
    } catch {
      _initPromise = null;
      throw new Error("Database initialization failed after retries");
    }
    return client;
  })();

  return _initPromise;
}
