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
      plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'starter', 'pro')),
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
          if (c.name === "plan") def += " CHECK(plan IN ('free', 'starter', 'pro'))";
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
      const cols = await client.execute("PRAGMA table_info(feedback)");
      const colNames = new Set(cols.rows.map((r) => str(r.name)));
      if (!colNames.has("type")) {
        await client.execute(
          `ALTER TABLE feedback ADD COLUMN type TEXT NOT NULL DEFAULT 'feedback'`
        );
      }
      if (!colNames.has("user_context")) {
        await client.execute(
          `ALTER TABLE feedback ADD COLUMN user_context TEXT NOT NULL DEFAULT ''`
        );
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
