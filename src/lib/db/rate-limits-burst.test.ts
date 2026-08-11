import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./client", () => ({
  ensureInitialized: vi.fn(),
}));

import { ensureInitialized } from "./client";
import { checkAndIncrementBurstCooldown } from "./rate-limits";

const mockedInit = vi.mocked(ensureInitialized);

function mockClient(rows: Array<{ call_count: number; window_start: string }>) {
  const execute = vi.fn(async (arg: { sql: string }) => {
    if (arg.sql.startsWith("SELECT")) {
      return { rows };
    }
    return { rows: [] };
  });
  mockedInit.mockResolvedValue({ execute } as never);
  return execute;
}

describe("checkAndIncrementBurstCooldown", () => {
  const userId = "u-burst";
  const provider = "warren_empty_add";
  const maxCalls = 10;
  const cooldownMs = 15 * 60 * 1000;
  const t0 = Date.parse("2026-08-11T12:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows the first call and starts a burst", async () => {
    const execute = mockClient([]);
    const result = await checkAndIncrementBurstCooldown(userId, provider, maxCalls, cooldownMs, t0);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(result.limit).toBe(10);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: expect.stringContaining("INSERT INTO rate_limits"),
      }),
    );
  });

  it("increments within the burst", async () => {
    mockClient([{ call_count: 3, window_start: new Date(t0).toISOString() }]);
    const result = await checkAndIncrementBurstCooldown(userId, provider, maxCalls, cooldownMs, t0 + 1000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(6);
  });

  it("allows the 10th call and starts the cooldown clock", async () => {
    const execute = mockClient([{ call_count: 9, window_start: new Date(t0).toISOString() }]);
    const result = await checkAndIncrementBurstCooldown(userId, provider, maxCalls, cooldownMs, t0);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.resetAt).toBe(new Date(t0 + cooldownMs).toISOString());
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: expect.stringContaining("UPDATE rate_limits SET call_count"),
        args: expect.arrayContaining([10, new Date(t0 + cooldownMs).toISOString()]),
      }),
    );
  });

  it("blocks during the cooldown window", async () => {
    const cooldownUntil = new Date(t0 + cooldownMs).toISOString();
    mockClient([{ call_count: 10, window_start: cooldownUntil }]);
    const mid = t0 + 5 * 60 * 1000;
    const result = await checkAndIncrementBurstCooldown(userId, provider, maxCalls, cooldownMs, mid);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSec).toBeGreaterThan(0);
    expect(result.resetAt).toBe(cooldownUntil);
  });

  it("resets after the cooldown elapses", async () => {
    const cooldownUntil = new Date(t0 + cooldownMs).toISOString();
    const execute = mockClient([{ call_count: 10, window_start: cooldownUntil }]);
    const after = t0 + cooldownMs + 1000;
    const result = await checkAndIncrementBurstCooldown(userId, provider, maxCalls, cooldownMs, after);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: expect.stringContaining("UPDATE rate_limits SET call_count = 1"),
      }),
    );
  });
});
