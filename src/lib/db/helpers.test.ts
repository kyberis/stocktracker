import { describe, expect, it } from "vitest";
import type { Row } from "@libsql/client";
import {
  str,
  num,
  holdingAssetType,
  txType,
  alertCondition,
  alertType,
  percentBasis,
  parseAlertChannels,
  feedbackStatus,
  feedbackType,
  parseRefreshInterval,
  normalizeTickerForExchange,
  EXCHANGE_SUFFIX_MAP,
  canonicalExchangeCode,
  exchangeCodeAliases,
  exchangesEquivalent,
  rowToDbUser,
  rowToPortfolio,
  mapUser,
  monthWindowKey,
  shouldResetAiWindow,
  shouldResetDailyAiWindow,
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

describe("holdingAssetType", () => {
  it("returns etf for etf", () => {
    expect(holdingAssetType("etf")).toBe("etf");
  });

  it("returns crypto for crypto", () => {
    expect(holdingAssetType("crypto")).toBe("crypto");
  });

  it("returns fund for fund", () => {
    expect(holdingAssetType("fund")).toBe("fund");
  });

  it("returns stock for stock", () => {
    expect(holdingAssetType("stock")).toBe("stock");
  });

  it("returns stock for unknown values", () => {
    expect(holdingAssetType("")).toBe("stock");
    expect(holdingAssetType("unknown")).toBe("stock");
    expect(holdingAssetType(null)).toBe("stock");
    expect(holdingAssetType(undefined)).toBe("stock");
    expect(holdingAssetType(123)).toBe("stock");
  });
});

describe("txType", () => {
  it("returns buy for buy", () => {
    expect(txType("buy")).toBe("buy");
  });

  it("returns sell for sell", () => {
    expect(txType("sell")).toBe("sell");
  });

  it("returns dividend for dividend", () => {
    expect(txType("dividend")).toBe("dividend");
  });

  it("returns fee for fee", () => {
    expect(txType("fee")).toBe("fee");
  });

  it("returns buy for unknown values", () => {
    expect(txType("unknown")).toBe("buy");
    expect(txType("")).toBe("buy");
    expect(txType(null)).toBe("buy");
    expect(txType(undefined)).toBe("buy");
  });
});

describe("alertCondition", () => {
  it("returns below for below", () => {
    expect(alertCondition("below")).toBe("below");
  });

  it("returns above for above and other values", () => {
    expect(alertCondition("above")).toBe("above");
    expect(alertCondition("")).toBe("above");
    expect(alertCondition("unknown")).toBe("above");
    expect(alertCondition(null)).toBe("above");
  });
});

describe("alertType", () => {
  it("returns percent_change for percent_change", () => {
    expect(alertType("percent_change")).toBe("percent_change");
  });

  it("returns threshold for threshold and other values", () => {
    expect(alertType("threshold")).toBe("threshold");
    expect(alertType("")).toBe("threshold");
    expect(alertType("unknown")).toBe("threshold");
    expect(alertType(null)).toBe("threshold");
  });
});

describe("percentBasis", () => {
  it("returns daily for daily", () => {
    expect(percentBasis("daily")).toBe("daily");
  });

  it("returns purchase for purchase", () => {
    expect(percentBasis("purchase")).toBe("purchase");
  });

  it("returns empty string for unknown values", () => {
    expect(percentBasis("")).toBe("");
    expect(percentBasis("unknown")).toBe("");
    expect(percentBasis(null)).toBe("");
  });
});

describe("parseAlertChannels", () => {
  it("parses single channel", () => {
    expect(parseAlertChannels("email")).toEqual(["email"]);
    expect(parseAlertChannels("push")).toEqual(["push"]);
    expect(parseAlertChannels("telegram")).toEqual(["telegram"]);
    expect(parseAlertChannels("whatsapp")).toEqual(["telegram"]);
    expect(parseAlertChannels("device")).toEqual(["device"]);
  });

  it("parses comma-separated channels", () => {
    expect(parseAlertChannels("email,push")).toEqual(["email", "push"]);
    expect(parseAlertChannels("email,push,telegram,device")).toEqual([
      "email",
      "push",
      "telegram",
      "device",
    ]);
  });

  it("filters invalid channels", () => {
    expect(parseAlertChannels("email,invalid,sms,push")).toEqual(["email", "push"]);
    expect(parseAlertChannels("foo,bar")).toEqual([]);
  });

  it("defaults to email when val is null/undefined", () => {
    expect(parseAlertChannels(null)).toEqual(["email"]);
    expect(parseAlertChannels(undefined)).toEqual(["email"]);
  });
});

describe("feedbackStatus", () => {
  it("returns answered for answered", () => {
    expect(feedbackStatus("answered")).toBe("answered");
  });

  it("returns closed for closed", () => {
    expect(feedbackStatus("closed")).toBe("closed");
  });

  it("returns open for other values", () => {
    expect(feedbackStatus("open")).toBe("open");
    expect(feedbackStatus("")).toBe("open");
    expect(feedbackStatus("unknown")).toBe("open");
    expect(feedbackStatus(null)).toBe("open");
  });
});

describe("feedbackType", () => {
  it("returns bug for bug", () => {
    expect(feedbackType("bug")).toBe("bug");
  });

  it("returns feedback for feedback and other values", () => {
    expect(feedbackType("feedback")).toBe("feedback");
    expect(feedbackType("")).toBe("feedback");
    expect(feedbackType("unknown")).toBe("feedback");
    expect(feedbackType(null)).toBe("feedback");
  });
});

describe("parseRefreshInterval", () => {
  it("returns 30 for 30", () => {
    expect(parseRefreshInterval(30)).toBe(30);
    expect(parseRefreshInterval("30")).toBe(30);
  });

  it("returns 60 for 60", () => {
    expect(parseRefreshInterval(60)).toBe(60);
    expect(parseRefreshInterval("60")).toBe(60);
  });

  it("returns 15 for other values", () => {
    expect(parseRefreshInterval(15)).toBe(15);
    expect(parseRefreshInterval(45)).toBe(15);
    expect(parseRefreshInterval(0)).toBe(15);
    expect(parseRefreshInterval("invalid")).toBe(15);
    expect(parseRefreshInterval(null)).toBe(15);
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

  it("canonicalExchangeCode collapses Copenhagen and NYSE aliases", () => {
    expect(canonicalExchangeCode("CPH")).toBe("OMK");
    expect(canonicalExchangeCode("XCSE")).toBe("OMK");
    expect(canonicalExchangeCode("omk")).toBe("OMK");
    expect(canonicalExchangeCode("NYSEAM")).toBe("NYSE");
    expect(canonicalExchangeCode("")).toBe("");
  });

  it("canonicalExchangeCode collapses NAS / XNAS / NMS onto NASDAQ", () => {
    expect(canonicalExchangeCode("NAS")).toBe("NASDAQ");
    expect(canonicalExchangeCode("XNAS")).toBe("NASDAQ");
    expect(canonicalExchangeCode("NMS")).toBe("NASDAQ");
    expect(canonicalExchangeCode("NDQ")).toBe("NASDAQ");
    expect(exchangesEquivalent("NAS", "NASDAQ")).toBe(true);
  });

  it("exchangesEquivalent treats CPH and OMK as the same venue", () => {
    expect(exchangesEquivalent("CPH", "OMK")).toBe(true);
    expect(exchangesEquivalent("CPH", "")).toBe(true);
    expect(exchangesEquivalent("NYSE", "NASDAQ")).toBe(false);
  });

  it("exchangeCodeAliases includes CPH when given OMK", () => {
    const aliases = exchangeCodeAliases("OMK");
    expect(aliases).toContain("OMK");
    expect(aliases).toContain("CPH");
    expect(aliases).toContain("XCSE");
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
      HKG: ".HK",
      XHKG: ".HK",
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

function mockRow(overrides: Record<string, unknown> = {}): Row {
  return {
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
    device_portfolio_id: "",
    last_active_at: "2025-03-10T12:00:00Z",
    tax_residency: "DE",
    onboarding_completed: 1,
    experience_level: "" as const,
    referral_code: "XYZ98765",
    referred_by: "",
    referral_reward_days: 0,
    ai_tokens_this_month: 0,
    ai_tokens_today: 0,
    trial_invited_at: "",
    trial_activated_at: "",
    trial_token: "",
    trial_expired_notified: 0,
    membership_grant_token: "",
    membership_grant_plan: "",
    membership_grant_days: 0,
    membership_grant_created_at: "",
    commerce_complimentary_at: "",
    plan_before_trial: "",
    plan_sunset_notified_at: "",
    checklist_dismissed_at: "",
    weekly_digest_enabled: 1,
    ...overrides,
  } as unknown as Row;
}

describe("rowToDbUser", () => {
  it("maps a full mock Row to DbUser with all fields", () => {
    const row = mockRow();
    const user = rowToDbUser(row);

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
      idp_sub: "",
      portfolio_review_count: 0,
      portfolio_review_reset_at: "",
      widget_token_hash: "",
      device_passkey_hash: "",
      device_template_id: "classic-dark",
      device_linked_at: "",
      device_pro_redeemed_at: "",
      device_portfolio_id: "",
      last_active_at: "2025-03-10T12:00:00Z",
      tax_residency: "DE",
      onboarding_completed: 1,
      experience_level: "",
      referral_code: "XYZ98765",
      referred_by: "",
      referral_reward_days: 0,
      ai_tokens_this_month: 0,
      ai_tokens_today: 0,
      trial_invited_at: "",
      trial_activated_at: "",
      trial_token: "",
      trial_expired_notified: 0,
      membership_grant_token: "",
      membership_grant_plan: "",
      membership_grant_days: 0,
      membership_grant_created_at: "",
      commerce_complimentary_at: "",
      plan_before_trial: "",
      plan_sunset_notified_at: "",
      checklist_dismissed_at: "",
      weekly_digest_enabled: 1,
      profile_slug: "",
      bio: "",
      social_visibility: "private",
      headline: "",
      share_portfolio_value: 0,
      share_holdings: 0,
      allow_comments: 1,
      deleted_at: "",
    });
  });

  it("maps admin role correctly", () => {
    const user = rowToDbUser(mockRow({ role: "admin" }));
    expect(user.role).toBe("admin");
  });

  it("maps user role for non-admin", () => {
    const user = rowToDbUser(mockRow({ role: "user" }));
    expect(user.role).toBe("user");
  });

  it("maps invalid role to user", () => {
    const user = rowToDbUser(mockRow({ role: "invalid" }));
    expect(user.role).toBe("user");
  });

  it("maps pro plan correctly", () => {
    const user = rowToDbUser(mockRow({ plan: "pro" }));
    expect(user.plan).toBe("pro");
  });

  it("maps legacy starter plan to pro", () => {
    const user = rowToDbUser(mockRow({ plan: "starter" }));
    expect(user.plan).toBe("pro");
  });

  it("maps free plan for invalid plan", () => {
    const user = rowToDbUser(mockRow({ plan: "invalid" }));
    expect(user.plan).toBe("free");
  });

  it("maps google auth_provider correctly", () => {
    const user = rowToDbUser(mockRow({ auth_provider: "google", google_id: "g-123" }));
    expect(user.auth_provider).toBe("google");
    expect(user.google_id).toBe("g-123");
  });

  it("maps apple auth_provider correctly", () => {
    const user = rowToDbUser(mockRow({ auth_provider: "apple", apple_id: "a-456" }));
    expect(user.auth_provider).toBe("apple");
    expect(user.apple_id).toBe("a-456");
  });

  it("maps credentials auth_provider for invalid provider", () => {
    const user = rowToDbUser(mockRow({ auth_provider: "saml" }));
    expect(user.auth_provider).toBe("credentials");
  });

  it("defaults device_template_id to classic-dark when empty", () => {
    const user = rowToDbUser(mockRow({ device_template_id: "" }));
    expect(user.device_template_id).toBe("classic-dark");
  });

  it("handles null/undefined values from DB (str/num coercion)", () => {
    const row = mockRow({
      id: 999,
      username: null,
      password_hash: undefined,
      role: "invalid",
      must_change_password: null,
      ai_calls_this_month: "10",
      ai_calls_reset_at: null,
      email_verified: 0,
    });
    const user = rowToDbUser(row);

    expect(user.id).toBe("999");
    expect(user.username).toBe("");
    expect(user.password_hash).toBe("");
    expect(user.role).toBe("user");
    expect(user.must_change_password).toBe(0);
    expect(user.ai_calls_this_month).toBe(10);
    expect(user.email_verified).toBe(0);
  });
});

describe("rowToPortfolio", () => {
  it("maps Row to Portfolio with supported currency", () => {
    const row = {
      id: "p-1",
      user_id: "u-1",
      name: "Main",
      is_default: 1,
      sort_order: 0,
      currency: "USD",
      created_at: "2025-01-01",
    } as unknown as Row;

    const portfolio = rowToPortfolio(row);

    expect(portfolio).toEqual({
      id: "p-1",
      userId: "u-1",
      name: "Main",
      isDefault: true,
      sortOrder: 0,
      currency: "USD",
      createdAt: "2025-01-01",
    });
  });

  it("falls back to EUR for unsupported currency", () => {
    const row = {
      id: "p-2",
      user_id: "u-2",
      name: "Crypto",
      is_default: 0,
      sort_order: 1,
      currency: "XYZ",
      created_at: "2025-02-01",
    } as unknown as Row;

    const portfolio = rowToPortfolio(row);

    expect(portfolio.currency).toBe("EUR");
    expect(portfolio.id).toBe("p-2");
    expect(portfolio.userId).toBe("u-2");
    expect(portfolio.name).toBe("Crypto");
    expect(portfolio.isDefault).toBe(false);
    expect(portfolio.sortOrder).toBe(1);
  });

  it("handles empty currency as EUR fallback", () => {
    const row = {
      id: "p-3",
      user_id: "u-3",
      name: "Empty",
      is_default: 0,
      sort_order: 0,
      currency: "",
      created_at: "2025-03-01",
    } as unknown as Row;

    const portfolio = rowToPortfolio(row);

    expect(portfolio.currency).toBe("EUR");
  });

  it("handles GBP, CHF, CAD and other supported currencies", () => {
    for (const curr of ["GBP", "CHF", "CAD", "JPY", "AUD"]) {
      const row = {
        id: "p",
        user_id: "u",
        name: "Test",
        is_default: 0,
        sort_order: 0,
        currency: curr,
        created_at: "2025-01-01",
      } as unknown as Row;
      const portfolio = rowToPortfolio(row);
      expect(portfolio.currency).toBe(curr);
    }
  });
});

describe("mapUser", () => {
  const baseDbUser = {
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
    idp_sub: "",
    portfolio_review_count: 0,
    portfolio_review_reset_at: "",
    widget_token_hash: "",
    device_passkey_hash: "",
    device_template_id: "classic-dark",
    device_linked_at: "",
    device_pro_redeemed_at: "",
    device_portfolio_id: "",
    last_active_at: "2025-03-10",
    tax_residency: "",
    onboarding_completed: 0,
    experience_level: "" as const,
    referral_code: "ABC12345",
    referred_by: "",
    referral_reward_days: 0,
    ai_tokens_this_month: 0,
    ai_tokens_today: 0,
    trial_invited_at: "",
    trial_activated_at: "",
    trial_token: "",
    trial_expired_notified: 0,
    checklist_dismissed_at: "",
    weekly_digest_enabled: 1,
    membership_grant_token: "",
    membership_grant_plan: "",
    membership_grant_days: 0,
    membership_grant_created_at: "",
    commerce_complimentary_at: "",
    plan_before_trial: "",
    plan_sunset_notified_at: "",
    profile_slug: "",
    bio: "",
    social_visibility: "private" as const,
    headline: "",
    share_portfolio_value: 0,
    share_holdings: 0,
    allow_comments: 1,
    deleted_at: "",
  };

  it("maps DbUser to PublicUser with correct field mapping", () => {
    const publicUser = mapUser(baseDbUser);

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
      devicePortfolioId: "",
      lastActiveAt: "2025-03-10",
      experienceLevel: "",
      referralCode: "ABC12345",
      referralRewardDays: 0,
      aiTokensThisMonth: 0,
      aiTokensToday: 0,
      profileSlug: "",
      bio: "",
      socialVisibility: "private",
      headline: "",
      sharePortfolioValue: false,
      shareHoldings: false,
      allowComments: true,
    });
  });

  it("deviceProEligible is true when device_linked_at set, device_pro_redeemed_at empty, plan free", () => {
    const dbUser = {
      ...baseDbUser,
      plan: "free" as const,
      device_linked_at: "2025-03-01T00:00:00Z",
      device_pro_redeemed_at: "",
    };
    const publicUser = mapUser(dbUser);
    expect(publicUser.deviceProEligible).toBe(true);
  });

  it("deviceProEligible is false when plan is pro (including former starter)", () => {
    const dbUser = {
      ...baseDbUser,
      plan: "pro" as const,
      device_linked_at: "2025-03-01T00:00:00Z",
      device_pro_redeemed_at: "",
    };
    const publicUser = mapUser(dbUser);
    expect(publicUser.deviceProEligible).toBe(false);
  });

  it("deviceProEligible is false when device_pro_redeemed_at is set", () => {
    const dbUser = {
      ...baseDbUser,
      plan: "free" as const,
      device_linked_at: "2025-03-01T00:00:00Z",
      device_pro_redeemed_at: "2025-03-05T00:00:00Z",
    };
    const publicUser = mapUser(dbUser);
    expect(publicUser.deviceProEligible).toBe(false);
  });

  it("deviceProEligible is false when device_linked_at is empty", () => {
    const dbUser = {
      ...baseDbUser,
      plan: "free" as const,
      device_linked_at: "",
      device_pro_redeemed_at: "",
    };
    const publicUser = mapUser(dbUser);
    expect(publicUser.deviceProEligible).toBe(false);
  });

  it("deviceProEligible is false when plan is pro", () => {
    const dbUser = {
      ...baseDbUser,
      plan: "pro" as const,
      device_linked_at: "2025-03-01T00:00:00Z",
      device_pro_redeemed_at: "",
    };
    const publicUser = mapUser(dbUser);
    expect(publicUser.deviceProEligible).toBe(false);
  });

  it("hasWidgetToken is true when widget_token_hash is non-empty", () => {
    const dbUser = { ...baseDbUser, widget_token_hash: "hash123" };
    const publicUser = mapUser(dbUser);
    expect(publicUser.hasWidgetToken).toBe(true);
  });

  it("hasDevicePasskey is true when device_passkey_hash is non-empty", () => {
    const dbUser = { ...baseDbUser, device_passkey_hash: "passkey-hash" };
    const publicUser = mapUser(dbUser);
    expect(publicUser.hasDevicePasskey).toBe(true);
  });

  it("does not include password_hash, stripe_customer_id, stripe_subscription_id", () => {
    const publicUser = mapUser(baseDbUser);
    expect("password_hash" in publicUser).toBe(false);
    expect("stripe_customer_id" in publicUser).toBe(false);
    expect("stripe_subscription_id" in publicUser).toBe(false);
  });

  it("converts must_change_password 1 to mustChangePassword true", () => {
    const dbUser = { ...baseDbUser, must_change_password: 1 };
    const publicUser = mapUser(dbUser);
    expect(publicUser.mustChangePassword).toBe(true);
  });

  it("converts email_verified 1 to emailVerified true", () => {
    const dbUser = { ...baseDbUser, email_verified: 1 };
    const publicUser = mapUser(dbUser);
    expect(publicUser.emailVerified).toBe(true);
  });

  it("maps authProvider google and apple", () => {
    expect(mapUser({ ...baseDbUser, auth_provider: "google" }).authProvider).toBe("google");
    expect(mapUser({ ...baseDbUser, auth_provider: "apple" }).authProvider).toBe("apple");
  });
});

describe("monthWindowKey", () => {
  it("returns YYYY-MM format for UTC date", () => {
    expect(monthWindowKey(new Date(Date.UTC(2025, 0, 15)))).toBe("2025-01");
    expect(monthWindowKey(new Date(Date.UTC(2025, 8, 1)))).toBe("2025-09");
    expect(monthWindowKey(new Date(Date.UTC(2024, 11, 31)))).toBe("2024-12");
  });

  it("pads month with leading zero", () => {
    expect(monthWindowKey(new Date(Date.UTC(2025, 0, 1)))).toBe("2025-01");
    expect(monthWindowKey(new Date(Date.UTC(2025, 8, 1)))).toBe("2025-09");
  });
});

describe("shouldResetAiWindow", () => {
  it("returns true when lastResetAt is empty", () => {
    expect(shouldResetAiWindow("")).toBe(true);
  });

  it("returns true when lastResetAt is invalid date", () => {
    expect(shouldResetAiWindow("invalid-date")).toBe(true);
    expect(shouldResetAiWindow("not-a-date")).toBe(true);
  });

  it("returns false when lastResetAt is in current month", () => {
    const now = new Date();
    const thisMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const dateInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth(), 15);
    expect(monthWindowKey(dateInMonth)).toBe(thisMonth);
    expect(shouldResetAiWindow(dateInMonth.toISOString())).toBe(false);
  });

  it("returns true when lastResetAt is in a different month", () => {
    const now = new Date();
    const prevMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 15);
    expect(shouldResetAiWindow(prevMonth.toISOString())).toBe(true);
  });
});

describe("shouldResetDailyAiWindow", () => {
  it("returns true when resetAt is empty", () => {
    expect(shouldResetDailyAiWindow("")).toBe(true);
  });

  it("returns false when resetAt is today", () => {
    const today = new Date();
    expect(shouldResetDailyAiWindow(today.toISOString())).toBe(false);
  });

  it("returns true when resetAt is yesterday", () => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    expect(shouldResetDailyAiWindow(yesterday.toISOString())).toBe(true);
  });

  it("returns true when resetAt is different year", () => {
    const lastYear = new Date(new Date().getUTCFullYear() - 1, 5, 15);
    expect(shouldResetDailyAiWindow(lastYear.toISOString())).toBe(true);
  });

  it("returns true when resetAt is different month", () => {
    const lastMonth = new Date();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    expect(shouldResetDailyAiWindow(lastMonth.toISOString())).toBe(true);
  });
});
