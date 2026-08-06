import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/screening/guard", () => ({
  requireScreeningAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/screening/metrics", () => ({
  recordScreeningEntryMetric: vi.fn(),
}));

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

import { requireScreeningAccess } from "@/lib/screening/guard";
import { trackEvent } from "@/lib/db";
import { recordScreeningEntryMetric } from "@/lib/screening/metrics";

const mockedAccess = vi.mocked(requireScreeningAccess);
const mockedTrackEvent = vi.mocked(trackEvent);
const mockedMetric = vi.mocked(recordScreeningEntryMetric);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/screening/entry-events", () => {
  it("returns 401 when not authenticated", async () => {
    const errorRes = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockedAccess.mockResolvedValue({ session: null, error: errorRes });

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/screening/entry-events", {
        method: "POST",
        body: JSON.stringify({ event: "screening_entry_viewed" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(401);
    expect(mockedTrackEvent).not.toHaveBeenCalled();
  });

  it("returns 404 when feature flag is off", async () => {
    const errorRes = NextResponse.json({ error: "Not found" }, { status: 404 });
    mockedAccess.mockResolvedValue({ session: null, error: errorRes });

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/screening/entry-events", {
        method: "POST",
        body: JSON.stringify({ event: "screening_entry_viewed" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(404);
  });

  it("rejects unknown events", async () => {
    mockedAccess.mockResolvedValue({
      session: { userId: "u1", role: "user" },
      error: null,
    });

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/screening/entry-events", {
        method: "POST",
        body: JSON.stringify({ event: "not_a_real_event" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(mockedTrackEvent).not.toHaveBeenCalled();
  });

  it("persists allow-listed events and bumps metrics", async () => {
    mockedAccess.mockResolvedValue({
      session: { userId: "u1", role: "user" },
      error: null,
    });

    const meta = {
      variant: "overexposed",
      preview: "live",
      top_sector: "Technology",
      top_pct: "48.2",
    };

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/screening/entry-events", {
        method: "POST",
        body: JSON.stringify({
          event: "screening_entry_viewed",
          metadata: meta,
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);
    expect(mockedTrackEvent).toHaveBeenCalledWith("u1", "screening_entry_viewed", meta);
    expect(mockedMetric).toHaveBeenCalledWith("screening_entry_viewed", meta);
  });
});
