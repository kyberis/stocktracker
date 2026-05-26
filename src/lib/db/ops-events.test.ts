import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockExecute, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockClient = { execute: mockExecute };
  return { mockExecute, mockClient };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

describe("ops-events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing outbox event when dedupe key already exists", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{
        id: "evt_1",
        event_type: "user_registered",
        user_id: "user_1",
        dedupe_key: "user_registered:user_1",
        source_app: "trefolio",
        summary: "Existing",
        admin_url: "https://trefolio.com/admin/users/user_1",
        payload_json: "{}",
        status: "pending",
        attempts: 0,
        next_attempt_at: "2026-05-26 00:00:00",
        last_attempted_at: "",
        last_error: "",
        sent_at: "",
        created_at: "2026-05-26 00:00:00",
      }],
    });

    const { createProdOpsEvent } = await import("./ops-events");
    const event = await createProdOpsEvent({
      eventType: "user_registered",
      userId: "user_1",
      dedupeKey: "user_registered:user_1",
      summary: "New signup",
      adminUrl: "https://trefolio.com/admin/users/user_1",
      payload: { method: "credentials" },
    });

    expect(event.id).toBe("evt_1");
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("inserts a new outbox event when dedupe key is missing", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

    const { createProdOpsEvent } = await import("./ops-events");
    const event = await createProdOpsEvent({
      eventType: "feedback_received",
      userId: "user_2",
      dedupeKey: "feedback_received:fb_1",
      summary: "Feedback received",
      adminUrl: "https://trefolio.com/admin/feedback",
      payload: { feedbackId: "fb_1" },
    });

    expect(event.status).toBe("pending");
    expect(mockExecute).toHaveBeenNthCalledWith(2, {
      sql: expect.stringContaining("INSERT INTO ops_event_outbox"),
      args: expect.arrayContaining([
        "feedback_received",
        "user_2",
        "feedback_received:fb_1",
        "trefolio",
        "Feedback received",
        "https://trefolio.com/admin/feedback",
        JSON.stringify({ feedbackId: "fb_1" }),
      ]),
    });
  });

  it("lists ready events ordered by created_at", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [{
        id: "evt_ready",
        event_type: "trial_activated",
        user_id: "user_3",
        dedupe_key: "trial_activated:onboarding:user_3",
        source_app: "trefolio",
        summary: "Trial activated",
        admin_url: "https://trefolio.com/admin/users/user_3",
        payload_json: "{\"source\":\"onboarding\"}",
        status: "pending",
        attempts: 0,
        next_attempt_at: "2026-05-26 00:00:00",
        last_attempted_at: "",
        last_error: "",
        sent_at: "",
        created_at: "2026-05-26 00:00:00",
      }],
    });

    const { listProdOpsEventsReady } = await import("./ops-events");
    const events = await listProdOpsEventsReady(10);

    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("trial_activated");
    expect(mockExecute).toHaveBeenCalledWith({
      sql: expect.stringContaining("WHERE status = 'pending'"),
      args: [10],
    });
  });

  it("updates status helpers for sent, retry, and dropped rows", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

    const {
      markProdOpsEventSent,
      scheduleProdOpsEventRetry,
      markProdOpsEventDropped,
    } = await import("./ops-events");

    await markProdOpsEventSent("evt_sent");
    await scheduleProdOpsEventRetry("evt_retry", "network_error", "2026-05-26T01:00:00.000Z", true);
    await markProdOpsEventDropped("evt_drop", "no_matching_destinations");

    expect(mockExecute).toHaveBeenNthCalledWith(1, {
      sql: expect.stringContaining("SET status = 'sent'"),
      args: ["evt_sent"],
    });
    expect(mockExecute).toHaveBeenNthCalledWith(2, {
      sql: expect.stringContaining("SET status = ?"),
      args: ["dead", "network_error", "2026-05-26T01:00:00.000Z", "evt_retry"],
    });
    expect(mockExecute).toHaveBeenNthCalledWith(3, {
      sql: expect.stringContaining("SET status = 'dropped'"),
      args: ["no_matching_destinations", "evt_drop"],
    });
  });
});
