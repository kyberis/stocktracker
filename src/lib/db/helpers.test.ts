import { describe, expect, it } from "vitest";
import {
  str,
  num,
  normalizeTickerForExchange,
  EXCHANGE_SUFFIX_MAP,
  rowToDbUser,
  mapUser,
} from "./helpers";

describe("str", () => {
  it("returns string as-is", () => {
    expect(str("hello")).toBe("hello");
    expect(str("")).toBe("");
  });

  it("converts number to string", () => {
    expect(str(42)).toBe("42");
    expect(str(0)).toBe("0");
    expect(str(-3.14)).toBe("-3.14");
  });

  it("returns empty string for null and undefined", () => {
    expect(str(null)).toBe("");
    expect(str(undefined)).toBe("");
  });

  it("converts boolean to string", () => {
    expect(str(true)).toBe("true");
    expect(str(false)).toBe("false");
  });

  it("handles other types", () => {
    expect(str({})).toBe("[object Object]");
    expect(str([])).toBe("");
    expect(str(Symbol("x"))).toBe("Symbol(x)");
    expect(str(BigInt(123))).toBe("123");
  });
});

describe("num", () => {
  it("returns number as-is", () => {
    expect(num(42)).toBe(42);
    expect(num(0)).toBe(0);
    expect(num(-3.14)).toBe(-3.14);
  });

  it("parses numeric strings", () => {
    expect(num("42")).toBe(42);
    expect(num("3.14")).toBe(3.14);
    expect(num("0")).toBe(0);
  });

  it("returns 0 for null and undefined", () => {
    expect(num(null)).toBe(0);
    expect(num(undefined)).toBe(0);
  });

  it("returns 0 for non-numeric string", () => {
    expect(num("hello")).toBe(0);
    expect(num("")).toBe(0);
  });

  it("returns 0 for NaN", () => {
    expect(num(NaN)).toBe(0);
    expect(num(Number("invalid"))).toBe(0);
  });

  it("handles boolean (truthy/falsy)", () => {
    expect(num(true)).toBe(1);
    expect(num(false)).toBe(0);
  });
});

describe("normalizeTickerForExchange", () => {
  it("adds .DE suffix for German exchanges (XET, TGD, TDG)", () => {
    expect(normalizeTickerForExchange("SAP", "XET")).toBe("SAP.DE");
    expect(normalizeTickerForExchange("BMW", "TGD")).toBe("BMW.DE");
    expect(normalizeTickerForExchange("VOW3", "TDG")).toBe("VOW3.DE");
  });

  it("adds .MC suffix for Spanish exchanges (MAD, BME)", () => {
    expect(normalizeTickerForExchange("IBE", "MAD")).toBe("IBE.MC");
    expect(normalizeTickerForExchange("SAN", "BME")).toBe("SAN.MC");
  });

  it("adds .L suffix for LSE", () => {
    expect(normalizeTickerForExchange("HSBA", "LSE")).toBe("HSBA.L");
  });

  it("adds .CO suffix for Nordic exchanges (OMK, CPH)", () => {
    expect(normalizeTickerForExchange("NOVO", "OMK")).toBe("NOVO.CO");
    expect(normalizeTickerForExchange("CARL", "CPH")).toBe("CARL.CO");
  });

  it("adds .PA, .AS, .BR, .MI, .HE, .VI, .SW, .TO for other European exchanges", () => {
    expect(normalizeTickerForExchange("MC", "PAR")).toBe("MC.PA");
    expect(normalizeTickerForExchange("ASML", "AMS")).toBe("ASML.AS");
    expect(normalizeTickerForExchange("SOLB", "BRU")).toBe("SOLB.BR");
    expect(normalizeTickerForExchange("ENI", "MIL")).toBe("ENI.MI");
    expect(normalizeTickerForExchange("NOKIA", "HEL")).toBe("NOKIA.HE");
    expect(normalizeTickerForExchange("OMV", "VIE")).toBe("OMV.VI");
    expect(normalizeTickerForExchange("NOVN", "SWX")).toBe("NOVN.SW");
    expect(normalizeTickerForExchange("RY", "TSE")).toBe("RY.TO");
    expect(normalizeTickerForExchange("TD", "TOR")).toBe("TD.TO");
  });

  it("adds .F for Frankfurt (FRA)", () => {
    expect(normalizeTickerForExchange("SAP", "FRA")).toBe("SAP.F");
  });

  it("leaves ticker unchanged when it already has a dot", () => {
    expect(normalizeTickerForExchange("SAP.DE", "XET")).toBe("SAP.DE");
    expect(normalizeTickerForExchange("AAPL", "US")).toBe("AAPL");
    expect(normalizeTickerForExchange("IBE.MC", "MAD")).toBe("IBE.MC");
  });

  it("leaves US tickers unchanged (unknown exchange)", () => {
    expect(normalizeTickerForExchange("AAPL", "US")).toBe("AAPL");
    expect(normalizeTickerForExchange("MSFT", "NASDAQ")).toBe("MSFT");
    expect(normalizeTickerForExchange("GOOGL", "UNKNOWN")).toBe("GOOGL");
  });

  it("handles exchange case-insensitively", () => {
    expect(normalizeTickerForExchange("SAP", "xet")).toBe("SAP.DE");
    expect(normalizeTickerForExchange("SAP", "Xet")).toBe("SAP.DE");
  });
});

describe("EXCHANGE_SUFFIX_MAP", () => {
  it("contains expected European exchange entries", () => {
    const expected: Record<string, string> = {
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
    for (const [exchange, suffix] of Object.entries(expected)) {
      expect(EXCHANGE_SUFFIX_MAP[exchange]).toBe(suffix);
    }
  });

  it("has no US/NASDAQ/NYSE entries (US tickers stay as-is)", () => {
    expect(EXCHANGE_SUFFIX_MAP["US"]).toBeUndefined();
    expect(EXCHANGE_SUFFIX_MAP["NASDAQ"]).toBeUndefined();
    expect(EXCHANGE_SUFFIX_MAP["NYSE"]).toBeUndefined();
  });
});

describe("rowToDbUser", () => {
  it("maps a mock libsql Row to DbUser", () => {
    const row = {
      id: "user-123",
      username: "johndoe",
      password_hash: "hashed-secret",
      role: "user",
      must_change_password: 0,
      created_at: "2025-01-15T10:00:00Z",
      email: "john@example.com",
      display_name: "John Doe",
      avatar_url: "https://example.com/avatar.png",
      plan: "free",
      stripe_customer_id: "cus_abc",
      stripe_subscription_id: "",
      plan_expires_at: "2026-01-15",
      ai_calls_this_month: 5,
      ai_calls_reset_at: "2025-01-01",
      ai_calls_today: 2,
      ai_daily_reset_at: "2025-01-15",
      email_verified: 1,
    } as Record<string, unknown>;

    const user = rowToDbUser(row as Parameters<typeof rowToDbUser>[0]);

    expect(user).toEqual({
      id: "user-123",
      username: "johndoe",
      password_hash: "hashed-secret",
      role: "user",
      must_change_password: 0,
      created_at: "2025-01-15T10:00:00Z",
      email: "john@example.com",
      display_name: "John Doe",
      avatar_url: "https://example.com/avatar.png",
      plan: "free",
      stripe_customer_id: "cus_abc",
      stripe_subscription_id: "",
      plan_expires_at: "2026-01-15",
      ai_calls_this_month: 5,
      ai_calls_reset_at: "2025-01-01",
      ai_calls_today: 2,
      ai_daily_reset_at: "2025-01-15",
      email_verified: 1,
      auth_provider: "credentials",
      google_id: "",
      apple_id: "",
      portfolio_review_count: 0,
      portfolio_review_reset_at: "",
      widget_token_hash: "",
      device_passkey_hash: "",
      device_template_id: "classic-dark",
      device_linked_at: "",
      device_pro_redeemed_at: "",
    });
  });

  it("maps admin role and pro plan correctly", () => {
    const row = {
      id: "admin-1",
      username: "admin",
      password_hash: "hash",
      role: "admin",
      must_change_password: 1,
      created_at: "2024-01-01",
      email: "admin@example.com",
      display_name: "Admin",
      avatar_url: "",
      plan: "pro",
      stripe_customer_id: "cus_pro",
      stripe_subscription_id: "sub_123",
      plan_expires_at: "2026-12-31",
      ai_calls_this_month: 100,
      ai_calls_reset_at: "2025-01-01",
      ai_calls_today: 10,
      ai_daily_reset_at: "2025-03-05",
      email_verified: 1,
    } as Record<string, unknown>;

    const user = rowToDbUser(row as Parameters<typeof rowToDbUser>[0]);

    expect(user.role).toBe("admin");
    expect(user.plan).toBe("pro");
    expect(user.must_change_password).toBe(1);
  });

  it("handles null/undefined values from DB (str/num coercion)", () => {
    const row = {
      id: 999,
      username: null,
      password_hash: undefined,
      role: "invalid",
      must_change_password: null,
      created_at: "",
      email: undefined,
      display_name: null,
      avatar_url: "",
      plan: "invalid",
      stripe_customer_id: null,
      stripe_subscription_id: undefined,
      plan_expires_at: "",
      ai_calls_this_month: "10",
      ai_calls_reset_at: null,
      ai_calls_today: undefined,
      ai_daily_reset_at: "",
      email_verified: 0,
    } as Record<string, unknown>;

    const user = rowToDbUser(row as Parameters<typeof rowToDbUser>[0]);

    expect(user.id).toBe("999");
    expect(user.username).toBe("");
    expect(user.password_hash).toBe("");
    expect(user.role).toBe("user");
    expect(user.must_change_password).toBe(0);
    expect(user.ai_calls_this_month).toBe(10);
    expect(user.email_verified).toBe(0);
  });
});

describe("mapUser", () => {
  it("maps DbUser to PublicUser (strips password, converts snake_case to camelCase)", () => {
    const dbUser = {
      id: "user-456",
      username: "janedoe",
      password_hash: "secret-hash",
      role: "user" as const,
      must_change_password: 0,
      created_at: "2025-02-20T12:00:00Z",
      email: "jane@example.com",
      display_name: "Jane Doe",
      avatar_url: "https://example.com/jane.png",
      plan: "pro" as const,
      stripe_customer_id: "cus_xyz",
      stripe_subscription_id: "sub_456",
      plan_expires_at: "2026-02-20",
      ai_calls_this_month: 50,
      ai_calls_reset_at: "2025-02-01",
      ai_calls_today: 3,
      ai_daily_reset_at: "2025-03-05",
      email_verified: 1,
      auth_provider: "credentials" as const,
      google_id: "",
      apple_id: "",
      portfolio_review_count: 0,
      portfolio_review_reset_at: "",
      widget_token_hash: "",
      device_passkey_hash: "",
      device_template_id: "classic-dark",
      device_linked_at: "",
      device_pro_redeemed_at: "",
    };

    const publicUser = mapUser(dbUser);

    expect(publicUser).toEqual({
      id: "user-456",
      username: "janedoe",
      role: "user",
      mustChangePassword: false,
      createdAt: "2025-02-20T12:00:00Z",
      email: "jane@example.com",
      displayName: "Jane Doe",
      avatarUrl: "https://example.com/jane.png",
      plan: "pro",
      planExpiresAt: "2026-02-20",
      aiCallsThisMonth: 50,
      aiCallsResetAt: "2025-02-01",
      aiCallsToday: 3,
      aiDailyResetAt: "2025-03-05",
      emailVerified: true,
      authProvider: "credentials",
      portfolioReviewCount: 0,
      portfolioReviewResetAt: "",
      hasWidgetToken: false,
      hasDevicePasskey: false,
      deviceProEligible: false,
    });
  });

  it("does not include password_hash, stripe_customer_id, stripe_subscription_id", () => {
    const dbUser = {
      id: "x",
      username: "u",
      password_hash: "secret",
      role: "user" as const,
      must_change_password: 0,
      created_at: "",
      email: "",
      display_name: "",
      avatar_url: "",
      plan: "free" as const,
      stripe_customer_id: "cus_secret",
      stripe_subscription_id: "sub_secret",
      plan_expires_at: "",
      ai_calls_this_month: 0,
      ai_calls_reset_at: "",
      ai_calls_today: 0,
      ai_daily_reset_at: "",
      email_verified: 0,
      auth_provider: "credentials" as const,
      google_id: "",
      apple_id: "",
      portfolio_review_count: 0,
      portfolio_review_reset_at: "",
      widget_token_hash: "",
      device_passkey_hash: "",
      device_template_id: "classic-dark",
      device_linked_at: "",
      device_pro_redeemed_at: "",
    };

    const publicUser = mapUser(dbUser);

    expect("password_hash" in publicUser).toBe(false);
    expect("stripe_customer_id" in publicUser).toBe(false);
    expect("stripe_subscription_id" in publicUser).toBe(false);
  });

  it("converts must_change_password 1 to mustChangePassword true", () => {
    const dbUser = {
      id: "x",
      username: "u",
      password_hash: "",
      role: "user" as const,
      must_change_password: 1,
      created_at: "",
      email: "",
      display_name: "",
      avatar_url: "",
      plan: "free" as const,
      stripe_customer_id: "",
      stripe_subscription_id: "",
      plan_expires_at: "",
      ai_calls_this_month: 0,
      ai_calls_reset_at: "",
      ai_calls_today: 0,
      ai_daily_reset_at: "",
      email_verified: 0,
      auth_provider: "credentials" as const,
      google_id: "",
      apple_id: "",
      portfolio_review_count: 0,
      portfolio_review_reset_at: "",
      widget_token_hash: "",
      device_passkey_hash: "",
      device_template_id: "classic-dark",
      device_linked_at: "",
      device_pro_redeemed_at: "",
    };

    const publicUser = mapUser(dbUser);

    expect(publicUser.mustChangePassword).toBe(true);
  });

  it("converts email_verified 1 to emailVerified true", () => {
    const dbUser = {
      id: "x",
      username: "u",
      password_hash: "",
      role: "user" as const,
      must_change_password: 0,
      created_at: "",
      email: "",
      display_name: "",
      avatar_url: "",
      plan: "free" as const,
      stripe_customer_id: "",
      stripe_subscription_id: "",
      plan_expires_at: "",
      ai_calls_this_month: 0,
      ai_calls_reset_at: "",
      ai_calls_today: 0,
      ai_daily_reset_at: "",
      email_verified: 1,
      auth_provider: "credentials" as const,
      google_id: "",
      apple_id: "",
      portfolio_review_count: 0,
      portfolio_review_reset_at: "",
      widget_token_hash: "",
      device_passkey_hash: "",
      device_template_id: "classic-dark",
      device_linked_at: "",
      device_pro_redeemed_at: "",
    };

    const publicUser = mapUser(dbUser);

    expect(publicUser.emailVerified).toBe(true);
  });
});
