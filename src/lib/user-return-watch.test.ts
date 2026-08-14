import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/user-return-watches", () => ({
  listDueUserReturnWatches: vi.fn(),
  claimUserReturnWatch: vi.fn(),
  claimDueWatchForUser: vi.fn(),
}));

vi.mock("@/lib/prodops", () => ({
  enqueueProdOpsSupportUserReturnedEvent: vi.fn().mockResolvedValue(undefined),
}));

import { listDueUserReturnWatches, claimUserReturnWatch } from "@/lib/db/user-return-watches";
import { enqueueProdOpsSupportUserReturnedEvent } from "@/lib/prodops";
import { processDueUserReturnWatches } from "./user-return-watch";

describe("processDueUserReturnWatches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("claims and enqueues for each due watch", async () => {
    vi.mocked(listDueUserReturnWatches).mockResolvedValueOnce([
      {
        id: "w1",
        userId: "u1",
        reason: "holdings_restore_support_email",
        emailSentAt: "2026-08-14 23:00:00",
        notifiedAt: "",
        createdAt: "2026-08-14 23:00:00",
      },
    ]);
    vi.mocked(claimUserReturnWatch).mockResolvedValueOnce(true);

    const result = await processDueUserReturnWatches();
    expect(result).toEqual({ checked: 1, notified: 1 });
    expect(enqueueProdOpsSupportUserReturnedEvent).toHaveBeenCalledWith({
      userId: "u1",
      reason: "holdings_restore_support_email",
      emailSentAt: "2026-08-14 23:00:00",
    });
  });

  it("skips when claim loses the race", async () => {
    vi.mocked(listDueUserReturnWatches).mockResolvedValueOnce([
      {
        id: "w1",
        userId: "u1",
        reason: "holdings_restore_support_email",
        emailSentAt: "2026-08-14 23:00:00",
        notifiedAt: "",
        createdAt: "2026-08-14 23:00:00",
      },
    ]);
    vi.mocked(claimUserReturnWatch).mockResolvedValueOnce(false);

    const result = await processDueUserReturnWatches();
    expect(result).toEqual({ checked: 1, notified: 0 });
    expect(enqueueProdOpsSupportUserReturnedEvent).not.toHaveBeenCalled();
  });
});
