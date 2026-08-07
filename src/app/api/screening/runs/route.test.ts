import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

vi.mock("@/lib/screening/guard", () => ({
  requireScreeningAccess: vi.fn(),
}));

vi.mock("@/lib/db/settings", () => ({
  isFeatureEnabledForUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  createScreeningRun: vi.fn(),
  insertSteps: vi.fn(),
  linkPendingAgentOutputToRun: vi.fn(),
  appendEvent: vi.fn(),
}));

vi.mock("@/lib/screening/metrics", () => ({
  recordScreeningRunCreated: vi.fn(),
}));

vi.mock("@/lib/screening/orchestrator/kick-worker", () => ({
  kickScreeningWorker: vi.fn(),
}));

vi.mock("@/lib/http/request-public-origin", () => ({
  getRequestPublicOrigin: () => "http://localhost",
}));

import { requireScreeningAccess } from "@/lib/screening/guard";
import { isFeatureEnabledForUser } from "@/lib/db/settings";
import {
  createScreeningRun,
  insertSteps,
  linkPendingAgentOutputToRun,
} from "@/lib/db";
import { kickScreeningWorker } from "@/lib/screening/orchestrator/kick-worker";

const validBrief = {
  intent: "explore",
  includeSectors: ["Technology"],
  excludeSectors: [],
  regions: ["us_canada"],
  candidateCount: 3,
  criteria: [
    { key: "marketCap", condition: "300 – 15,000M USD", source: "chat" },
  ],
  endedEarly: false,
  locale: "en",
};

const okSession = {
  session: { userId: "user-1", role: "user", plan: "free" as const },
  error: null,
} as const;

describe("POST /api/screening/runs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
    vi.mocked(requireScreeningAccess).mockResolvedValue(
      okSession as unknown as Awaited<ReturnType<typeof requireScreeningAccess>>,
    );
  });

  it("returns 401 when auth fails", async () => {
    vi.mocked(requireScreeningAccess).mockResolvedValueOnce({
      session: null,
      error: NextResponse.json({ error: "unauth" }, { status: 401 }),
    } as unknown as Awaited<ReturnType<typeof requireScreeningAccess>>);
    const { POST } = await import("./route");
    const res = await POST(
      new NextRequest("http://localhost/api/screening/runs", {
        method: "POST",
        body: JSON.stringify(validBrief),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("goes down the mock path when the pipeline flag is off", async () => {
    vi.mocked(isFeatureEnabledForUser).mockResolvedValue(false);
    vi.mocked(createScreeningRun).mockResolvedValue({
      id: "row-1",
    } as unknown as Awaited<ReturnType<typeof createScreeningRun>>);
    const { POST } = await import("./route");
    const res = await POST(
      new NextRequest("http://localhost/api/screening/runs", {
        method: "POST",
        body: JSON.stringify(validBrief),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.run.runId).toMatch(/^mock-/);
    expect(body.run.mocked).toBe(true);
    expect(insertSteps).not.toHaveBeenCalled();
    expect(kickScreeningWorker).not.toHaveBeenCalled();
  });

  it("creates real steps and fires the worker when the flag is on", async () => {
    vi.mocked(isFeatureEnabledForUser).mockResolvedValue(true);
    vi.mocked(createScreeningRun).mockResolvedValue({
      id: "real-run-1",
      userId: "user-1",
      status: "authorized",
      intent: "explore",
      briefJson: JSON.stringify(validBrief),
      mockedPipeline: false,
      createdAt: "2026-08-07T00:00:00.000Z",
      updatedAt: "2026-08-07T00:00:00.000Z",
    });
    vi.mocked(insertSteps).mockResolvedValue([]);
    vi.mocked(linkPendingAgentOutputToRun).mockResolvedValue(1);

    const { POST } = await import("./route");
    const res = await POST(
      new NextRequest("http://localhost/api/screening/runs", {
        method: "POST",
        body: JSON.stringify(validBrief),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.run.runId).toBe("real-run-1");
    expect(body.run.mocked).toBe(false);
    expect(insertSteps).toHaveBeenCalledWith(
      "real-run-1",
      expect.arrayContaining([
        expect.objectContaining({ agentKind: "hard_data" }),
        expect.objectContaining({
          agentKind: "compiler",
          dependsOn: expect.any(Array),
        }),
      ]),
    );
    expect(kickScreeningWorker).toHaveBeenCalledWith(
      expect.objectContaining({ runId: "real-run-1" }),
    );
    expect(linkPendingAgentOutputToRun).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", agentKind: "intake", runId: "real-run-1" }),
    );
  });

  it("returns 422 when the brief violates sanity limits", async () => {
    vi.mocked(isFeatureEnabledForUser).mockResolvedValue(true);
    const badBrief = {
      ...validBrief,
      criteria: [
        {
          key: "roic",
          condition: "> 150%",
          source: "chat",
        },
      ],
    };
    const { POST } = await import("./route");
    const res = await POST(
      new NextRequest("http://localhost/api/screening/runs", {
        method: "POST",
        body: JSON.stringify(badBrief),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(422);
  });
});
