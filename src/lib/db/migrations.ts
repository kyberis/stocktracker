import type { Client } from "@libsql/client";
import { randomUUID, randomBytes } from "crypto";
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
      ai_calls_reset_at TEXT NOT NULL DEFAULT (datetime('now')),
      utm_source TEXT NOT NULL DEFAULT '',
      utm_medium TEXT NOT NULL DEFAULT '',
      utm_campaign TEXT NOT NULL DEFAULT '',
      utm_term TEXT NOT NULL DEFAULT '',
      utm_content TEXT NOT NULL DEFAULT '',
      attribution_landing_path TEXT NOT NULL DEFAULT '',
      attribution_referrer TEXT NOT NULL DEFAULT '',
      attribution_captured_at TEXT NOT NULL DEFAULT ''
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

    CREATE TABLE IF NOT EXISTS portfolio_snapshots (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      total_value_eur REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS portfolio_shares (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_active INTEGER NOT NULL DEFAULT 1,
      show_values INTEGER NOT NULL DEFAULT 0,
      excluded_tickers TEXT,
      UNIQUE(user_id)
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
  if (!userCols.has("utm_source")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN utm_source TEXT NOT NULL DEFAULT ''" });
  }
  if (!userCols.has("utm_medium")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN utm_medium TEXT NOT NULL DEFAULT ''" });
  }
  if (!userCols.has("utm_campaign")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN utm_campaign TEXT NOT NULL DEFAULT ''" });
  }
  if (!userCols.has("utm_term")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN utm_term TEXT NOT NULL DEFAULT ''" });
  }
  if (!userCols.has("utm_content")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN utm_content TEXT NOT NULL DEFAULT ''" });
  }
  if (!userCols.has("attribution_landing_path")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN attribution_landing_path TEXT NOT NULL DEFAULT ''" });
  }
  if (!userCols.has("attribution_referrer")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN attribution_referrer TEXT NOT NULL DEFAULT ''" });
  }
  if (!userCols.has("attribution_captured_at")) {
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN attribution_captured_at TEXT NOT NULL DEFAULT ''" });
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

  const holdingColsTags = await client.execute("PRAGMA table_info(holdings)");
  const holdingColNamesTags = new Set(holdingColsTags.rows.map((r) => str(r.name)));
  if (!holdingColNamesTags.has("tags")) {
    await client.execute({ sql: "ALTER TABLE holdings ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'" });
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
  {
    version: 10,
    description: "Create passkeys table for WebAuthn passkey authentication",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS passkeys (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          credential_public_key TEXT NOT NULL,
          counter INTEGER NOT NULL DEFAULT 0,
          device_type TEXT NOT NULL DEFAULT '',
          backed_up INTEGER NOT NULL DEFAULT 0,
          transports TEXT NOT NULL DEFAULT '[]',
          name TEXT NOT NULL DEFAULT 'Passkey',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_used_at TEXT NOT NULL DEFAULT '',
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_passkeys_user ON passkeys(user_id);
      `);
    },
  },
  {
    version: 11,
    description: "Add device_passkey_hash column for T4-S3 device auth",
    up: async (client: Client) => {
      try {
        await client.execute({
          sql: "ALTER TABLE users ADD COLUMN device_passkey_hash TEXT NOT NULL DEFAULT ''",
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
    },
  },
  {
    version: 12,
    description: "Add device_template_id column for T4-S3 display themes",
    up: async (client: Client) => {
      try {
        await client.execute({
          sql: "ALTER TABLE users ADD COLUMN device_template_id TEXT NOT NULL DEFAULT 'classic-dark'",
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
    },
  },
  {
    version: 13,
    description: "Add device_linked_at to track when a physical device first connects",
    up: async (client: Client) => {
      try {
        await client.execute({
          sql: "ALTER TABLE users ADD COLUMN device_linked_at TEXT NOT NULL DEFAULT ''",
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
    },
  },
  {
    version: 14,
    description: "Add device_pro_redeemed_at to prevent duplicate device free-year grants",
    up: async (client: Client) => {
      try {
        await client.execute({
          sql: "ALTER TABLE users ADD COLUMN device_pro_redeemed_at TEXT NOT NULL DEFAULT ''",
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
    },
  },
  {
    version: 15,
    description: "Create device_interest table for hardware waitlist",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS device_interest (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(email)
        )
      `);
    },
  },
  // NOTE: Original v13 for portfolio_snapshots/portfolio_shares was placed here
  // (after v14/v15 in the array) with a duplicate version number, so it never ran.
  // Fixed by v19 (portfolio_shares) and v20 (portfolio_snapshots).
  {
    version: 16,
    description: "Allow 'starter' plan value in users table CHECK constraint",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(users)");
      const colDefs = cols.rows.map((r) => ({
        name: str(r.name),
        type: str(r.type),
        notnull: Number(r.notnull),
        dflt: r.dflt_value,
        pk: Number(r.pk),
      }));

      const planCol = colDefs.find((c) => c.name === "plan");
      if (!planCol) return;

      const columnDefs = colDefs
        .map((c) => {
          let def = `${c.name} ${c.type}`;
          if (c.pk) def += " PRIMARY KEY";
          if (c.notnull && !c.pk) def += " NOT NULL";
          if (c.dflt != null) {
            const d = String(c.dflt);
            if (d.startsWith("(") || d.startsWith("'") || /^-?\d/.test(d)) {
              def += ` DEFAULT ${d}`;
            } else if (/\(/.test(d)) {
              def += ` DEFAULT (${d})`;
            } else {
              def += ` DEFAULT '${d}'`;
            }
          }
          if (c.name === "plan") def += " CHECK(plan IN ('free', 'pro'))";
          if (c.name === "role") def += " CHECK(role IN ('admin', 'user'))";
          return def;
        })
        .join(", ");

      const colNames = colDefs.map((c) => c.name).join(", ");

      await client.executeMultiple(`
        CREATE TABLE users_new (${columnDefs});
        INSERT INTO users_new (${colNames}) SELECT ${colNames} FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email != '';
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id != '';
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apple_id_unique ON users(apple_id) WHERE apple_id != '';
      `);
    },
  },
  {
    version: 17,
    description: "Create snaptrade_connections table for SnapTrade brokerage aggregator",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS snaptrade_connections (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          snaptrade_user_id TEXT NOT NULL,
          user_secret_encrypted TEXT NOT NULL,
          label TEXT NOT NULL DEFAULT '',
          last_synced_at TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_snaptrade_connections_user ON snaptrade_connections(user_id);
      `);
    },
  },
  {
    version: 18,
    description: "Fix SnapTrade MIC-suffixed tickers to Yahoo Finance format",
    up: async (client: Client) => {
      const micToYahoo: Record<string, string> = {
        XGAT: ".DE", XETR: ".DE", XFRA: ".F",
        XLON: ".L",  XAMS: ".AS", XBRU: ".BR", XPAR: ".PA",
        XMAD: ".MC", XMIL: ".MI", XLIS: ".LS",
        XCSE: ".CO", XHEL: ".HE", XSTO: ".ST", XOSL: ".OL", XICE: ".IC",
        XSWX: ".SW", XWBO: ".VI",
        XTSE: ".TO", XTSX: ".TO", XASX: ".AX",
        XHKG: ".HK", XSES: ".SI", XTKS: ".T",
        XNAS: "",    XNYS: "",    XASE: "",    BATS: "",    ARCX: "",
      };

      for (const [mic, suffix] of Object.entries(micToYahoo)) {
        const pattern = `%.${mic}`;
        for (const table of ["holdings", "transactions"] as const) {
          if (suffix) {
            await client.execute({
              sql: `UPDATE ${table} SET ticker = SUBSTR(ticker, 1, LENGTH(ticker) - ${mic.length + 1}) || ? WHERE ticker LIKE ?`,
              args: [suffix, pattern],
            });
          } else {
            await client.execute({
              sql: `UPDATE ${table} SET ticker = SUBSTR(ticker, 1, LENGTH(ticker) - ${mic.length + 1}) WHERE ticker LIKE ?`,
              args: [pattern],
            });
          }
        }
      }

      // Fix space-separated share classes imported as-is: "NOVO B" → "NOVO-B"
      for (const table of ["holdings", "transactions"] as const) {
        await client.execute({
          sql: `UPDATE ${table} SET ticker = REPLACE(ticker, ' ', '-') WHERE ticker LIKE '% %'`,
        });
      }

      // Fix BRK.B → BRK-B (US dot-separated share classes)
      await client.execute({ sql: "UPDATE holdings SET ticker = 'BRK-B' WHERE ticker = 'BRK.B'" });
      await client.execute({ sql: "UPDATE transactions SET ticker = 'BRK-B' WHERE ticker = 'BRK.B'" });
      await client.execute({ sql: "UPDATE holdings SET ticker = 'BRK-A' WHERE ticker = 'BRK.A'" });
      await client.execute({ sql: "UPDATE transactions SET ticker = 'BRK-A' WHERE ticker = 'BRK.A'" });
    },
  },
  {
    version: 19,
    description: "Ensure portfolio_shares table exists (v13 fix — missing semicolon)",
    up: async (client: Client) => {
      await client.execute({
        sql: `CREATE TABLE IF NOT EXISTS portfolio_shares (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          is_active INTEGER NOT NULL DEFAULT 1,
          show_values INTEGER NOT NULL DEFAULT 0,
          excluded_tickers TEXT,
          UNIQUE(user_id)
        )`,
      });
    },
  },
  {
    version: 20,
    description: "Create portfolios table and add portfolio_id to data tables for multi-portfolio support",
    up: async (client: Client) => {
      // 1. Create portfolios table
      await client.execute({
        sql: `CREATE TABLE IF NOT EXISTS portfolios (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT 'My Portfolio',
        is_default INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, name)
      )`,
      });
      await client.execute({
        sql: "CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id)",
      });

      // 2. Create a default portfolio for every existing user
      const users = await client.execute("SELECT id FROM users");
      for (const row of users.rows) {
        const userId = str(row.id);
        const existing = await client.execute({
          sql: "SELECT id FROM portfolios WHERE user_id = ? AND is_default = 1",
          args: [userId],
        });
        if (existing.rows.length === 0) {
          const { randomUUID } = await import("crypto");
          const portfolioId = randomUUID();
          await client.execute({
            sql: "INSERT INTO portfolios (id, user_id, name, is_default, sort_order) VALUES (?, ?, 'My Portfolio', 1, 0)",
            args: [portfolioId, userId],
          });
        }
      }

      // 3a. Ensure portfolio_snapshots exists (original v13 entry was a duplicate and never ran)
      await client.execute({
        sql: `CREATE TABLE IF NOT EXISTS portfolio_snapshots (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          total_value_eur REAL NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(user_id, date)
        )`,
      });

      // 3b. Add portfolio_id column to data tables
      for (const table of ["holdings", "transactions", "cash_entries", "portfolio_snapshots", "portfolio_shares"]) {
        try {
          await client.execute({ sql: `ALTER TABLE ${table} ADD COLUMN portfolio_id TEXT NOT NULL DEFAULT ''` });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("duplicate column")) throw e;
        }
      }

      // 4. Backfill portfolio_id for all existing rows
      for (const table of ["holdings", "transactions", "cash_entries", "portfolio_snapshots", "portfolio_shares"]) {
        await client.execute({
          sql: `UPDATE ${table} SET portfolio_id = (
          SELECT p.id FROM portfolios p WHERE p.user_id = ${table}.user_id AND p.is_default = 1
        ) WHERE portfolio_id = ''`,
        });
      }

      // 5. Add device_portfolio_id to users table
      try {
        await client.execute({ sql: "ALTER TABLE users ADD COLUMN device_portfolio_id TEXT NOT NULL DEFAULT ''" });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
    },
  },
  {
    version: 21,
    description: "Ensure portfolio_snapshots table exists (v13 ordering fix)",
    up: async (client: Client) => {
      await client.execute({
        sql: `CREATE TABLE IF NOT EXISTS portfolio_snapshots (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          total_value_eur REAL NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(user_id, date)
        )`,
      });

      // Also ensure portfolio_id column exists on the table
      try {
        await client.execute({
          sql: "ALTER TABLE portfolio_snapshots ADD COLUMN portfolio_id TEXT NOT NULL DEFAULT ''",
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }

      // Backfill portfolio_id if any rows have it empty
      await client.execute({
        sql: `UPDATE portfolio_snapshots SET portfolio_id = (
          SELECT p.id FROM portfolios p WHERE p.user_id = portfolio_snapshots.user_id AND p.is_default = 1
        ) WHERE portfolio_id = ''`,
      });
    },
  },
  {
    version: 22,
    description: "Backfill empty portfolio_id rows to default portfolio (post-import fix)",
    up: async (client: Client) => {
      for (const table of ["holdings", "transactions", "cash_entries", "portfolio_snapshots", "portfolio_shares"]) {
        try {
          await client.execute({
            sql: `UPDATE ${table} SET portfolio_id = (
              SELECT p.id FROM portfolios p WHERE p.user_id = ${table}.user_id AND p.is_default = 1
            ) WHERE portfolio_id = '' OR portfolio_id IS NULL`,
          });
        } catch { /* table may not exist yet */ }
      }
    },
  },
  {
    version: 23,
    description: "Multi-channel percentage-based price alerts: extend price_alerts, add notification prefs, push subscriptions, device notifications",
    up: async (client: Client) => {
      const alertCols = await client.execute("PRAGMA table_info(price_alerts)");
      const alertColNames = new Set(alertCols.rows.map((r) => str(r.name)));
      for (const [col, def] of [
        ["alert_type", "ALTER TABLE price_alerts ADD COLUMN alert_type TEXT NOT NULL DEFAULT 'threshold'"],
        ["percent_basis", "ALTER TABLE price_alerts ADD COLUMN percent_basis TEXT NOT NULL DEFAULT ''"],
        ["percent_value", "ALTER TABLE price_alerts ADD COLUMN percent_value REAL NOT NULL DEFAULT 0"],
        ["is_portfolio_wide", "ALTER TABLE price_alerts ADD COLUMN is_portfolio_wide INTEGER NOT NULL DEFAULT 0"],
        ["portfolio_id", "ALTER TABLE price_alerts ADD COLUMN portfolio_id TEXT NOT NULL DEFAULT ''"],
        ["last_notified_ticker", "ALTER TABLE price_alerts ADD COLUMN last_notified_ticker TEXT NOT NULL DEFAULT ''"],
        ["last_notified_at", "ALTER TABLE price_alerts ADD COLUMN last_notified_at TEXT NOT NULL DEFAULT ''"],
      ] as const) {
        if (!alertColNames.has(col)) {
          await client.execute({ sql: def });
        }
      }

      const settingsCols = await client.execute("PRAGMA table_info(user_settings)");
      const settingsColNames = new Set(settingsCols.rows.map((r) => str(r.name)));
      for (const [col, def] of [
        ["alert_channels", "ALTER TABLE user_settings ADD COLUMN alert_channels TEXT NOT NULL DEFAULT 'email'"],
        ["whatsapp_phone", "ALTER TABLE user_settings ADD COLUMN whatsapp_phone TEXT NOT NULL DEFAULT ''"],
        ["whatsapp_verified", "ALTER TABLE user_settings ADD COLUMN whatsapp_verified INTEGER NOT NULL DEFAULT 0"],
        ["alert_device_enabled", "ALTER TABLE user_settings ADD COLUMN alert_device_enabled INTEGER NOT NULL DEFAULT 0"],
      ] as const) {
        if (!settingsColNames.has(col)) {
          await client.execute({ sql: def });
        }
      }

      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          user_agent TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

        CREATE TABLE IF NOT EXISTS device_notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          ticker TEXT NOT NULL DEFAULT '',
          read INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_device_notif_user ON device_notifications(user_id, read);
      `);
    },
  },
  {
    version: 24,
    description: "WhatsApp message rate-limit counters on user_settings",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(user_settings)");
      const existing = new Set(cols.rows.map((r) => str(r.name)));
      for (const [col, def] of [
        ["wa_msgs_today", "ALTER TABLE user_settings ADD COLUMN wa_msgs_today INTEGER NOT NULL DEFAULT 0"],
        ["wa_daily_reset_at", "ALTER TABLE user_settings ADD COLUMN wa_daily_reset_at TEXT NOT NULL DEFAULT ''"],
        ["wa_msgs_month", "ALTER TABLE user_settings ADD COLUMN wa_msgs_month INTEGER NOT NULL DEFAULT 0"],
        ["wa_monthly_reset_at", "ALTER TABLE user_settings ADD COLUMN wa_monthly_reset_at TEXT NOT NULL DEFAULT ''"],
      ] as const) {
        if (!existing.has(col)) {
          await client.execute({ sql: def });
        }
      }
    },
  },
  {
    version: 25,
    description: "Per-broker sync tracking for incremental SnapTrade imports",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS snaptrade_broker_syncs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          brokerage_authorization_id TEXT NOT NULL,
          brokerage_name TEXT NOT NULL DEFAULT '',
          last_imported_at TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_snaptrade_broker_syncs_user_broker
          ON snaptrade_broker_syncs(user_id, brokerage_authorization_id);
      `);
    },
  },
  {
    version: 26,
    description: "Add pending_delete_at to snaptrade_connections for deferred cleanup on downgrade",
    up: async (client: Client) => {
      await client.execute(
        `ALTER TABLE snaptrade_connections ADD COLUMN pending_delete_at TEXT NOT NULL DEFAULT ''`
      );
    },
  },
  {
    version: 27,
    description: "Add currency column to portfolios for per-portfolio base currency (EUR or USD)",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(portfolios)");
      const colNames = new Set(cols.rows.map((r) => str(r.name)));
      if (!colNames.has("currency")) {
        await client.execute(
          `ALTER TABLE portfolios ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR'`
        );
      }
    },
  },
  {
    version: 28,
    description: "Widen cash_entries unique constraint to include portfolio_id",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS cash_entries_new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          amount_eur REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          portfolio_id TEXT NOT NULL DEFAULT '',
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user_id, name, portfolio_id)
        );
        INSERT OR IGNORE INTO cash_entries_new (id, user_id, name, amount_eur, created_at, updated_at, portfolio_id)
          SELECT id, user_id, name, amount_eur, created_at, updated_at, COALESCE(portfolio_id, '') FROM cash_entries;
        DROP TABLE cash_entries;
        ALTER TABLE cash_entries_new RENAME TO cash_entries;
      `);
    },
  },
  {
    version: 29,
    description: "Add type and user_context columns to feedback table",
    up: async (client: Client) => {
      for (const [col, sql] of [
        ["type", `ALTER TABLE feedback ADD COLUMN type TEXT NOT NULL DEFAULT 'feedback'`],
        ["user_context", `ALTER TABLE feedback ADD COLUMN user_context TEXT NOT NULL DEFAULT ''`],
      ] as const) {
        try {
          const cols = await client.execute("PRAGMA table_info(feedback)");
          const colNames = new Set(cols.rows.map((r) => str(r.name)));
          if (!colNames.has(col)) await client.execute(sql);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("duplicate column")) throw e;
        }
      }
    },
  },
  {
    version: 30,
    description: "Add needs_attention flag to snaptrade_connections for surfacing credential issues",
    up: async (client: Client) => {
      try {
        const cols = await client.execute("PRAGMA table_info(snaptrade_connections)");
        const colNames = new Set(cols.rows.map((r) => str(r.name)));
        if (!colNames.has("needs_attention")) {
          await client.execute(
            `ALTER TABLE snaptrade_connections ADD COLUMN needs_attention INTEGER NOT NULL DEFAULT 0`
          );
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
    },
  },
  {
    version: 31,
    description: "Create calendar_events table for earnings, economic, and IPO event calendar",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS calendar_events (
          id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          symbol TEXT,
          name TEXT NOT NULL,
          event_date TEXT NOT NULL,
          event_time TEXT,
          details TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_calendar_events_type_date ON calendar_events(event_type, event_date);
        CREATE INDEX IF NOT EXISTS idx_calendar_events_symbol ON calendar_events(symbol);
      `);
    },
  },
  {
    version: 32,
    description: "Add all_disabled_since to snaptrade_connections, last_active_at to users, create cron_executions table",
    up: async (client: Client) => {
      try {
        await client.execute({ sql: "ALTER TABLE snaptrade_connections ADD COLUMN all_disabled_since TEXT NOT NULL DEFAULT ''", args: [] });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
      try {
        await client.execute({ sql: "ALTER TABLE users ADD COLUMN last_active_at TEXT NOT NULL DEFAULT ''", args: [] });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS cron_executions (
          id TEXT PRIMARY KEY,
          job_name TEXT NOT NULL,
          started_at TEXT NOT NULL DEFAULT (datetime('now')),
          finished_at TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'running',
          result TEXT NOT NULL DEFAULT '',
          error_message TEXT NOT NULL DEFAULT '',
          duration_ms INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_cron_executions_job ON cron_executions(job_name, started_at);
      `);
    },
  },
  {
    version: 33,
    description: "Add dashboard_theme column to user_settings for layout theme selection",
    up: async (client: Client) => {
      try {
        await client.execute({
          sql: "ALTER TABLE user_settings ADD COLUMN dashboard_theme TEXT NOT NULL DEFAULT 'default'",
          args: [],
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
    },
  },
  {
    version: 34,
    description: "Add default_currency column to user_settings for multi-currency support",
    up: async (client: Client) => {
      try {
        await client.execute({
          sql: "ALTER TABLE user_settings ADD COLUMN default_currency TEXT NOT NULL DEFAULT 'EUR'",
          args: [],
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
    },
  },
  {
    version: 35,
    description: "Add type, display_currency, display_amount, notes, valuation_date to cash_entries for net worth tracking",
    up: async (client: Client) => {
      for (const ddl of [
        "ALTER TABLE cash_entries ADD COLUMN type TEXT NOT NULL DEFAULT 'cash'",
        "ALTER TABLE cash_entries ADD COLUMN display_currency TEXT NOT NULL DEFAULT 'EUR'",
        "ALTER TABLE cash_entries ADD COLUMN display_amount REAL NOT NULL DEFAULT 0",
        "ALTER TABLE cash_entries ADD COLUMN notes TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE cash_entries ADD COLUMN valuation_date TEXT NOT NULL DEFAULT ''",
      ]) {
        try {
          await client.execute({ sql: ddl });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("duplicate column")) throw e;
        }
      }
      await client.execute({
        sql: "UPDATE cash_entries SET display_currency = 'EUR', display_amount = amount_eur WHERE type = 'cash' AND display_amount = 0",
      });
    },
  },
  {
    version: 36,
    description: "Add transaction_count to snaptrade_broker_syncs, broker_name to transactions",
    up: async (client: Client) => {
      for (const ddl of [
        "ALTER TABLE snaptrade_broker_syncs ADD COLUMN transaction_count INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE transactions ADD COLUMN broker_name TEXT NOT NULL DEFAULT ''",
      ]) {
        try {
          await client.execute({ sql: ddl });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("duplicate column")) throw e;
        }
      }
    },
  },
  {
    version: 37,
    description: "Add tax_residency column to users for future tax support",
    up: async (client: Client) => {
      try {
        await client.execute({
          sql: "ALTER TABLE users ADD COLUMN tax_residency TEXT NOT NULL DEFAULT ''",
          args: [],
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
    },
  },
  {
    version: 38,
    description: "Add onboarding_completed column to users",
    up: async (client: Client) => {
      try {
        await client.execute({
          sql: "ALTER TABLE users ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0",
          args: [],
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
      await client.execute({
        sql: "UPDATE users SET onboarding_completed = 1 WHERE email_verified = 1",
      });
    },
  },
  {
    version: 39,
    description: "Create screener_cache table for stock screener feature",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS screener_cache (
          symbol TEXT PRIMARY KEY,
          short_name TEXT,
          sector TEXT,
          industry TEXT,
          country TEXT,
          exchange TEXT,
          currency TEXT,
          market_cap REAL,
          pe_ratio REAL,
          forward_pe REAL,
          dividend_yield REAL,
          dividend_per_share REAL,
          eps REAL,
          beta REAL,
          profit_margin REAL,
          return_on_equity REAL,
          fifty_two_week_high REAL,
          fifty_two_week_low REAL,
          regular_market_price REAL,
          regular_market_change_percent REAL,
          analyst_strong_buy INTEGER,
          analyst_buy INTEGER,
          analyst_hold INTEGER,
          analyst_sell INTEGER,
          analyst_strong_sell INTEGER,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_screener_cache_sector ON screener_cache(sector);
        CREATE INDEX IF NOT EXISTS idx_screener_cache_dividend_yield ON screener_cache(dividend_yield);
        CREATE INDEX IF NOT EXISTS idx_screener_cache_pe_ratio ON screener_cache(pe_ratio);
        CREATE INDEX IF NOT EXISTS idx_screener_cache_market_cap ON screener_cache(market_cap);
      `);
    },
  },
  {
    version: 40,
    description: "Create notifications table for in-app notification platform",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'info',
          title TEXT NOT NULL,
          title_es TEXT NOT NULL DEFAULT '',
          message TEXT NOT NULL,
          message_es TEXT NOT NULL DEFAULT '',
          link TEXT NOT NULL DEFAULT '',
          link_label TEXT NOT NULL DEFAULT '',
          link_label_es TEXT NOT NULL DEFAULT '',
          read INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at);
      `);
    },
  },
  {
    version: 41,
    description: "Create goals table for persistent portfolio goal tracking",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS goals (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          portfolio_id TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL DEFAULT 'My Goal',
          target_amount REAL NOT NULL,
          currency TEXT NOT NULL DEFAULT 'EUR',
          growth_rate REAL NOT NULL DEFAULT 7,
          yearly_contribution REAL NOT NULL DEFAULT 0,
          contribution_mode TEXT NOT NULL DEFAULT 'monthly',
          reinvest_dividends INTEGER NOT NULL DEFAULT 1,
          horizon INTEGER NOT NULL DEFAULT 20,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
      `);
    },
  },
  {
    version: 42,
    description: "Create support_chat_conversations table",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS support_chat_conversations (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          messages TEXT NOT NULL DEFAULT '[]',
          status TEXT NOT NULL DEFAULT 'active'
            CHECK(status IN ('active', 'resolved', 'escalated')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_support_chat_user ON support_chat_conversations(user_id);
        CREATE INDEX IF NOT EXISTS idx_support_chat_status ON support_chat_conversations(status);
        CREATE INDEX IF NOT EXISTS idx_support_chat_created ON support_chat_conversations(created_at);
      `);
    },
  },
  {
    version: 43,
    description: "Expand goals table for multi-goal and financial planning",
    up: async (client: Client) => {
      await client.execute({ sql: "ALTER TABLE goals ADD COLUMN goal_type TEXT NOT NULL DEFAULT 'custom'", args: [] });
      await client.execute({ sql: "ALTER TABLE goals ADD COLUMN target_date TEXT", args: [] });
      await client.execute({ sql: "ALTER TABLE goals ADD COLUMN priority INTEGER NOT NULL DEFAULT 0", args: [] });
      await client.execute({ sql: "ALTER TABLE goals ADD COLUMN milestones TEXT NOT NULL DEFAULT '[]'", args: [] });
      await client.execute({ sql: "ALTER TABLE goals ADD COLUMN monthly_contribution REAL NOT NULL DEFAULT 0", args: [] });
      await client.execute({ sql: "ALTER TABLE goals ADD COLUMN notes TEXT NOT NULL DEFAULT ''", args: [] });
      await client.execute({ sql: "ALTER TABLE goals ADD COLUMN icon TEXT NOT NULL DEFAULT ''", args: [] });
      await client.execute({ sql: "ALTER TABLE goals ADD COLUMN color TEXT NOT NULL DEFAULT ''", args: [] });
    },
  },
  {
    version: 44,
    description: "Add source column to cash_entries and widen unique constraint to include it",
    up: async (client: Client) => {
      try {
        await client.execute({ sql: "ALTER TABLE cash_entries ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'", args: [] });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }

      // Backfill source from name patterns
      await client.execute({
        sql: "UPDATE cash_entries SET source = 'snaptrade' WHERE source = 'manual' AND UPPER(name) LIKE 'CASH %'",
      });
      await client.execute({
        sql: "UPDATE cash_entries SET source = 'degiro' WHERE source = 'manual' AND UPPER(name) LIKE 'DEGIRO%'",
      });
      await client.execute({
        sql: "UPDATE cash_entries SET source = 'interactive_brokers' WHERE source = 'manual' AND UPPER(name) LIKE 'INTERACTIVE BROKERS%'",
      });
      await client.execute({
        sql: "UPDATE cash_entries SET source = 'trading_212' WHERE source = 'manual' AND UPPER(name) LIKE 'TRADING 212%'",
      });
      await client.execute({
        sql: "UPDATE cash_entries SET source = 'revolut' WHERE source = 'manual' AND UPPER(name) LIKE 'REVOLUT%'",
      });

      // Rebuild table to widen unique constraint: (user_id, name, portfolio_id, source)
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS cash_entries_v2 (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          amount_eur REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          portfolio_id TEXT NOT NULL DEFAULT '',
          type TEXT NOT NULL DEFAULT 'cash',
          display_currency TEXT NOT NULL DEFAULT 'EUR',
          display_amount REAL NOT NULL DEFAULT 0,
          notes TEXT NOT NULL DEFAULT '',
          valuation_date TEXT NOT NULL DEFAULT '',
          source TEXT NOT NULL DEFAULT 'manual',
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user_id, name, portfolio_id, source)
        );
        INSERT OR IGNORE INTO cash_entries_v2
          (id, user_id, name, amount_eur, created_at, updated_at, portfolio_id,
           type, display_currency, display_amount, notes, valuation_date, source)
          SELECT id, user_id, name, amount_eur, created_at, updated_at, portfolio_id,
                 type, display_currency, display_amount, notes, valuation_date, source
          FROM cash_entries;
        DROP TABLE cash_entries;
        ALTER TABLE cash_entries_v2 RENAME TO cash_entries;
      `);
    },
  },
  {
    version: 45,
    description: "Create snaptrade_api_logs table for admin response inspection",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS snaptrade_api_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL DEFAULT '',
          action TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'success',
          request_summary TEXT NOT NULL DEFAULT '',
          response_body TEXT NOT NULL DEFAULT '{}',
          error_message TEXT NOT NULL DEFAULT '',
          duration_ms INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_snaptrade_api_logs_user ON snaptrade_api_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_snaptrade_api_logs_created ON snaptrade_api_logs(created_at);
      `);
    },
  },
  {
    version: 46,
    description: "Create scheduled_x_posts table for automated X/Twitter posting",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS scheduled_x_posts (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          image_url TEXT NOT NULL DEFAULT '',
          hashtags TEXT NOT NULL DEFAULT '',
          scheduled_at TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          posted_at TEXT NOT NULL DEFAULT '',
          x_post_id TEXT NOT NULL DEFAULT '',
          error_message TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_scheduled_x_posts_status ON scheduled_x_posts(status);
        CREATE INDEX IF NOT EXISTS idx_scheduled_x_posts_scheduled ON scheduled_x_posts(scheduled_at);
      `);
    },
  },
  {
    version: 47,
    description: "Add source column to holdings for position-synced vs transaction-derived distinction",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(holdings)");
      const colNames = new Set(cols.rows.map((r) => str(r.name)));
      if (!colNames.has("source")) {
        await client.execute({
          sql: "ALTER TABLE holdings ADD COLUMN source TEXT NOT NULL DEFAULT 'transaction'",
          args: [],
        });
      }
    },
  },
  {
    version: 48,
    description: "Ensure scheduled_x_posts table exists (re-apply skipped migration 46)",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS scheduled_x_posts (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          image_url TEXT NOT NULL DEFAULT '',
          hashtags TEXT NOT NULL DEFAULT '',
          scheduled_at TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          posted_at TEXT NOT NULL DEFAULT '',
          x_post_id TEXT NOT NULL DEFAULT '',
          error_message TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_scheduled_x_posts_status ON scheduled_x_posts(status);
        CREATE INDEX IF NOT EXISTS idx_scheduled_x_posts_scheduled ON scheduled_x_posts(scheduled_at);
      `);
    },
  },
  {
    version: 49,
    description: "Add experience_level to users table",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(users)");
      const colNames = new Set(cols.rows.map((r) => str(r.name)));
      if (!colNames.has("experience_level")) {
        await client.execute({
          sql: "ALTER TABLE users ADD COLUMN experience_level TEXT NOT NULL DEFAULT ''",
          args: [],
        });
      }
    },
  },
  {
    version: 50,
    description: "Create email_templates and email_sends tables",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS email_templates (
          id TEXT PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          subject TEXT NOT NULL,
          subject_es TEXT NOT NULL DEFAULT '',
          body_html TEXT NOT NULL,
          body_html_es TEXT NOT NULL DEFAULT '',
          body_text TEXT NOT NULL DEFAULT '',
          body_text_es TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL DEFAULT 'general',
          experience_level TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS email_sends (
          id TEXT PRIMARY KEY,
          resend_id TEXT NOT NULL DEFAULT '',
          template_id TEXT NOT NULL DEFAULT '',
          user_id TEXT NOT NULL,
          email_to TEXT NOT NULL DEFAULT '',
          subject TEXT NOT NULL,
          body_html TEXT NOT NULL,
          body_text TEXT NOT NULL DEFAULT '',
          sent_at TEXT NOT NULL DEFAULT (datetime('now')),
          status TEXT NOT NULL DEFAULT 'sent',
          delivered_at TEXT NOT NULL DEFAULT '',
          opened_at TEXT NOT NULL DEFAULT '',
          open_count INTEGER NOT NULL DEFAULT 0,
          clicked_at TEXT NOT NULL DEFAULT '',
          bounced_at TEXT NOT NULL DEFAULT '',
          failed_at TEXT NOT NULL DEFAULT '',
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_email_sends_resend_id ON email_sends(resend_id);
        CREATE INDEX IF NOT EXISTS idx_email_sends_user_id ON email_sends(user_id);
      `);
    },
  },
  {
    version: 51,
    description: "Add email_notifications_enabled to user_settings",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(user_settings)");
      const colNames = new Set(cols.rows.map((r) => str(r.name)));
      if (!colNames.has("email_notifications_enabled")) {
        await client.execute({
          sql: "ALTER TABLE user_settings ADD COLUMN email_notifications_enabled INTEGER NOT NULL DEFAULT 1",
          args: [],
        });
      }
    },
  },
  {
    version: 53,
    description: "Add snaptrade_broker_portfolio_map for multi-portfolio sync",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS snaptrade_broker_portfolio_map (
          user_id TEXT NOT NULL,
          brokerage_authorization_id TEXT NOT NULL,
          portfolio_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (user_id, brokerage_authorization_id, portfolio_id),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
        );
      `);
    },
  },
  {
    version: 54,
    description: "Add transaction_portfolio_map for multi-portfolio transaction mapping",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS transaction_portfolio_map (
          transaction_id TEXT NOT NULL,
          portfolio_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (transaction_id, portfolio_id),
          FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
          FOREIGN KEY(portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_tx_portfolio_map_user_portfolio
          ON transaction_portfolio_map(user_id, portfolio_id);
      `);
    },
  },
  {
    version: 55,
    description: "Seed email templates",
    up: async (client: Client) => {
      const { EMAIL_TEMPLATE_SEEDS } = await import("./email-template-seeds");
      const existing = await client.execute("SELECT COUNT(*) as cnt FROM email_templates");
      if (Number(existing.rows[0]?.cnt) > 0) return;

      for (const t of EMAIL_TEMPLATE_SEEDS) {
        await client.execute({
          sql: `INSERT INTO email_templates (id, slug, name, subject, subject_es, body_html, body_html_es, body_text, body_text_es, category, experience_level)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            randomUUID(), t.slug, t.name, t.subject, t.subjectEs,
            t.bodyHtml, t.bodyHtmlEs, t.bodyText, t.bodyTextEs,
            t.category, t.experienceLevel,
          ],
        });
      }
    },
  },
  {
    version: 56,
    description: "Add figi_share_class to holdings for stable security identity across ticker renames",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(holdings)");
      const colNames = new Set(cols.rows.map((r) => str(r.name)));
      if (!colNames.has("figi_share_class")) {
        await client.execute({
          sql: "ALTER TABLE holdings ADD COLUMN figi_share_class TEXT NOT NULL DEFAULT ''",
        });
      }
    },
  },
  {
    version: 57,
    description: "Add first-touch attribution columns to users",
    up: async (client: Client) => {
      const statements = [
        "ALTER TABLE users ADD COLUMN utm_source TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE users ADD COLUMN utm_medium TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE users ADD COLUMN utm_campaign TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE users ADD COLUMN utm_term TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE users ADD COLUMN utm_content TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE users ADD COLUMN attribution_landing_path TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE users ADD COLUMN attribution_referrer TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE users ADD COLUMN attribution_captured_at TEXT NOT NULL DEFAULT ''",
      ] as const;
      for (const sql of statements) {
        try {
          await client.execute({ sql });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("duplicate column")) throw e;
        }
      }
    },
  },
  {
    version: 58,
    description: "Create broker integration requests table and seed confirmation email template",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS broker_integration_requests (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          broker_name TEXT NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'requested'
            CHECK(status IN ('requested', 'reviewing', 'planned', 'done', 'rejected')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_broker_integration_requests_user
          ON broker_integration_requests(user_id);
        CREATE INDEX IF NOT EXISTS idx_broker_integration_requests_created
          ON broker_integration_requests(created_at);
      `);

      const slug = "broker-integration-request-received";
      const existing = await client.execute({
        sql: "SELECT id FROM email_templates WHERE slug = ? LIMIT 1",
        args: [slug],
      });
      if (existing.rows.length > 0) return;

      await client.execute({
        sql: `INSERT INTO email_templates
              (id, slug, name, subject, subject_es, body_html, body_html_es, body_text, body_text_es, category, experience_level)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          randomUUID(),
          slug,
          "Broker Integration Request Received",
          "We received your broker integration request",
          "Recibimos tu solicitud de integración de bróker",
          `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="padding:28px 28px 8px;">
          <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">Thanks, {{display_name}}</h1>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">
            We received your request to add <strong>{{broker_name}}</strong> to trefolio.
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;">
            Our team reviews broker requests regularly based on demand, data quality, and integration feasibility.
          </p>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;">
            Request ID: <strong>{{request_id}}</strong>
          </p>
          <a href="{{base_url}}/import" style="display:inline-block;padding:10px 16px;background:#10b981;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">Open Import Center</a>
        </td></tr>
        <tr><td style="padding:18px 28px 26px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;">
            You received this email from trefolio. <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
          `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="padding:28px 28px 8px;">
          <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">Gracias, {{display_name}}</h1>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">
            Recibimos tu solicitud para agregar <strong>{{broker_name}}</strong> a trefolio.
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;">
            Nuestro equipo revisa estas solicitudes regularmente según demanda, calidad de datos y viabilidad técnica.
          </p>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;">
            ID de solicitud: <strong>{{request_id}}</strong>
          </p>
          <a href="{{base_url}}/import" style="display:inline-block;padding:10px 16px;background:#10b981;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">Abrir Centro de Importación</a>
        </td></tr>
        <tr><td style="padding:18px 28px 26px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;">
            Recibiste este email de trefolio. <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Cancelar suscripción</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
          `Hi {{display_name}},

We received your request to add {{broker_name}} to trefolio.
Our team will evaluate it based on demand, data quality, and integration feasibility.

Request ID: {{request_id}}

Open Import Center: {{base_url}}/import`,
          `Hola {{display_name}},

Recibimos tu solicitud para agregar {{broker_name}} a trefolio.
Nuestro equipo la evaluará según demanda, calidad de datos y viabilidad técnica.

ID de solicitud: {{request_id}}

Abrir Centro de Importación: {{base_url}}/import`,
          "lifecycle",
          "",
        ],
      });
    },
  },
  {
    version: 59,
    description: "Add referral program: referral_code, referred_by, referral_reward_days on users; create referrals table; backfill codes",
    up: async (client: Client) => {
      const addCol = async (col: string, def: string) => {
        try { await client.execute(`ALTER TABLE users ADD COLUMN ${col} ${def}`); } catch { /* duplicate column */ }
      };
      await addCol("referral_code", "TEXT");
      await addCol("referred_by", "TEXT NOT NULL DEFAULT ''");
      await addCol("referral_reward_days", "INTEGER NOT NULL DEFAULT 0");

      await client.executeMultiple(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

        CREATE TABLE IF NOT EXISTS referrals (
          id TEXT PRIMARY KEY,
          referrer_id TEXT NOT NULL,
          referee_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending'
            CHECK(status IN ('pending','accepted','rewarded','rejected')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          accepted_at TEXT,
          rewarded_at TEXT,
          reject_reason TEXT,
          FOREIGN KEY(referrer_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(referee_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_id);
        CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
      `);

      // Backfill referral codes for existing users
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
      const users = await client.execute("SELECT id FROM users WHERE referral_code IS NULL");
      for (const row of users.rows) {
        let code = "";
        const bytes = randomBytes(8);
        for (let i = 0; i < 8; i++) code += chars[bytes[i] % chars.length];
        await client.execute({ sql: "UPDATE users SET referral_code = ? WHERE id = ?", args: [code, str(row.id)] });
      }
    },
  },
  {
    version: 60,
    description: "Seed referral program email template",
    up: async (client: Client) => {
      const existing = await client.execute({
        sql: "SELECT COUNT(*) as cnt FROM email_templates WHERE slug = ?",
        args: ["referral-program"],
      });
      if (Number(existing.rows[0]?.cnt) > 0) return;

      const { EMAIL_TEMPLATE_SEEDS } = await import("./email-template-seeds");
      const t = EMAIL_TEMPLATE_SEEDS.find((s) => s.slug === "referral-program");
      if (!t) return;

      await client.execute({
        sql: `INSERT INTO email_templates (id, slug, name, subject, subject_es, body_html, body_html_es, body_text, body_text_es, category, experience_level)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          randomUUID(), t.slug, t.name, t.subject, t.subjectEs,
          t.bodyHtml, t.bodyHtmlEs, t.bodyText, t.bodyTextEs,
          t.category, t.experienceLevel,
        ],
      });
    },
  },
  {
    version: 61,
    description: "Add use_case and referral_source columns to users",
    up: async (client: Client) => {
      await client.execute("ALTER TABLE users ADD COLUMN use_case TEXT");
      await client.execute("ALTER TABLE users ADD COLUMN referral_source TEXT");
    },
  },
  {
    version: 62,
    description: "Add snapshots_backfilled_at to users for portfolio history backfill tracking",
    up: async (client: Client) => {
      try {
        await client.execute("ALTER TABLE users ADD COLUMN snapshots_backfilled_at TEXT");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
    },
  },
  {
    version: 63,
    description: "Widen portfolio_snapshots unique constraint to (user_id, portfolio_id, date)",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS portfolio_snapshots_new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          total_value_eur REAL NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          portfolio_id TEXT NOT NULL DEFAULT '',
          UNIQUE(user_id, portfolio_id, date)
        )
      `);
      await client.execute(
        "INSERT OR IGNORE INTO portfolio_snapshots_new SELECT id, user_id, date, total_value_eur, created_at, portfolio_id FROM portfolio_snapshots"
      );
      await client.execute("DROP TABLE portfolio_snapshots");
      await client.execute("ALTER TABLE portfolio_snapshots_new RENAME TO portfolio_snapshots");
    },
  },
  {
    version: 64,
    description: "Create aggregate (portfolio_id='') snapshot rows from existing per-portfolio data",
    up: async (client: Client) => {
      await client.execute(`
        INSERT OR IGNORE INTO portfolio_snapshots (id, user_id, date, total_value_eur, created_at, portfolio_id)
        SELECT
          lower(hex(randomblob(16))),
          user_id,
          date,
          SUM(total_value_eur),
          MIN(created_at),
          ''
        FROM portfolio_snapshots
        WHERE portfolio_id != ''
        GROUP BY user_id, date
      `);
    },
  },
  {
    version: 65,
    description: "Create unsubscribe_tokens table for one-time email unsubscribe links",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS unsubscribe_tokens (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          used_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_unsub_tokens_user ON unsubscribe_tokens(user_id)"
      );
    },
  },
  {
    version: 66,
    description: "Create refund_requests table and seed refund email templates",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS refund_requests (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          reason TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'pending'
            CHECK(status IN ('pending', 'approved', 'rejected')),
          admin_note TEXT NOT NULL DEFAULT '',
          resolved_at TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_refund_requests_user ON refund_requests(user_id);
        CREATE INDEX IF NOT EXISTS idx_refund_requests_created ON refund_requests(created_at);
      `);

      const templates: Array<{
        slug: string;
        name: string;
        subject: string;
        subjectEs: string;
        bodyHtml: string;
        bodyHtmlEs: string;
        bodyText: string;
        bodyTextEs: string;
      }> = [
        {
          slug: "refund-request-received",
          name: "Refund Request Received",
          subject: "We received your refund request",
          subjectEs: "Recibimos tu solicitud de reembolso",
          bodyHtml: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="padding:28px 28px 8px;">
          <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">Hi {{display_name}},</h1>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">
            We received your refund request and our team will review it shortly.
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;">
            We'll get back to you via email once we've reviewed your request. This usually takes 1–3 business days.
          </p>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;">
            Request ID: <strong>{{request_id}}</strong>
          </p>
        </td></tr>
        <tr><td style="padding:18px 28px 26px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;">
            You received this email from trefolio. <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
          bodyHtmlEs: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="padding:28px 28px 8px;">
          <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">Hola {{display_name}},</h1>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">
            Recibimos tu solicitud de reembolso y nuestro equipo la revisará en breve.
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;">
            Te responderemos por email una vez que hayamos revisado tu solicitud. Esto normalmente toma de 1 a 3 días hábiles.
          </p>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;">
            ID de solicitud: <strong>{{request_id}}</strong>
          </p>
        </td></tr>
        <tr><td style="padding:18px 28px 26px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;">
            Recibiste este email de trefolio. <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Cancelar suscripción</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
          bodyText: `Hi {{display_name}},

We received your refund request and our team will review it shortly.

We'll get back to you via email once we've reviewed your request. This usually takes 1–3 business days.

Request ID: {{request_id}}`,
          bodyTextEs: `Hola {{display_name}},

Recibimos tu solicitud de reembolso y nuestro equipo la revisará en breve.

Te responderemos por email una vez que hayamos revisado tu solicitud. Esto normalmente toma de 1 a 3 días hábiles.

ID de solicitud: {{request_id}}`,
        },
        {
          slug: "refund-request-approved",
          name: "Refund Request Approved",
          subject: "Your refund request has been approved",
          subjectEs: "Tu solicitud de reembolso ha sido aprobada",
          bodyHtml: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="padding:28px 28px 8px;">
          <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">Good news, {{display_name}}</h1>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">
            Your refund request has been approved. The refund will be processed and should appear on your original payment method within 5–10 business days.
          </p>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;">
            Request ID: <strong>{{request_id}}</strong>
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;">
            If you have any questions, feel free to reach out to us at <a href="mailto:support@trefolio.com" style="color:#6366f1;">support@trefolio.com</a>.
          </p>
        </td></tr>
        <tr><td style="padding:18px 28px 26px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;">
            You received this email from trefolio. <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
          bodyHtmlEs: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="padding:28px 28px 8px;">
          <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">Buenas noticias, {{display_name}}</h1>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">
            Tu solicitud de reembolso ha sido aprobada. El reembolso se procesará y debería aparecer en tu método de pago original dentro de 5 a 10 días hábiles.
          </p>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;">
            ID de solicitud: <strong>{{request_id}}</strong>
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;">
            Si tienes alguna pregunta, no dudes en escribirnos a <a href="mailto:support@trefolio.com" style="color:#6366f1;">support@trefolio.com</a>.
          </p>
        </td></tr>
        <tr><td style="padding:18px 28px 26px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;">
            Recibiste este email de trefolio. <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Cancelar suscripción</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
          bodyText: `Hi {{display_name}},

Your refund request has been approved. The refund will be processed and should appear on your original payment method within 5–10 business days.

Request ID: {{request_id}}

If you have any questions, feel free to reach out to us at support@trefolio.com.`,
          bodyTextEs: `Hola {{display_name}},

Tu solicitud de reembolso ha sido aprobada. El reembolso se procesará y debería aparecer en tu método de pago original dentro de 5 a 10 días hábiles.

ID de solicitud: {{request_id}}

Si tienes alguna pregunta, no dudes en escribirnos a support@trefolio.com.`,
        },
        {
          slug: "refund-request-rejected",
          name: "Refund Request Rejected",
          subject: "Update on your refund request",
          subjectEs: "Actualización sobre tu solicitud de reembolso",
          bodyHtml: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="padding:28px 28px 8px;">
          <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">Hi {{display_name}},</h1>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">
            After reviewing your refund request, we're unable to process a refund at this time. This may be because the request falls outside our refund policy.
          </p>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;">
            Request ID: <strong>{{request_id}}</strong>
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;">
            If you believe this was made in error or have further questions, please contact us at <a href="mailto:support@trefolio.com" style="color:#6366f1;">support@trefolio.com</a>.
          </p>
        </td></tr>
        <tr><td style="padding:18px 28px 26px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;">
            You received this email from trefolio. <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
          bodyHtmlEs: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="padding:28px 28px 8px;">
          <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">Hola {{display_name}},</h1>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">
            Después de revisar tu solicitud de reembolso, no podemos procesar un reembolso en este momento. Esto puede deberse a que la solicitud no cumple con nuestra política de reembolsos.
          </p>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;">
            ID de solicitud: <strong>{{request_id}}</strong>
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;">
            Si crees que esto fue un error o tienes más preguntas, contáctanos en <a href="mailto:support@trefolio.com" style="color:#6366f1;">support@trefolio.com</a>.
          </p>
        </td></tr>
        <tr><td style="padding:18px 28px 26px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;">
            Recibiste este email de trefolio. <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Cancelar suscripción</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
          bodyText: `Hi {{display_name}},

After reviewing your refund request, we're unable to process a refund at this time. This may be because the request falls outside our refund policy.

Request ID: {{request_id}}

If you believe this was made in error or have further questions, please contact us at support@trefolio.com.`,
          bodyTextEs: `Hola {{display_name}},

Después de revisar tu solicitud de reembolso, no podemos procesar un reembolso en este momento. Esto puede deberse a que la solicitud no cumple con nuestra política de reembolsos.

ID de solicitud: {{request_id}}

Si crees que esto fue un error o tienes más preguntas, contáctanos en support@trefolio.com.`,
        },
      ];

      for (const tpl of templates) {
        const existing = await client.execute({
          sql: "SELECT id FROM email_templates WHERE slug = ? LIMIT 1",
          args: [tpl.slug],
        });
        if (existing.rows.length > 0) continue;

        await client.execute({
          sql: `INSERT INTO email_templates
                (id, slug, name, subject, subject_es, body_html, body_html_es, body_text, body_text_es, category, experience_level)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            randomUUID(),
            tpl.slug,
            tpl.name,
            tpl.subject,
            tpl.subjectEs,
            tpl.bodyHtml,
            tpl.bodyHtmlEs,
            tpl.bodyText,
            tpl.bodyTextEs,
            "lifecycle",
            "",
          ],
        });
      }
    },
  },
  {
    version: 66,
    description: "Add total_invested_eur column to portfolio_snapshots for performance tracking",
    up: async (client: Client) => {
      try {
        await client.execute(
          "ALTER TABLE portfolio_snapshots ADD COLUMN total_invested_eur REAL NOT NULL DEFAULT 0"
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
    },
  },
  {
    version: 67,
    description: "Add ai_tokens_this_month and ai_tokens_today columns for token-based AI limits",
    up: async (client: Client) => {
      for (const ddl of [
        "ALTER TABLE users ADD COLUMN ai_tokens_this_month INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN ai_tokens_today INTEGER NOT NULL DEFAULT 0",
      ]) {
        try {
          await client.execute({ sql: ddl });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("duplicate column")) throw e;
        }
      }
    },
  },
  {
    version: 68,
    description: "Create portfolio_scores table for AI portfolio score caching",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS portfolio_scores (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          portfolio_id TEXT NOT NULL DEFAULT '',
          score_json TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL DEFAULT (datetime('now', '+24 hours')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_portfolio_scores_user_portfolio ON portfolio_scores(user_id, portfolio_id)"
      );
    },
  },
  {
    version: 69,
    description: "Add trial columns for 7-day Pro trial system",
    up: async (client: Client) => {
      for (const ddl of [
        "ALTER TABLE users ADD COLUMN trial_invited_at TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE users ADD COLUMN trial_activated_at TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE users ADD COLUMN trial_token TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE users ADD COLUMN trial_expired_notified INTEGER NOT NULL DEFAULT 0",
      ]) {
        try {
          await client.execute({ sql: ddl });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("duplicate column")) throw e;
        }
      }
    },
  },
  {
    version: 70,
    description: "Seed trial-invitation and trial-expired email templates",
    up: async (client: Client) => {
      const { EMAIL_TEMPLATE_SEEDS } = await import("./email-template-seeds");
      for (const slug of ["trial-invitation", "trial-expired"]) {
        const existing = await client.execute({
          sql: "SELECT COUNT(*) as cnt FROM email_templates WHERE slug = ?",
          args: [slug],
        });
        if (Number(existing.rows[0]?.cnt) > 0) continue;
        const t = EMAIL_TEMPLATE_SEEDS.find((s) => s.slug === slug);
        if (!t) continue;
        await client.execute({
          sql: `INSERT INTO email_templates (id, slug, name, subject, subject_es, body_html, body_html_es, body_text, body_text_es, category, experience_level)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            randomUUID(), t.slug, t.name, t.subject, t.subjectEs,
            t.bodyHtml, t.bodyHtmlEs, t.bodyText, t.bodyTextEs,
            t.category, t.experienceLevel,
          ],
        });
      }
    },
  },
  {
    version: 71,
    description: "Create feature_flag_overrides table for per-user feature flag targeting",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS feature_flag_overrides (
          id TEXT PRIMARY KEY,
          flag TEXT NOT NULL,
          user_id TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(flag, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_ffo_flag ON feature_flag_overrides(flag);
        CREATE INDEX IF NOT EXISTS idx_ffo_user ON feature_flag_overrides(user_id);
      `);
    },
  },
  {
    version: 72,
    description: "Refresh trial email templates with rich feature groups",
    up: async (client: Client) => {
      const { EMAIL_TEMPLATE_SEEDS } = await import("./email-template-seeds");
      for (const slug of ["trial-invitation", "trial-expired"]) {
        const t = EMAIL_TEMPLATE_SEEDS.find((s) => s.slug === slug);
        if (!t) continue;
        await client.execute({
          sql: `UPDATE email_templates
                SET body_html = ?, body_html_es = ?, body_text = ?, body_text_es = ?
                WHERE slug = ?`,
          args: [t.bodyHtml, t.bodyHtmlEs, t.bodyText, t.bodyTextEs, slug],
        });
      }
    },
  },
  {
    version: 73,
    description: "Add growth_box placeholder to trial-expired email template",
    up: async (client: Client) => {
      const { EMAIL_TEMPLATE_SEEDS } = await import("./email-template-seeds");
      const t = EMAIL_TEMPLATE_SEEDS.find((s) => s.slug === "trial-expired");
      if (!t) return;
      await client.execute({
        sql: `UPDATE email_templates
              SET body_html = ?, body_html_es = ?
              WHERE slug = 'trial-expired'`,
        args: [t.bodyHtml, t.bodyHtmlEs],
      });
    },
  },
  {
    version: 74,
    description: "Create ai_logs table for admin review of AI prompts and responses",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS ai_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          source TEXT NOT NULL DEFAULT '',
          model TEXT NOT NULL DEFAULT '',
          prompt_system TEXT NOT NULL DEFAULT '',
          prompt_user TEXT NOT NULL DEFAULT '',
          response TEXT NOT NULL DEFAULT '',
          tokens_used INTEGER NOT NULL DEFAULT 0,
          duration_ms INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'success' CHECK(status IN ('success','error')),
          error_message TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON ai_logs(user_id)"
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_ai_logs_source ON ai_logs(source)"
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON ai_logs(created_at DESC)"
      );
    },
  },
  {
    version: 75,
    description: "Add input/output token breakdown and cost to ai_logs",
    up: async (client: Client) => {
      for (const col of [
        "ALTER TABLE ai_logs ADD COLUMN tokens_input INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE ai_logs ADD COLUMN tokens_output INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE ai_logs ADD COLUMN cost_usd REAL NOT NULL DEFAULT 0",
      ]) {
        try { await client.execute(col); }
        catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("duplicate column")) throw e;
        }
      }
    },
  },
  {
    version: 76,
    description: "Onboarding checklist table and users.checklist_dismissed_at",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS onboarding_checklist (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          step TEXT NOT NULL,
          completed_at DATETIME NOT NULL DEFAULT (datetime('now')),
          UNIQUE(user_id, step)
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_onboarding_checklist_user ON onboarding_checklist(user_id)"
      );
      try {
        await client.execute(
          "ALTER TABLE users ADD COLUMN checklist_dismissed_at DATETIME"
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
    },
  },
  {
    version: 77,
    description: "Weekly digests table and users.weekly_digest_enabled",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS weekly_digests (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          portfolio_id TEXT,
          week_start DATE NOT NULL,
          week_end DATE NOT NULL,
          summary_text TEXT NOT NULL DEFAULT '',
          stats_json TEXT NOT NULL DEFAULT '{}',
          created_at DATETIME NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_weekly_digests_user ON weekly_digests(user_id)"
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_weekly_digests_week ON weekly_digests(user_id, week_end DESC)"
      );
      try {
        await client.execute(
          "ALTER TABLE users ADD COLUMN weekly_digest_enabled INTEGER NOT NULL DEFAULT 1"
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
    },
  },
  {
    version: 78,
    description: "Add index on portfolio_snapshots for compaction and history queries",
    up: async (client: Client) => {
      await client.execute(
        `CREATE INDEX IF NOT EXISTS idx_snapshots_user_date
         ON portfolio_snapshots (user_id, date)`
      );
    },
  },
  {
    version: 79,
    description: "Add per-asset-type value columns to portfolio_snapshots",
    up: async (client: Client) => {
      const cols = [
        "stock_value_eur REAL NOT NULL DEFAULT 0",
        "etf_value_eur REAL NOT NULL DEFAULT 0",
        "crypto_value_eur REAL NOT NULL DEFAULT 0",
      ];
      for (const col of cols) {
        try {
          await client.execute(`ALTER TABLE portfolio_snapshots ADD COLUMN ${col}`);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("duplicate column")) throw e;
        }
      }
    },
  },
  {
    version: 80,
    description: "Create yahoo_historical_cache table for permanent historical price storage",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS yahoo_historical_cache (
          symbol TEXT NOT NULL,
          date TEXT NOT NULL,
          open REAL NOT NULL DEFAULT 0,
          high REAL NOT NULL DEFAULT 0,
          low REAL NOT NULL DEFAULT 0,
          close REAL NOT NULL DEFAULT 0,
          volume REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (symbol, date)
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_yhc_symbol ON yahoo_historical_cache (symbol)"
      );
    },
  },
  {
    version: 81,
    description: "Create satisfaction_surveys table and add satisfaction columns to users",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS satisfaction_surveys (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
          comment TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'submitted')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          submitted_at TEXT NOT NULL DEFAULT '',
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_satisfaction_user ON satisfaction_surveys(user_id)"
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_satisfaction_status ON satisfaction_surveys(status)"
      );

      const cols = [
        "satisfaction_completed INTEGER NOT NULL DEFAULT 0",
        "satisfaction_dismiss_count INTEGER NOT NULL DEFAULT 0",
        "satisfaction_interaction_count INTEGER NOT NULL DEFAULT 0",
      ];
      for (const col of cols) {
        try {
          await client.execute(`ALTER TABLE users ADD COLUMN ${col}`);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("duplicate column")) throw e;
        }
      }
    },
  },
  {
    version: 82,
    description: "Market digests and translations tables for email-to-insight pipeline",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS market_digests (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          gmail_message_id TEXT NOT NULL UNIQUE,
          sender TEXT NOT NULL,
          original_subject TEXT NOT NULL,
          received_at DATETIME NOT NULL,
          raw_text TEXT,
          raw_html TEXT,
          mentioned_tickers TEXT NOT NULL DEFAULT '[]',
          sectors TEXT NOT NULL DEFAULT '[]',
          sentiment TEXT,
          ai_model TEXT,
          tokens_used INTEGER DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'draft',
          published_at DATETIME,
          email_sent INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_market_digests_status ON market_digests(status)"
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_market_digests_received ON market_digests(received_at DESC)"
      );

      await client.execute(`
        CREATE TABLE IF NOT EXISTS market_digest_translations (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          digest_id TEXT NOT NULL REFERENCES market_digests(id) ON DELETE CASCADE,
          language TEXT NOT NULL,
          title TEXT NOT NULL DEFAULT '',
          summary TEXT NOT NULL DEFAULT '',
          key_points TEXT NOT NULL DEFAULT '[]',
          created_at DATETIME NOT NULL DEFAULT (datetime('now')),
          UNIQUE(digest_id, language)
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_mdt_digest_lang ON market_digest_translations(digest_id, language)"
      );
    },
  },
  {
    version: 83,
    description: "Private chat rooms and messages",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS private_chat_rooms (
          id TEXT PRIMARY KEY,
          created_by TEXT NOT NULL REFERENCES users(id),
          label TEXT NOT NULL DEFAULT '',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS private_chat_messages (
          id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL REFERENCES private_chat_rooms(id) ON DELETE CASCADE,
          sender_id TEXT NOT NULL REFERENCES users(id),
          type TEXT NOT NULL DEFAULT 'text',
          content TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_pcm_room_created ON private_chat_messages(room_id, created_at)"
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_pcm_expires ON private_chat_messages(expires_at)"
      );
    },
  },
  {
    version: 84,
    description: "Private chat participants tracking",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS private_chat_participants (
          room_id TEXT NOT NULL REFERENCES private_chat_rooms(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id),
          joined_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (room_id, user_id)
        )
      `);
    },
  },
  {
    version: 85,
    description: "Chat reply-to, edit, and typing indicator columns",
    up: async (client: Client) => {
      const msgCols = await client.execute("PRAGMA table_info(private_chat_messages)");
      const msgColNames = new Set(msgCols.rows.map((r) => String(r.name)));
      if (!msgColNames.has("reply_to_id")) {
        await client.execute("ALTER TABLE private_chat_messages ADD COLUMN reply_to_id TEXT");
      }
      if (!msgColNames.has("edited_at")) {
        await client.execute("ALTER TABLE private_chat_messages ADD COLUMN edited_at TEXT");
      }
      const partCols = await client.execute("PRAGMA table_info(private_chat_participants)");
      const partColNames = new Set(partCols.rows.map((r) => String(r.name)));
      if (!partColNames.has("last_typing_at")) {
        await client.execute("ALTER TABLE private_chat_participants ADD COLUMN last_typing_at TEXT");
      }
    },
  },
  {
    version: 86,
    description: "Chat presence tracking and read receipts",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(private_chat_participants)");
      const colNames = new Set(cols.rows.map((r) => String(r.name)));
      if (!colNames.has("last_seen_at")) {
        await client.execute("ALTER TABLE private_chat_participants ADD COLUMN last_seen_at TEXT");
      }
      if (!colNames.has("last_read_msg_id")) {
        await client.execute("ALTER TABLE private_chat_participants ADD COLUMN last_read_msg_id TEXT");
      }
    },
  },
  {
    version: 87,
    description: "Persistent chat messages (opt-out from 24h TTL)",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(private_chat_messages)");
      const colNames = new Set(cols.rows.map((r) => String(r.name)));
      if (!colNames.has("is_persistent")) {
        await client.execute("ALTER TABLE private_chat_messages ADD COLUMN is_persistent INTEGER NOT NULL DEFAULT 0");
      }
    },
  },
  {
    version: 88,
    description: "Per-user chat clear timestamp",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(private_chat_participants)");
      const colNames = new Set(cols.rows.map((r) => String(r.name)));
      if (!colNames.has("cleared_at")) {
        await client.execute("ALTER TABLE private_chat_participants ADD COLUMN cleared_at TEXT");
      }
    },
  },
  {
    version: 89,
    description: "Emoji reactions on chat messages",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS private_chat_reactions (
          message_id TEXT NOT NULL REFERENCES private_chat_messages(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id),
          emoji TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (message_id, user_id, emoji)
        )
      `);
    },
  },
  {
    version: 90,
    description: "Track scheduled X post for market digests",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(market_digests)");
      const colNames = new Set(cols.rows.map((r) => String(r.name)));
      if (!colNames.has("x_scheduled_post_id")) {
        await client.execute("ALTER TABLE market_digests ADD COLUMN x_scheduled_post_id TEXT DEFAULT ''");
      }
    },
  },
  {
    version: 91,
    description: "Multi-source market digests: sources table, digest_date grouping, backfill",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS market_digest_sources (
          id TEXT PRIMARY KEY,
          digest_id TEXT NOT NULL REFERENCES market_digests(id) ON DELETE CASCADE,
          gmail_message_id TEXT NOT NULL UNIQUE,
          sender TEXT NOT NULL,
          original_subject TEXT NOT NULL,
          original_date TEXT NOT NULL,
          received_at DATETIME NOT NULL,
          raw_text TEXT,
          raw_html TEXT,
          extracted_links TEXT NOT NULL DEFAULT '[]',
          created_at DATETIME NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_mds_digest ON market_digest_sources(digest_id)"
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_mds_gmail ON market_digest_sources(gmail_message_id)"
      );

      const cols = await client.execute("PRAGMA table_info(market_digests)");
      const colNames = new Set(cols.rows.map((r) => String(r.name)));
      if (!colNames.has("digest_date")) {
        await client.execute("ALTER TABLE market_digests ADD COLUMN digest_date TEXT DEFAULT ''");
        await client.execute(
          "CREATE INDEX IF NOT EXISTS idx_market_digests_date ON market_digests(digest_date)"
        );
      }

      const existing = await client.execute(
        "SELECT id, gmail_message_id, sender, original_subject, received_at, raw_text, raw_html FROM market_digests WHERE gmail_message_id != ''"
      );
      for (const r of existing.rows) {
        const receivedAt = String(r.received_at ?? "");
        const digestDate = receivedAt.slice(0, 10);
        await client.execute({
          sql: "UPDATE market_digests SET digest_date = ? WHERE id = ?",
          args: [digestDate, String(r.id)],
        });
        await client.execute({
          sql: `INSERT OR IGNORE INTO market_digest_sources
            (id, digest_id, gmail_message_id, sender, original_subject, original_date, received_at, raw_text, raw_html)
            VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            String(r.id),
            String(r.gmail_message_id),
            String(r.sender ?? ""),
            String(r.original_subject ?? ""),
            digestDate,
            receivedAt,
            String(r.raw_text ?? ""),
            String(r.raw_html ?? ""),
          ],
        });
      }
    },
  },
  {
    version: 92,
    description:
      "Social profiles: add profile_slug, bio, social_visibility, headline, share_portfolio_value, share_holdings to users",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(users)");
      const colNames = new Set(cols.rows.map((r) => String(r.name)));
      if (!colNames.has("profile_slug")) {
        await client.execute("ALTER TABLE users ADD COLUMN profile_slug TEXT NOT NULL DEFAULT ''");
      }
      if (!colNames.has("bio")) {
        await client.execute("ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ''");
      }
      if (!colNames.has("social_visibility")) {
        await client.execute(
          "ALTER TABLE users ADD COLUMN social_visibility TEXT NOT NULL DEFAULT 'private'"
        );
      }
      if (!colNames.has("headline")) {
        await client.execute("ALTER TABLE users ADD COLUMN headline TEXT NOT NULL DEFAULT ''");
      }
      if (!colNames.has("share_portfolio_value")) {
        await client.execute(
          "ALTER TABLE users ADD COLUMN share_portfolio_value INTEGER NOT NULL DEFAULT 0"
        );
      }
      if (!colNames.has("share_holdings")) {
        await client.execute(
          "ALTER TABLE users ADD COLUMN share_holdings INTEGER NOT NULL DEFAULT 0"
        );
      }
      await client.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_profile_slug ON users(profile_slug) WHERE profile_slug != ''"
      );
    },
  },
  {
    version: 93,
    description: "Create user_connections table",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS user_connections (
          id TEXT PRIMARY KEY,
          requester_id TEXT NOT NULL REFERENCES users(id),
          receiver_id TEXT NOT NULL REFERENCES users(id),
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'blocked')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(requester_id, receiver_id)
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_uc_receiver_status ON user_connections(receiver_id, status)"
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_uc_requester_status ON user_connections(requester_id, status)"
      );
    },
  },
  {
    version: 94,
    description: "Create social_posts table",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS social_posts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          title TEXT NOT NULL DEFAULT '',
          content TEXT NOT NULL,
          content_format TEXT NOT NULL DEFAULT 'html' CHECK(content_format IN ('markdown', 'html')),
          visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public', 'network', 'private')),
          post_type TEXT NOT NULL DEFAULT 'article' CHECK(post_type IN ('article', 'analysis', 'trade_idea', 'portfolio_update', 'link')),
          link_url TEXT NOT NULL DEFAULT '',
          link_title TEXT NOT NULL DEFAULT '',
          link_image TEXT NOT NULL DEFAULT '',
          is_draft INTEGER NOT NULL DEFAULT 0,
          published_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_sp_user_published ON social_posts(user_id, published_at)"
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_sp_visibility_published ON social_posts(visibility, published_at)"
      );
    },
  },
  {
    version: 95,
    description: "Create social_post_images table",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS social_post_images (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          alt_text TEXT NOT NULL DEFAULT '',
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
    },
  },
  {
    version: 96,
    description: "Create social_post_comments table and add allow_comments to users",
    up: async (client: Client) => {
      await client.execute(
        "ALTER TABLE users ADD COLUMN allow_comments INTEGER NOT NULL DEFAULT 1"
      );
      await client.execute(`
        CREATE TABLE IF NOT EXISTS social_post_comments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id),
          parent_id TEXT,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_spc_post_created ON social_post_comments(post_id, created_at)"
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_spc_parent ON social_post_comments(parent_id)"
      );
    },
  },
  {
    version: 97,
    description: "Create feed_items table for fan-out-on-write feed",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS feed_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
          author_id TEXT NOT NULL,
          published_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(user_id, post_id)
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_fi_user_published ON feed_items(user_id, published_at DESC)"
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_fi_post ON feed_items(post_id)"
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_fi_author ON feed_items(author_id)"
      );

      // Seed existing posts into feed_items
      // 1. Every author gets their own published posts
      await client.execute({
        sql: `INSERT OR IGNORE INTO feed_items (user_id, post_id, author_id, published_at)
              SELECT p.user_id, p.id, p.user_id, p.published_at
              FROM social_posts p
              WHERE p.is_draft = 0 AND p.published_at IS NOT NULL`,
        args: [],
      });
      // 2. Connected users get public + network posts
      await client.execute({
        sql: `INSERT OR IGNORE INTO feed_items (user_id, post_id, author_id, published_at)
              SELECT
                CASE WHEN uc.requester_id = p.user_id THEN uc.receiver_id ELSE uc.requester_id END,
                p.id, p.user_id, p.published_at
              FROM social_posts p
              JOIN user_connections uc ON (
                (uc.requester_id = p.user_id OR uc.receiver_id = p.user_id)
                AND uc.status = 'accepted'
              )
              WHERE p.is_draft = 0 AND p.published_at IS NOT NULL
                AND p.visibility IN ('public', 'network')`,
        args: [],
      });
    },
  },
  {
    version: 98,
    description: "Create moat_reports table for stored Buffett evaluations",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS moat_reports (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          symbol TEXT NOT NULL,
          company_name TEXT NOT NULL DEFAULT '',
          evaluation_json TEXT NOT NULL DEFAULT '{}',
          ai_narrative TEXT NOT NULL DEFAULT '',
          total_score REAL NOT NULL DEFAULT 0,
          max_score REAL NOT NULL DEFAULT 100,
          verdict TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_moat_reports_user ON moat_reports(user_id, created_at DESC)"
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_moat_reports_symbol ON moat_reports(user_id, symbol)"
      );
    },
  },
  {
    version: 99,
    description: "Create moat_cache table for global shared evaluations",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS moat_cache (
          symbol TEXT PRIMARY KEY,
          company_name TEXT NOT NULL DEFAULT '',
          sector TEXT NOT NULL DEFAULT '',
          industry TEXT NOT NULL DEFAULT '',
          evaluation_json TEXT NOT NULL DEFAULT '{}',
          total_score REAL NOT NULL DEFAULT 0,
          max_score REAL NOT NULL DEFAULT 100,
          score_pct REAL NOT NULL DEFAULT 0,
          verdict TEXT NOT NULL DEFAULT '',
          passed_count INTEGER NOT NULL DEFAULT 0,
          criteria_count INTEGER NOT NULL DEFAULT 8,
          earnings_consistency_score REAL,
          earnings_consistency_status TEXT,
          gross_margin_score REAL,
          gross_margin_status TEXT,
          net_margin_score REAL,
          net_margin_status TEXT,
          retained_earnings_score REAL,
          retained_earnings_status TEXT,
          return_on_equity_score REAL,
          return_on_equity_status TEXT,
          debt_sustainability_score REAL,
          debt_sustainability_status TEXT,
          capex_efficiency_score REAL,
          capex_efficiency_status TEXT,
          product_durability_score REAL,
          product_durability_status TEXT,
          pe_ratio REAL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_moat_cache_score ON moat_cache(score_pct DESC)"
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_moat_cache_sector ON moat_cache(sector)"
      );
    },
  },
  {
    version: 100,
    description: "Create moat_auto_tickers table for admin-managed automatic moat generation",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS moat_auto_tickers (
          symbol TEXT PRIMARY KEY,
          added_by TEXT NOT NULL DEFAULT '',
          added_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
    },
  },
  {
    version: 101,
    description: "Seed feature-moat-screener email template",
    up: async (client: Client) => {
      const existing = await client.execute({
        sql: "SELECT COUNT(*) as cnt FROM email_templates WHERE slug = ?",
        args: ["feature-moat-screener"],
      });
      if (Number(existing.rows[0]?.cnt) > 0) return;

      const { EMAIL_TEMPLATE_SEEDS } = await import("./email-template-seeds");
      const t = EMAIL_TEMPLATE_SEEDS.find((s) => s.slug === "feature-moat-screener");
      if (!t) return;

      await client.execute({
        sql: `INSERT INTO email_templates (id, slug, name, subject, subject_es, body_html, body_html_es, body_text, body_text_es, category, experience_level)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          randomUUID(), t.slug, t.name, t.subject, t.subjectEs,
          t.bodyHtml, t.bodyHtmlEs, t.bodyText, t.bodyTextEs,
          t.category, t.experienceLevel,
        ],
      });
    },
  },
  {
    version: 102,
    description: "Add tags JSON column to moat_reports for user-defined report labels",
    up: async (client: Client) => {
      try {
        await client.execute({
          sql: "ALTER TABLE moat_reports ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'",
          args: [],
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
    },
  },
  {
    version: 103,
    description: "Investment strategies: saved target/stop/purchase reference per ticker linked to price alerts",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS investment_strategies (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          ticker TEXT NOT NULL,
          exchange TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL DEFAULT '',
          purchase_price REAL NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'USD',
          target_price REAL NOT NULL DEFAULT 0,
          stop_loss_price REAL NOT NULL DEFAULT 0,
          target_alert_id TEXT NOT NULL DEFAULT '',
          stop_alert_id TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
      await client.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_investment_strategies_user_ticker_ex
        ON investment_strategies(user_id, ticker, exchange);
      `);
    },
  },
  {
    version: 104,
    description: "Private chat room kind and participant membership (social invite vs admin link)",
    up: async (client: Client) => {
      const roomCols = await client.execute("PRAGMA table_info(private_chat_rooms)");
      const hasKind = roomCols.rows.some((row) => str(row.name) === "kind");
      if (!hasKind) {
        await client.execute(
          "ALTER TABLE private_chat_rooms ADD COLUMN kind TEXT NOT NULL DEFAULT 'admin_link'"
        );
      }
      const partCols = await client.execute("PRAGMA table_info(private_chat_participants)");
      const hasMembership = partCols.rows.some((row) => str(row.name) === "membership_status");
      if (!hasMembership) {
        await client.execute(
          "ALTER TABLE private_chat_participants ADD COLUMN membership_status TEXT NOT NULL DEFAULT 'active'"
        );
      }
    },
  },
  {
    version: 105,
    description: "Feedback pipeline: Linear id, auto pipeline timestamps, completion draft, ack email tracking",
    up: async (client: Client) => {
      for (const [col, sql] of [
        ["linear_issue_id", `ALTER TABLE feedback ADD COLUMN linear_issue_id TEXT NOT NULL DEFAULT ''`],
        ["auto_pipeline_at", `ALTER TABLE feedback ADD COLUMN auto_pipeline_at TEXT NOT NULL DEFAULT ''`],
        ["completion_email_draft", `ALTER TABLE feedback ADD COLUMN completion_email_draft TEXT NOT NULL DEFAULT ''`],
        ["completion_draft_ready_at", `ALTER TABLE feedback ADD COLUMN completion_draft_ready_at TEXT NOT NULL DEFAULT ''`],
        ["completion_email_sent_at", `ALTER TABLE feedback ADD COLUMN completion_email_sent_at TEXT NOT NULL DEFAULT ''`],
        ["ack_email_sent_at", `ALTER TABLE feedback ADD COLUMN ack_email_sent_at TEXT NOT NULL DEFAULT ''`],
        ["linear_issue_url", `ALTER TABLE feedback ADD COLUMN linear_issue_url TEXT NOT NULL DEFAULT ''`],
      ] as const) {
        try {
          const cols = await client.execute("PRAGMA table_info(feedback)");
          const colNames = new Set(cols.rows.map((r) => str(r.name)));
          if (!colNames.has(col)) await client.execute(sql);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("duplicate column")) throw e;
        }
      }
    },
  },
  {
    version: 106,
    description: "Admin membership grant: pending token, plan, days, created_at on users",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(users)");
      const colNames = new Set(cols.rows.map((r) => str(r.name)));
      if (!colNames.has("membership_grant_token")) {
        await client.execute(
          "ALTER TABLE users ADD COLUMN membership_grant_token TEXT NOT NULL DEFAULT ''",
        );
      }
      if (!colNames.has("membership_grant_plan")) {
        await client.execute(
          "ALTER TABLE users ADD COLUMN membership_grant_plan TEXT NOT NULL DEFAULT ''",
        );
      }
      if (!colNames.has("membership_grant_days")) {
        await client.execute(
          "ALTER TABLE users ADD COLUMN membership_grant_days INTEGER NOT NULL DEFAULT 0",
        );
      }
      if (!colNames.has("membership_grant_created_at")) {
        await client.execute(
          "ALTER TABLE users ADD COLUMN membership_grant_created_at TEXT NOT NULL DEFAULT ''",
        );
      }
    },
  },
  {
    version: 107,
    description: "Two-tier subscriptions: migrate starter users and grants to pro",
    up: async (client: Client) => {
      await client.execute("UPDATE users SET plan = 'pro' WHERE plan = 'starter'");
      await client.execute(
        "UPDATE users SET membership_grant_plan = 'pro' WHERE membership_grant_plan = 'starter'",
      );
    },
  },
  {
    version: 108,
    description: "User favorite tool IDs (JSON) on user_settings",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(user_settings)");
      const colNames = new Set(cols.rows.map((r) => String(r.name)));
      if (!colNames.has("favorite_tool_ids")) {
        await client.execute(
          "ALTER TABLE user_settings ADD COLUMN favorite_tool_ids TEXT NOT NULL DEFAULT '[]'",
        );
      }
    },
  },
  {
    version: 109,
    description: "holdings.tags JSON array for user-defined portfolio labels",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(holdings)");
      const colNames = new Set(cols.rows.map((r) => String(r.name)));
      if (!colNames.has("tags")) {
        await client.execute(
          "ALTER TABLE holdings ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'",
        );
      }
    },
  },
  {
    version: 110,
    description:
      "Telegram: Warren bot tables; alert channel columns on user_settings; migrate WhatsApp flags to Telegram",
    up: async (client: Client) => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS telegram_link_tokens (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_user
          ON telegram_link_tokens(user_id);

        CREATE TABLE IF NOT EXISTS telegram_chats (
          chat_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          language_code TEXT NOT NULL DEFAULT '',
          linked_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_active_portfolio_id TEXT NOT NULL DEFAULT ''
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_chats_user
          ON telegram_chats(user_id);

        CREATE TABLE IF NOT EXISTS telegram_proposals (
          id TEXT PRIMARY KEY,
          chat_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          kind TEXT NOT NULL,
          data_json TEXT NOT NULL,
          summary TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending'
        );
        CREATE INDEX IF NOT EXISTS idx_telegram_proposals_chat
          ON telegram_proposals(chat_id);

        CREATE TABLE IF NOT EXISTS telegram_messages (
          id TEXT PRIMARY KEY,
          chat_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat_created
          ON telegram_messages(chat_id, created_at);
      `);

      const cols = await client.execute("PRAGMA table_info(user_settings)");
      const colNames = new Set(cols.rows.map((r) => String(r.name)));
      for (const [col, def] of [
        ["telegram_chat_id", "ALTER TABLE user_settings ADD COLUMN telegram_chat_id TEXT NOT NULL DEFAULT ''"],
        ["telegram_link_token", "ALTER TABLE user_settings ADD COLUMN telegram_link_token TEXT NOT NULL DEFAULT ''"],
        ["telegram_link_expires_at", "ALTER TABLE user_settings ADD COLUMN telegram_link_expires_at TEXT NOT NULL DEFAULT ''"],
      ] as const) {
        if (!colNames.has(col)) {
          await client.execute({ sql: def });
        }
      }
      await client.execute(
        "UPDATE user_settings SET alert_channels = REPLACE(alert_channels, 'whatsapp', 'telegram') WHERE alert_channels LIKE '%whatsapp%'",
      );
      await client.execute(`
        INSERT INTO platform_settings (key, value)
        SELECT 'telegram_enabled', value FROM platform_settings WHERE key = 'whatsapp_enabled'
        AND NOT EXISTS (SELECT 1 FROM platform_settings WHERE key = 'telegram_enabled')
      `);
      await client.execute(
        "UPDATE feature_flag_overrides SET flag = 'telegram_enabled' WHERE flag = 'whatsapp_enabled'",
      );
    },
  },
  {
    version: 111,
    description:
      "Unified accounts: add idp_sub column to users (link to user.trefolio.com IdP)",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(users)");
      const colNames = new Set(cols.rows.map((r) => String(r.name)));
      if (!colNames.has("idp_sub")) {
        await client.execute(
          "ALTER TABLE users ADD COLUMN idp_sub TEXT NOT NULL DEFAULT ''",
        );
      }
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_users_idp_sub ON users(idp_sub) WHERE idp_sub != ''",
      );
    },
  },
  {
    version: 112,
    description:
      "Global portfolio news cache: articles, symbol links, per-symbol fetch metadata",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS portfolio_news_articles (
          id TEXT PRIMARY KEY,
          url TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL DEFAULT '',
          summary TEXT NOT NULL DEFAULT '',
          source TEXT NOT NULL DEFAULT '',
          published_at TEXT NOT NULL DEFAULT '',
          ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
          extra_json TEXT NOT NULL DEFAULT '{}'
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_portfolio_news_articles_published ON portfolio_news_articles(published_at DESC)",
      );
      await client.execute(`
        CREATE TABLE IF NOT EXISTS portfolio_news_article_symbols (
          article_id TEXT NOT NULL REFERENCES portfolio_news_articles(id) ON DELETE CASCADE,
          symbol TEXT NOT NULL,
          PRIMARY KEY (article_id, symbol)
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_portfolio_news_article_symbols_symbol ON portfolio_news_article_symbols(symbol)",
      );
      await client.execute(`
        CREATE TABLE IF NOT EXISTS portfolio_news_symbol_fetch_meta (
          symbol TEXT PRIMARY KEY,
          last_fetched_at TEXT NOT NULL DEFAULT ''
        )
      `);
    },
  },
  {
    version: 113,
    description: "Agent Office: missions and chat messages",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS agent_missions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'active'
            CHECK(status IN ('active', 'completed', 'cancelled')),
          steps_json TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_agent_missions_user_status ON agent_missions(user_id, status, updated_at DESC)",
      );
      await client.execute(`
        CREATE TABLE IF NOT EXISTS agent_office_messages (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role TEXT NOT NULL DEFAULT 'user'
            CHECK(role IN ('user', 'warren', 'clara', 'will')),
          content TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_agent_office_messages_user ON agent_office_messages(user_id, created_at ASC)",
      );
    },
  },
  {
    version: 114,
    description: "ProdOps Telegram: ops event outbox for async external dispatch",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS ops_event_outbox (
          id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          dedupe_key TEXT NOT NULL UNIQUE,
          source_app TEXT NOT NULL DEFAULT 'trefolio',
          summary TEXT NOT NULL DEFAULT '',
          admin_url TEXT NOT NULL DEFAULT '',
          payload_json TEXT NOT NULL DEFAULT '{}',
          status TEXT NOT NULL DEFAULT 'pending'
            CHECK(status IN ('pending', 'sent', 'dropped', 'dead')),
          attempts INTEGER NOT NULL DEFAULT 0,
          next_attempt_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_attempted_at TEXT NOT NULL DEFAULT '',
          last_error TEXT NOT NULL DEFAULT '',
          sent_at TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_ops_event_outbox_status_next_attempt ON ops_event_outbox(status, next_attempt_at)",
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_ops_event_outbox_user_created ON ops_event_outbox(user_id, created_at DESC)",
      );
    },
  },
  {
    version: 115,
    description: "Create fundamentals_cache for permanent income/balance/cashflow/earnings storage",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS fundamentals_cache (
          symbol TEXT NOT NULL,
          type TEXT NOT NULL,
          data_json TEXT NOT NULL,
          provider TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (symbol, type)
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_fundamentals_cache_symbol ON fundamentals_cache(symbol)",
      );
    },
  },
  {
    version: 116,
    description: "AID news digest cache per user/ticker/event",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS aid_news_cache (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          ticker TEXT NOT NULL DEFAULT '',
          event_key TEXT NOT NULL DEFAULT '',
          headline TEXT NOT NULL DEFAULT '',
          summary_json TEXT NOT NULL DEFAULT '{}',
          sources_json TEXT NOT NULL DEFAULT '[]',
          used_web INTEGER NOT NULL DEFAULT 0,
          fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL DEFAULT ''
        )
      `);
      await client.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_aid_news_cache_user_event ON aid_news_cache(user_id, ticker, event_key)",
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_aid_news_cache_user_fetched ON aid_news_cache(user_id, fetched_at DESC)",
      );
    },
  },
  {
    version: 117,
    description: "AID visit tracking, FinPulse social posts cache",
    up: async (client: Client) => {
      const settingsCols = await client.execute("PRAGMA table_info(user_settings)");
      const colNames = new Set(settingsCols.rows.map((r) => String(r.name)));
      if (!colNames.has("last_aid_visit_at")) {
        await client.execute({
          sql: "ALTER TABLE user_settings ADD COLUMN last_aid_visit_at TEXT NOT NULL DEFAULT ''",
        });
      }
      if (!colNames.has("aid_warren_nudge_date")) {
        await client.execute({
          sql: "ALTER TABLE user_settings ADD COLUMN aid_warren_nudge_date TEXT NOT NULL DEFAULT ''",
        });
      }
      await client.execute(`
        CREATE TABLE IF NOT EXISTS aid_social_posts (
          id TEXT PRIMARY KEY,
          handle TEXT NOT NULL,
          post_key TEXT NOT NULL,
          source_url TEXT NOT NULL DEFAULT '',
          published_at TEXT NOT NULL DEFAULT '',
          headline TEXT NOT NULL DEFAULT '',
          summary_json TEXT NOT NULL DEFAULT '{}',
          tickers_json TEXT NOT NULL DEFAULT '[]',
          tags_json TEXT NOT NULL DEFAULT '[]',
          fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL DEFAULT ''
        )
      `);
      await client.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_aid_social_posts_handle_key ON aid_social_posts(handle, post_key)",
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_aid_social_posts_fetched ON aid_social_posts(fetched_at DESC)",
      );
    },
  },
  {
    version: 118,
    description: "AID layout order preference on user_settings",
    up: async (client: Client) => {
      const settingsCols = await client.execute("PRAGMA table_info(user_settings)");
      const colNames = new Set(settingsCols.rows.map((r) => String(r.name)));
      if (!colNames.has("aid_layout_order")) {
        await client.execute({
          sql: "ALTER TABLE user_settings ADD COLUMN aid_layout_order TEXT NOT NULL DEFAULT '{}'",
        });
      }
    },
  },
  {
    version: 119,
    description: "Commerce-off complimentary Pro grant marker on users",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(users)");
      const colNames = new Set(cols.rows.map((r) => str(r.name)));
      if (!colNames.has("commerce_complimentary_at")) {
        await client.execute(
          "ALTER TABLE users ADD COLUMN commerce_complimentary_at TEXT NOT NULL DEFAULT ''",
        );
      }
    },
  },
  {
    version: 120,
    description: "MCP analytics events for admin usage dashboard",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS mcp_analytics_events (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          tool_name TEXT,
          auth_type TEXT,
          token_id TEXT,
          metadata TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_mcp_analytics_user ON mcp_analytics_events(user_id)",
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_mcp_analytics_event ON mcp_analytics_events(event_type)",
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_mcp_analytics_created ON mcp_analytics_events(created_at)",
      );
    },
  },
  {
    version: 121,
    description: "Company analysis durable 7-day cache (report + narrative)",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS company_analysis_cache (
          cache_key TEXT PRIMARY KEY,
          ticker TEXT NOT NULL,
          kind TEXT NOT NULL,
          language TEXT NOT NULL DEFAULT '',
          payload_json TEXT NOT NULL DEFAULT '{}',
          generated_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          last_gap_retry_at TEXT,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_company_analysis_cache_ticker ON company_analysis_cache(ticker)",
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_company_analysis_cache_expires ON company_analysis_cache(expires_at)",
      );
    },
  },
  {
    version: 122,
    description: "fund_value_eur column on portfolio_snapshots",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(portfolio_snapshots)");
      const colNames = new Set(cols.rows.map((r) => str(r.name)));
      if (!colNames.has("fund_value_eur")) {
        await client.execute(
          "ALTER TABLE portfolio_snapshots ADD COLUMN fund_value_eur REAL NOT NULL DEFAULT 0",
        );
      }
    },
  },
  {
    version: 123,
    description: "fixed-return fields on cash_entries",
    up: async (client: Client) => {
      const alters = [
        "ALTER TABLE cash_entries ADD COLUMN start_date TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE cash_entries ADD COLUMN term_months INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE cash_entries ADD COLUMN total_return_pct REAL NOT NULL DEFAULT 0",
      ];
      for (const sql of alters) {
        try {
          await client.execute(sql);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("duplicate column")) throw e;
        }
      }
    },
  },
  {
    version: 124,
    description: "portfolio recommendation skip/acted state for home card",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS portfolio_recommendation_state (
          user_id TEXT NOT NULL,
          recommendation_key TEXT NOT NULL,
          status TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (user_id, recommendation_key)
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_portfolio_rec_state_user ON portfolio_recommendation_state(user_id)",
      );
    },
  },
  {
    version: 125,
    description: "weekly portfolio recommendation cache",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS portfolio_recommendation_cache (
          user_id TEXT NOT NULL,
          portfolio_id TEXT NOT NULL DEFAULT '',
          week_key TEXT NOT NULL,
          queue_json TEXT NOT NULL DEFAULT '[]',
          computed_at TEXT NOT NULL,
          PRIMARY KEY (user_id, portfolio_id)
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_portfolio_rec_cache_week ON portfolio_recommendation_cache(week_key)",
      );
    },
  },
  {
    version: 126,
    description: "last_manual_at on portfolio recommendation cache (weekly manual cooldown)",
    up: async (client: Client) => {
      try {
        await client.execute(
          "ALTER TABLE portfolio_recommendation_cache ADD COLUMN last_manual_at TEXT NOT NULL DEFAULT ''",
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("duplicate column")) throw e;
      }
    },
  },
  {
    version: 127,
    description: "TRF-008 dedupe price_alerts and moat_reports; unique indexes",
    up: async (client: Client) => {
      try {
        await client.execute(`
          DELETE FROM price_alerts
          WHERE rowid NOT IN (
            SELECT MIN(rowid) FROM price_alerts
            GROUP BY user_id, ticker, condition, threshold, currency
          )
        `);
      } catch (e: unknown) {
        console.warn("[migration 127] price_alerts dedupe:", e instanceof Error ? e.message : e);
      }

      try {
        await client.execute(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_price_alerts_unique_active
          ON price_alerts(user_id, ticker, condition, threshold, currency)
          WHERE active = 1
        `);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("already exists") && !msg.includes("duplicate")) {
          console.warn("[migration 127] price_alerts unique index:", msg);
        }
      }

      try {
        await client.execute(`
          DELETE FROM moat_reports
          WHERE rowid NOT IN (
            SELECT MAX(rowid) FROM moat_reports
            GROUP BY user_id, symbol, DATE(created_at)
          )
        `);
      } catch (e: unknown) {
        console.warn("[migration 127] moat_reports dedupe:", e instanceof Error ? e.message : e);
      }
    },
  },
  {
    version: 128,
    description: "TRF-008 unique index on moat_reports (user, symbol, day)",
    up: async (client: Client) => {
      try {
        await client.execute(`
          DELETE FROM moat_reports
          WHERE rowid NOT IN (
            SELECT MAX(rowid) FROM moat_reports
            GROUP BY user_id, symbol, DATE(created_at)
          )
        `);
      } catch (e: unknown) {
        console.warn("[migration 128] moat dedupe:", e instanceof Error ? e.message : e);
      }
      try {
        await client.execute(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_moat_reports_unique_day
          ON moat_reports(user_id, symbol, DATE(created_at))
        `);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("already exists") && !msg.includes("duplicate")) {
          console.warn("[migration 128] moat unique index:", msg);
        }
      }
    },
  },
  {
    version: 129,
    description: "Investment screening runs and per-agent output logs",
    up: async (client: Client) => {
      // screening_runs holds the brief the Intake agent produced and — for the
      // mock pipeline slice — a flag so the runs list can filter out fixture
      // rows before the research agents are real.
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS screening_runs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN (
            'draft',
            'needs_clarification',
            'rejected_infeasible',
            'authorized',
            'running',
            'completed'
          )),
          intent TEXT NOT NULL DEFAULT 'explore' CHECK(intent IN ('rebalance', 'explore')),
          brief_json TEXT NOT NULL DEFAULT '',
          mocked_pipeline INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_screening_runs_user_created
          ON screening_runs(user_id, created_at DESC);

        CREATE TABLE IF NOT EXISTS screening_agent_outputs (
          id TEXT PRIMARY KEY,
          run_id TEXT,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          agent_kind TEXT NOT NULL,
          output_json TEXT NOT NULL DEFAULT '',
          latency_ms INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_screening_outputs_user_created
          ON screening_agent_outputs(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_screening_outputs_run
          ON screening_agent_outputs(run_id, created_at DESC);
      `);
    },
  },
  {
    version: 130,
    description: "Investment screening event-driven orchestrator (step queue + events)",
    up: async (client: Client) => {
      // screening_run_steps is the durable queue the worker leases against.
      // depends_on holds a JSON array of step ids that must be 'done' before
      // this step can be leased — fan-out (IR/Web per ticker) piggybacks on
      // the same table by inserting one row per (agent_kind, ticker).
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS screening_run_steps (
          id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL REFERENCES screening_runs(id) ON DELETE CASCADE,
          agent_kind TEXT NOT NULL,
          ticker TEXT,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN (
            'pending',
            'running',
            'done',
            'failed',
            'skipped'
          )),
          attempts INTEGER NOT NULL DEFAULT 0,
          lease_owner TEXT,
          lease_expires_at TEXT,
          depends_on TEXT NOT NULL DEFAULT '[]',
          error_message TEXT,
          started_at TEXT,
          completed_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_screening_run_steps_run_status
          ON screening_run_steps(run_id, status);
        CREATE INDEX IF NOT EXISTS idx_screening_run_steps_status_lease
          ON screening_run_steps(status, lease_expires_at);

        -- append-only event store for audit + replay. Keep payloads small; the
        -- authoritative agent output stays in screening_agent_outputs.
        CREATE TABLE IF NOT EXISTS screening_run_events (
          id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL REFERENCES screening_runs(id) ON DELETE CASCADE,
          step_id TEXT,
          event_type TEXT NOT NULL,
          payload_json TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_screening_run_events_run_created
          ON screening_run_events(run_id, created_at);
      `);
    },
  },
  {
    version: 131,
    description:
      "Screening agent outputs: per-ticker columns for IR fan-out (E4)",
    up: async (client: Client) => {
      // IR / Web agents produce one output row per ticker. ticker + agent_index
      // keep them addressable; index supports list-by-(run, kind, ticker).
      await client.executeMultiple(`
        ALTER TABLE screening_agent_outputs ADD COLUMN ticker TEXT;
        ALTER TABLE screening_agent_outputs ADD COLUMN agent_index INTEGER;

        CREATE INDEX IF NOT EXISTS idx_screening_outputs_run_kind_ticker
          ON screening_agent_outputs(run_id, agent_kind, ticker);
      `);
    },
  },
  {
    version: 132,
    description:
      "Screening QA (Agent 6): per-issue verification rounds table",
    up: async (client: Client) => {
      // One row per QA issue so we can query issues by (run, round) or by
      // (run, agent_kind, ticker) when a rerun handler injects correction
      // hints. The aggregate verdict + issue list is also persisted to
      // screening_agent_outputs under agent_kind='qa' for compose-time reads.
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS screening_qa_rounds (
          id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL REFERENCES screening_runs(id) ON DELETE CASCADE,
          round_number INTEGER NOT NULL,
          verdict TEXT NOT NULL CHECK(verdict IN ('pass','fail','pass_with_degradation')),
          flagged_agent_kinds TEXT NOT NULL DEFAULT '[]',
          degraded_tickers TEXT NOT NULL DEFAULT '[]',
          issue_type TEXT,
          rule_id TEXT,
          agent_kind TEXT,
          ticker TEXT,
          claim_path TEXT,
          expected_value TEXT,
          actual_value TEXT,
          issue_summary TEXT,
          blocking INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_screening_qa_run_round
          ON screening_qa_rounds(run_id, round_number);
        CREATE INDEX IF NOT EXISTS idx_screening_qa_run_created
          ON screening_qa_rounds(run_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_screening_qa_run_kind_ticker
          ON screening_qa_rounds(run_id, agent_kind, ticker);
      `);
    },
  },
  {
    version: 133,
    description:
      "Screening run variable cost ledger + shared ticker research cache",
    up: async (client: Client) => {
      // Variable ops cost only (LLM + Tavily). FMP is a fixed plan cost and is
      // intentionally not allocated per report.
      await client.executeMultiple(`
        ALTER TABLE screening_runs ADD COLUMN cost_usd REAL NOT NULL DEFAULT 0;
        ALTER TABLE screening_runs ADD COLUMN cost_json TEXT NOT NULL DEFAULT '';

        CREATE TABLE IF NOT EXISTS screening_research_cache (
          cache_key TEXT PRIMARY KEY,
          ticker TEXT NOT NULL,
          schema_version TEXT NOT NULL DEFAULT 'v1',
          payload_json TEXT NOT NULL DEFAULT '',
          model TEXT NOT NULL DEFAULT 'mini',
          credits_used REAL NOT NULL DEFAULT 0,
          generated_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_screening_research_cache_ticker
          ON screening_research_cache(ticker, expires_at);
      `);
    },
  },
  {
    version: 134,
    description: "Screening runs: allow analyze intent (single-company)",
    up: async (client: Client) => {
      // SQLite cannot ALTER a CHECK constraint — recreate the table.
      await client.executeMultiple(`
        PRAGMA foreign_keys = OFF;

        CREATE TABLE screening_runs_new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN (
            'draft',
            'needs_clarification',
            'rejected_infeasible',
            'authorized',
            'running',
            'completed'
          )),
          intent TEXT NOT NULL DEFAULT 'explore' CHECK(intent IN ('rebalance', 'explore', 'analyze')),
          brief_json TEXT NOT NULL DEFAULT '',
          mocked_pipeline INTEGER NOT NULL DEFAULT 1,
          cost_usd REAL NOT NULL DEFAULT 0,
          cost_json TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        INSERT INTO screening_runs_new (
          id, user_id, status, intent, brief_json, mocked_pipeline,
          cost_usd, cost_json, created_at, updated_at
        )
        SELECT
          id, user_id, status, intent, brief_json, mocked_pipeline,
          COALESCE(cost_usd, 0), COALESCE(cost_json, ''), created_at, updated_at
        FROM screening_runs;

        DROP TABLE screening_runs;
        ALTER TABLE screening_runs_new RENAME TO screening_runs;

        CREATE INDEX IF NOT EXISTS idx_screening_runs_user_created
          ON screening_runs(user_id, created_at DESC);

        PRAGMA foreign_keys = ON;
      `);
    },
  },
  {
    version: 135,
    description: "Screening runs: index for admin cost ranking",
    up: async (client: Client) => {
      await client.execute(
        `CREATE INDEX IF NOT EXISTS idx_screening_runs_cost_usd
           ON screening_runs(cost_usd DESC, created_at DESC)`,
      );
    },
  },
  {
    version: 136,
    description:
      "Broker integration requests: add broker_name_normalized for case-insensitive demand grouping",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(broker_integration_requests)");
      const colNames = new Set(cols.rows.map((r) => String(r.name)));
      if (!colNames.has("broker_name_normalized")) {
        await client.execute(
          "ALTER TABLE broker_integration_requests ADD COLUMN broker_name_normalized TEXT NOT NULL DEFAULT ''",
        );
      }
      // Backfill. SQLite's LOWER() is ASCII-only — fine for the broker names
      // seen in production so far (Latin-script brand names).
      await client.execute(
        `UPDATE broker_integration_requests
           SET broker_name_normalized = LOWER(TRIM(broker_name))
           WHERE broker_name_normalized = ''`,
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_broker_integration_requests_normalized ON broker_integration_requests(broker_name_normalized)",
      );
    },
  },
  {
    version: 137,
    description: "Acquisition tracking: channel spend caps/entries and Gate 4 decision memos",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS channel_spend_caps (
          id TEXT PRIMARY KEY,
          channel TEXT NOT NULL,
          cap_amount_eur REAL NOT NULL,
          period_start TEXT NOT NULL,
          period_end TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_channel_spend_caps_channel ON channel_spend_caps(channel, period_start DESC)",
      );
      await client.execute(`
        CREATE TABLE IF NOT EXISTS channel_spend_entries (
          id TEXT PRIMARY KEY,
          channel TEXT NOT NULL,
          amount_eur REAL NOT NULL,
          spent_on TEXT NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_channel_spend_entries_channel ON channel_spend_entries(channel, spent_on DESC)",
      );
      await client.execute(`
        CREATE TABLE IF NOT EXISTS acquisition_decision_memos (
          id TEXT PRIMARY KEY,
          period_start TEXT NOT NULL,
          period_end TEXT NOT NULL,
          decision TEXT NOT NULL CHECK(decision IN ('scale', 'iterate', 'stop')),
          notes TEXT NOT NULL DEFAULT '',
          next_cycle_kpi_targets TEXT NOT NULL DEFAULT '',
          budget_reallocation TEXT NOT NULL DEFAULT '',
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_acquisition_decision_memos_period ON acquisition_decision_memos(period_start DESC)",
      );
    },
  },
  {
    version: 138,
    description: "SnapTrade connections: add first_sync_notified_at for first-holdings activation email",
    up: async (client: Client) => {
      const cols = await client.execute("PRAGMA table_info(snaptrade_connections)");
      const colNames = new Set(cols.rows.map((r) => String(r.name)));
      if (!colNames.has("first_sync_notified_at")) {
        await client.execute(
          "ALTER TABLE snaptrade_connections ADD COLUMN first_sync_notified_at TEXT NOT NULL DEFAULT ''",
        );
      }
      // Backfill: users who already have holdings shouldn't get a stray
      // "your portfolio is ready" email for data that's been there for months.
      await client.execute(`
        UPDATE snaptrade_connections
           SET first_sync_notified_at = datetime('now')
         WHERE first_sync_notified_at = ''
           AND user_id IN (SELECT DISTINCT user_id FROM holdings)
      `);
    },
  },
  {
    version: 139,
    description: "First-party A/B/C experiments + empty_activation draft seed",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS experiments (
          id TEXT PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'draft'
            CHECK(status IN ('draft', 'running', 'paused', 'archived')),
          variants_json TEXT NOT NULL,
          metrics_json TEXT NOT NULL,
          reset_generation INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          launched_at TEXT NOT NULL DEFAULT '',
          reset_at TEXT NOT NULL DEFAULT ''
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status)",
      );
      await client.execute(`
        CREATE TABLE IF NOT EXISTS experiment_assignments (
          experiment_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          variant TEXT NOT NULL,
          assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (experiment_id, user_id)
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user ON experiment_assignments(user_id)",
      );

      // Seed empty_activation in draft — human launches from admin.
      const existing = await client.execute({
        sql: "SELECT id FROM experiments WHERE key = ?",
        args: ["empty_activation"],
      });
      if (existing.rows.length === 0) {
        await client.execute({
          sql: `INSERT INTO experiments (
                  id, key, name, description, status, variants_json, metrics_json
                ) VALUES (?, ?, ?, ?, 'draft', ?, ?)`,
          args: [
            "exp_empty_activation",
            "empty_activation",
            "Empty activation (welcome dashboard)",
            "A/B/C layouts for the post-onboarding empty portfolio surface on Home v2.",
            JSON.stringify([
              { key: "control", weight: 34 },
              { key: "portfolio_first", weight: 33 },
              { key: "job_chooser", weight: 33 },
            ]),
            JSON.stringify(["empty_activation_cta", "holding_add"]),
          ],
        });
      }
    },
  },
  {
    version: 140,
    description: "portfolio_anomalies table for staff anomaly agent triage",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS portfolio_anomalies (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'open'
            CHECK(status IN ('open', 'acked', 'fixed', 'dismissed')),
          severity TEXT NOT NULL DEFAULT 'warn'
            CHECK(severity IN ('error', 'warn', 'info')),
          codes_json TEXT NOT NULL DEFAULT '[]',
          findings_json TEXT NOT NULL DEFAULT '[]',
          ai_explanation TEXT NOT NULL DEFAULT '',
          remediation_prompt TEXT NOT NULL DEFAULT '',
          fingerprint TEXT NOT NULL,
          notified_at TEXT NOT NULL DEFAULT '',
          resolved_at TEXT NOT NULL DEFAULT '',
          resolved_by TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_portfolio_anomalies_status_severity ON portfolio_anomalies(status, severity, updated_at DESC)",
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_portfolio_anomalies_user_fp ON portfolio_anomalies(user_id, fingerprint)",
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_portfolio_anomalies_user_status ON portfolio_anomalies(user_id, status)",
      );
    },
  },
  {
    version: 141,
    description: "Backfill blank portfolio_id on holdings/transactions/cash to each user's default portfolio",
    up: async (client: Client) => {
      for (const table of ["holdings", "transactions", "cash_entries"] as const) {
        await client.execute({
          sql: `UPDATE ${table} SET portfolio_id = (
                  SELECT p.id FROM portfolios p
                  WHERE p.user_id = ${table}.user_id AND p.is_default = 1
                  LIMIT 1
                )
                WHERE (portfolio_id = '' OR portfolio_id IS NULL)
                  AND EXISTS (
                    SELECT 1 FROM portfolios p
                    WHERE p.user_id = ${table}.user_id AND p.is_default = 1
                  )`,
        });
      }
    },
  },
  {
    version: 142,
    description: "Archive table for portfolio resets so wiped ledgers can be recovered",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS portfolio_reset_archives (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          portfolio_id TEXT NOT NULL DEFAULT '',
          holdings_json TEXT NOT NULL DEFAULT '[]',
          transactions_json TEXT NOT NULL DEFAULT '[]',
          cash_json TEXT NOT NULL DEFAULT '[]',
          snapshot_max_eur REAL NOT NULL DEFAULT 0,
          source TEXT NOT NULL DEFAULT 'reset_portfolio',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_portfolio_reset_archives_user ON portfolio_reset_archives(user_id, created_at DESC)",
      );
    },
  },
  {
    version: 143,
    description: "Watch restored-holdings email recipients and alert ProdOps on first return",
    up: async (client: Client) => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS user_return_watches (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reason TEXT NOT NULL DEFAULT 'holdings_restore_support_email',
          email_sent_at TEXT NOT NULL,
          notified_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(user_id, reason)
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_return_watches_open ON user_return_watches(notified_at, email_sent_at)",
      );

      const { randomUUID } = await import("crypto");
      const sent = await client.execute({
        sql: `SELECT user_id, MIN(sent_at) AS sent_at
              FROM email_sends
              WHERE user_id IS NOT NULL AND user_id != ''
                AND status IN ('sent', 'delivered')
                AND (
                  subject LIKE '%holdings are back%'
                  OR subject LIKE '%posiciones del portfolio%'
                )
              GROUP BY user_id`,
      });
      for (const row of sent.rows) {
        const userId = String(row.user_id || "");
        const emailSentAt = String(row.sent_at || "");
        if (!userId || !emailSentAt) continue;
        await client.execute({
          sql: `INSERT OR IGNORE INTO user_return_watches (id, user_id, reason, email_sent_at)
                VALUES (?, ?, 'holdings_restore_support_email', ?)`,
          args: [randomUUID(), userId, emailSentAt],
        });
      }
    },
  },
  {
    version: 144,
    description: "Refresh email templates to drop Folio / Bifolio / Trefolio plan names",
    up: async (client: Client) => {
      const { EMAIL_TEMPLATE_SEEDS } = await import("./email-template-seeds");
      for (const t of EMAIL_TEMPLATE_SEEDS) {
        await client.execute({
          sql: `UPDATE email_templates
                SET name = ?, subject = ?, subject_es = ?,
                    body_html = ?, body_html_es = ?,
                    body_text = ?, body_text_es = ?,
                    updated_at = datetime('now')
                WHERE slug = ?`,
          args: [
            t.name,
            t.subject,
            t.subjectEs,
            t.bodyHtml,
            t.bodyHtmlEs,
            t.bodyText,
            t.bodyTextEs,
            t.slug,
          ],
        });
      }
    },
  },
  {
    version: 145,
    description: "Price alert uniqueness by type + alert_dispatch_log for admin observability",
    up: async (client: Client) => {
      try {
        await client.execute("DROP INDEX IF EXISTS idx_price_alerts_unique_active");
      } catch (e: unknown) {
        console.warn("[migration 145] drop old unique index:", e instanceof Error ? e.message : e);
      }

      // Collapse duplicate active percent alerts before installing the stricter unique key
      try {
        await client.execute(`
          DELETE FROM price_alerts
          WHERE alert_type = 'percent_change' AND active = 1 AND rowid NOT IN (
            SELECT MIN(rowid) FROM price_alerts
            WHERE alert_type = 'percent_change' AND active = 1
            GROUP BY user_id, ticker, percent_basis, percent_value, is_portfolio_wide, portfolio_id
          )
        `);
      } catch (e: unknown) {
        console.warn("[migration 145] percent dedupe:", e instanceof Error ? e.message : e);
      }

      try {
        await client.execute(`
          DELETE FROM price_alerts
          WHERE alert_type = 'threshold' AND active = 1 AND rowid NOT IN (
            SELECT MIN(rowid) FROM price_alerts
            WHERE alert_type = 'threshold' AND active = 1
            GROUP BY user_id, ticker, condition, threshold, currency
          )
        `);
      } catch (e: unknown) {
        console.warn("[migration 145] threshold dedupe:", e instanceof Error ? e.message : e);
      }

      try {
        await client.execute(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_price_alerts_unique_threshold
          ON price_alerts(user_id, ticker, condition, threshold, currency)
          WHERE active = 1 AND alert_type = 'threshold'
        `);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("already exists") && !msg.includes("duplicate")) {
          console.warn("[migration 145] threshold unique index:", msg);
        }
      }

      try {
        await client.execute(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_price_alerts_unique_percent
          ON price_alerts(user_id, ticker, percent_basis, percent_value, is_portfolio_wide, portfolio_id)
          WHERE active = 1 AND alert_type = 'percent_change'
        `);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("already exists") && !msg.includes("duplicate")) {
          console.warn("[migration 145] percent unique index:", msg);
        }
      }

      await client.execute(`
        CREATE TABLE IF NOT EXISTS alert_dispatch_log (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          alert_id TEXT NOT NULL DEFAULT '',
          ticker TEXT NOT NULL DEFAULT '',
          alert_type TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT '',
          channels_requested TEXT NOT NULL DEFAULT '',
          channels_sent TEXT NOT NULL DEFAULT '',
          channels_failed TEXT NOT NULL DEFAULT '',
          channels_skipped TEXT NOT NULL DEFAULT '[]',
          details TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_alert_dispatch_log_created ON alert_dispatch_log(created_at)",
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_alert_dispatch_log_user ON alert_dispatch_log(user_id)",
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_alert_dispatch_log_status ON alert_dispatch_log(status)",
      );
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
