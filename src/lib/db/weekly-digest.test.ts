import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDigestEligibleUsers } from "./weekly-digest";

const { mockExecute, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  return { mockExecute, mockClient: { execute: mockExecute } };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockExecute.mockResolvedValue({ rows: [] });
});

describe("getDigestEligibleUsers", () => {
  it("restricts to plan = 'pro' by default (includeFree omitted)", async () => {
    await getDigestEligibleUsers();
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ args: [0] }),
    );
  });

  it("restricts to plan = 'pro' when includeFree is explicitly false", async () => {
    await getDigestEligibleUsers({ includeFree: false });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ args: [0] }),
    );
  });

  it("includes free-plan users when includeFree is true", async () => {
    await getDigestEligibleUsers({ includeFree: true });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ args: [1] }),
    );
  });
});
