import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prodops", () => ({
  enqueueProdOpsIngestEvent: vi.fn(),
}));

describe("internal prodops-ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IDP_SERVICE_TOKEN = "idp-secret";
  });

  it("rejects unauthorized requests", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/internal/prodops-ingest", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("enqueues an IdP signup event", async () => {
    const { enqueueProdOpsIngestEvent } = await import("@/lib/prodops");
    vi.mocked(enqueueProdOpsIngestEvent).mockResolvedValue({ id: "evt_1", deduped: false });

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/internal/prodops-ingest", {
        method: "POST",
        headers: { authorization: "Bearer idp-secret" },
        body: JSON.stringify({
          eventType: "user_registered",
          userId: "sub_1",
          dedupeKey: "accounts:user_registered:sub_1",
          summary: "IdP signup · sub_1",
          adminUrl: "https://user.trefolio.com/admin/users/sub_1",
          metadata: { email: "a@example.com" },
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, id: "evt_1", deduped: false });
    expect(enqueueProdOpsIngestEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "user_registered",
        sourceApp: "accounts",
        userId: "sub_1",
      }),
    );
  });

  it("rejects digest without body", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/internal/prodops-ingest", {
        method: "POST",
        headers: { authorization: "Bearer idp-secret" },
        body: JSON.stringify({
          eventType: "ops_digest",
          userId: "idp",
          dedupeKey: "accounts:ops_digest:1",
          summary: "Daily ops digest",
          adminUrl: "https://user.trefolio.com/admin",
          metadata: {},
        }),
      }),
    );
    expect(response.status).toBe(400);
  });
});
