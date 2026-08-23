import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/cron-logging", () => ({
  verifyCronAuth: vi.fn().mockReturnValue(null),
  withCronLogging: (_name: string, fn: () => Promise<Record<string, unknown>>) => async () => {
    const result = await fn();
    return NextResponse.json(result);
  },
}));

vi.mock("@/lib/user-return-watch", () => ({
  processDueUserReturnWatches: vi.fn().mockResolvedValue({ checked: 2, notified: 1 }),
}));

describe("GET/POST /api/cron/support-return-watch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when cron auth fails", async () => {
    const { verifyCronAuth } = await import("@/lib/cron-logging");
    vi.mocked(verifyCronAuth).mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const { GET } = await import("./route");
    const response = await GET(new NextRequest("http://localhost/api/cron/support-return-watch"));

    expect(response.status).toBe(401);
  });

  it("runs the return-watch processor on GET", async () => {
    const { processDueUserReturnWatches } = await import("@/lib/user-return-watch");
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest("http://localhost/api/cron/support-return-watch", {
        headers: { Authorization: "Bearer test" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ checked: 2, notified: 1 });
    expect(processDueUserReturnWatches).toHaveBeenCalledTimes(1);
  });
});
