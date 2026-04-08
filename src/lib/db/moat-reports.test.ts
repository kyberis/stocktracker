import { describe, it, expect, vi, beforeEach } from "vitest";
import * as moatReports from "./moat-reports";

const { mockExecute, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  return {
    mockExecute,
    mockClient: { execute: mockExecute },
  };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("report-uuid-1"),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockExecute.mockReset();
});

describe("moat-reports", () => {
  describe("normalizeMoatReportTags", () => {
    it("lowercases, dedupes, strips invalid chars, and caps count", () => {
      expect(
        moatReports.normalizeMoatReportTags([
          "Dividend",
          "dividend",
          "watch-list",
          "a".repeat(50),
          "",
          123 as unknown as string,
        ]),
      ).toEqual(["dividend", "watch-list"]);
    });

    it("returns empty for non-array", () => {
      expect(moatReports.normalizeMoatReportTags(null)).toEqual([]);
    });
  });

  describe("listMoatReports", () => {
    it("adds AND EXISTS predicates per required tag", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      await moatReports.listMoatReports("user-1", 100, ["alpha", "beta"]);

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("json_each(moat_reports.tags)"),
        args: ["user-1", "alpha", "beta", 100],
      });
      const call = mockExecute.mock.calls[0][0] as { sql: string };
      const existsMatches = call.sql.match(/EXISTS/g);
      expect(existsMatches?.length).toBe(2);
    });

    it("maps tag column JSON into summaries", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [
          {
            id: "r1",
            symbol: "AAPL",
            company_name: "Apple",
            total_score: 80,
            max_score: 100,
            verdict: "Strong",
            ai_narrative: "",
            created_at: "2026-01-01",
            tags: '["dividend","watchlist"]',
          },
        ],
      });
      const result = await moatReports.listMoatReports("user-1");
      expect(result[0]?.tags).toEqual(["dividend", "watchlist"]);
    });
  });
});
