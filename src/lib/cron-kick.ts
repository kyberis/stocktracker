import { deferTask } from "@/lib/task-runner";

let prodopsInflight: Promise<void> | null = null;
let feedbackInflight: Promise<void> | null = null;

/**
 * Drain the ProdOps outbox after an enqueue. Coalesces concurrent kicks
 * in the same isolate so a burst of events becomes one dispatch.
 */
export function kickProdOpsDispatch(): void {
  deferTask(async () => {
    if (prodopsInflight) {
      await prodopsInflight;
      return;
    }
    prodopsInflight = import("@/lib/prodops")
      .then((m) => m.dispatchPendingProdOpsEvents())
      .then(() => undefined)
      .finally(() => {
        prodopsInflight = null;
      });
    await prodopsInflight;
  });
}

/** Run the feedback Linear/ack pipeline after new feedback is written. */
export function kickFeedbackPipeline(): void {
  deferTask(async () => {
    if (feedbackInflight) {
      await feedbackInflight;
      return;
    }
    feedbackInflight = import("@/lib/feedback-pipeline")
      .then((m) => m.runFeedbackPipelineWork())
      .then(() => undefined)
      .finally(() => {
        feedbackInflight = null;
      });
    await feedbackInflight;
  });
}
