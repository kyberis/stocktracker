import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn(),
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    isFeatureEnabled: vi.fn().mockResolvedValue(false),
  };
});

vi.mock("@/lib/commerce-complimentary-pro", () => ({
  renewCommerceComplimentaryPro: vi.fn().mockResolvedValue({ renewed: true, planExpiresAt: "2026-07-01T00:00:00.000Z" }),
}));

vi.mock("@/lib/cron-logging", async () => {
  const { NextResponse } = await import("next/server");
  return {
    withCronLogging: (_name: string, handler: () => Promise<Record<string, unknown>>) => {
      return async () => NextResponse.json(await handler());
    },
    verifyCronAuth: vi.fn().mockReturnValue(null),
  };
});

import { ensureInitialized } from "@/lib/db/client";
import { isFeatureEnabled } from "@/lib/db";
import { renewCommerceComplimentaryPro } from "@/lib/commerce-complimentary-pro";

const mockedEnsureInit = vi.mocked(ensureInitialized);
const mockedIsFeatureEnabled = vi.mocked(isFeatureEnabled);
const mockedRenew = vi.mocked(renewCommerceComplimentaryPro);

const mockClient = {
  execute: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedEnsureInit.mockResolvedValue(mockClient as never);
  mockedIsFeatureEnabled.mockResolvedValue(false);
});

describe("commerce-complimentary-renewal cron", () => {
  it("skips when commerce_enabled is on", async () => {
    mockedIsFeatureEnabled.mockImplementation(async (flag) => flag === "commerce_enabled");

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/commerce-complimentary-renewal");
    const res = await (mod.GET as (req: NextRequest) => Promise<Response>)(req);
    const body = await res.json();

    expect(body.skipped).toBe(true);
    expect(body.reason).toBe("commerce_enabled flag is on");
    expect(mockedRenew).not.toHaveBeenCalled();
  });

  it("renews expired complimentary users", async () => {
    mockClient.execute.mockResolvedValueOnce({
      rows: [{ id: "u1" }, { id: "u2" }],
    });
    mockedRenew
      .mockResolvedValueOnce({ renewed: true, planExpiresAt: "2026-07-01T00:00:00.000Z" })
      .mockResolvedValueOnce({ renewed: false, reason: "not_expired" });

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/commerce-complimentary-renewal");
    const res = await (mod.GET as (req: NextRequest) => Promise<Response>)(req);
    const body = await res.json();

    expect(body.renewed).toBe(1);
    expect(body.scanned).toBe(2);
    expect(mockedRenew).toHaveBeenCalledTimes(2);
  });
});
