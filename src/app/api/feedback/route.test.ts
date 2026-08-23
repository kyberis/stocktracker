import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  createFeedback: vi.fn(),
  getFeedbackByUser: vi.fn(),
  getAllFeedback: vi.fn(),
  getAllFeedbackPaginated: vi.fn(),
  replyToFeedback: vi.fn(),
}));

vi.mock("@/lib/api-response", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

vi.mock("@/lib/prodops", () => ({
  enqueueProdOpsFeedbackReceivedEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/cron-kick", () => ({
  kickFeedbackPipeline: vi.fn(),
}));

import { requireSession } from "@/lib/auth/guards";
import { createFeedback } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { enqueueProdOpsFeedbackReceivedEvent } from "@/lib/prodops";
import { kickFeedbackPipeline } from "@/lib/cron-kick";

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("kicks the feedback pipeline after a new submission", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      session: { userId: "u1", email: "u@example.com", plan: "free", username: "u" },
      error: null,
    } as never);
    vi.mocked(parseBody).mockResolvedValue({
      success: true,
      data: { subject: "Bug", message: "Broken", type: "bug" },
    } as never);
    vi.mocked(createFeedback).mockResolvedValue({
      id: "fb1",
      subject: "Bug",
      type: "bug",
    } as never);

    const { POST } = await import("./route");
    const res = await POST(new NextRequest("http://localhost/api/feedback", { method: "POST" }));

    expect(res.status).toBe(201);
    expect(enqueueProdOpsFeedbackReceivedEvent).toHaveBeenCalledWith(
      expect.objectContaining({ feedbackId: "fb1", userId: "u1" }),
    );
    expect(kickFeedbackPipeline).toHaveBeenCalledTimes(1);
  });
});
