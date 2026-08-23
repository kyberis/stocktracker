import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/feedback", () => ({
  listFeedbackPendingAckEmail: vi.fn(),
  listFeedbackReadyForAutoPipeline: vi.fn(),
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
  sendFeedbackAutoAckEmail: vi.fn(),
}));

vi.mock("@/lib/linear", () => ({
  isLinearConfigured: vi.fn(),
  createLinearFeedbackIssue: vi.fn(),
}));

import {
  applyFeedbackPipelineDbUpdate,
  listFeedbackPendingAckEmail,
  listFeedbackReadyForAutoPipeline,
  markFeedbackAckEmailSent,
} from "@/lib/db/feedback";
import { findUserById, getUserSettings } from "@/lib/db";
import { sendFeedbackAutoAckEmail } from "@/lib/email";
import { createLinearFeedbackIssue, isLinearConfigured } from "@/lib/linear";
import { runFeedbackPipelineWork } from "./feedback-pipeline";

describe("runFeedbackPipelineWork", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listFeedbackPendingAckEmail).mockResolvedValue([]);
    vi.mocked(listFeedbackReadyForAutoPipeline).mockResolvedValue([]);
    vi.mocked(getUserSettings).mockResolvedValue({ language: "en" } as never);
  });

  it("retries pending ack emails", async () => {
    vi.mocked(listFeedbackPendingAckEmail).mockResolvedValue([
      { id: "fb1", userId: "u1", subject: "Hello" } as never,
    ]);
    vi.mocked(findUserById).mockResolvedValue({ email: "a@b.com" } as never);
    vi.mocked(sendFeedbackAutoAckEmail).mockResolvedValue({ success: true } as never);
    vi.mocked(isLinearConfigured).mockReturnValue(false);

    const result = await runFeedbackPipelineWork();

    expect(markFeedbackAckEmailSent).toHaveBeenCalledWith("fb1");
    expect(result.ackRetries).toBe(1);
    expect(result.skippedNewPipeline).toBe(true);
  });

  it("creates a Linear issue for due feedback when configured", async () => {
    vi.mocked(isLinearConfigured).mockReturnValue(true);
    vi.mocked(listFeedbackReadyForAutoPipeline).mockResolvedValue([
      {
        id: "fb2",
        userId: "u2",
        subject: "Bug",
        message: "Broken",
        type: "bug",
      } as never,
    ]);
    vi.mocked(findUserById).mockResolvedValue({ email: "b@c.com" } as never);
    vi.mocked(createLinearFeedbackIssue).mockResolvedValue({
      issueId: "lin_1",
      identifier: "TRE-1",
      url: "https://linear.app/i/1",
    });
    vi.mocked(applyFeedbackPipelineDbUpdate).mockResolvedValue(true);
    vi.mocked(sendFeedbackAutoAckEmail).mockResolvedValue({ success: true } as never);

    const result = await runFeedbackPipelineWork();

    expect(createLinearFeedbackIssue).toHaveBeenCalledWith({
      feedbackId: "fb2",
      subject: "Bug",
      message: "Broken",
      type: "bug",
    });
    expect(result.pipelines).toBe(1);
    expect(result.skippedNewPipeline).toBe(false);
  });

  it("clears the ack queue when the user has no email", async () => {
    vi.mocked(listFeedbackPendingAckEmail).mockResolvedValue([
      { id: "fb3", userId: "u3", subject: "Hi" } as never,
    ]);
    vi.mocked(findUserById).mockResolvedValue({ email: "" } as never);
    vi.mocked(isLinearConfigured).mockReturnValue(false);

    const result = await runFeedbackPipelineWork();

    expect(markFeedbackAckEmailSent).toHaveBeenCalledWith("fb3");
    expect(sendFeedbackAutoAckEmail).not.toHaveBeenCalled();
    expect(result.ackRetries).toBe(0);
  });

  it("skips Linear rows that lose the claim race", async () => {
    vi.mocked(isLinearConfigured).mockReturnValue(true);
    vi.mocked(listFeedbackReadyForAutoPipeline).mockResolvedValue([
      {
        id: "fb4",
        userId: "u4",
        subject: "Race",
        message: "x",
        type: "feedback",
      } as never,
    ]);
    vi.mocked(findUserById).mockResolvedValue({ email: "d@e.com" } as never);
    vi.mocked(createLinearFeedbackIssue).mockResolvedValue({
      issueId: "lin_2",
      identifier: "TRE-2",
      url: "https://linear.app/i/2",
    });
    vi.mocked(applyFeedbackPipelineDbUpdate).mockResolvedValue(false);

    const result = await runFeedbackPipelineWork();

    expect(result.pipelines).toBe(0);
    expect(sendFeedbackAutoAckEmail).not.toHaveBeenCalled();
  });
});
