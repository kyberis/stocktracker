import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/cron-logging", () => ({
  verifyCronAuth: vi.fn().mockReturnValue(null),
  withCronLogging: (_name: string, fn: () => Promise<Record<string, unknown>>) => async () => {
    const result = await fn();
    return NextResponse.json(result);
  },
}));

vi.mock("@/lib/db/feedback", () => ({
  listFeedbackPendingAckEmail: vi.fn().mockResolvedValue([]),
  listFeedbackReadyForAutoPipeline: vi.fn().mockResolvedValue([]),
  applyFeedbackPipelineDbUpdate: vi.fn(),
  markFeedbackAckEmailSent: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
  getUserSettings: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  buildFeedbackAutoAckAdminReply: vi.fn(() => "Thanks"),
  feedbackMailLocaleFromAppLanguage: vi.fn(() => "en"),
  sendFeedbackAutoAckEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/linear", () => ({
  isLinearConfigured: vi.fn(() => false),
  createLinearFeedbackIssue: vi.fn(),
}));

describe("GET /api/cron/feedback-pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when cron secret mismatch", async () => {
    const { verifyCronAuth } = await import("@/lib/cron-logging");
    vi.mocked(verifyCronAuth).mockReturnValueOnce(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/feedback-pipeline");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns skipped when Linear is not configured", async () => {
    const { verifyCronAuth } = await import("@/lib/cron-logging");
    vi.mocked(verifyCronAuth).mockReturnValueOnce(null);

    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/feedback-pipeline", {
      headers: { Authorization: "Bearer test" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skippedNewPipeline).toBe(true);
  });
});
