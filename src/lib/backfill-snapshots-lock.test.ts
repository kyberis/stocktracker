import { describe, expect, it } from "vitest";
import { acquireBackfillLock, releaseBackfillLock } from "./backfill-snapshots-lock";

describe("backfill-snapshots-lock", () => {
  it("allows first acquire and rejects concurrent acquire for same user", () => {
    const userId = "user-test-lock";
    releaseBackfillLock(userId);

    expect(acquireBackfillLock(userId)).toBe(true);
    expect(acquireBackfillLock(userId)).toBe(false);

    releaseBackfillLock(userId);
    expect(acquireBackfillLock(userId)).toBe(true);
    releaseBackfillLock(userId);
  });

  it("does not block different users", () => {
    releaseBackfillLock("user-a");
    releaseBackfillLock("user-b");

    expect(acquireBackfillLock("user-a")).toBe(true);
    expect(acquireBackfillLock("user-b")).toBe(true);

    releaseBackfillLock("user-a");
    releaseBackfillLock("user-b");
  });
});
