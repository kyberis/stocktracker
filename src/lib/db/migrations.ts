import type { Client } from "@libsql/client";
import { encrypt, tryDecryptOrPlaintext } from "@/lib/crypto";
import { str, EXCHANGE_SUFFIX_MAP } from "./helpers";

interface Migration {
  version: number;
  description: string;
  up: (client: Client) => Promise<void>;
}

async function getCurrentVersion(client: Client): Promise<number> {
  await client.execute(
    `CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL DEFAULT '',
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );
  const result = await client.execute("SELECT MAX(version) as v FROM schema_version");
  return Number(result.rows[0]?.v) || 0;
}

async function markVersion(client: Client, version: number, description: string): Promise<void> {
  await client.execute({
    sql: "INSERT OR IGNORE INTO schema_version (version, description) VALUES (?, ?)",
    args: [version, description],
  });
}

/**
 * All historical schema setup consolidated into the bootstrap migration.
 * These statements are idempotent (CREATE IF NOT EXISTS, ALTER only when column missing)
 * so they're safe to run on both fresh and existing databases.
 */
async function bootstrapSchema(client: Client): Promise<void> {
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
      language TEXT NOT NULL DEFAULT 'en',
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    PRAGMA foreign_keys = ON;
  `);

  const holdingColumns = await client.execute("PRAGMA table_info(holdings)");
  const colNames = new Set(holdingColumns.rows.map((r) => str(r.name)));
  if (!colNames.has("asset_type")) {
    await client.execute({ sql: "ALTER TABLE holdings ADD COLUMN asset_type TEXT NOT NULL DEFAULT 'stock'" });
  }

  await client.execute({ sql: "UPDATE holdings SET ticker = 'W9C' WHERE ticker = 'CSU.TO' AND name = 'Constellation Software Inc'" });
  await client.execute({ sql: "UPDATE holdings SET ticker = 'IS0E' WHERE ticker = 'ISOE' AND UPPER(exchange) IN ('TDG', 'TGD')" });

  for (const [exch, suffix] of Object.entries(EXCHANGE_SUFFIX_MAP)) {
    await client.execute({
      sql: `UPDATE holdings SET ticker = ticker || ? WHERE UPPER(exchange) = ? AND ticker NOT LIKE '%.%'`,
      args: [suffix, exch],
    });
  }
  await client.execute({ sql: "UPDATE holdings SET asset_type = 'etf' WHERE UPPER(name) LIKE '%ETF%'" });
  await client.execute({ sql: "UPDATE holdings SET asset_type = 'stock' WHERE asset_type IS NULL OR asset_type NOT IN ('stock', 'etf')" });
  await client.execute({
    sql: `INSERT OR IGNORE INTO cash_entries (id, user_id, name, amount_eur)
          SELECT id, user_id, name, value_in_eur FROM holdings
          WHERE UPPER(exchange) = 'CASH' OR UPPER(ticker) LIKE 'CASH-%'`,
  });
  await client.execute({ sql: "DELETE FROM holdings WHERE UPPER(exchange) = 'CASH' OR UPPER(ticker) LIKE 'CASH-%'" });

  const userColumns = await client.execute("PRAGMA table_info(users)");
  const userCols = new Set(userColumns.rows.map((r) => str(r.name)));
  if (!userCols.has("email")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''" });
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT ''" });
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''" });
  }
  if (!userCols.has("plan")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'" });
  }
  if (!userCols.has("stripe_customer_id")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN stripe_customer_id TEXT NOT NULL DEFAULT ''" });
  }
  if (!userCols.has("stripe_subscription_id")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT NOT NULL DEFAULT ''" });
  }
  if (!userCols.has("plan_expires_at")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN plan_expires_at TEXT NOT NULL DEFAULT ''" });
  }
  if (!userCols.has("ai_calls_this_month")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN ai_calls_this_month INTEGER NOT NULL DEFAULT 0" });
  }
  if (!userCols.has("ai_calls_reset_at")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN ai_calls_reset_at TEXT NOT NULL DEFAULT ''" });
  }
  await client.execute({ sql: "UPDATE users SET ai_calls_reset_at = datetime('now') WHERE ai_calls_reset_at = '' OR ai_calls_reset_at IS NULL" });

  const settingsCols = await client.execute("PRAGMA table_info(user_settings)");
  const settingsColNames = new Set(settingsCols.rows.map((r) => str(r.name)));
  if (!settingsColNames.has("refresh_interval")) {
    await client.execute({ sql: "ALTER TABLE user_settings ADD COLUMN refresh_interval INTEGER NOT NULL DEFAULT 15" });
  }
  if (!settingsColNames.has("openai_api_key")) {
    await client.execute({ sql: "ALTER TABLE user_settings ADD COLUMN openai_api_key TEXT NOT NULL DEFAULT ''" });
  }

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, holding_id TEXT, ticker TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '', exchange TEXT NOT NULL DEFAULT '', isin TEXT NOT NULL DEFAULT '',
      asset_type TEXT NOT NULL DEFAULT 'stock', account_id TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL CHECK(type IN ('buy', 'sell', 'dividend', 'fee')),
      date TEXT NOT NULL, shares REAL NOT NULL DEFAULT 0, price_per_share REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0, fees REAL NOT NULL DEFAULT 0, taxes REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'EUR', display_currency TEXT NOT NULL DEFAULT 'EUR',
      notes TEXT NOT NULL DEFAULT '', source_ref TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS watchlist (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, ticker TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '', exchange TEXT NOT NULL DEFAULT '',
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, UNIQUE(user_id, ticker)
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL,
      broker TEXT NOT NULL DEFAULT '', currency TEXT NOT NULL DEFAULT 'EUR',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS rebalance_targets (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'assetClass',
      label TEXT NOT NULL, target_percent REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, category, label)
    );
  `);

  const holdingCols2 = await client.execute("PRAGMA table_info(holdings)");
  const holdingColNames2 = new Set(holdingCols2.rows.map((r) => str(r.name)));
  if (!holdingColNames2.has("sector")) {
    await client.execute({ sql: "ALTER TABLE holdings ADD COLUMN sector TEXT NOT NULL DEFAULT ''" });
    await client.execute({ sql: "ALTER TABLE holdings ADD COLUMN region TEXT NOT NULL DEFAULT ''" });
    await client.execute({ sql: "ALTER TABLE holdings ADD COLUMN asset_class TEXT NOT NULL DEFAULT ''" });
    await client.execute({ sql: "ALTER TABLE holdings ADD COLUMN account_id TEXT NOT NULL DEFAULT ''" });
  }

  const txCols = await client.execute("PRAGMA table_info(transactions)");
  const txColNames = new Set(txCols.rows.map((r) => str(r.name)));
  if (!txColNames.has("name")) await client.execute({ sql: "ALTER TABLE transactions ADD COLUMN name TEXT NOT NULL DEFAULT ''" });
  if (!txColNames.has("exchange")) await client.execute({ sql: "ALTER TABLE transactions ADD COLUMN exchange TEXT NOT NULL DEFAULT ''" });
  if (!txColNames.has("isin")) await client.execute({ sql: "ALTER TABLE transactions ADD COLUMN isin TEXT NOT NULL DEFAULT ''" });
  if (!txColNames.has("asset_type")) await client.execute({ sql: "ALTER TABLE transactions ADD COLUMN asset_type TEXT NOT NULL DEFAULT 'stock'" });
  if (!txColNames.has("account_id")) await client.execute({ sql: "ALTER TABLE transactions ADD COLUMN account_id TEXT NOT NULL DEFAULT ''" });
  if (!txColNames.has("display_currency")) await client.execute({ sql: "ALTER TABLE transactions ADD COLUMN display_currency TEXT NOT NULL DEFAULT 'EUR'" });
  if (!txColNames.has("source_ref")) await client.execute({ sql: "ALTER TABLE transactions ADD COLUMN source_ref TEXT NOT NULL DEFAULT ''" });

  await client.execute({
    sql: `UPDATE transactions SET exchange = COALESCE((
            SELECT h.exchange FROM holdings h WHERE h.user_id = transactions.user_id
              AND UPPER(h.ticker) = UPPER(transactions.ticker) ORDER BY h.created_at DESC LIMIT 1
          ), exchange) WHERE exchange = ''`,
  });
  await client.execute({
    sql: `UPDATE transactions SET name = COALESCE((
            SELECT h.name FROM holdings h WHERE h.user_id = transactions.user_id
              AND UPPER(h.ticker) = UPPER(transactions.ticker) ORDER BY h.created_at DESC LIMIT 1
          ), name) WHERE name = ''`,
  });
  await client.execute({
    sql: `UPDATE transactions SET display_currency = COALESCE((
            SELECT h.display_currency FROM holdings h WHERE h.user_id = transactions.user_id
              AND UPPER(h.ticker) = UPPER(transactions.ticker) ORDER BY h.created_at DESC LIMIT 1
          ), display_currency) WHERE display_currency = ''`,
  });
  await client.execute({ sql: "UPDATE transactions SET display_currency = currency WHERE display_currency = '' OR display_currency IS NULL" });

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, event TEXT NOT NULL, metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON analytics_events(event);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
  `);

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS landing_events (
      id TEXT PRIMARY KEY, event TEXT NOT NULL, metadata TEXT, referrer TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_landing_events_event ON landing_events(event);
    CREATE INDEX IF NOT EXISTS idx_landing_events_created ON landing_events(created_at);
  `);

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      user_id TEXT NOT NULL, provider TEXT NOT NULL,
      call_count INTEGER NOT NULL DEFAULT 0, window_start TEXT NOT NULL,
      PRIMARY KEY(user_id, provider)
    );
  `);

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subject TEXT NOT NULL, message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'answered', 'closed')),
      admin_reply TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')),
      replied_at TEXT NOT NULL DEFAULT '',
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
  `);

  const userColsRL = await client.execute("PRAGMA table_info(users)");
  const userColNamesRL = new Set(userColsRL.rows.map((r) => str(r.name)));
  if (!userColNamesRL.has("ai_calls_today")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN ai_calls_today INTEGER NOT NULL DEFAULT 0" });
  }
  if (!userColNamesRL.has("ai_daily_reset_at")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN ai_daily_reset_at TEXT NOT NULL DEFAULT ''" });
  }
  await client.execute({ sql: "UPDATE users SET ai_daily_reset_at = datetime('now') WHERE ai_daily_reset_at = '' OR ai_daily_reset_at IS NULL" });

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS price_alerts (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, ticker TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '', condition TEXT NOT NULL CHECK(condition IN ('above', 'below')),
      threshold REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
      active INTEGER NOT NULL DEFAULT 1, triggered INTEGER NOT NULL DEFAULT 0,
      triggered_at TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);
    CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(active);
  `);

  const userColsEmail = await client.execute("PRAGMA table_info(users)");
  const userColNamesEmail = new Set(userColsEmail.rows.map((r) => str(r.name)));
  if (!userColNamesEmail.has("email_verified")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0" });
  }

  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS platform_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')`,
  });

  const keysResult = await client.execute(
    "SELECT user_id, alpha_vantage_api_key FROM user_settings WHERE alpha_vantage_api_key != ''"
  );
  for (const row of keysResult.rows) {
    const raw = str(row.alpha_vantage_api_key);
    const decrypted = tryDecryptOrPlaintext(raw);
    if (decrypted === raw && !raw.includes("=")) {
      await client.execute({
        sql: "UPDATE user_settings SET alpha_vantage_api_key = ? WHERE user_id = ?",
        args: [encrypt(raw), str(row.user_id)],
      });
    }
  }
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: "Bootstrap: full schema creation and legacy data migrations",
    up: bootstrapSchema,
  },
  {
    version: 2,
    description: "Remove restrictive language CHECK constraint from user_settings",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(user_settings)");
      const colNames = cols.rows.map((r) => str(r.name));
      if (!colNames.includes("language")) return;

      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS user_settings_new (
          user_id TEXT PRIMARY KEY,
          provider TEXT NOT NULL DEFAULT 'yahoo' CHECK(provider IN ('yahoo', 'alphavantage')),
          alpha_vantage_api_key TEXT NOT NULL DEFAULT '',
          language TEXT NOT NULL DEFAULT 'en',
          refresh_interval INTEGER NOT NULL DEFAULT 15,
          openai_api_key TEXT NOT NULL DEFAULT '',
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        INSERT OR IGNORE INTO user_settings_new
          SELECT user_id, provider, alpha_vantage_api_key, language, refresh_interval, openai_api_key
          FROM user_settings;
        DROP TABLE user_settings;
        ALTER TABLE user_settings_new RENAME TO user_settings;
      `);
    },
  },
  {
    version: 3,
    description: "Add exchange_rate_eur to transactions for historical FX accuracy",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(transactions)");
      const colNames = new Set(cols.rows.map((r) => str(r.name)));
      if (!colNames.has("exchange_rate_eur")) {
        await client.execute({ sql: "ALTER TABLE transactions ADD COLUMN exchange_rate_eur REAL" });
      }
    },
  },
  {
    version: 4,
    description: "Deduplicate existing source_refs and add unique partial index",
    up: async (client: Client) => {
      await client.execute({
        sql: `DELETE FROM transactions
              WHERE source_ref != ''
                AND id NOT IN (
                  SELECT MIN(id) FROM transactions
                  WHERE source_ref != ''
                  GROUP BY user_id, source_ref
                )`,
      });

      await client.execute({
        sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_user_source_ref
              ON transactions(user_id, source_ref)
              WHERE source_ref != ''`,
      });
    },
  },
  {
    version: 5,
    description: "Add auth_provider and google_id columns for OAuth support",
    up: async (client: Client) => {
      for (const stmt of [
        "ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'credentials'",
        "ALTER TABLE users ADD COLUMN google_id TEXT NOT NULL DEFAULT ''",
      ]) {
        try { await client.execute({ sql: stmt }); }
        catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("duplicate column")) throw e;
        }
      }

      await client.execute({
        sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
              ON users(email) WHERE email != ''`,
      });
      await client.execute({
        sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique
              ON users(google_id) WHERE google_id != ''`,
      });
    },
  },
  {
    version: 6,
    description: "Add portfolio_review_count and portfolio_review_reset_at columns",
    up: async (client: Client) => {
      for (const stmt of [
        "ALTER TABLE users ADD COLUMN portfolio_review_count INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN portfolio_review_reset_at TEXT NOT NULL DEFAULT ''",
      ]) {
        try { await client.execute({ sql: stmt }); }
        catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("duplicate column")) throw e;
        }
      }
    },
  },
  {
    version: 7,
    description: "Create ibkr_connections table for Flex Web Service API credentials",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS ibkr_connections (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token_encrypted TEXT NOT NULL,
          query_id TEXT NOT NULL,
          label TEXT NOT NULL DEFAULT '',
          last_synced_at TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_ibkr_connections_user ON ibkr_connections(user_id);
      `);
    },
  },
  {
    version: 8,
    description: "Add apple_id column for Apple OAuth support",
    up: async (client: Client) => {
      try {
        await client.execute({
          sql: "ALTER TABLE users ADD COLUMN apple_id TEXT NOT NULL DEFAULT ''",
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }

      await client.execute({
        sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apple_id_unique
              ON users(apple_id) WHERE apple_id != ''`,
      });
    },
  },
  {
    version: 9,
    description: "Add widget_token_hash column for PWA widget API auth",
    up: async (client: Client) => {
      try {
        await client.execute({
          sql: "ALTER TABLE users ADD COLUMN widget_token_hash TEXT NOT NULL DEFAULT ''",
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
    },
  },
];

export async function runMigrations(client: Client) {
  const currentVersion = await getCurrentVersion(client);

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;
    console.log(`Running migration v${migration.version}: ${migration.description}`);
    await migration.up(client);
    await markVersion(client, migration.version, migration.description);
  }
}
