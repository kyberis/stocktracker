import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/cron-logging", () => ({
  verifyCronAuth: vi.fn().mockReturnValue(null),
  withCronLogging: (_name: string, fn: () => Promise<Record<string, unknown>>) => async () => {
    const result = await fn();
    return NextResponse.json(result);
  },
}));

describe("GET/POST /api/cron/digest-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when cron auth fails", async () => {
    const { verifyCronAuth } = await import("@/lib/cron-logging");
    vi.mocked(verifyCronAuth).mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/cron/digest-email"));

    expect(res.status).toBe(401);
    expect(verifyCronAuth).toHaveBeenCalledWith("digest-email", expect.any(NextRequest));
  });

  it("returns an archived no-op on GET and POST", async () => {
    const { GET, POST } = await import("./route");
    const getRes = await GET(new NextRequest("http://localhost/api/cron/digest-email"));
    const postRes = await POST(
      new NextRequest("http://localhost/api/cron/digest-email", { method: "POST" }),
    );

    expect(getRes.status).toBe(200);
    expect(await getRes.json()).toMatchObject({ skipped: true, archived: true });
    expect(postRes.status).toBe(200);
    expect(await postRes.json()).toMatchObject({ skipped: true, archived: true });
  });
});
