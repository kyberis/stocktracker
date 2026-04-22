import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getPrivateChatRoom: vi.fn(),
  getPrivateChatMessages: vi.fn(),
  joinPrivateChatRoom: vi.fn(),
  getPrivateChatParticipants: vi.fn(),
  getParticipantMembership: vi.fn(),
  updateLastSeen: vi.fn(),
  getReactionsForRoom: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn(),
}));

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

import { requireSession } from "@/lib/auth/guards";
import {
  getPrivateChatRoom,
  getPrivateChatMessages,
  joinPrivateChatRoom,
  getPrivateChatParticipants,
  getParticipantMembership,
  updateLastSeen,
  getReactionsForRoom,
} from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const mockedRequireSession = vi.mocked(requireSession);
const mockedGetRoom = vi.mocked(getPrivateChatRoom);
const mockedGetMessages = vi.mocked(getPrivateChatMessages);
const mockedJoinRoom = vi.mocked(joinPrivateChatRoom);
const mockedGetParticipants = vi.mocked(getPrivateChatParticipants);
const mockedGetMembership = vi.mocked(getParticipantMembership);
const mockedUpdateLastSeen = vi.mocked(updateLastSeen);
const mockedGetReactions = vi.mocked(getReactionsForRoom);

function makeRequest(token: string, params?: Record<string, string>) {
  const search = params ? `?${new URLSearchParams(params).toString()}` : "";
  return new NextRequest(`http://localhost/api/chat/${token}${search}`);
}

function makeCtx(token: string) {
  return { params: Promise.resolve({ token }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetMessages.mockResolvedValue([] as never);
  mockedGetParticipants.mockResolvedValue([] as never);
  mockedGetReactions.mockResolvedValue({} as never);
});

describe("GET /api/chat/[token] — read receipt (updateLastSeen)", () => {
  it("returns 401 when not authenticated", async () => {
    const errorRes = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockedRequireSession.mockResolvedValue({ session: null, error: errorRes } as never);

    const { GET } = await import("./route");
    const res = await (GET as (req: NextRequest, ctx: unknown) => Promise<NextResponse>)(
      makeRequest("token1234"),
      makeCtx("token1234"),
    );
    expect(res.status).toBe(401);
    expect(mockedUpdateLastSeen).not.toHaveBeenCalled();
  });

  it("returns 404 for an invalid/short token", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1" },
      error: null,
    } as never);

    const { GET } = await import("./route");
    const res = await (GET as (req: NextRequest, ctx: unknown) => Promise<NextResponse>)(
      makeRequest("abc"),
      makeCtx("abc"),
    );
    expect(res.status).toBe(404);
    expect(mockedUpdateLastSeen).not.toHaveBeenCalled();
  });

  it("returns 404 when the room does not exist", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1" },
      error: null,
    } as never);
    mockedGetRoom.mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await (GET as (req: NextRequest, ctx: unknown) => Promise<NextResponse>)(
      makeRequest("token1234"),
      makeCtx("token1234"),
    );
    expect(res.status).toBe(404);
    expect(mockedUpdateLastSeen).not.toHaveBeenCalled();
  });

  it("does not update last seen for a pending participant", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1" },
      error: null,
    } as never);
    mockedGetRoom.mockResolvedValue({
      id: "r1",
      token: "token1234",
      kind: "direct",
    } as never);
    mockedGetMembership.mockResolvedValue("pending" as never);
    mockedGetParticipants.mockResolvedValue([
      {
        userId: "u2",
        membershipStatus: "active",
        displayName: "Other",
        avatarUrl: null,
      },
    ] as never);

    const { GET } = await import("./route");
    const res = await (GET as (req: NextRequest, ctx: unknown) => Promise<NextResponse>)(
      makeRequest("token1234"),
      makeCtx("token1234"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.membership).toBe("pending");
    expect(mockedUpdateLastSeen).not.toHaveBeenCalled();
  });

  it("updates last seen with the lastRead query param on success", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1" },
      error: null,
    } as never);
    mockedGetRoom.mockResolvedValue({
      id: "r1",
      token: "token1234",
      kind: "direct",
    } as never);
    mockedGetMembership.mockResolvedValue("active" as never);
    mockedGetParticipants.mockResolvedValue([
      { userId: "u1", membershipStatus: "active", clearedAt: null },
    ] as never);

    const { GET } = await import("./route");
    const res = await (GET as (req: NextRequest, ctx: unknown) => Promise<NextResponse>)(
      makeRequest("token1234", { lastRead: "2025-01-02T03:04:05Z" }),
      makeCtx("token1234"),
    );

    expect(res.status).toBe(200);
    expect(mockedUpdateLastSeen).toHaveBeenCalledWith(
      "token1234",
      "u1",
      "2025-01-02T03:04:05Z",
    );
  });

  it("auto-joins admin_link rooms and updates last seen", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1" },
      error: null,
    } as never);
    mockedGetRoom.mockResolvedValue({
      id: "r1",
      token: "token1234",
      kind: "admin_link",
    } as never);
    mockedJoinRoom.mockResolvedValue("joined" as never);
    mockedGetParticipants.mockResolvedValue([
      { userId: "u1", membershipStatus: "active", clearedAt: null },
    ] as never);

    const { GET } = await import("./route");
    const res = await (GET as (req: NextRequest, ctx: unknown) => Promise<NextResponse>)(
      makeRequest("token1234"),
      makeCtx("token1234"),
    );
    expect(res.status).toBe(200);
    expect(mockedJoinRoom).toHaveBeenCalledWith("token1234", "u1");
    expect(mockedUpdateLastSeen).toHaveBeenCalledWith("token1234", "u1", undefined);
  });

  it("returns 403 when an admin_link room is already full", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1" },
      error: null,
    } as never);
    mockedGetRoom.mockResolvedValue({
      id: "r1",
      token: "token1234",
      kind: "admin_link",
    } as never);
    mockedJoinRoom.mockResolvedValue("full" as never);

    const { GET } = await import("./route");
    const res = await (GET as (req: NextRequest, ctx: unknown) => Promise<NextResponse>)(
      makeRequest("token1234"),
      makeCtx("token1234"),
    );
    expect(res.status).toBe(403);
    expect(mockedUpdateLastSeen).not.toHaveBeenCalled();
  });
});
