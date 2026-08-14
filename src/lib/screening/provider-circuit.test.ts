import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getScreeningProviderCircuit,
  setScreeningProviderCircuit,
  setFeatureEnabled,
} = vi.hoisted(() => ({
  getScreeningProviderCircuit: vi.fn(),
  setScreeningProviderCircuit: vi.fn(),
  setFeatureEnabled: vi.fn(),
}));

const { enqueueProdOpsScreeningProviderQuotaEvent } = vi.hoisted(() => ({
  enqueueProdOpsScreeningProviderQuotaEvent: vi.fn(),
}));

vi.mock("@/lib/db/settings", () => ({
  getScreeningProviderCircuit,
  setScreeningProviderCircuit,
  setFeatureEnabled,
}));

vi.mock("@/lib/prodops", () => ({
  enqueueProdOpsScreeningProviderQuotaEvent,
}));

import {
  clearScreeningProviderCircuit,
  isScreeningNewRunsAllowed,
  isScreeningProviderQuotaStatus,
  tripScreeningProviderCircuit,
} from "./provider-circuit";

const openCircuit = {
  paused: false,
  provider: "unknown" as const,
  detail: "",
  trippedAt: "",
  trippedBy: "system" as const,
  generation: 0,
};

describe("isScreeningProviderQuotaStatus", () => {
  it("trips on 429 and quota language", () => {
    expect(isScreeningProviderQuotaStatus(429)).toBe(true);
    expect(isScreeningProviderQuotaStatus(500, "insufficient_quota")).toBe(true);
    expect(isScreeningProviderQuotaStatus(500, "Rate limit reached")).toBe(true);
    expect(isScreeningProviderQuotaStatus(500, "boom")).toBe(false);
  });
});

describe("tripScreeningProviderCircuit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getScreeningProviderCircuit.mockResolvedValue({ ...openCircuit });
    setScreeningProviderCircuit.mockResolvedValue(undefined);
    setFeatureEnabled.mockResolvedValue(undefined);
    enqueueProdOpsScreeningProviderQuotaEvent.mockResolvedValue(undefined);
  });

  it("writes circuit, disables new-runs flag, and alerts once", async () => {
    const next = await tripScreeningProviderCircuit({
      provider: "fmp",
      statusCode: 429,
      detail: "slow down",
      trippedBy: "system",
    });
    expect(next.paused).toBe(true);
    expect(next.provider).toBe("fmp");
    expect(next.generation).toBe(1);
    expect(setFeatureEnabled).toHaveBeenCalledWith("screening_new_runs_enabled", false);
    expect(enqueueProdOpsScreeningProviderQuotaEvent).toHaveBeenCalledTimes(1);
    expect(enqueueProdOpsScreeningProviderQuotaEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "fmp",
        statusCode: 429,
        generation: 1,
      }),
    );
  });

  it("is idempotent while already paused", async () => {
    getScreeningProviderCircuit.mockResolvedValue({
      paused: true,
      provider: "tavily",
      detail: "already",
      trippedAt: "2026-08-14T00:00:00.000Z",
      trippedBy: "system",
      generation: 3,
    });
    const next = await tripScreeningProviderCircuit({
      provider: "fmp",
      statusCode: 429,
      detail: "again",
      trippedBy: "system",
    });
    expect(next.provider).toBe("tavily");
    expect(setScreeningProviderCircuit).not.toHaveBeenCalled();
    expect(enqueueProdOpsScreeningProviderQuotaEvent).not.toHaveBeenCalled();
  });

  it("does not enqueue ProdOps on admin pause", async () => {
    await tripScreeningProviderCircuit({
      provider: "unknown",
      detail: "Paused manually from admin",
      trippedBy: "admin",
    });
    expect(enqueueProdOpsScreeningProviderQuotaEvent).not.toHaveBeenCalled();
    expect(setFeatureEnabled).toHaveBeenCalledWith("screening_new_runs_enabled", false);
  });
});

describe("clearScreeningProviderCircuit", () => {
  it("clears pause and re-enables the flag", async () => {
    getScreeningProviderCircuit.mockResolvedValue({
      paused: true,
      provider: "openai",
      detail: "quota",
      trippedAt: "2026-08-14T00:00:00.000Z",
      trippedBy: "system",
      generation: 2,
    });
    const next = await clearScreeningProviderCircuit("admin-1");
    expect(next.paused).toBe(false);
    expect(next.clearedByUserId).toBe("admin-1");
    expect(next.generation).toBe(2);
    expect(setFeatureEnabled).toHaveBeenCalledWith("screening_new_runs_enabled", true);
  });
});

describe("isScreeningNewRunsAllowed", () => {
  it("follows circuit.paused", async () => {
    getScreeningProviderCircuit.mockResolvedValue({ ...openCircuit, paused: true });
    expect(await isScreeningNewRunsAllowed()).toBe(false);
    getScreeningProviderCircuit.mockResolvedValue({ ...openCircuit });
    expect(await isScreeningNewRunsAllowed()).toBe(true);
  });
});
