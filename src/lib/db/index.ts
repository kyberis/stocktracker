import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import path from "path";
import { createClient, type Client, type Row } from "@libsql/client";
import bcrypt from "bcryptjs";
import type { ApiProviderName, CashEntry, Holding, HoldingAssetType, Language } from "@/lib/types";
import { seedHoldingsForUser } from "./seed";

export type UserRole = "admin" | "user";

export interface DbUser {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  must_change_password: number;
  created_at: string;
}

export interface PublicUser {
  id: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface UserSettings {
  provider: ApiProviderName;
  alphaVantageApiKey: string;
  language: Language;
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
}

async function ensureAdminUser(client: Client) {
  const passwordHash = bcrypt.hashSync(ADMIN_DEFAULT_PASSWORD, BCRYPT_ROUNDS);
  const existing = await client.execute({
    sql: "SELECT id FROM users WHERE username = ?",
    args: [ADMIN_DEFAULT_USERNAME],
  });
  const adminId = (existing.rows[0]?.id as string) || randomUUID();

  await client.batch(
    [
      {
        sql: `INSERT OR IGNORE INTO users (id, username, password_hash, role, must_change_password)
              VALUES (?, ?, ?, 'admin', 1)`,
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
  };
}

function mapUser(user: DbUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: user.must_change_password === 1,
    createdAt: user.created_at,
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
        sql: `INSERT INTO users (id, username, password_hash, role, must_change_password)
              VALUES (?, ?, ?, 'user', 0)`,
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

export async function deleteUser(userId: string) {
  const client = await ensureInitialized();
  await client.execute({ sql: "DELETE FROM users WHERE id = ?", args: [userId] });
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT provider, alpha_vantage_api_key, language FROM user_settings WHERE user_id = ?",
    args: [userId],
  });

  if (result.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO user_settings (user_id, provider, alpha_vantage_api_key, language)
            VALUES (?, 'yahoo', '', 'en')`,
      args: [userId],
    });
    return { provider: "yahoo", alphaVantageApiKey: "", language: "en" };
  }

  const row = result.rows[0];
  return {
    provider: (row.provider === "alphavantage" ? "alphavantage" : "yahoo") as ApiProviderName,
    alphaVantageApiKey: str(row.alpha_vantage_api_key),
    language: (row.language === "es" ? "es" : "en") as Language,
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
  };

  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE user_settings SET provider = ?, alpha_vantage_api_key = ?, language = ? WHERE user_id = ?",
    args: [next.provider, next.alphaVantageApiKey, next.language, userId],
  });

  return next;
}

export async function listHoldings(userId: string): Promise<Holding[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur
          FROM holdings WHERE user_id = ? ORDER BY created_at ASC`,
    args: [userId],
  });

  return result.rows.map((row) => ({
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
  }));
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
  const id = randomUUID();
  const ticker = normalizeTickerForExchange(holding.ticker, holding.exchange);
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
    sql: `SELECT id, name, ticker, isin, asset_type, shares, purchase_price, display_currency, exchange, value_in_eur
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
  };

  await client.execute({
    sql: `UPDATE holdings
          SET name = ?, ticker = ?, isin = ?, asset_type = ?, shares = ?, purchase_price = ?,
              display_currency = ?, exchange = ?, value_in_eur = ?
          WHERE id = ? AND user_id = ?`,
    args: [
      next.name, next.ticker, next.isin, next.assetType, next.shares, next.purchasePrice,
      next.displayCurrency, next.exchange, next.valueInEUR,
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
  if (useSeedData) {
    return seedHoldingsForUser(client, userId);
  }
  return 0;
}

export function toPublicUser(user: DbUser): PublicUser {
  return mapUser(user);
}
