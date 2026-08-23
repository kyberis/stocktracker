import { beforeEach, describe, expect, it, vi } from "vitest";

const redis = {
  set: vi.fn(),
  del: vi.fn(),
  get: vi.fn(),
};

vi.mock("@/lib/upstash", () => ({
  getRedisClient: vi.fn(() => redis),
}));

import { getRedisClient } from "@/lib/upstash";
import { listCoverageGaps, recordCoverageGaps } from "./coverage-gaps";

describe("coverage-gaps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRedisClient).mockReturnValue(redis as never);
  });

  it("stores unique uppercase tickers", async () => {
    await recordCoverageGaps(["aapl", "AAPL", " MSFT "]);
    expect(redis.set).toHaveBeenCalledWith("coverage:gaps", ["AAPL", "MSFT"], {
      ex: 8 * 24 * 3600,
    });
  });

  it("clears the key when refresh-holdings has no remaining failures", async () => {
    await recordCoverageGaps([]);
    expect(redis.del).toHaveBeenCalledWith("coverage:gaps");
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("returns null when Redis is unavailable", async () => {
    vi.mocked(getRedisClient).mockReturnValue(null);
    await expect(listCoverageGaps()).resolves.toBeNull();
  });

  it("returns an empty list when the key is missing", async () => {
    redis.get.mockResolvedValue(null);
    await expect(listCoverageGaps()).resolves.toEqual([]);
  });
});
