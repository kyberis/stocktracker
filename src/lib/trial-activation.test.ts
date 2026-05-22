import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
  updateUserSubscription: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn(),
}));

import { findUserById, updateUserSubscription } from "@/lib/db";
import { ensureInitialized } from "@/lib/db/client";
import {
  activateProTrial,
  getTrialEligibilityError,
  getTrialPlanExpiresAt,
} from "./trial-activation";

const mockedFindUser = vi.mocked(findUserById);
const mockedUpdateSub = vi.mocked(updateUserSubscription);
const mockedEnsureInit = vi.mocked(ensureInitialized);

const mockClient = {
  execute: vi.fn().mockResolvedValue({ rows: [] }),
};

const freeUser = {
  id: "u1",
  plan: "free" as const,
  trial_token: "tok",
  trial_activated_at: "",
  trial_invited_at: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedEnsureInit.mockResolvedValue(mockClient as never);
});

describe("getTrialEligibilityError", () => {
  it("returns null for eligible free user", () => {
    expect(getTrialEligibilityError(freeUser as never)).toBeNull();
  });

  it("returns already_activated when trial was used", () => {
    expect(
      getTrialEligibilityError({ ...freeUser, trial_activated_at: "2026-01-01" } as never),
    ).toBe("already_activated");
  });

  it("returns not_free_plan for paid users", () => {
    expect(getTrialEligibilityError({ ...freeUser, plan: "pro" } as never)).toBe("not_free_plan");
  });

  it("returns invalid_token when token mismatches", () => {
    expect(getTrialEligibilityError(freeUser as never, { token: "wrong" })).toBe("invalid_token");
  });
});

describe("getTrialPlanExpiresAt", () => {
  it("returns ISO date 7 days later", () => {
    const base = Date.parse("2026-01-01T00:00:00.000Z");
    expect(getTrialPlanExpiresAt(base)).toBe("2026-01-08T00:00:00.000Z");
  });
});

describe("activateProTrial", () => {
  it("activates pro plan for eligible user", async () => {
    mockedFindUser.mockResolvedValue(freeUser as never);

    const result = await activateProTrial("u1");

    expect(result.planExpiresAt).toBeDefined();
    expect(mockedUpdateSub).toHaveBeenCalledWith("u1", {
      plan: "pro",
      planExpiresAt: expect.any(String),
    });
    expect(mockClient.execute).toHaveBeenCalledWith({
      sql: expect.stringContaining("trial_activated_at"),
      args: ["u1"],
    });
  });

  it("throws when user not found", async () => {
    mockedFindUser.mockResolvedValue(null);
    await expect(activateProTrial("missing")).rejects.toThrow("user_not_found");
  });

  it("throws when trial already activated", async () => {
    mockedFindUser.mockResolvedValue({ ...freeUser, trial_activated_at: "2026-01-01" } as never);
    await expect(activateProTrial("u1")).rejects.toThrow("already_activated");
  });
});
