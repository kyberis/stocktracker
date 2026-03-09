import { ensureInitialized } from "./client";
import { str, parseRefreshInterval } from "./helpers";
import type { UserSettings } from "./helpers";
import type { Language } from "@/lib/types";
import { isValidLanguage } from "@/lib/languages";
import { encrypt, tryDecryptOrPlaintext } from "@/lib/crypto";

export type PlatformFeature = "alerts_enabled" | "csv_export_enabled" | "apple_signin_enabled" | "device_enabled";

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT language, refresh_interval FROM user_settings WHERE user_id = ?",
    args: [userId],
  });

  if (result.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO user_settings (user_id, language, refresh_interval)
            VALUES (?, 'en', 15)`,
      args: [userId],
    });
    return { language: "en", refreshInterval: 15 };
  }

  const row = result.rows[0];
  return {
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
    language: updates.language ?? current.language,
    refreshInterval: updates.refreshInterval ?? current.refreshInterval,
  };

  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE user_settings SET language = ?, refresh_interval = ? WHERE user_id = ?",
    args: [next.language, next.refreshInterval, userId],
  });

  return next;
}

export function getGlobalAlphaVantageApiKey(): string {
  return process.env.STOCKTRACKER_ALPHAVANTAGE_API_KEY || "";
}

export function getGlobalOpenAIApiKey(): string {
  return process.env.STOCKTRACKER_OPENAI_API_KEY || "";
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
