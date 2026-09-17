import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue({ execute: mockExecute }),
}));

vi.mock("@/lib/db/settings", () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}));

import { isFeatureEnabled } from "@/lib/db/settings";
import { listAidWarmUserIds } from "./warm-users";

describe("listAidWarmUserIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
  });

  it("scopes override and cache candidates to recently active non-test users", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ user_id: "active-1" }] })
      .mockResolvedValueOnce({ rows: [{ user_id: "active-2" }] });

    await expect(listAidWarmUserIds(10)).resolves.toEqual(["active-1", "active-2"]);

    expect(mockExecute.mock.calls[0][0].sql).toContain("last_active_at");
    expect(mockExecute.mock.calls[0][0].sql).toContain("trefolio.com");
    expect(mockExecute.mock.calls[0][0].args).toEqual(["-30 days", 10]);
    expect(mockExecute.mock.calls[1][0].sql).toContain("aid_news_cache");
    expect(mockExecute.mock.calls[1][0].args).toEqual(["-30 days", 10]);
  });

  it("skips global cache warm when aid_beta is off", async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);
    mockExecute.mockResolvedValueOnce({ rows: [{ user_id: "override-1" }] });

    await expect(listAidWarmUserIds(5)).resolves.toEqual(["override-1"]);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
