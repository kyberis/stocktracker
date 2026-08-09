import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import type { IntakeAgentOutput } from "@/lib/screening/schemas";

vi.mock("@/lib/screening/guard", () => ({
  requireScreeningAccess: vi.fn(),
}));

vi.mock("@/lib/screening/intake-agent", () => ({
  runIntakeAgent: vi.fn(),
}));

vi.mock("@/lib/screening/metrics", () => ({
  recordScreeningIntakeTurn: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  insertScreeningAgentOutput: vi.fn(),
  findUserById: vi.fn(),
}));

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

import { requireScreeningAccess } from "@/lib/screening/guard";
import { runIntakeAgent } from "@/lib/screening/intake-agent";
import { insertScreeningAgentOutput, findUserById } from "@/lib/db";
import { recordScreeningIntakeTurn } from "@/lib/screening/metrics";

const mockedAccess = vi.mocked(requireScreeningAccess);
const mockedAgent = vi.mocked(runIntakeAgent);
const mockedInsert = vi.mocked(insertScreeningAgentOutput);
const mockedMetric = vi.mocked(recordScreeningIntakeTurn);
const mockedUser = vi.mocked(findUserById);

const authorizedSession = {
  session: { userId: "u1", role: "user" },
  error: null,
} as const;

function goodAgentOutput(overrides: Partial<IntakeAgentOutput> = {}): IntakeAgentOutput {
  return {
    status: "ok",
    assistantText: "ok",
    brief: {
      intent: "explore",
      includeSectors: [],
      excludeSectors: [],
      regions: [],
      candidateCount: 5,
      criteria: [],
      endedEarly: false,
      locale: "en",
      riskProfile: null,
    },
    questions: [],
    suggestions: [],
    warnings: [],
    inferredFields: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedInsert.mockResolvedValue({
    id: "o1",
    runId: null,
    userId: "u1",
    agentKind: "intake",
    ticker: null,
    agentIndex: null,
    outputJson: "{}",
    latencyMs: 42,
    createdAt: new Date().toISOString(),
  });
  mockedUser.mockResolvedValue({ plan: "free" } as never);
});

describe("POST /api/screening/intake/chat", () => {
  it("returns 401 when session guard fails", async () => {
    mockedAccess.mockResolvedValue({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/screening/intake/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "explore",
          locale: "en",
          messages: [{ role: "user", content: "hi" }],
        }),
      }),
    );
    expect(res.status).toBe(401);
    expect(mockedAgent).not.toHaveBeenCalled();
  });

  it("returns 400 when the body is invalid", async () => {
    mockedAccess.mockResolvedValue(authorizedSession);
    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/screening/intake/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "nope" }),
      }),
    );
    expect(res.status).toBe(400);
    expect(mockedAgent).not.toHaveBeenCalled();
  });

  it("persists the agent output and returns the brief", async () => {
    mockedAccess.mockResolvedValue(authorizedSession);
    mockedAgent.mockResolvedValue({
      output: goodAgentOutput(),
      latencyMs: 42,
      logJson: "{}",
      aiLogId: null,
    });

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/screening/intake/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "explore",
          locale: "en",
          messages: [{ role: "user", content: "small caps only" }],
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      agent: { status: string };
      brief: { intent: string };
    };
    expect(body.agent.status).toBe("ok");
    expect(body.brief.intent).toBe("explore");
    expect(mockedInsert).toHaveBeenCalledTimes(1);
    expect(mockedMetric).toHaveBeenCalledWith("ok", "explore", 42);
  });

  it("returns the envelope on shape rejection so the UI can retry without a hard error", async () => {
    mockedAccess.mockResolvedValue(authorizedSession);
    mockedAgent.mockResolvedValue({
      output: goodAgentOutput({ status: "rejected_shape", assistantText: "Could not parse." }),
      latencyMs: 10,
      logJson: "{}",
      aiLogId: null,
    });

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/screening/intake/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "explore",
          locale: "en",
          messages: [{ role: "user", content: "hi" }],
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      agent: { status: string };
      assistantText: string;
    };
    expect(body.agent.status).toBe("rejected_shape");
    expect(body.assistantText).toContain("Could not parse");
    expect(mockedInsert).toHaveBeenCalledTimes(1);
    expect(mockedMetric).toHaveBeenCalledWith("rejected_shape", "explore", 10);
  });
});
