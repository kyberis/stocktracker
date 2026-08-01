import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindUserIdByIdpSub = vi.fn();
const mockTrackEvent = vi.fn();
const mockDeleteUser = vi.fn();
const mockInc = vi.fn();

vi.mock("@/lib/db", () => ({
  findUserIdByIdpSub: (sub: string) => mockFindUserIdByIdpSub(sub),
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  deleteUser: (id: string) => mockDeleteUser(id),
}));

vi.mock("@/lib/metrics", () => ({
  authEventsTotal: { inc: (labels: unknown) => mockInc(labels) },
}));

import { POST } from "./route";

describe("POST /api/internal/account-deleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IDP_SERVICE_TOKEN = "service-secret";
    mockTrackEvent.mockResolvedValue(undefined);
    mockDeleteUser.mockResolvedValue(undefined);
  });

  it("returns 401 without bearer token", async () => {
    const res = await POST(
      new Request("http://localhost/api/internal/account-deleted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub: "u_1" }),
      }) as never,
    );
    expect(res.status).toBe(401);
  });

  it("returns ok without delete when no local user", async () => {
    mockFindUserIdByIdpSub.mockResolvedValue(null);
    const res = await POST(
      new Request("http://localhost/api/internal/account-deleted", {
        method: "POST",
        headers: {
          Authorization: "Bearer service-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sub: "u_missing" }),
      }) as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, deleted: false, tracked: false });
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("tracks account_deleted and deletes local user", async () => {
    mockFindUserIdByIdpSub.mockResolvedValue("local-user-1");
    const res = await POST(
      new Request("http://localhost/api/internal/account-deleted", {
        method: "POST",
        headers: {
          Authorization: "Bearer service-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sub: "u_abc" }),
      }) as never,
    );
    expect(res.status).toBe(200);
    expect(mockTrackEvent).toHaveBeenCalledWith("local-user-1", "account_deleted", {
      source: "idp",
    });
    expect(mockInc).toHaveBeenCalledWith({ event: "account_delete" });
    expect(mockDeleteUser).toHaveBeenCalledWith("local-user-1");
    const body = await res.json();
    expect(body).toEqual({ ok: true, deleted: true, tracked: true });
  });
});
