import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(() => ({ get: vi.fn(), set: vi.fn() })),
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(
    vi.fn().mockImplementation(() => ({ limit: vi.fn() })),
    { fixedWindow: vi.fn().mockReturnValue("fixedWindow") },
  ),
}));

const origEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

afterEach(() => {
  process.env = { ...origEnv };
});

describe("upstash", () => {
  it("getRedisClient() returns null when env vars missing", async () => {
    const mod = await import("./upstash");
    expect(mod.getRedisClient()).toBeNull();
  });

  it("getRedisClient() returns Redis instance when env vars set", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
    const mod = await import("./upstash");
    const client = mod.getRedisClient();
    expect(client).not.toBeNull();
    expect(client).toHaveProperty("get");
    expect(client).toHaveProperty("set");
  });

  it("avRateLimiter() returns null when no Redis", async () => {
    const mod = await import("./upstash");
    expect(mod.avRateLimiter()).toBeNull();
  });

  it("avRateLimiter() returns Ratelimit when Redis available", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
    const mod = await import("./upstash");
    const limiter = mod.avRateLimiter();
    expect(limiter).not.toBeNull();
    expect(limiter).toHaveProperty("limit");
  });

  it("aiImportRateLimiter() returns null when no Redis", async () => {
    const mod = await import("./upstash");
    expect(mod.aiImportRateLimiter()).toBeNull();
  });

  it("aiImportRateLimiter() returns Ratelimit when Redis available", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
    const mod = await import("./upstash");
    const limiter = mod.aiImportRateLimiter();
    expect(limiter).not.toBeNull();
    expect(limiter).toHaveProperty("limit");
  });

  it("signupRateLimiter() returns null when no Redis", async () => {
    const mod = await import("./upstash");
    expect(mod.signupRateLimiter()).toBeNull();
  });

  it("signupRateLimiter() returns Ratelimit when Redis available", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
    const mod = await import("./upstash");
    const limiter = mod.signupRateLimiter();
    expect(limiter).not.toBeNull();
    expect(limiter).toHaveProperty("limit");
  });

  it("loginRateLimiter() returns null when no Redis", async () => {
    const mod = await import("./upstash");
    expect(mod.loginRateLimiter()).toBeNull();
  });

  it("loginRateLimiter() returns Ratelimit when Redis available", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
    const mod = await import("./upstash");
    const limiter = mod.loginRateLimiter();
    expect(limiter).not.toBeNull();
    expect(limiter).toHaveProperty("limit");
  });

  it("deviceAuthRateLimiter() returns null when no Redis", async () => {
    const mod = await import("./upstash");
    expect(mod.deviceAuthRateLimiter()).toBeNull();
  });

  it("deviceAuthRateLimiter() returns Ratelimit when Redis available", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
    const mod = await import("./upstash");
    const limiter = mod.deviceAuthRateLimiter();
    expect(limiter).not.toBeNull();
    expect(limiter).toHaveProperty("limit");
  });
});
