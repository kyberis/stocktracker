import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import path from "path";
import { createClient, type Client, type Row } from "@libsql/client";
import bcrypt from "bcryptjs";
import type { ApiProviderName, CashEntry, Holding, HoldingAssetType, Language, RefreshInterval, Transaction, TransactionType, WatchlistItem, Account, RebalanceTarget } from "@/lib/types";
import { encrypt, decrypt } from "@/lib/crypto";
import { deriveHoldingsFromTransactions } from "@/lib/derive-holdings";
import { seedHoldingsForUser, seedCashForUser, seedTransactionsForUser } from "./seed";

export type UserRole = "admin" | "user";
export type UserPlan = "free" | "pro";

export interface DbUser {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  must_change_password: number;
  created_at: string;
  email: string;
  display_name: string;
  avatar_url: string;
  plan: UserPlan;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan_expires_at: string;
  ai_calls_this_month: number;
  ai_calls_reset_at: string;
  ai_calls_today: number;
  ai_daily_reset_at: string;
}

export interface PublicUser {
  id: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
  createdAt: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  plan: UserPlan;
  planExpiresAt: string;
  aiCallsThisMonth: number;
  aiCallsResetAt: string;
  aiCallsToday: number;
  aiDailyResetAt: string;
}

export interface UserSettings {
  provider: ApiProviderName;
  alphaVantageApiKey: string;
  language: Language;
  refreshInterval: RefreshInterval;
}

const ADMIN_DEFAULT_USERNAME = "admin";
const ADMIN_DEFAULT_PASSWORD = "admin";
const BCRYPT_ROUNDS = 10;

let _client: Client | null = null;
let _initialized = false;

function getClient(): Client {
  if (_client) return _client;

  const tursoUrl =
    process.env.STOCKTRACKER_TURSO_DATABASE_URL ||
    process.env.stocktracker_TURSO_DATABASE_URL;
  const tursoToken =
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
      url: `file:${path.join(dataDir, "stocktracker.db")}`,
    });
  }

  return _client;
}

async function runMigrations(client: Client) {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'pro')),
      stripe_customer_id TEXT NOT NULL DEFAULT '',
      stripe_subscription_id TEXT NOT NULL DEFAULT '',
      plan_expires_at TEXT NOT NULL DEFAULT '',
      ai_calls_this_month INTEGER NOT NULL DEFAULT 0,
      ai_calls_reset_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS holdings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      ticker TEXT NOT NULL,
      isin TEXT NOT NULL DEFAULT '',
      asset_type TEXT NOT NULL DEFAULT 'stock',
      shares REAL NOT NULL,
      purchase_price REAL NOT NULL,
      display_currency TEXT NOT NULL,
      exchange TEXT NOT NULL,
      value_in_eur REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cash_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount_eur REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'yahoo' CHECK(provider IN ('yahoo', 'alphavantage')),
      alpha_vantage_api_key TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'en' CHECK(language IN ('en', 'es')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    PRAGMA foreign_keys = ON;
  `);

  const holdingColumns = await client.execute("PRAGMA table_info(holdings)");
  const hasAssetType = holdingColumns.rows.some((row) => str(row.name) === "asset_type");
  if (!hasAssetType) {
    await client.execute({
      sql: "ALTER TABLE holdings ADD COLUMN asset_type TEXT NOT NULL DEFAULT 'stock'",
    });
  }

  // Normalize legacy tickers for existing datasets.
  await client.execute({
    sql: "UPDATE holdings SET ticker = 'W9C' WHERE ticker = 'CSU.TO' AND name = 'Constellation Software Inc'",
  });
  await client.execute({
    sql: "UPDATE holdings SET ticker = 'IS0E' WHERE ticker = 'ISOE' AND UPPER(exchange) IN ('TDG', 'TGD')",
  });

  // Auto-append exchange suffix for any bare ticker on a known exchange.
  for (const [exch, suffix] of Object.entries(EXCHANGE_SUFFIX_MAP)) {
    await client.execute({
      sql: `UPDATE holdings SET ticker = ticker || ?
            WHERE UPPER(exchange) = ? AND ticker NOT LIKE '%.%'`,
      args: [suffix, exch],
    });
  }
  await client.execute({
    sql: "UPDATE holdings SET asset_type = 'etf' WHERE UPPER(name) LIKE '%ETF%'",
  });
  await client.execute({
    sql: "UPDATE holdings SET asset_type = 'stock' WHERE asset_type IS NULL OR asset_type NOT IN ('stock', 'etf')",
  });
  // Move legacy cash rows out of holdings into dedicated cash table.
  await client.execute({
    sql: `
      INSERT OR IGNORE INTO cash_entries (id, user_id, name, amount_eur)
      SELECT id, user_id, name, value_in_eur
      FROM holdings
      WHERE UPPER(exchange) = 'CASH' OR UPPER(ticker) LIKE 'CASH-%'
    `,
  });
  await client.execute({
    sql: "DELETE FROM holdings WHERE UPPER(exchange) = 'CASH' OR UPPER(ticker) LIKE 'CASH-%'",
  });

  // Add profile columns to users table if missing.
  const userColumns = await client.execute("PRAGMA table_info(users)");
  const hasEmail = userColumns.rows.some((row) => str(row.name) === "email");
  if (!hasEmail) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''" });
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT ''" });
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''" });
  }
  const hasPlan = userColumns.rows.some((row) => str(row.name) === "plan");
  if (!hasPlan) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'" });
  }
  const hasStripeCustomerId = userColumns.rows.some((row) => str(row.name) === "stripe_customer_id");
  if (!hasStripeCustomerId) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN stripe_customer_id TEXT NOT NULL DEFAULT ''" });
  }
  const hasStripeSubscriptionId = userColumns.rows.some((row) => str(row.name) === "stripe_subscription_id");
  if (!hasStripeSubscriptionId) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT NOT NULL DEFAULT ''" });
  }
  const hasPlanExpiresAt = userColumns.rows.some((row) => str(row.name) === "plan_expires_at");
  if (!hasPlanExpiresAt) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN plan_expires_at TEXT NOT NULL DEFAULT ''" });
  }
  const hasAiCallsThisMonth = userColumns.rows.some((row) => str(row.name) === "ai_calls_this_month");
  if (!hasAiCallsThisMonth) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN ai_calls_this_month INTEGER NOT NULL DEFAULT 0" });
  }
  const hasAiCallsResetAt = userColumns.rows.some((row) => str(row.name) === "ai_calls_reset_at");
  if (!hasAiCallsResetAt) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN ai_calls_reset_at TEXT NOT NULL DEFAULT ''" });
  }
  await client.execute({
    sql: "UPDATE users SET ai_calls_reset_at = datetime('now') WHERE ai_calls_reset_at = '' OR ai_calls_reset_at IS NULL",
  });

  // Add refresh_interval column to user_settings if missing.
  const settingsColumns = await client.execute("PRAGMA table_info(user_settings)");
  const hasRefreshInterval = settingsColumns.rows.some((row) => str(row.name) === "refresh_interval");
  if (!hasRefreshInterval) {
    await client.execute({
      sql: "ALTER TABLE user_settings ADD COLUMN refresh_interval INTEGER NOT NULL DEFAULT 15",
    });
  }

  // Add openai_api_key column to user_settings if missing.
  const hasOpenAIKey = settingsColumns.rows.some((row) => str(row.name) === "openai_api_key");
  if (!hasOpenAIKey) {
    await client.execute({
      sql: "ALTER TABLE user_settings ADD COLUMN openai_api_key TEXT NOT NULL DEFAULT ''",
    });
  }

  // ── New tables for transactions, watchlist, accounts, rebalance targets ──
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      holding_id TEXT,
      ticker TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      exchange TEXT NOT NULL DEFAULT '',
      isin TEXT NOT NULL DEFAULT '',
      asset_type TEXT NOT NULL DEFAULT 'stock',
      account_id TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL CHECK(type IN ('buy', 'sell', 'dividend', 'fee')),
      date TEXT NOT NULL,
      shares REAL NOT NULL DEFAULT 0,
      price_per_share REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      fees REAL NOT NULL DEFAULT 0,
      taxes REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'EUR',
      display_currency TEXT NOT NULL DEFAULT 'EUR',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      ticker TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      exchange TEXT NOT NULL DEFAULT '',
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, ticker)
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      broker TEXT NOT NULL DEFAULT '',
      currency TEXT NOT NULL DEFAULT 'EUR',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rebalance_targets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'assetClass',
      label TEXT NOT NULL,
      target_percent REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, category, label)
    );
  `);

  // Add taxonomy columns to holdings if missing.
  const holdingCols2 = await client.execute("PRAGMA table_info(holdings)");
  const hasSector = holdingCols2.rows.some((row) => str(row.name) === "sector");
  if (!hasSector) {
    await client.execute({ sql: "ALTER TABLE holdings ADD COLUMN sector TEXT NOT NULL DEFAULT ''" });
    await client.execute({ sql: "ALTER TABLE holdings ADD COLUMN region TEXT NOT NULL DEFAULT ''" });
    await client.execute({ sql: "ALTER TABLE holdings ADD COLUMN asset_class TEXT NOT NULL DEFAULT ''" });
    await client.execute({ sql: "ALTER TABLE holdings ADD COLUMN account_id TEXT NOT NULL DEFAULT ''" });
  }

  const transactionCols = await client.execute("PRAGMA table_info(transactions)");
  const hasTxName = transactionCols.rows.some((row) => str(row.name) === "name");
  if (!hasTxName) {
    await client.execute({ sql: "ALTER TABLE transactions ADD COLUMN name TEXT NOT NULL DEFAULT ''" });
  }
  const hasTxExchange = transactionCols.rows.some((row) => str(row.name) === "exchange");
  if (!hasTxExchange) {
    await client.execute({ sql: "ALTER TABLE transactions ADD COLUMN exchange TEXT NOT NULL DEFAULT ''" });
  }
  const hasTxIsin = transactionCols.rows.some((row) => str(row.name) === "isin");
  if (!hasTxIsin) {
    await client.execute({ sql: "ALTER TABLE transactions ADD COLUMN isin TEXT NOT NULL DEFAULT ''" });
  }
  const hasTxAssetType = transactionCols.rows.some((row) => str(row.name) === "asset_type");
  if (!hasTxAssetType) {
    await client.execute({ sql: "ALTER TABLE transactions ADD COLUMN asset_type TEXT NOT NULL DEFAULT 'stock'" });
  }
  const hasTxAccountId = transactionCols.rows.some((row) => str(row.name) === "account_id");
  if (!hasTxAccountId) {
    await client.execute({ sql: "ALTER TABLE transactions ADD COLUMN account_id TEXT NOT NULL DEFAULT ''" });
  }
  const hasTxDisplayCurrency = transactionCols.rows.some((row) => str(row.name) === "display_currency");
  if (!hasTxDisplayCurrency) {
    await client.execute({ sql: "ALTER TABLE transactions ADD COLUMN display_currency TEXT NOT NULL DEFAULT 'EUR'" });
  }

  await client.execute({
    sql: `
      UPDATE transactions
      SET exchange = COALESCE((
        SELECT h.exchange FROM holdings h
        WHERE h.user_id = transactions.user_id
          AND UPPER(h.ticker) = UPPER(transactions.ticker)
        ORDER BY h.created_at DESC LIMIT 1
      ), exchange)
      WHERE exchange = ''
    `,
  });
  await client.execute({
    sql: `
      UPDATE transactions
      SET name = COALESCE((
        SELECT h.name FROM holdings h
        WHERE h.user_id = transactions.user_id
          AND UPPER(h.ticker) = UPPER(transactions.ticker)
        ORDER BY h.created_at DESC LIMIT 1
      ), name)
      WHERE name = ''
    `,
  });
  await client.execute({
    sql: `
      UPDATE transactions
      SET display_currency = COALESCE((
        SELECT h.display_currency FROM holdings h
        WHERE h.user_id = transactions.user_id
          AND UPPER(h.ticker) = UPPER(transactions.ticker)
        ORDER BY h.created_at DESC LIMIT 1
      ), display_currency)
      WHERE display_currency = ''
    `,
  });
  await client.execute({
    sql: "UPDATE transactions SET display_currency = currency WHERE display_currency = '' OR display_currency IS NULL",
  });

  // ── Analytics events table ──
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON analytics_events(event);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
  `);

  // ── Landing page anonymous analytics ──
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS landing_events (
      id TEXT PRIMARY KEY,
      event TEXT NOT NULL,
      metadata TEXT,
      referrer TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_landing_events_event ON landing_events(event);
    CREATE INDEX IF NOT EXISTS idx_landing_events_created ON landing_events(created_at);
  `);

  // ── Rate limits table ──
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      call_count INTEGER NOT NULL DEFAULT 0,
      window_start TEXT NOT NULL,
      PRIMARY KEY(user_id, provider)
    );
  `);

  // Add ai_calls_today / ai_daily_reset_at columns to users if missing.
  const userColsRL = await client.execute("PRAGMA table_info(users)");
  const hasAiCallsToday = userColsRL.rows.some((row) => str(row.name) === "ai_calls_today");
  if (!hasAiCallsToday) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN ai_calls_today INTEGER NOT NULL DEFAULT 0" });
  }
  const hasAiDailyResetAt = userColsRL.rows.some((row) => str(row.name) === "ai_daily_reset_at");
  if (!hasAiDailyResetAt) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN ai_daily_reset_at TEXT NOT NULL DEFAULT ''" });
  }
  await client.execute({
    sql: "UPDATE users SET ai_daily_reset_at = datetime('now') WHERE ai_daily_reset_at = '' OR ai_daily_reset_at IS NULL",
  });

  // Encrypt any plaintext AV API keys that were stored before encryption was added.
  const keysResult = await client.execute(
    "SELECT user_id, alpha_vantage_api_key FROM user_settings WHERE alpha_vantage_api_key != ''"
  );
  for (const row of keysResult.rows) {
    const raw = str(row.alpha_vantage_api_key);
    const decrypted = decrypt(raw);
    if (decrypted === raw && !raw.includes("=")) {
      // Value didn't change after decrypt and isn't base64 -> still plaintext
      await client.execute({
        sql: "UPDATE user_settings SET alpha_vantage_api_key = ? WHERE user_id = ?",
        args: [encrypt(raw), str(row.user_id)],
      });
    }
  }
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

  // Seed transactions from DEGIRO CSV on first run (if admin has no transactions yet)
  if (isNew) {
    await seedTransactionsForUser(client, adminId);
  } else {
    const txCount = await client.execute({
      sql: "SELECT COUNT(*) as cnt FROM transactions WHERE user_id = ?",
      args: [adminId],
    });
    if (num(txCount.rows[0]?.cnt) === 0) {
      await seedTransactionsForUser(client, adminId);
    }
  }
}

async function ensureInitialized(): Promise<Client> {
  const client = getClient();
  if (_initialized) return client;
  await runMigrations(client);
  await ensureAdminUser(client);
  _initialized = true;
  return client;
}

function str(val: unknown): string {
  return val == null ? "" : String(val);
}

function num(val: unknown): number {
  if (val == null) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function holdingAssetType(val: unknown): HoldingAssetType {
  return val === "etf" ? "etf" : "stock";
}

const EXCHANGE_SUFFIX_MAP: Record<string, string> = {
  XET: ".DE",
  TGD: ".DE",
  TDG: ".DE",
  FRA: ".F",
  MAD: ".MC",
  BME: ".MC",
  LSE: ".L",
  OMK: ".CO",
  CPH: ".CO",
  PAR: ".PA",
  AMS: ".AS",
  BRU: ".BR",
  MIL: ".MI",
  HEL: ".HE",
  VIE: ".VI",
  SWX: ".SW",
  TSE: ".TO",
  TOR: ".TO",
};

/**
 * Ensures the ticker carries the correct exchange suffix for Yahoo/AV lookups.
 * Only appends the suffix when the ticker doesn't already contain a dot
 * (i.e. it's a bare symbol) and the exchange is one we know needs a suffix.
 */
function normalizeTickerForExchange(ticker: string, exchange: string): string {
  if (ticker.includes(".")) return ticker;
  const suffix = EXCHANGE_SUFFIX_MAP[exchange.toUpperCase()];
  return suffix ? `${ticker}${suffix}` : ticker;
}

function rowToDbUser(row: Row): DbUser {
  return {
    id: str(row.id),
    username: str(row.username),
    password_hash: str(row.password_hash),
    role: row.role === "admin" ? "admin" : "user",
    must_change_password: num(row.must_change_password),
    created_at: str(row.created_at),
    email: str(row.email),
    display_name: str(row.display_name),
    avatar_url: str(row.avatar_url),
    plan: row.plan === "pro" ? "pro" : "free",
    stripe_customer_id: str(row.stripe_customer_id),
    stripe_subscription_id: str(row.stripe_subscription_id),
    plan_expires_at: str(row.plan_expires_at),
    ai_calls_this_month: num(row.ai_calls_this_month),
    ai_calls_reset_at: str(row.ai_calls_reset_at),
    ai_calls_today: num(row.ai_calls_today),
    ai_daily_reset_at: str(row.ai_daily_reset_at),
  };
}

function mapUser(user: DbUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: user.must_change_password === 1,
    createdAt: user.created_at,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    plan: user.plan,
    planExpiresAt: user.plan_expires_at,
    aiCallsThisMonth: user.ai_calls_this_month,
    aiCallsResetAt: user.ai_calls_reset_at,
    aiCallsToday: user.ai_calls_today,
    aiDailyResetAt: user.ai_daily_reset_at,
  };
}

export async function findUserByUsername(username: string): Promise<DbUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE username = ?",
    args: [username],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

export async function findUserById(userId: string): Promise<DbUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [userId],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

export async function listUsers(): Promise<PublicUser[]> {
  const client = await ensureInitialized();
  const result = await client.execute("SELECT * FROM users ORDER BY created_at ASC");
  return result.rows.map(rowToDbUser).map(mapUser);
}

export async function createUser(params: {
  username: string;
  passwordHash: string;
  seedWithData: boolean;
}): Promise<PublicUser> {
  const client = await ensureInitialized();
  const id = randomUUID();

  await client.batch(
    [
      {
        sql: `INSERT INTO users (id, username, password_hash, role, must_change_password, ai_calls_reset_at)
              VALUES (?, ?, ?, 'user', 0, datetime('now'))`,
        args: [id, params.username, params.passwordHash],
      },
      {
        sql: `INSERT INTO user_settings (user_id, provider, alpha_vantage_api_key, language)
              VALUES (?, 'yahoo', '', 'en')`,
        args: [id],
      },
    ],
    "write"
  );

  if (params.seedWithData) {
    await seedHoldingsForUser(client, id);
    await seedTransactionsForUser(client, id);
  }

  const created = await findUserById(id);
  if (!created) throw new Error("Failed to create user");
  return mapUser(created);
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string,
  mustChangePassword: boolean
) {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?",
    args: [passwordHash, mustChangePassword ? 1 : 0, userId],
  });
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<{ email: string; displayName: string; avatarUrl: string }>
): Promise<PublicUser | null> {
  const client = await ensureInitialized();
  const user = await findUserById(userId);
  if (!user) return null;

  const email = updates.email ?? user.email;
  const displayName = updates.displayName ?? user.display_name;
  const avatarUrl = updates.avatarUrl ?? user.avatar_url;

  await client.execute({
    sql: "UPDATE users SET email = ?, display_name = ?, avatar_url = ? WHERE id = ?",
    args: [email, displayName, avatarUrl, userId],
  });

  const updated = await findUserById(userId);
  return updated ? mapUser(updated) : null;
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET role = ? WHERE id = ?",
    args: [role, userId],
  });
}

function monthWindowKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shouldResetAiWindow(lastResetAt: string): boolean {
  if (!lastResetAt) return true;
  const parsed = new Date(lastResetAt);
  if (isNaN(parsed.getTime())) return true;
  return monthWindowKey(parsed) !== monthWindowKey(new Date());
}

export async function updateUserSubscription(
  userId: string,
  updates: Partial<{
    plan: UserPlan;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    planExpiresAt: string;
  }>
): Promise<void> {
  const client = await ensureInitialized();
  const user = await findUserById(userId);
  if (!user) return;
  const nextPlan = updates.plan ?? user.plan;
  const nextStripeCustomerId = updates.stripeCustomerId ?? user.stripe_customer_id;
  const nextStripeSubscriptionId = updates.stripeSubscriptionId ?? user.stripe_subscription_id;
  const nextPlanExpiresAt = updates.planExpiresAt ?? user.plan_expires_at;
  await client.execute({
    sql: `UPDATE users
          SET plan = ?, stripe_customer_id = ?, stripe_subscription_id = ?, plan_expires_at = ?
          WHERE id = ?`,
    args: [nextPlan, nextStripeCustomerId, nextStripeSubscriptionId, nextPlanExpiresAt, userId],
  });
}

export async function findUserByStripeCustomerId(customerId: string): Promise<DbUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE stripe_customer_id = ?",
    args: [customerId],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

export async function findUserByStripeSubscriptionId(subscriptionId: string): Promise<DbUser | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE stripe_subscription_id = ?",
    args: [subscriptionId],
  });
  if (result.rows.length === 0) return null;
  return rowToDbUser(result.rows[0]);
}

export async function resetAiUsageWindow(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET ai_calls_this_month = 0, ai_calls_reset_at = datetime('now') WHERE id = ?",
    args: [userId],
  });
}

export async function getAiUsage(userId: string): Promise<{
  plan: UserPlan;
  aiCallsThisMonth: number;
  aiCallsResetAt: string;
}> {
  const user = await findUserById(userId);
  if (!user) {
    return { plan: "free", aiCallsThisMonth: 0, aiCallsResetAt: new Date().toISOString() };
  }
  if (shouldResetAiWindow(user.ai_calls_reset_at)) {
    await resetAiUsageWindow(userId);
    return { plan: user.plan, aiCallsThisMonth: 0, aiCallsResetAt: new Date().toISOString() };
  }
  return {
    plan: user.plan,
    aiCallsThisMonth: user.ai_calls_this_month,
    aiCallsResetAt: user.ai_calls_reset_at,
  };
}

export async function incrementAiUsage(userId: string): Promise<number> {
  const usage = await getAiUsage(userId);
  const client = await ensureInitialized();
  const next = usage.aiCallsThisMonth + 1;
  await client.execute({
    sql: "UPDATE users SET ai_calls_this_month = ? WHERE id = ?",
    args: [next, userId],
  });
  return next;
}

/* ── Daily AI usage (Pro) ─────────────────────────────────── */

function shouldResetDailyAiWindow(resetAt: string): boolean {
  if (!resetAt) return true;
  const d = new Date(resetAt);
  const now = new Date();
  return d.getUTCFullYear() !== now.getUTCFullYear() ||
    d.getUTCMonth() !== now.getUTCMonth() ||
    d.getUTCDate() !== now.getUTCDate();
}

export async function getDailyAiUsage(userId: string): Promise<{ aiCallsToday: number; aiDailyResetAt: string }> {
  const user = await findUserById(userId);
  if (!user) return { aiCallsToday: 0, aiDailyResetAt: new Date().toISOString() };
  if (shouldResetDailyAiWindow(user.ai_daily_reset_at)) {
    const client = await ensureInitialized();
    await client.execute({
      sql: "UPDATE users SET ai_calls_today = 0, ai_daily_reset_at = datetime('now') WHERE id = ?",
      args: [userId],
    });
    return { aiCallsToday: 0, aiDailyResetAt: new Date().toISOString() };
  }
  return { aiCallsToday: user.ai_calls_today, aiDailyResetAt: user.ai_daily_reset_at };
}

export async function incrementDailyAiUsage(userId: string): Promise<number> {
  const usage = await getDailyAiUsage(userId);
  const next = usage.aiCallsToday + 1;
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET ai_calls_today = ? WHERE id = ?",
    args: [next, userId],
  });
  return next;
}

/* ── Rate limits (per-user, per-provider) ─────────────────── */

export async function checkAndIncrementRateLimit(
  userId: string,
  provider: string,
  maxCalls: number,
  windowKey: string,
): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  const client = await ensureInitialized();

  const existing = await client.execute({
    sql: "SELECT call_count, window_start FROM rate_limits WHERE user_id = ? AND provider = ?",
    args: [userId, provider],
  });

  if (existing.rows.length === 0) {
    await client.execute({
      sql: "INSERT INTO rate_limits (user_id, provider, call_count, window_start) VALUES (?, ?, 1, ?)",
      args: [userId, provider, windowKey],
    });
    return { allowed: true, remaining: maxCalls - 1, resetAt: windowKey };
  }

  const row = existing.rows[0];
  const currentWindow = str(row.window_start);

  if (currentWindow !== windowKey) {
    await client.execute({
      sql: "UPDATE rate_limits SET call_count = 1, window_start = ? WHERE user_id = ? AND provider = ?",
      args: [windowKey, userId, provider],
    });
    return { allowed: true, remaining: maxCalls - 1, resetAt: windowKey };
  }

  const currentCount = num(row.call_count);
  if (currentCount >= maxCalls) {
    return { allowed: false, remaining: 0, resetAt: windowKey };
  }

  await client.execute({
    sql: "UPDATE rate_limits SET call_count = call_count + 1 WHERE user_id = ? AND provider = ?",
    args: [userId, provider],
  });
  return { allowed: true, remaining: maxCalls - currentCount - 1, resetAt: windowKey };
}

export async function recordRateLimitUsage(
  userId: string,
  provider: string,
  count: number,
  windowKey: string,
): Promise<void> {
  if (count <= 0) return;
  const client = await ensureInitialized();
  const existing = await client.execute({
    sql: "SELECT call_count, window_start FROM rate_limits WHERE user_id = ? AND provider = ?",
    args: [userId, provider],
  });

  if (existing.rows.length === 0) {
    await client.execute({
      sql: "INSERT INTO rate_limits (user_id, provider, call_count, window_start) VALUES (?, ?, ?, ?)",
      args: [userId, provider, count, windowKey],
    });
    return;
  }

  const currentWindow = str(existing.rows[0].window_start);
  if (currentWindow !== windowKey) {
    await client.execute({
      sql: "UPDATE rate_limits SET call_count = ?, window_start = ? WHERE user_id = ? AND provider = ?",
      args: [count, windowKey, userId, provider],
    });
  } else {
    await client.execute({
      sql: "UPDATE rate_limits SET call_count = call_count + ? WHERE user_id = ? AND provider = ?",
      args: [count, userId, provider],
    });
  }
}

export async function countProSubscribers(): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute("SELECT COUNT(*) as cnt FROM users WHERE plan = 'pro'");
  return num(result.rows[0]?.cnt);
}

export async function getRateLimitStats(): Promise<{
  perUser: { userId: string; username: string; provider: string; callCount: number; windowStart: string }[];
}> {
  const client = await ensureInitialized();
  const result = await client.execute(
    `SELECT rl.user_id, u.username, rl.provider, rl.call_count, rl.window_start
     FROM rate_limits rl
     JOIN users u ON u.id = rl.user_id
     ORDER BY rl.call_count DESC`
  );
  return {
    perUser: result.rows.map((r) => ({
      userId: str(r.user_id),
      username: str(r.username),
      provider: str(r.provider),
      callCount: num(r.call_count),
      windowStart: str(r.window_start),
    })),
  };
}

export async function deleteUser(userId: string) {
  const client = await ensureInitialized();
  await client.execute({ sql: "DELETE FROM users WHERE id = ?", args: [userId] });
}

function parseRefreshInterval(val: unknown): RefreshInterval {
  const n = Number(val);
  if (n === 30 || n === 60) return n;
  return 15;
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT provider, alpha_vantage_api_key, language, refresh_interval FROM user_settings WHERE user_id = ?",
    args: [userId],
  });

  if (result.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO user_settings (user_id, provider, alpha_vantage_api_key, language, refresh_interval)
            VALUES (?, 'yahoo', '', 'en', 15)`,
      args: [userId],
    });
    return { provider: "yahoo", alphaVantageApiKey: "", language: "en", refreshInterval: 15 };
  }

  const row = result.rows[0];
  return {
    provider: (row.provider === "alphavantage" ? "alphavantage" : "yahoo") as ApiProviderName,
    alphaVantageApiKey: decrypt(str(row.alpha_vantage_api_key)),
    language: (row.language === "es" ? "es" : "en") as Language,
    refreshInterval: parseRefreshInterval(row.refresh_interval),
  };
}

export async function updateUserSettings(
  userId: string,
  updates: Partial<UserSettings>
): Promise<UserSettings> {
  const current = await getUserSettings(userId);
  const next: UserSettings = {
    provider: updates.provider ?? current.provider,
    alphaVantageApiKey: updates.alphaVantageApiKey ?? current.alphaVantageApiKey,
    language: updates.language ?? current.language,
    refreshInterval: updates.refreshInterval ?? current.refreshInterval,
  };

  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE user_settings SET provider = ?, alpha_vantage_api_key = ?, language = ?, refresh_interval = ? WHERE user_id = ?",
    args: [next.provider, encrypt(next.alphaVantageApiKey), next.language, next.refreshInterval, userId],
  });

  return next;
}

/* ── Global Alpha Vantage API Key (admin-managed, shared) ── */

export async function getGlobalAlphaVantageApiKey(): Promise<string> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT us.alpha_vantage_api_key FROM user_settings us
          JOIN users u ON u.id = us.user_id
          WHERE u.role = 'admin' AND us.alpha_vantage_api_key != ''
          ORDER BY u.created_at ASC LIMIT 1`,
  });
  if (result.rows.length === 0) return "";
  return decrypt(str(result.rows[0].alpha_vantage_api_key));
}

export async function setGlobalAlphaVantageApiKey(key: string): Promise<void> {
  const client = await ensureInitialized();
  const admin = await client.execute({
    sql: "SELECT id FROM users WHERE username = ?",
    args: [ADMIN_DEFAULT_USERNAME],
  });
  if (admin.rows.length === 0) throw new Error("Admin user not found");
  const adminId = str(admin.rows[0].id);
  await client.execute({
    sql: "UPDATE user_settings SET alpha_vantage_api_key = ? WHERE user_id = ?",
    args: [encrypt(key), adminId],
  });
}

/* ── Global OpenAI API Key (admin-managed, shared) ── */

export async function getGlobalOpenAIApiKey(): Promise<string> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT us.openai_api_key FROM user_settings us
          JOIN users u ON u.id = us.user_id
          WHERE u.role = 'admin' AND us.openai_api_key != ''
          ORDER BY u.created_at ASC LIMIT 1`,
  });
  if (result.rows.length === 0) return "";
  return decrypt(str(result.rows[0].openai_api_key));
}

export async function setGlobalOpenAIApiKey(key: string): Promise<void> {
  const client = await ensureInitialized();
  const admin = await client.execute({
    sql: "SELECT id FROM users WHERE username = ?",
    args: [ADMIN_DEFAULT_USERNAME],
  });
  if (admin.rows.length === 0) throw new Error("Admin user not found");
  const adminId = str(admin.rows[0].id);
  await client.execute({
    sql: "UPDATE user_settings SET openai_api_key = ? WHERE user_id = ?",
    args: [key ? encrypt(key) : "", adminId],
  });
}

export async function listHoldings(userId: string): Promise<Holding[]> {
  const client = await ensureInitialized();
  const holdingsResult = await client.execute({
    sql: `SELECT id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, sector, region, asset_class, account_id
          FROM holdings WHERE user_id = ? ORDER BY name ASC`,
    args: [userId],
  });

  if (holdingsResult.rows.length > 0) {
    return holdingsResult.rows.map((row) => ({
      id: str(row.id),
      name: str(row.name),
      ticker: str(row.ticker),
      isin: str(row.isin),
      assetType: holdingAssetType(row.asset_type),
      shares: num(row.shares),
      purchasePrice: num(row.purchase_price),
      displayCurrency: str(row.display_currency),
      exchange: str(row.exchange),
      valueInEUR: num(row.value_in_eur),
      sector: str(row.sector),
      region: str(row.region),
      assetClass: str(row.asset_class),
      accountId: str(row.account_id),
    }));
  }

  const txCount = await client.execute({
    sql: "SELECT COUNT(*) as cnt FROM transactions WHERE user_id = ?",
    args: [userId],
  });
  if (num(txCount.rows[0]?.cnt) > 0) {
    return rebuildHoldings(userId);
  }

  return [];
}

export async function listCashEntries(userId: string): Promise<CashEntry[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, name, amount_eur
          FROM cash_entries WHERE user_id = ? ORDER BY created_at ASC`,
    args: [userId],
  });
  return result.rows.map((row) => ({
    id: str(row.id),
    name: str(row.name),
    amountEUR: num(row.amount_eur),
  }));
}

export async function addCashEntry(
  userId: string,
  entry: Omit<CashEntry, "id">
): Promise<CashEntry> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO cash_entries (id, user_id, name, amount_eur)
          VALUES (?, ?, ?, ?)`,
    args: [id, userId, entry.name, entry.amountEUR],
  });
  return { ...entry, id };
}

export async function updateCashEntry(
  userId: string,
  cashId: string,
  updates: Partial<Omit<CashEntry, "id">>
): Promise<CashEntry | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, name, amount_eur
          FROM cash_entries WHERE id = ? AND user_id = ?`,
    args: [cashId, userId],
  });
  if (result.rows.length === 0) return null;
  const current = result.rows[0];
  const next = {
    name: updates.name ?? str(current.name),
    amountEUR: updates.amountEUR ?? num(current.amount_eur),
  };
  await client.execute({
    sql: `UPDATE cash_entries
          SET name = ?, amount_eur = ?, updated_at = datetime('now')
          WHERE id = ? AND user_id = ?`,
    args: [next.name, next.amountEUR, cashId, userId],
  });
  return { id: cashId, ...next };
}

export async function removeCashEntry(userId: string, cashId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM cash_entries WHERE id = ? AND user_id = ?",
    args: [cashId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function addHolding(
  userId: string,
  holding: Omit<Holding, "id">
): Promise<Holding> {
  const client = await ensureInitialized();
  const ticker = normalizeTickerForExchange(holding.ticker, holding.exchange);

  const existing = await client.execute({
    sql: `SELECT id, shares, purchase_price FROM holdings
          WHERE user_id = ? AND UPPER(ticker) = UPPER(?) AND UPPER(exchange) = UPPER(?)`,
    args: [userId, ticker, holding.exchange],
  });

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    const oldShares = Number(row.shares) || 0;
    const oldPrice = Number(row.purchase_price) || 0;
    const newShares = holding.shares;
    const newPrice = holding.purchasePrice;
    const totalShares = oldShares + newShares;

    // Only recalculate average when buying more shares (positive addition).
    // Selling (negative shares) keeps the existing cost basis unchanged.
    const avgPrice =
      newShares > 0 && totalShares > 0
        ? (oldShares * oldPrice + newShares * newPrice) / totalShares
        : oldPrice;

    const finalShares = Math.max(totalShares, 0);
    const existingId = str(row.id);
    await client.execute({
      sql: `UPDATE holdings SET shares = ?, purchase_price = ? WHERE id = ? AND user_id = ?`,
      args: [finalShares, avgPrice, existingId, userId],
    });
    return { ...holding, id: existingId, ticker, shares: finalShares, purchasePrice: avgPrice };
  }

  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO holdings (
            id, user_id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, userId, holding.name, ticker, holding.isin,
      holding.assetType ?? "stock",
      holding.shares, holding.purchasePrice, holding.displayCurrency,
      holding.exchange, holding.valueInEUR,
    ],
  });
  return { ...holding, id, ticker };
}

export async function updateHolding(
  userId: string,
  holdingId: string,
  updates: Partial<Omit<Holding, "id">>
): Promise<Holding | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, sector, region, asset_class, account_id
          FROM holdings WHERE id = ? AND user_id = ?`,
    args: [holdingId, userId],
  });

  if (result.rows.length === 0) return null;
  const current = result.rows[0];

  const exchange = updates.exchange ?? str(current.exchange);
  const rawTicker = updates.ticker ?? str(current.ticker);
  const next = {
    name: updates.name ?? str(current.name),
    ticker: normalizeTickerForExchange(rawTicker, exchange),
    isin: updates.isin ?? str(current.isin),
    assetType: updates.assetType ?? holdingAssetType(current.asset_type),
    shares: updates.shares ?? num(current.shares),
    purchasePrice: updates.purchasePrice ?? num(current.purchase_price),
    displayCurrency: updates.displayCurrency ?? str(current.display_currency),
    exchange,
    valueInEUR: updates.valueInEUR ?? num(current.value_in_eur),
    sector: updates.sector ?? str(current.sector),
    region: updates.region ?? str(current.region),
    assetClass: updates.assetClass ?? str(current.asset_class),
    accountId: updates.accountId ?? str(current.account_id),
  };

  await client.execute({
    sql: `UPDATE holdings
          SET name = ?, ticker = ?, isin = ?, asset_type = ?, shares = ?, purchase_price = ?,
              display_currency = ?, exchange = ?, value_in_eur = ?,
              sector = ?, region = ?, asset_class = ?, account_id = ?
          WHERE id = ? AND user_id = ?`,
    args: [
      next.name, next.ticker, next.isin, next.assetType, next.shares, next.purchasePrice,
      next.displayCurrency, next.exchange, next.valueInEUR,
      next.sector, next.region, next.assetClass, next.accountId,
      holdingId, userId,
    ],
  });

  return { id: holdingId, ...next };
}

export async function removeHolding(userId: string, holdingId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM holdings WHERE id = ? AND user_id = ?",
    args: [holdingId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function resetUserHoldings(
  userId: string,
  useSeedData: boolean
): Promise<number> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "DELETE FROM holdings WHERE user_id = ?",
    args: [userId],
  });
  await client.execute({
    sql: "DELETE FROM cash_entries WHERE user_id = ?",
    args: [userId],
  });
  await client.execute({
    sql: "DELETE FROM transactions WHERE user_id = ?",
    args: [userId],
  });
  if (useSeedData) {
    const holdingsCount = await seedHoldingsForUser(client, userId);
    const cashCount = await seedCashForUser(client, userId);
    const txCount = await seedTransactionsForUser(client, userId);
    return holdingsCount + cashCount + txCount;
  }
  return 0;
}

export function toPublicUser(user: DbUser): PublicUser {
  return mapUser(user);
}

/* ── Transactions ──────────────────────────────────────────── */

function txType(val: unknown): TransactionType {
  const v = String(val);
  if (v === "sell" || v === "dividend" || v === "fee") return v;
  return "buy";
}

export async function listTransactions(userId: string, holdingId?: string): Promise<Transaction[]> {
  const client = await ensureInitialized();
  const sql = holdingId
    ? "SELECT * FROM transactions WHERE user_id = ? AND holding_id = ? ORDER BY date DESC, created_at DESC"
    : "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC";
  const args = holdingId ? [userId, holdingId] : [userId];
  const result = await client.execute({ sql, args });
  return result.rows.map((r) => ({
    id: str(r.id),
    holdingId: str(r.holding_id),
    ticker: str(r.ticker),
    name: str(r.name),
    exchange: str(r.exchange),
    isin: str(r.isin),
    assetType: holdingAssetType(r.asset_type),
    accountId: str(r.account_id),
    type: txType(r.type),
    date: str(r.date),
    shares: num(r.shares),
    pricePerShare: num(r.price_per_share),
    totalAmount: num(r.total_amount),
    fees: num(r.fees),
    taxes: num(r.taxes),
    currency: str(r.currency),
    displayCurrency: str(r.display_currency),
    notes: str(r.notes),
    createdAt: str(r.created_at),
  }));
}

export async function addTransaction(userId: string, tx: Omit<Transaction, "id" | "createdAt">): Promise<Transaction> {
  const client = await ensureInitialized();
  const id = randomUUID();
  const total = tx.totalAmount || tx.shares * tx.pricePerShare;
  const exchange = (tx.exchange || "").toUpperCase();
  const ticker = normalizeTickerForExchange(tx.ticker, exchange);
  await client.execute({
    sql: `INSERT INTO transactions (
            id, user_id, holding_id, ticker, name, exchange, isin, asset_type, account_id,
            type, date, shares, price_per_share, total_amount, fees, taxes, currency, display_currency, notes
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
      tx.holdingId || "",
      ticker,
      tx.name || "",
      exchange,
      tx.isin || "",
      tx.assetType || "stock",
      tx.accountId || "",
      tx.type,
      tx.date,
      tx.shares,
      tx.pricePerShare,
      total,
      tx.fees || 0,
      tx.taxes || 0,
      tx.currency || "EUR",
      tx.displayCurrency || tx.currency || "EUR",
      tx.notes || "",
    ],
  });
  const created: Transaction = {
    ...tx,
    id,
    ticker,
    exchange,
    totalAmount: total,
    fees: tx.fees || 0,
    taxes: tx.taxes || 0,
    notes: tx.notes || "",
    createdAt: new Date().toISOString(),
  };

  await syncHoldingForTransaction(userId, {
    ticker,
    exchange,
    name: tx.name || "",
    isin: tx.isin || "",
    assetType: tx.assetType || "stock",
    type: tx.type,
    shares: tx.shares,
    totalAmount: total,
    fees: tx.fees || 0,
    taxes: tx.taxes || 0,
    currency: tx.currency || "EUR",
    displayCurrency: tx.displayCurrency || tx.currency || "EUR",
    accountId: tx.accountId || "",
  });

  return created;
}

/* ── Incremental Holdings Sync ──────────────────────────── */

async function syncHoldingForTransaction(
  userId: string,
  tx: { ticker: string; exchange: string; name: string; isin: string; assetType: string; type: string; shares: number; totalAmount: number; fees: number; taxes: number; currency: string; displayCurrency?: string; accountId?: string }
): Promise<void> {
  if (tx.type !== "buy" && tx.type !== "sell") return;

  const client = await ensureInitialized();
  const ticker = tx.ticker.toUpperCase();
  const exchange = (tx.exchange || "").toUpperCase();

  const existing = await client.execute({
    sql: "SELECT id, shares, purchase_price FROM holdings WHERE user_id = ? AND UPPER(ticker) = ? AND UPPER(exchange) = ?",
    args: [userId, ticker, exchange],
  });

  if (tx.type === "buy") {
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      const oldShares = num(row.shares);
      const oldCost = oldShares * num(row.purchase_price);
      const newShares = oldShares + tx.shares;
      const newCost = oldCost + tx.totalAmount + (tx.fees || 0) + (tx.taxes || 0);
      const newPrice = newShares > 0 ? newCost / newShares : 0;
      await client.execute({
        sql: "UPDATE holdings SET shares = ?, purchase_price = ? WHERE id = ? AND user_id = ?",
        args: [newShares, newPrice, str(row.id), userId],
      });
    } else {
      const id = randomUUID();
      const price = tx.shares > 0 ? (tx.totalAmount + (tx.fees || 0) + (tx.taxes || 0)) / tx.shares : 0;
      await client.execute({
        sql: `INSERT INTO holdings (id, user_id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, account_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        args: [id, userId, tx.name || ticker, ticker, tx.isin || "", tx.assetType || "stock", tx.shares, price, tx.displayCurrency || tx.currency || "EUR", exchange, tx.accountId || ""],
      });
    }
  } else if (tx.type === "sell") {
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      const oldShares = num(row.shares);
      const oldCost = oldShares * num(row.purchase_price);
      const sold = Math.min(tx.shares, oldShares);
      const avgCost = oldShares > 0 ? oldCost / oldShares : 0;
      const newShares = oldShares - sold;
      const newCost = Math.max(0, oldCost - sold * avgCost);
      const newPrice = newShares > 0 ? newCost / newShares : 0;

      if (newShares <= 0) {
        await client.execute({
          sql: "DELETE FROM holdings WHERE id = ? AND user_id = ?",
          args: [str(row.id), userId],
        });
      } else {
        await client.execute({
          sql: "UPDATE holdings SET shares = ?, purchase_price = ? WHERE id = ? AND user_id = ?",
          args: [newShares, newPrice, str(row.id), userId],
        });
      }
    }
  }
}

export async function rebuildHoldings(userId: string): Promise<Holding[]> {
  const client = await ensureInitialized();

  const metadataRows = await client.execute({
    sql: `SELECT id, name, ticker, isin, asset_type, display_currency, exchange, sector, region, asset_class, account_id
          FROM holdings WHERE user_id = ?`,
    args: [userId],
  });

  const metadataByKey = new Map<string, {
    id: string; name: string; isin: string; assetType: HoldingAssetType;
    displayCurrency: string; sector: string; region: string; assetClass: string; accountId: string;
  }>();
  for (const row of metadataRows.rows) {
    const key = `${str(row.ticker).toUpperCase()}|${str(row.exchange).toUpperCase()}`;
    if (!metadataByKey.has(key)) {
      metadataByKey.set(key, {
        id: str(row.id), name: str(row.name), isin: str(row.isin),
        assetType: holdingAssetType(row.asset_type), displayCurrency: str(row.display_currency),
        sector: str(row.sector), region: str(row.region), assetClass: str(row.asset_class),
        accountId: str(row.account_id),
      });
    }
  }

  const transactions = await listTransactions(userId);
  const derived = deriveHoldingsFromTransactions(transactions, metadataByKey);

  await client.execute({ sql: "DELETE FROM holdings WHERE user_id = ?", args: [userId] });

  for (const h of derived) {
    const id = randomUUID();
    await client.execute({
      sql: `INSERT INTO holdings (id, user_id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur, sector, region, asset_class, account_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, h.name, h.ticker, h.isin || "", h.assetType || "stock", h.shares, h.purchasePrice, h.displayCurrency, h.exchange, h.valueInEUR || 0, h.sector || "", h.region || "", h.assetClass || "", h.accountId || ""],
    });
  }

  return derived;
}

export async function deleteTransaction(userId: string, txId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({ sql: "DELETE FROM transactions WHERE id = ? AND user_id = ?", args: [txId, userId] });
  return (result.rowsAffected ?? 0) > 0;
}

export async function deleteTransactionsForPosition(
  userId: string,
  ticker: string,
  exchange: string
): Promise<number> {
  const client = await ensureInitialized();
  const normalizedTicker = normalizeTickerForExchange(ticker, exchange);
  const result = await client.execute({
    sql: "DELETE FROM transactions WHERE user_id = ? AND UPPER(ticker) = UPPER(?) AND UPPER(exchange) = UPPER(?)",
    args: [userId, normalizedTicker, exchange],
  });
  return Number(result.rowsAffected ?? 0);
}

/* ── Watchlist ────────────────────────────────────────────── */

export async function listWatchlist(userId: string): Promise<WatchlistItem[]> {
  const client = await ensureInitialized();
  const result = await client.execute({ sql: "SELECT * FROM watchlist WHERE user_id = ? ORDER BY added_at DESC", args: [userId] });
  return result.rows.map((r) => ({ id: str(r.id), ticker: str(r.ticker), name: str(r.name), exchange: str(r.exchange), addedAt: str(r.added_at) }));
}

export async function addWatchlistItem(userId: string, item: Omit<WatchlistItem, "id" | "addedAt">): Promise<WatchlistItem> {
  const client = await ensureInitialized();
  const id = randomUUID();
  const ticker = normalizeTickerForExchange(item.ticker, item.exchange);
  await client.execute({
    sql: "INSERT OR IGNORE INTO watchlist (id, user_id, ticker, name, exchange) VALUES (?, ?, ?, ?, ?)",
    args: [id, userId, ticker, item.name, item.exchange],
  });
  return { id, ticker, name: item.name, exchange: item.exchange, addedAt: new Date().toISOString() };
}

export async function removeWatchlistItem(userId: string, itemId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({ sql: "DELETE FROM watchlist WHERE id = ? AND user_id = ?", args: [itemId, userId] });
  return (result.rowsAffected ?? 0) > 0;
}

/* ── Accounts ─────────────────────────────────────────────── */

export async function listAccounts(userId: string): Promise<Account[]> {
  const client = await ensureInitialized();
  const result = await client.execute({ sql: "SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at ASC", args: [userId] });
  return result.rows.map((r) => ({ id: str(r.id), name: str(r.name), broker: str(r.broker), currency: str(r.currency), createdAt: str(r.created_at) }));
}

export async function addAccount(userId: string, acct: Omit<Account, "id" | "createdAt">): Promise<Account> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: "INSERT INTO accounts (id, user_id, name, broker, currency) VALUES (?, ?, ?, ?, ?)",
    args: [id, userId, acct.name, acct.broker || "", acct.currency || "EUR"],
  });
  return { id, name: acct.name, broker: acct.broker || "", currency: acct.currency || "EUR", createdAt: new Date().toISOString() };
}

export async function deleteAccount(userId: string, accountId: string): Promise<boolean> {
  const client = await ensureInitialized();
  await client.execute({ sql: "UPDATE holdings SET account_id = '' WHERE user_id = ? AND account_id = ?", args: [userId, accountId] });
  const result = await client.execute({ sql: "DELETE FROM accounts WHERE id = ? AND user_id = ?", args: [accountId, userId] });
  return (result.rowsAffected ?? 0) > 0;
}

/* ── Rebalance Targets ────────────────────────────────────── */

export async function listRebalanceTargets(userId: string): Promise<RebalanceTarget[]> {
  const client = await ensureInitialized();
  const result = await client.execute({ sql: "SELECT * FROM rebalance_targets WHERE user_id = ? ORDER BY category, label", args: [userId] });
  return result.rows.map((r) => ({ id: str(r.id), category: str(r.category), label: str(r.label), targetPercent: num(r.target_percent) }));
}

export async function setRebalanceTarget(userId: string, target: Omit<RebalanceTarget, "id">): Promise<RebalanceTarget> {
  const client = await ensureInitialized();
  const existing = await client.execute({
    sql: "SELECT id FROM rebalance_targets WHERE user_id = ? AND category = ? AND label = ?",
    args: [userId, target.category, target.label],
  });
  if (existing.rows.length > 0) {
    const id = str(existing.rows[0].id);
    await client.execute({ sql: "UPDATE rebalance_targets SET target_percent = ? WHERE id = ?", args: [target.targetPercent, id] });
    return { id, ...target };
  }
  const id = randomUUID();
  await client.execute({
    sql: "INSERT INTO rebalance_targets (id, user_id, category, label, target_percent) VALUES (?, ?, ?, ?, ?)",
    args: [id, userId, target.category, target.label, target.targetPercent],
  });
  return { id, ...target };
}

export async function deleteRebalanceTarget(userId: string, targetId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({ sql: "DELETE FROM rebalance_targets WHERE id = ? AND user_id = ?", args: [targetId, userId] });
  return (result.rowsAffected ?? 0) > 0;
}

/* ── Analytics ─────────────────────────────────────────────── */

export async function trackEvent(
  userId: string,
  event: string,
  metadata?: Record<string, string>
): Promise<void> {
  try {
    const client = await ensureInitialized();
    await client.execute({
      sql: "INSERT INTO analytics_events (id, user_id, event, metadata) VALUES (?, ?, ?, ?)",
      args: [randomUUID(), userId, event, metadata ? JSON.stringify(metadata) : null],
    });
  } catch (err) {
    console.error("Failed to track event:", err instanceof Error ? err.message : err);
  }
}

export async function trackLandingEvent(
  event: string,
  metadata?: Record<string, string>,
  referrer?: string
): Promise<void> {
  try {
    const client = await ensureInitialized();
    await client.execute({
      sql: "INSERT INTO landing_events (id, event, metadata, referrer) VALUES (?, ?, ?, ?)",
      args: [randomUUID(), event, metadata ? JSON.stringify(metadata) : null, referrer || null],
    });
  } catch (err) {
    console.error("Failed to track landing event:", err instanceof Error ? err.message : err);
  }
}

export interface LandingAnalytics {
  totalPageViews: number;
  totalCtaClicks: number;
  eventsByType: { event: string; count: number }[];
  ctaBreakdown: { cta: string; count: number }[];
  dailyViews: { date: string; views: number }[];
}

export interface AnalyticsSummary {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalEvents: number;
  eventsByType: { event: string; count: number }[];
  topStocks: { ticker: string; views: number }[];
  dailyActivity: { date: string; users: number; events: number }[];
  signupsByDay: { date: string; count: number }[];
  landing: LandingAnalytics;
}

export async function getAnalyticsSummary(days = 30): Promise<AnalyticsSummary> {
  const client = await ensureInitialized();

  const [
    usersResult, active7d, active30d, totalEvents, eventsByType, topStocks, dailyActivity, signupsByDay,
    landingPageViews, landingCtaClicks, landingEventsByType, landingCtaBreakdown, landingDailyViews,
  ] = await Promise.all([
      client.execute("SELECT COUNT(*) as cnt FROM users"),
      client.execute({
        sql: "SELECT COUNT(DISTINCT user_id) as cnt FROM analytics_events WHERE created_at >= datetime('now', '-7 days')",
      }),
      client.execute({
        sql: "SELECT COUNT(DISTINCT user_id) as cnt FROM analytics_events WHERE created_at >= datetime('now', '-30 days')",
      }),
      client.execute({
        sql: "SELECT COUNT(*) as cnt FROM analytics_events WHERE created_at >= datetime('now', ?)",
        args: [`-${days} days`],
      }),
      client.execute({
        sql: `SELECT event, COUNT(*) as cnt FROM analytics_events
              WHERE created_at >= datetime('now', ?)
              GROUP BY event ORDER BY cnt DESC`,
        args: [`-${days} days`],
      }),
      client.execute({
        sql: `SELECT json_extract(metadata, '$.ticker') as ticker, COUNT(*) as cnt
              FROM analytics_events
              WHERE event = 'stock_view' AND created_at >= datetime('now', ?)
              GROUP BY ticker ORDER BY cnt DESC LIMIT 10`,
        args: [`-${days} days`],
      }),
      client.execute({
        sql: `SELECT date(created_at) as day,
                     COUNT(DISTINCT user_id) as users,
                     COUNT(*) as events
              FROM analytics_events
              WHERE created_at >= datetime('now', ?)
              GROUP BY day ORDER BY day ASC`,
        args: [`-${days} days`],
      }),
      client.execute({
        sql: `SELECT date(created_at) as day, COUNT(*) as cnt
              FROM users
              WHERE created_at >= datetime('now', ?)
              GROUP BY day ORDER BY day ASC`,
        args: [`-${days} days`],
      }),
      client.execute({
        sql: "SELECT COUNT(*) as cnt FROM landing_events WHERE event = 'landing_page_view' AND created_at >= datetime('now', ?)",
        args: [`-${days} days`],
      }),
      client.execute({
        sql: "SELECT COUNT(*) as cnt FROM landing_events WHERE event = 'landing_cta_click' AND created_at >= datetime('now', ?)",
        args: [`-${days} days`],
      }),
      client.execute({
        sql: `SELECT event, COUNT(*) as cnt FROM landing_events
              WHERE created_at >= datetime('now', ?)
              GROUP BY event ORDER BY cnt DESC`,
        args: [`-${days} days`],
      }),
      client.execute({
        sql: `SELECT json_extract(metadata, '$.cta') as cta, COUNT(*) as cnt
              FROM landing_events
              WHERE event = 'landing_cta_click' AND created_at >= datetime('now', ?)
              GROUP BY cta ORDER BY cnt DESC`,
        args: [`-${days} days`],
      }),
      client.execute({
        sql: `SELECT date(created_at) as day, COUNT(*) as cnt
              FROM landing_events
              WHERE event = 'landing_page_view' AND created_at >= datetime('now', ?)
              GROUP BY day ORDER BY day ASC`,
        args: [`-${days} days`],
      }),
    ]);

  return {
    totalUsers: num(usersResult.rows[0]?.cnt),
    activeUsers7d: num(active7d.rows[0]?.cnt),
    activeUsers30d: num(active30d.rows[0]?.cnt),
    totalEvents: num(totalEvents.rows[0]?.cnt),
    eventsByType: eventsByType.rows.map((r) => ({ event: str(r.event), count: num(r.cnt) })),
    topStocks: topStocks.rows.map((r) => ({ ticker: str(r.ticker), views: num(r.cnt) })),
    dailyActivity: dailyActivity.rows.map((r) => ({
      date: str(r.day),
      users: num(r.users),
      events: num(r.events),
    })),
    signupsByDay: signupsByDay.rows.map((r) => ({ date: str(r.day), count: num(r.cnt) })),
    landing: {
      totalPageViews: num(landingPageViews.rows[0]?.cnt),
      totalCtaClicks: num(landingCtaClicks.rows[0]?.cnt),
      eventsByType: landingEventsByType.rows.map((r) => ({ event: str(r.event), count: num(r.cnt) })),
      ctaBreakdown: landingCtaBreakdown.rows.map((r) => ({ cta: str(r.cta), count: num(r.cnt) })),
      dailyViews: landingDailyViews.rows.map((r) => ({ date: str(r.day), views: num(r.cnt) })),
    },
  };
}

/* ── Prometheus Metrics Snapshot ────────────────────────────── */

export interface MetricsSnapshot {
  freeUsers: number;
  proUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  holdingsCount: number;
  transactionsCount: number;
  eventsLast24h: { event: string; count: number }[];
}

export async function getMetricsSnapshot(): Promise<MetricsSnapshot> {
  const client = await ensureInitialized();

  const [freeUsers, proUsers, active7d, active30d, holdings, transactions, events24h] =
    await Promise.all([
      client.execute("SELECT COUNT(*) as cnt FROM users WHERE plan = 'free'"),
      client.execute("SELECT COUNT(*) as cnt FROM users WHERE plan = 'pro'"),
      client.execute({
        sql: "SELECT COUNT(DISTINCT user_id) as cnt FROM analytics_events WHERE created_at >= datetime('now', '-7 days')",
      }),
      client.execute({
        sql: "SELECT COUNT(DISTINCT user_id) as cnt FROM analytics_events WHERE created_at >= datetime('now', '-30 days')",
      }),
      client.execute("SELECT COUNT(*) as cnt FROM holdings"),
      client.execute("SELECT COUNT(*) as cnt FROM transactions"),
      client.execute({
        sql: `SELECT event, COUNT(*) as cnt FROM analytics_events
              WHERE created_at >= datetime('now', '-1 day')
              GROUP BY event ORDER BY cnt DESC`,
      }),
    ]);

  return {
    freeUsers: num(freeUsers.rows[0]?.cnt),
    proUsers: num(proUsers.rows[0]?.cnt),
    activeUsers7d: num(active7d.rows[0]?.cnt),
    activeUsers30d: num(active30d.rows[0]?.cnt),
    holdingsCount: num(holdings.rows[0]?.cnt),
    transactionsCount: num(transactions.rows[0]?.cnt),
    eventsLast24h: events24h.rows.map((r) => ({ event: str(r.event), count: num(r.cnt) })),
  };
}
