import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkEligibility } from "./satisfaction";

const { mockExecute, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  return { mockExecute, mockClient: { execute: mockExecute } };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const OLD_ENOUGH_ACCOUNT = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

function userRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    satisfaction_completed: 0,
    satisfaction_dismiss_count: 0,
    satisfaction_interaction_count: 0,
    created_at: OLD_ENOUGH_ACCOUNT,
    ...overrides,
  };
}

describe("checkEligibility", () => {
  it("is not eligible below the lowered first-time threshold of 4 interactions", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [userRow({ satisfaction_interaction_count: 3 })] })
      .mockResolvedValueOnce({ rows: [] }); // getSurveyByUser

    const result = await checkEligibility("user-1");
    expect(result).toEqual({ eligible: false, draft: null });
  });

  it("is eligible once the lowered first-time threshold of 4 interactions is hit", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [userRow({ satisfaction_interaction_count: 4 })] })
      .mockResolvedValueOnce({ rows: [] }); // getSurveyByUser

    const result = await checkEligibility("user-1");
    expect(result).toEqual({ eligible: true, draft: null });
  });

  it("requires the higher repeat threshold of 10 after a prior dismissal", async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [userRow({ satisfaction_dismiss_count: 1, satisfaction_interaction_count: 9 })],
      })
      .mockResolvedValueOnce({ rows: [] }); // getSurveyByUser

    const result = await checkEligibility("user-1");
    expect(result).toEqual({ eligible: false, draft: null });
  });

  it("is eligible at the repeat threshold of 10 after a prior dismissal", async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [userRow({ satisfaction_dismiss_count: 1, satisfaction_interaction_count: 10 })],
      })
      .mockResolvedValueOnce({ rows: [] }); // getSurveyByUser

    const result = await checkEligibility("user-1");
    expect(result).toEqual({ eligible: true, draft: null });
  });

  it("is not eligible when the account is younger than the minimum age", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        userRow({
          satisfaction_interaction_count: 10,
          created_at: new Date().toISOString(),
        }),
      ],
    });

    const result = await checkEligibility("user-1");
    expect(result).toEqual({ eligible: false, draft: null });
  });

  it("is not eligible once already completed", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [userRow({ satisfaction_completed: 1, satisfaction_interaction_count: 20 })],
    });

    const result = await checkEligibility("user-1");
    expect(result).toEqual({ eligible: false, draft: null });
  });

  it("is not eligible after the max dismissal count is reached", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        userRow({ satisfaction_dismiss_count: 3, satisfaction_interaction_count: 20 }),
      ],
    });

    const result = await checkEligibility("user-1");
    expect(result).toEqual({ eligible: false, draft: null });
  });
});
