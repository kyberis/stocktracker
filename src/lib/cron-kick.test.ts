import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/task-runner", () => ({
  deferTask: (fn: () => Promise<void>) => {
    void fn();
  },
}));

vi.mock("@/lib/prodops", () => ({
  dispatchPendingProdOpsEvents: vi.fn().mockResolvedValue({ sent: 1 }),
}));

vi.mock("@/lib/feedback-pipeline", () => ({
  runFeedbackPipelineWork: vi.fn().mockResolvedValue({ pipelines: 1 }),
}));

import { dispatchPendingProdOpsEvents } from "@/lib/prodops";
import { runFeedbackPipelineWork } from "@/lib/feedback-pipeline";
import { kickFeedbackPipeline, kickProdOpsDispatch } from "./cron-kick";

describe("cron kicks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches ProdOps outbox work in the background", async () => {
    kickProdOpsDispatch();
    await vi.waitFor(() => {
      expect(dispatchPendingProdOpsEvents).toHaveBeenCalledTimes(1);
    });
  });

  it("runs the feedback pipeline in the background", async () => {
    kickFeedbackPipeline();
    await vi.waitFor(() => {
      expect(runFeedbackPipelineWork).toHaveBeenCalledTimes(1);
    });
  });

  it("coalesces overlapping ProdOps kicks onto one in-flight dispatch", async () => {
    let resolveDispatch: (() => void) | undefined;
    vi.mocked(dispatchPendingProdOpsEvents).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDispatch = () => resolve({ sent: 1 } as never);
        }),
    );

    kickProdOpsDispatch();
    kickProdOpsDispatch();
    await vi.waitFor(() => {
      expect(dispatchPendingProdOpsEvents).toHaveBeenCalledTimes(1);
    });
    resolveDispatch?.();
    await vi.waitFor(() => {
      expect(resolveDispatch).toBeDefined();
    });
  });
});
