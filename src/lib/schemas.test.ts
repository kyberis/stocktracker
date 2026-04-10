import { describe, expect, it } from "vitest";
import {
  loginSchema,
  signupSchema,
  createHoldingSchema,
  createTransactionSchema,
  createCashSchema,
  userSettingsSchema,
  createAlertSchema,
  adminUserActionSchema,
} from "./schemas";

describe("loginSchema", () => {
  it("accepts valid identifier and password", () => {
    const result = loginSchema.safeParse({ identifier: "user@example.com", password: "secret123" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ identifier: "user@example.com", password: "secret123" });
    }
  });

  it("accepts username as identifier", () => {
    const result = loginSchema.safeParse({ identifier: "admin", password: "secret123" });
    expect(result.success).toBe(true);
  });

  it("fails when identifier is missing", () => {
    const result = loginSchema.safeParse({ password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("fails when password is missing", () => {
    const result = loginSchema.safeParse({ identifier: "johndoe" });
    expect(result.success).toBe(false);
  });

  it("fails when identifier is empty string", () => {
    const result = loginSchema.safeParse({ identifier: "", password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("fails when password is empty string", () => {
    const result = loginSchema.safeParse({ identifier: "johndoe", password: "" });
    expect(result.success).toBe(false);
  });

  it("fails when identifier is not a string", () => {
    const result = loginSchema.safeParse({ identifier: 123, password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("fails when password is not a string", () => {
    const result = loginSchema.safeParse({ identifier: "johndoe", password: null });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("accepts valid email and password", () => {
    const result = signupSchema.safeParse({
      email: "john@example.com",
      password: "secret123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("john@example.com");
      expect(result.data.password).toBe("secret123");
    }
  });

  it("accepts optional displayName", () => {
    const result = signupSchema.safeParse({
      email: "john@example.com",
      password: "secret123",
      displayName: "John Doe",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe("John Doe");
    }
  });

  it("fails when email is missing", () => {
    const result = signupSchema.safeParse({ password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("fails when password is missing", () => {
    const result = signupSchema.safeParse({ email: "john@example.com" });
    expect(result.success).toBe(false);
  });

  it("fails when email is invalid", () => {
    const result = signupSchema.safeParse({ email: "notanemail", password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("fails when password is too short (< 6 chars)", () => {
    const result = signupSchema.safeParse({ email: "john@example.com", password: "abc" });
    expect(result.success).toBe(false);
  });

  it("fails when email is not a string", () => {
    const result = signupSchema.safeParse({ email: 123, password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("rejects disposable email domains", () => {
    const disposable = [
      "user@mailinator.com",
      "user@guerrillamail.com",
      "user@yopmail.com",
      "user@tempmail.com",
      "user@throwaway.email",
      "user@10minutemail.com",
      "user@maildrop.cc",
    ];
    for (const email of disposable) {
      const result = signupSchema.safeParse({ email, password: "secret123" });
      expect(result.success, `expected ${email} to be rejected`).toBe(false);
    }
  });

  it("allows legitimate email domains", () => {
    const legitimate = [
      "user@gmail.com",
      "user@outlook.com",
      "user@company.org",
      "user@example.com",
    ];
    for (const email of legitimate) {
      const result = signupSchema.safeParse({ email, password: "secret123" });
      expect(result.success, `expected ${email} to be accepted`).toBe(true);
    }
  });
});

describe("createHoldingSchema", () => {
  it("accepts valid ticker and name", () => {
    const result = createHoldingSchema.safeParse({
      ticker: "AAPL",
      name: "Apple Inc",
      shares: 1,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ticker).toBe("AAPL");
      expect(result.data.name).toBe("Apple Inc");
      expect(result.data.shares).toBe(1);
      expect(result.data.purchasePrice).toBe(0);
      expect(result.data.assetType).toBe("stock");
    }
  });

  it("accepts shares and purchasePrice as numbers", () => {
    const result = createHoldingSchema.safeParse({
      ticker: "MSFT",
      name: "Microsoft",
      shares: 10,
      purchasePrice: 350.5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shares).toBe(10);
      expect(result.data.purchasePrice).toBe(350.5);
    }
  });

  it("fails when ticker is missing", () => {
    const result = createHoldingSchema.safeParse({ name: "Apple Inc" });
    expect(result.success).toBe(false);
  });

  it("fails when name is missing", () => {
    const result = createHoldingSchema.safeParse({ ticker: "AAPL" });
    expect(result.success).toBe(false);
  });

  it("fails when ticker is empty", () => {
    const result = createHoldingSchema.safeParse({ ticker: "", name: "Apple Inc" });
    expect(result.success).toBe(false);
  });

  it("fails when shares is not a number", () => {
    const result = createHoldingSchema.safeParse({
      ticker: "AAPL",
      name: "Apple",
      shares: "10",
    });
    expect(result.success).toBe(false);
  });

  it("accepts assetType stock or etf", () => {
    expect(createHoldingSchema.safeParse({ ticker: "AAPL", name: "A", shares: 1, assetType: "stock" }).success).toBe(true);
    expect(createHoldingSchema.safeParse({ ticker: "VOO", name: "V", shares: 1, assetType: "etf" }).success).toBe(true);
  });

  it("fails when assetType is invalid", () => {
    const result = createHoldingSchema.safeParse({
      ticker: "AAPL",
      name: "Apple",
      shares: 1,
      assetType: "bond_invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("createTransactionSchema", () => {
  it("accepts valid required fields", () => {
    const result = createTransactionSchema.safeParse({
      ticker: "AAPL",
      type: "buy",
      date: "2025-01-15",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ticker).toBe("AAPL");
      expect(result.data.type).toBe("buy");
      expect(result.data.date).toBe("2025-01-15");
      expect(result.data.shares).toBe(0);
      expect(result.data.pricePerShare).toBe(0);
    }
  });

  it("accepts all transaction types", () => {
    for (const type of ["buy", "sell", "dividend", "fee"] as const) {
      const result = createTransactionSchema.safeParse({
        ticker: "AAPL",
        type,
        date: "2025-01-15",
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts optional shares and pricePerShare", () => {
    const result = createTransactionSchema.safeParse({
      ticker: "AAPL",
      type: "buy",
      date: "2025-01-15",
      shares: 5,
      pricePerShare: 150.25,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shares).toBe(5);
      expect(result.data.pricePerShare).toBe(150.25);
    }
  });

  it("fails when ticker is missing", () => {
    const result = createTransactionSchema.safeParse({ type: "buy", date: "2025-01-15" });
    expect(result.success).toBe(false);
  });

  it("fails when type is missing", () => {
    const result = createTransactionSchema.safeParse({ ticker: "AAPL", date: "2025-01-15" });
    expect(result.success).toBe(false);
  });

  it("fails when date is missing", () => {
    const result = createTransactionSchema.safeParse({ ticker: "AAPL", type: "buy" });
    expect(result.success).toBe(false);
  });

  it("fails when type is invalid", () => {
    const result = createTransactionSchema.safeParse({
      ticker: "AAPL",
      type: "swap",
      date: "2025-01-15",
    });
    expect(result.success).toBe(false);
  });

  it("fails when shares is not a number", () => {
    const result = createTransactionSchema.safeParse({
      ticker: "AAPL",
      type: "buy",
      date: "2025-01-15",
      shares: "five",
    });
    expect(result.success).toBe(false);
  });
});

describe("createCashSchema", () => {
  it("accepts valid name and amountEUR", () => {
    const result = createCashSchema.safeParse({ name: "Savings", amountEUR: 1000 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Savings");
      expect(result.data.amountEUR).toBe(1000);
    }
  });

  it("accepts zero amount", () => {
    const result = createCashSchema.safeParse({ name: "Empty", amountEUR: 0 });
    expect(result.success).toBe(true);
  });

  it("fails when name is missing", () => {
    const result = createCashSchema.safeParse({ amountEUR: 100 });
    expect(result.success).toBe(false);
  });

  it("fails when amountEUR is missing", () => {
    const result = createCashSchema.safeParse({ name: "Savings" });
    expect(result.success).toBe(false);
  });

  it("fails when amountEUR is negative", () => {
    const result = createCashSchema.safeParse({ name: "Savings", amountEUR: -100 });
    expect(result.success).toBe(false);
  });

  it("fails when amountEUR is not a number", () => {
    const result = createCashSchema.safeParse({ name: "Savings", amountEUR: "100" });
    expect(result.success).toBe(false);
  });

  it("fails when name is empty", () => {
    const result = createCashSchema.safeParse({ name: "", amountEUR: 100 });
    expect(result.success).toBe(false);
  });
});

describe("userSettingsSchema", () => {
  it("accepts empty object (all optional)", () => {
    const result = userSettingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts provider yahoo or alphavantage", () => {
    expect(userSettingsSchema.safeParse({ provider: "yahoo" }).success).toBe(true);
    expect(userSettingsSchema.safeParse({ provider: "alphavantage" }).success).toBe(true);
  });

  it("accepts language en or es", () => {
    expect(userSettingsSchema.safeParse({ language: "en" }).success).toBe(true);
    expect(userSettingsSchema.safeParse({ language: "es" }).success).toBe(true);
  });

  it("accepts refreshInterval 15, 30, or 60", () => {
    expect(userSettingsSchema.safeParse({ refreshInterval: 15 }).success).toBe(true);
    expect(userSettingsSchema.safeParse({ refreshInterval: 30 }).success).toBe(true);
    expect(userSettingsSchema.safeParse({ refreshInterval: 60 }).success).toBe(true);
  });

  it("fails when dashboardTheme is invalid", () => {
    const result = userSettingsSchema.safeParse({ dashboardTheme: "nonexistent" });
    expect(result.success).toBe(false);
  });

  it("fails when refreshInterval is not 15, 30, or 60", () => {
    const result = userSettingsSchema.safeParse({ refreshInterval: 45 });
    expect(result.success).toBe(false);
  });
});

describe("createAlertSchema", () => {
  it("accepts valid ticker, condition, threshold", () => {
    const result = createAlertSchema.safeParse({
      ticker: "AAPL",
      condition: "above",
      threshold: 150,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ticker).toBe("AAPL");
      expect(result.data.condition).toBe("above");
      expect(result.data.threshold).toBe(150);
      expect(result.data.currency).toBe("USD");
    }
  });

  it("accepts condition above or below", () => {
    expect(createAlertSchema.safeParse({ ticker: "AAPL", condition: "above", threshold: 100 }).success).toBe(true);
    expect(createAlertSchema.safeParse({ ticker: "AAPL", condition: "below", threshold: 100 }).success).toBe(true);
  });

  it("fails when ticker is missing", () => {
    const result = createAlertSchema.safeParse({ condition: "above", threshold: 100 });
    expect(result.success).toBe(false);
  });

  it("fails when condition is missing", () => {
    const result = createAlertSchema.safeParse({ ticker: "AAPL", threshold: 100 });
    expect(result.success).toBe(false);
  });

  it("fails when threshold is missing", () => {
    const result = createAlertSchema.safeParse({ ticker: "AAPL", condition: "above" });
    expect(result.success).toBe(false);
  });

  it("fails when threshold is zero or negative", () => {
    expect(createAlertSchema.safeParse({ ticker: "AAPL", condition: "above", threshold: 0 }).success).toBe(false);
    expect(createAlertSchema.safeParse({ ticker: "AAPL", condition: "above", threshold: -10 }).success).toBe(false);
  });

  it("fails when condition is invalid", () => {
    const result = createAlertSchema.safeParse({
      ticker: "AAPL",
      condition: "equals",
      threshold: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe("adminUserActionSchema", () => {
  it("accepts setRole action with userId and role", () => {
    const result = adminUserActionSchema.safeParse({
      action: "setRole",
      userId: "user-123",
      role: "admin",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe("setRole");
      expect(result.data.userId).toBe("user-123");
      expect((result.data as { role: string }).role).toBe("admin");
    }
  });

  it("accepts setPlan action with userId and plan", () => {
    const result = adminUserActionSchema.safeParse({
      action: "setPlan",
      userId: "user-456",
      plan: "pro",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe("setPlan");
      expect((result.data as { plan: string }).plan).toBe("pro");
    }
  });

  it("accepts setPassword action with userId and newPassword", () => {
    const result = adminUserActionSchema.safeParse({
      action: "setPassword",
      userId: "user-789",
      newPassword: "newsecret123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe("setPassword");
      expect((result.data as { newPassword: string }).newPassword).toBe("newsecret123");
    }
  });

  it("fails when action is missing", () => {
    const result = adminUserActionSchema.safeParse({ userId: "user-123", role: "admin" });
    expect(result.success).toBe(false);
  });

  it("fails when action is unknown", () => {
    const result = adminUserActionSchema.safeParse({
      action: "deleteUser",
      userId: "user-123",
    });
    expect(result.success).toBe(false);
  });

  it("fails when setRole has invalid role", () => {
    const result = adminUserActionSchema.safeParse({
      action: "setRole",
      userId: "user-123",
      role: "superadmin",
    });
    expect(result.success).toBe(false);
  });

  it("fails when setPlan has invalid plan", () => {
    const result = adminUserActionSchema.safeParse({
      action: "setPlan",
      userId: "user-123",
      plan: "enterprise",
    });
    expect(result.success).toBe(false);
  });

  it("fails when setPassword has short newPassword", () => {
    const result = adminUserActionSchema.safeParse({
      action: "setPassword",
      userId: "user-123",
      newPassword: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("fails when userId is empty", () => {
    const result = adminUserActionSchema.safeParse({
      action: "setRole",
      userId: "",
      role: "admin",
    });
    expect(result.success).toBe(false);
  });
});
