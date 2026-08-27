import { describe, it, expect, vi, beforeEach } from "vitest";
import * as settings from "./settings";
import { isValidLanguage } from "@/lib/languages";

const { mockExecute, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockClient = { execute: mockExecute };
  return { mockExecute, mockClient };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

vi.mock("@/lib/languages", () => ({
  isValidLanguage: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn().mockReturnValue("encrypted"),
  tryDecryptOrPlaintext: vi.fn().mockImplementation((v: string) => v),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockExecute.mockReset();
  settings.invalidatePlatformSettingsCache();
});

const DEFAULT_SETTINGS = {
  language: "en",
  refreshInterval: 15,
  alertChannels: ["email"],
  telegramChatId: "",
  telegramLinkToken: "",
  telegramLinkExpiresAt: "",
  alertDeviceEnabled: false,
  dashboardTheme: "default",
  defaultCurrency: "EUR",
  emailNotificationsEnabled: true,
  favoriteToolIds: [] as string[],
};

const settingsRow = {
  language: "en",
  refresh_interval: 15,
  alert_channels: "email",
  telegram_chat_id: "",
  telegram_link_token: "",
  telegram_link_expires_at: "",
  alert_device_enabled: 0,
  dashboard_theme: "default",
  default_currency: "EUR",
  email_notifications_enabled: 1,
  favorite_tool_ids: "[]",
};

describe("settings", () => {
  describe("getUserSettings", () => {
    it("returns DEFAULT_SETTINGS and inserts defaults when no row found", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await settings.getUserSettings("u1");

      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        sql: "SELECT language, refresh_interval, alert_channels, telegram_chat_id, telegram_link_token, telegram_link_expires_at, alert_device_enabled, dashboard_theme, default_currency, email_notifications_enabled, favorite_tool_ids FROM user_settings WHERE user_id = ?",
        args: ["u1"],
      });
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining("INSERT INTO user_settings"),
        args: ["u1"],
      });
      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it("returns parsed settings when row found", async () => {
      mockExecute.mockResolvedValue({ rows: [settingsRow] });

      const result = await settings.getUserSettings("u1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT language, refresh_interval, alert_channels, telegram_chat_id, telegram_link_token, telegram_link_expires_at, alert_device_enabled, dashboard_theme, default_currency, email_notifications_enabled, favorite_tool_ids FROM user_settings WHERE user_id = ?",
        args: ["u1"],
      });
      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it("parses custom values when row has overrides", async () => {
      mockExecute.mockResolvedValue({
        rows: [{
          ...settingsRow,
          language: "es",
          refresh_interval: 30,
          alert_channels: "email,telegram",
          telegram_chat_id: "12345",
          telegram_link_token: "",
          telegram_link_expires_at: "",
          alert_device_enabled: 1,
          dashboard_theme: "terminal",
          default_currency: "USD",
        }],
      });

      const result = await settings.getUserSettings("u1");

      expect(result).toEqual({
        language: "es",
        refreshInterval: 30,
        alertChannels: ["email", "telegram"],
        telegramChatId: "12345",
        telegramLinkToken: "",
        telegramLinkExpiresAt: "",
        alertDeviceEnabled: true,
        dashboardTheme: "terminal",
        defaultCurrency: "USD",
        emailNotificationsEnabled: true,
        favoriteToolIds: [],
      });
    });

    it("falls back to default theme when invalid dashboard_theme", async () => {
      mockExecute.mockResolvedValue({
        rows: [{ ...settingsRow, dashboard_theme: "invalid_theme" }],
      });

      const result = await settings.getUserSettings("u1");

      expect(result.dashboardTheme).toBe("default");
    });

    it("falls back to EUR when invalid default_currency", async () => {
      mockExecute.mockResolvedValue({
        rows: [{ ...settingsRow, default_currency: "XXX" }],
      });

      const result = await settings.getUserSettings("u1");

      expect(result.defaultCurrency).toBe("EUR");
    });

    it("falls back to en when invalid language", async () => {
      vi.mocked(isValidLanguage).mockReturnValueOnce(false);
      mockExecute.mockResolvedValue({
        rows: [{ ...settingsRow, language: "zz" }],
      });

      const result = await settings.getUserSettings("u1");

      expect(result.language).toBe("en");
    });
  });

  describe("updateUserSettings", () => {
    it("merges updates with current settings and executes UPDATE", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [settingsRow] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await settings.updateUserSettings("u1", {
        language: "es",
        refreshInterval: 30,
      });

      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining("UPDATE user_settings SET"),
        args: expect.arrayContaining(["es", 30, "email", "", "", "", 0, "default", "EUR", 1, "[]", "u1"]),
      });
      expect(result).toMatchObject({
        language: "es",
        refreshInterval: 30,
      });
    });
  });

  describe("getTelegramQuota", () => {
    it("returns allowed=true when under all limits", async () => {
      const now = new Date().toISOString().slice(0, 10);
      mockExecute
        .mockResolvedValueOnce({
          rows: [{
            wa_msgs_today: 2,
            wa_daily_reset_at: now,
            wa_msgs_month: 10,
            wa_monthly_reset_at: `${now.slice(0, 7)}-01`,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ value: "100" }] })
        .mockResolvedValueOnce({ rows: [{ value: `${now.slice(0, 7)}-01` }] });

      const result = await settings.getTelegramQuota("u1");

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.userToday).toBe(2);
      expect(result.userMonth).toBe(10);
      expect(result.userDailyLimit).toBe(5);
      expect(result.userMonthlyLimit).toBe(30);
      expect(result.globalMonthlyLimit).toBe(3000);
    });

    it("returns allowed=false with reason daily_limit when userToday >= limit", async () => {
      const now = new Date().toISOString().slice(0, 10);
      mockExecute
        .mockResolvedValueOnce({
          rows: [{
            wa_msgs_today: 5,
            wa_daily_reset_at: now,
            wa_msgs_month: 0,
            wa_monthly_reset_at: now,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ value: "0" }] })
        .mockResolvedValueOnce({ rows: [{ value: now }] });

      const result = await settings.getTelegramQuota("u1");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("daily_limit");
      expect(result.userToday).toBe(5);
    });

    it("returns allowed=false with reason monthly_limit when userMonth >= limit", async () => {
      const now = new Date().toISOString().slice(0, 10);
      mockExecute
        .mockResolvedValueOnce({
          rows: [{
            wa_msgs_today: 0,
            wa_daily_reset_at: now,
            wa_msgs_month: 30,
            wa_monthly_reset_at: `${now.slice(0, 7)}-01`,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ value: "0" }] })
        .mockResolvedValueOnce({ rows: [{ value: `${now.slice(0, 7)}-01` }] });

      const result = await settings.getTelegramQuota("u1");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("monthly_limit");
      expect(result.userMonth).toBe(30);
    });

    it("returns allowed=false with reason global_limit when globalMonth >= limit", async () => {
      const now = new Date().toISOString().slice(0, 10);
      mockExecute
        .mockResolvedValueOnce({
          rows: [{
            wa_msgs_today: 0,
            wa_daily_reset_at: now,
            wa_msgs_month: 0,
            wa_monthly_reset_at: now,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ value: "3000" }] })
        .mockResolvedValueOnce({ rows: [{ value: `${now.slice(0, 7)}-01` }] });

      const result = await settings.getTelegramQuota("u1");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("global_limit");
      expect(result.globalMonth).toBe(3000);
    });
  });

  describe("incrementTelegramCounter", () => {
    it("returns early when no user row found", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      await settings.incrementTelegramCounter("u1");

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT wa_daily_reset_at, wa_monthly_reset_at FROM user_settings WHERE user_id = ?",
        args: ["u1"],
      });
    });

    it("updates user and global counters when no resets needed (4 executes)", async () => {
      const now = new Date();
      const todayIso = now.toISOString();
      const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
      mockExecute
        .mockResolvedValueOnce({
          rows: [{
            wa_daily_reset_at: todayIso,
            wa_monthly_reset_at: monthStart,
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ value: monthStart }] })
        .mockResolvedValueOnce({ rows: [] });

      await settings.incrementTelegramCounter("u1");

      expect(mockExecute).toHaveBeenCalledTimes(4);
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining("UPDATE user_settings SET"),
        args: expect.arrayContaining([0, 0, "u1"]),
      });
      expect(mockExecute).toHaveBeenNthCalledWith(4, {
        sql: expect.stringContaining("wa_global_msgs_month"),
      });
    });

    it("resets global counter and writes reset_at when global month reset (5 executes)", async () => {
      const now = new Date();
      const todayIso = now.toISOString();
      // Use day-1 of previous UTC month — setUTCMonth(now-1) on day 31 can roll
      // into the current month (e.g. Jul 31 → Jun 31 → Jul 1).
      const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const oldMonthStart = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}-01`;
      mockExecute
        .mockResolvedValueOnce({
          rows: [{
            wa_daily_reset_at: todayIso,
            wa_monthly_reset_at: oldMonthStart,
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ value: oldMonthStart }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await settings.incrementTelegramCounter("u1");

      expect(mockExecute).toHaveBeenCalledTimes(5);
      expect(mockExecute).toHaveBeenNthCalledWith(4, {
        sql: expect.stringContaining("wa_global_msgs_month"),
      });
      expect(mockExecute).toHaveBeenNthCalledWith(5, {
        sql: expect.stringContaining("wa_global_monthly_reset_at"),
        args: expect.any(Array),
      });
    });
  });

  describe("getPlatformSetting", () => {
    it("returns value when row found", async () => {
      mockExecute.mockResolvedValue({ rows: [{ key: "my_key", value: "my-value" }] });

      const result = await settings.getPlatformSetting("my_key");

      expect(mockExecute).toHaveBeenCalledWith("SELECT key, value FROM platform_settings");
      expect(result).toBe("my-value");
    });

    it("returns empty string when no row found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      const result = await settings.getPlatformSetting("missing_key");

      expect(result).toBe("");
    });

    it("reuses the in-process cache within the TTL", async () => {
      mockExecute.mockResolvedValue({ rows: [{ key: "my_key", value: "cached" }] });

      await settings.getPlatformSetting("my_key");
      await settings.getPlatformSetting("my_key");

      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it("refetches after cache invalidation", async () => {
      mockExecute.mockResolvedValue({ rows: [{ key: "my_key", value: "v1" }] });
      await settings.getPlatformSetting("my_key");
      settings.invalidatePlatformSettingsCache();
      mockExecute.mockResolvedValue({ rows: [{ key: "my_key", value: "v2" }] });

      const result = await settings.getPlatformSetting("my_key");

      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(result).toBe("v2");
    });
  });

  describe("setPlatformSetting", () => {
    it("inserts or replaces key-value in platform_settings", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      await settings.setPlatformSetting("my_key", "my_value");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("INSERT INTO platform_settings"),
        args: ["my_key", "my_value"],
      });
    });
  });

  describe("isFeatureEnabled", () => {
    it("returns true when platform setting is 'true'", async () => {
      mockExecute.mockResolvedValue({ rows: [{ key: "telegram_enabled", value: "true" }] });

      const result = await settings.isFeatureEnabled("telegram_enabled");

      expect(result).toBe(true);
    });

    it("returns false when platform setting is 'false'", async () => {
      mockExecute.mockResolvedValue({ rows: [{ key: "telegram_enabled", value: "false" }] });

      const result = await settings.isFeatureEnabled("telegram_enabled");

      expect(result).toBe(false);
    });

    it("returns DEFAULT_ENABLED_FLAGS default when no setting", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      const resultEnabled = await settings.isFeatureEnabled("telegram_enabled");
      const resultDisabled = await settings.isFeatureEnabled("alerts_enabled");
      const lifecycleActivation = await settings.isFeatureEnabled("lifecycle_activation_email_enabled");

      expect(resultEnabled).toBe(true);
      expect(resultDisabled).toBe(false);
      expect(lifecycleActivation).toBe(true);
    });

    it("defaults portfolio_anomaly_agent and display_invariants off", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      expect(await settings.isFeatureEnabled("portfolio_anomaly_agent")).toBe(false);
      expect(await settings.isFeatureEnabled("display_invariants")).toBe(false);
    });
  });

  describe("ALL_PLATFORM_FEATURES", () => {
    it("includes admin UI flags that used to be missing from GET", () => {
      expect(settings.ALL_PLATFORM_FEATURES).toEqual(
        expect.arrayContaining([
          "portfolio_anomaly_agent",
          "display_invariants",
          "weekly_digest_free_tier_enabled",
          "lifecycle_activation_email_enabled",
          "lifecycle_winback_email_enabled",
          "mcp_fmp_proxy",
          "import_broker_picker_enabled",
        ]),
      );
    });
  });

  describe("setFeatureEnabled", () => {
    it("sets feature to true", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      await settings.setFeatureEnabled("csv_export_enabled", true);

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("INSERT INTO platform_settings"),
        args: ["csv_export_enabled", "true"],
      });
    });

    it("sets feature to false", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      await settings.setFeatureEnabled("csv_export_enabled", false);

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("INSERT INTO platform_settings"),
        args: ["csv_export_enabled", "false"],
      });
    });
  });

  describe("getGlobalAlphaVantageApiKey", () => {
    const origEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...origEnv };
    });

    it("returns env value when STOCKTRACKER_ALPHAVANTAGE_API_KEY is set", () => {
      process.env.STOCKTRACKER_ALPHAVANTAGE_API_KEY = "av-key-123";

      const result = settings.getGlobalAlphaVantageApiKey();

      expect(result).toBe("av-key-123");
    });

    it("returns empty string when env not set", () => {
      delete process.env.STOCKTRACKER_ALPHAVANTAGE_API_KEY;

      const result = settings.getGlobalAlphaVantageApiKey();

      expect(result).toBe("");
    });
  });

  describe("getGlobalResendApiKey", () => {
    it("returns decrypted value when resend_api_key is set", async () => {
      mockExecute.mockResolvedValue({ rows: [{ key: "resend_api_key", value: "stored-key" }] });

      const result = await settings.getGlobalResendApiKey();

      expect(mockExecute).toHaveBeenCalledWith("SELECT key, value FROM platform_settings");
      expect(result).toBe("stored-key");
    });

    it("returns empty string when no resend_api_key", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      const result = await settings.getGlobalResendApiKey();

      expect(result).toBe("");
    });
  });

  describe("setGlobalResendApiKey", () => {
    it("encrypts and stores key when non-empty", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      await settings.setGlobalResendApiKey("my-resend-key");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("INSERT INTO platform_settings"),
        args: ["resend_api_key", "encrypted"],
      });
    });

    it("stores empty string when key is empty", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      await settings.setGlobalResendApiKey("");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("INSERT INTO platform_settings"),
        args: ["resend_api_key", ""],
      });
    });
  });

  describe("getGlobalOpenAIApiKey", () => {
    const origEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...origEnv };
    });

    it("returns env value when STOCKTRACKER_OPENAI_API_KEY is set", () => {
      delete process.env.AI_GATEWAY_API_KEY;
      delete process.env.VERCEL_OIDC_TOKEN;
      process.env.STOCKTRACKER_OPENAI_API_KEY = "openai-key-123";

      const result = settings.getGlobalOpenAIApiKey();

      expect(result).toBe("openai-key-123");
    });

    it("prefers AI_GATEWAY_API_KEY over STOCKTRACKER_OPENAI_API_KEY", () => {
      process.env.AI_GATEWAY_API_KEY = "gw-key";
      process.env.STOCKTRACKER_OPENAI_API_KEY = "legacy";

      expect(settings.getGlobalOpenAIApiKey()).toBe("gw-key");
    });

    it("returns empty string when env not set", () => {
      delete process.env.STOCKTRACKER_OPENAI_API_KEY;
      delete process.env.AI_GATEWAY_API_KEY;
      delete process.env.VERCEL_OIDC_TOKEN;

      const result = settings.getGlobalOpenAIApiKey();

      expect(result).toBe("");
    });
  });

  describe("getStripePriceConfig", () => {
    it("returns db value when platform setting exists", async () => {
      mockExecute.mockResolvedValue({
        rows: [{ key: "stripe_price_pro_monthly", value: "price_abc123" }],
      });

      const result = await settings.getStripePriceConfig("stripe_price_pro_monthly");

      expect(mockExecute).toHaveBeenCalledWith("SELECT key, value FROM platform_settings");
      expect(result).toBe("price_abc123");
    });

    it("returns env fallback when db empty", async () => {
      const origEnv = process.env.STRIPE_PRICE_PRO_MONTHLY;
      process.env.STRIPE_PRICE_PRO_MONTHLY = "price_env_fallback";
      mockExecute.mockResolvedValue({ rows: [] });

      const result = await settings.getStripePriceConfig("stripe_price_pro_monthly");

      expect(result).toBe("price_env_fallback");
      process.env.STRIPE_PRICE_PRO_MONTHLY = origEnv;
    });
  });

  describe("getAllStripePriceConfig", () => {
    it("returns all stripe price configs via getStripePriceConfig", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      const result = await settings.getAllStripePriceConfig();

      expect(mockExecute).toHaveBeenCalled();
      expect(result).toHaveProperty("stripe_price_pro_monthly");
      expect(result).toHaveProperty("stripe_price_pro_annual");
      expect(Object.keys(result)).toHaveLength(3);
    });
  });

  describe("setStripePriceConfig", () => {
    it("sets platform setting for stripe price key", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      await settings.setStripePriceConfig("stripe_price_pro_annual", "price_xyz");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("INSERT INTO platform_settings"),
        args: ["stripe_price_pro_annual", "price_xyz"],
      });
    });
  });

  describe("getPromoBannerConfig", () => {
    it("returns DEFAULT_PROMO_BANNER when no raw setting", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      const result = await settings.getPromoBannerConfig();

      expect(mockExecute).toHaveBeenCalledWith("SELECT key, value FROM platform_settings");
      expect(result).toMatchObject({ enabled: false, title: expect.any(String) });
    });

    it("returns merged config when valid JSON", async () => {
      mockExecute.mockResolvedValue({
        rows: [{
          key: "promo_banner_config",
          value: JSON.stringify({ enabled: true, title: "Custom Promo" }),
        }],
      });

      const result = await settings.getPromoBannerConfig();

      expect(result.enabled).toBe(true);
      expect(result.title).toBe("Custom Promo");
    });

    it("returns DEFAULT_PROMO_BANNER when JSON parse fails", async () => {
      mockExecute.mockResolvedValue({ rows: [{ key: "promo_banner_config", value: "not-valid-json" }] });

      const result = await settings.getPromoBannerConfig();

      expect(result).toMatchObject({ enabled: false });
    });
  });

  describe("setPromoBannerConfig", () => {
    it("merges config and persists via setPlatformSetting", async () => {
      mockExecute
        .mockResolvedValueOnce({
          rows: [{ key: "promo_banner_config", value: JSON.stringify({ enabled: false }) }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await settings.setPromoBannerConfig({ enabled: true });

      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining("INSERT INTO platform_settings"),
        args: ["promo_banner_config", expect.stringContaining('"enabled":true')],
      });
      expect(result.enabled).toBe(true);
    });
  });

  describe("getGaMeasurementId", () => {
    it("returns db value when platform setting exists", async () => {
      mockExecute.mockResolvedValue({ rows: [{ key: "ga_measurement_id", value: "G-ABC123" }] });

      const result = await settings.getGaMeasurementId();

      expect(mockExecute).toHaveBeenCalledWith("SELECT key, value FROM platform_settings");
      expect(result).toBe("G-ABC123");
    });

    it("returns env fallback when db empty", async () => {
      const origEnv = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-ENV123";
      mockExecute.mockResolvedValue({ rows: [] });

      const result = await settings.getGaMeasurementId();

      expect(result).toBe("G-ENV123");
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = origEnv;
    });
  });

  describe("setGaMeasurementId", () => {
    it("trims and stores ga_measurement_id", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      await settings.setGaMeasurementId("  G-ABC123  ");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("INSERT INTO platform_settings"),
        args: ["ga_measurement_id", "G-ABC123"],
      });
    });
  });

  describe("getAdConfig", () => {
    it("returns default config with env clientId when no raw setting", async () => {
      const origEnv = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = "ca-pub-env";
      mockExecute.mockResolvedValue({ rows: [] });

      const result = await settings.getAdConfig();

      expect(mockExecute).toHaveBeenCalledWith("SELECT key, value FROM platform_settings");
      expect(result.clientId).toBe("ca-pub-env");
      expect(result.globalEnabled).toBe(false);
      expect(result.slots).toHaveProperty("dashboard-summary");
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = origEnv;
    });

    it("returns parsed config with merged slots when valid JSON", async () => {
      mockExecute.mockResolvedValue({
        rows: [{
          key: "ad_config",
          value: JSON.stringify({
            clientId: "ca-pub-db",
            globalEnabled: true,
            slots: { "dashboard-summary": { enabled: false, slotId: "slot-123" } },
          }),
        }],
      });

      const result = await settings.getAdConfig();

      expect(result.clientId).toBe("ca-pub-db");
      expect(result.globalEnabled).toBe(true);
      expect(result.slots["dashboard-summary"]).toEqual({ enabled: false, slotId: "slot-123" });
    });

    it("returns default config when JSON parse fails", async () => {
      mockExecute.mockResolvedValue({ rows: [{ key: "ad_config", value: "invalid" }] });

      const result = await settings.getAdConfig();

      expect(result.globalEnabled).toBe(false);
      expect(result.slots).toBeDefined();
    });

    it("uses envClientId when parsed clientId is empty", async () => {
      const origEnv = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = "ca-pub-fallback";
      mockExecute.mockResolvedValue({
        rows: [{ key: "ad_config", value: JSON.stringify({ clientId: "", globalEnabled: true }) }],
      });

      const result = await settings.getAdConfig();

      expect(result.clientId).toBe("ca-pub-fallback");
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = origEnv;
    });

    it("skips unknown slot keys when merging parsed slots", async () => {
      mockExecute.mockResolvedValue({
        rows: [{
          value: JSON.stringify({
            clientId: "ca-pub",
            slots: { "unknown-slot": { enabled: true, slotId: "x" } },
          }),
        }],
      });

      const result = await settings.getAdConfig();

      expect(result.slots).not.toHaveProperty("unknown-slot");
      expect(result.slots["dashboard-summary"]).toBeDefined();
    });
  });

  describe("setAdConfig", () => {
    it("merges partial config and persists", async () => {
      mockExecute
        .mockResolvedValueOnce({
          rows: [{
            value: JSON.stringify({
              clientId: "ca-pub",
              globalEnabled: false,
              slots: { "dashboard-summary": { enabled: true, slotId: "" } },
            }),
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await settings.setAdConfig({
        globalEnabled: true,
        slots: { "dashboard-summary": { enabled: true, slotId: "new-slot" } },
      });

      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining("INSERT INTO platform_settings"),
        args: ["ad_config", expect.stringContaining("new-slot")],
      });
      expect(result.globalEnabled).toBe(true);
      expect(result.slots["dashboard-summary"].slotId).toBe("new-slot");
    });

    it("skips unknown slot keys when merging config.slots", async () => {
      mockExecute
        .mockResolvedValueOnce({
          rows: [{
            value: JSON.stringify({
              clientId: "ca-pub",
              globalEnabled: false,
              slots: { "dashboard-summary": { enabled: true, slotId: "" } },
            }),
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await settings.setAdConfig({
        slots: { "unknown-slot": { enabled: false, slotId: "x" } },
      });

      expect(result.slots).not.toHaveProperty("unknown-slot");
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });
  });

  describe("getAllPlatformSettings", () => {
    it("returns all key-value pairs from platform_settings", async () => {
      mockExecute.mockResolvedValue({
        rows: [
          { key: "k1", value: "v1" },
          { key: "k2", value: "v2" },
        ],
      });

      const result = await settings.getAllPlatformSettings();

      expect(mockExecute).toHaveBeenCalledWith("SELECT key, value FROM platform_settings");
      expect(result).toEqual({ k1: "v1", k2: "v2" });
    });

    it("returns empty object when no rows", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      const result = await settings.getAllPlatformSettings();

      expect(result).toEqual({});
    });
  });

  describe("ProdOps config", () => {
    it("returns env base URL and bot username fallbacks when no config row exists", async () => {
      const original = process.env.PRODOPS_BASE_URL;
      const originalBot = process.env.PRODOPS_TELEGRAM_BOT_USERNAME;
      process.env.PRODOPS_BASE_URL = "https://ops.trefolio.com";
      process.env.PRODOPS_TELEGRAM_BOT_USERNAME = "@trefolio_prodops_bot";
      mockExecute.mockResolvedValue({ rows: [] });

      const result = await settings.getProdOpsConfig();

      expect(result.baseUrl).toBe("https://ops.trefolio.com");
      expect(result.botUsername).toBe("trefolio_prodops_bot");
      expect(result.enabled).toBe(false);
      process.env.PRODOPS_BASE_URL = original;
      process.env.PRODOPS_TELEGRAM_BOT_USERNAME = originalBot;
    });

    it("normalizes recipient, bot username, and event types when saving config", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await settings.setProdOpsConfig({
        enabled: true,
        baseUrl: "https://ops.trefolio.com/",
        botUsername: "@trefolio_prodops_bot",
        enabledEventTypes: ["user_registered", "membership_paid", "membership_paid"] as never,
        recipient: {
          id: "recipient_1",
          label: " Ops ",
          type: "telegram_dm",
          source: "telegram_link",
          chatId: " 12345 ",
          enabled: true,
          enabledEventTypes: ["user_registered"],
          telegramUsername: "@ops",
          linkedAt: "2026-05-26T00:00:00.000Z",
        } as never,
      });

      expect(result.baseUrl).toBe("https://ops.trefolio.com");
      expect(result.botUsername).toBe("trefolio_prodops_bot");
      expect(result.recipient?.label).toBe("Ops");
      expect(result.recipient?.chatId).toBe("12345");
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining("INSERT INTO platform_settings"),
        args: ["prodops_config", expect.stringContaining("\"chatId\":\"12345\"")],
      });
    });

    it("creates and completes a ProdOps Telegram link", async () => {
      const prodOpsLink = await import("@/lib/prodops-link");
      vi.spyOn(prodOpsLink, "hashProdOpsLinkToken").mockReturnValue("ignored");

      const prodOpsConfigRow = {
        key: "prodops_config",
        value: JSON.stringify({
          enabled: true,
          baseUrl: "https://ops.trefolio.com",
          botUsername: "trefolio_prodops_bot",
          enabledEventTypes: ["user_registered"],
          recipient: null,
          pendingLink: null,
        }),
      };

      mockExecute
        .mockResolvedValueOnce({ rows: [prodOpsConfigRow] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const { deepLink, expiresAt } = await settings.createProdOpsRecipientLink();
      const token = deepLink.split("start=")[1];

      expect(deepLink).toContain("https://t.me/trefolio_prodops_bot?start=");
      expect(token).toMatch(/^[0-9a-f]{12}$/);
      expect(expiresAt).toBeTruthy();

      settings.invalidatePlatformSettingsCache();
      mockExecute.mockReset();
      const pendingProdOpsConfigRow = {
        key: "prodops_config",
        value: JSON.stringify({
          enabled: true,
          baseUrl: "https://ops.trefolio.com",
          botUsername: "trefolio_prodops_bot",
          enabledEventTypes: ["user_registered"],
          recipient: null,
          pendingLink: {
            tokenHash: "ignored",
            tokenIssuedAt: "2026-05-26T00:00:00.000Z",
            tokenExpiresAt: "2999-05-26T00:15:00.000Z",
          },
        }),
      };
      mockExecute
        .mockResolvedValueOnce({ rows: [pendingProdOpsConfigRow] })
        .mockResolvedValueOnce({ rows: [pendingProdOpsConfigRow] })
        .mockResolvedValueOnce({ rows: [] });

      const recipient = await settings.completeProdOpsRecipientLink({
        token,
        chatId: "12345",
        telegramUserId: "777",
        telegramUsername: "ops",
        telegramDisplayName: "Ops Admin",
      });

      expect(recipient?.chatId).toBe("12345");
      expect(recipient?.telegramUsername).toBe("ops");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("INSERT INTO platform_settings"),
        args: ["prodops_config", expect.stringContaining("\"recipient\"")],
      });
    });

    it("unlinks the ProdOps recipient", async () => {
      mockExecute
        .mockResolvedValueOnce({
          rows: [{
            value: JSON.stringify({
              enabled: true,
              baseUrl: "https://ops.trefolio.com",
              botUsername: "trefolio_prodops_bot",
              enabledEventTypes: ["user_registered"],
              recipient: {
                id: "recipient_1",
                label: "@ops",
                type: "telegram_dm",
                source: "telegram_link",
                chatId: "12345",
                enabled: true,
                enabledEventTypes: ["user_registered"],
              },
              pendingLink: null,
            }),
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await settings.unlinkProdOpsRecipient();

      expect(result.recipient).toBeNull();
      expect(result.pendingLink).toBeNull();
    });

    it("prefers env shared secret over stored value", async () => {
      const original = process.env.PRODOPS_SHARED_SECRET;
      process.env.PRODOPS_SHARED_SECRET = "env-secret";
      mockExecute.mockResolvedValue({ rows: [{ value: "db-secret" }] });

      const value = await settings.getProdOpsSharedSecret();
      const meta = await settings.getProdOpsSharedSecretMeta();

      expect(value).toBe("env-secret");
      expect(meta).toEqual({
        hasSecret: true,
        maskedSecret: "env-...cret",
        source: "env",
      });
      process.env.PRODOPS_SHARED_SECRET = original;
    });
  });
});
