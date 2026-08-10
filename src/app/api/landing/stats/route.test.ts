import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  countVerifiedUsers: vi.fn(),
}));

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: () => Promise<Response>) => handler,
}));

import { countVerifiedUsers } from "@/lib/db";

const mockedCount = vi.mocked(countVerifiedUsers);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/landing/stats", () => {
  it("returns the live verified-user count", async () => {
    mockedCount.mockResolvedValue(230);

    const { GET } = await import("./route");
    const res = await (GET as () => Promise<Response>)();
    const body = await res.json();

    expect(body).toEqual({ userCount: 230 });
  });
});
