import { ensureInitialized } from "./client";
import { str, parseRefreshInterval, ADMIN_DEFAULT_USERNAME } from "./helpers";
import type { UserSettings } from "./helpers";
import type { ApiProviderName, Language } from "@/lib/types";
import { isValidLanguage } from "@/lib/languages";
import { encrypt, tryDecryptOrPlaintext } from "@/lib/crypto";

export type PlatformFeature = "alerts_enabled" | "csv_export_enabled";

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
    alphaVantageApiKey: tryDecryptOrPlaintext(str(row.alpha_vantage_api_key)),
    language: (isValidLanguage(String(row.language)) ? String(row.language) : "en") as Language,
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

export async function getGlobalAlphaVantageApiKey(): Promise<string> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT us.alpha_vantage_api_key FROM user_settings us
          JOIN users u ON u.id = us.user_id
          WHERE u.role = 'admin' AND us.alpha_vantage_api_key != ''
          ORDER BY u.created_at ASC LIMIT 1`,
  });
  if (result.rows.length === 0) return "";
  return tryDecryptOrPlaintext(str(result.rows[0].alpha_vantage_api_key));
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

export async function getGlobalOpenAIApiKey(): Promise<string> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT us.openai_api_key FROM user_settings us
          JOIN users u ON u.id = us.user_id
          WHERE u.role = 'admin' AND us.openai_api_key != ''
          ORDER BY u.created_at ASC LIMIT 1`,
  });
  if (result.rows.length === 0) return "";
  return tryDecryptOrPlaintext(str(result.rows[0].openai_api_key));
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

export async function getPlatformSetting(key: string): Promise<string> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT value FROM platform_settings WHERE key = ?",
    args: [key],
  });
  if (result.rows.length === 0) return "";
  return str(result.rows[0].value);
}

export async function setPlatformSetting(key: string, value: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `INSERT INTO platform_settings (key, value) VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [key, value],
  });
}

export async function isFeatureEnabled(feature: PlatformFeature): Promise<boolean> {
  const val = await getPlatformSetting(feature);
  return val === "true";
}

export async function setFeatureEnabled(feature: PlatformFeature, enabled: boolean): Promise<void> {
  await setPlatformSetting(feature, enabled ? "true" : "false");
}

export async function getGlobalResendApiKey(): Promise<string> {
  const val = await getPlatformSetting("resend_api_key");
  if (!val) return "";
  return tryDecryptOrPlaintext(val);
}

export async function setGlobalResendApiKey(key: string): Promise<void> {
  await setPlatformSetting("resend_api_key", key ? encrypt(key) : "");
}

export async function getAllPlatformSettings(): Promise<Record<string, string>> {
  const client = await ensureInitialized();
  const result = await client.execute("SELECT key, value FROM platform_settings");
  const settings: Record<string, string> = {};
  for (const row of result.rows) {
    settings[str(row.key)] = str(row.value);
  }
  return settings;
}
