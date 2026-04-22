import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getPrivateChatRoom: vi.fn(),
  addPrivateChatMessage: vi.fn(),
  editPrivateChatMessage: vi.fn(),
  getParticipantMembership: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn(),
}));

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

vi.mock("@/lib/private-chat-audio", () => ({
  parseAndValidateAudioMessageContent: vi.fn(() => ({
    ok: true,
    content: "audio-content",
  })),
}));

import { requireSession } from "@/lib/auth/guards";
import {
  getPrivateChatRoom,
  addPrivateChatMessage,
  editPrivateChatMessage,
  getParticipantMembership,
} from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const mockedRequireSession = vi.mocked(requireSession);
const mockedGetRoom = vi.mocked(getPrivateChatRoom);
const mockedAddMessage = vi.mocked(addPrivateChatMessage);
const mockedEditMessage = vi.mocked(editPrivateChatMessage);
const mockedGetMembership = vi.mocked(getParticipantMembership);

function makeRequest(
  token: string,
  body: Record<string, unknown>,
  method: "POST" | "PATCH" = "POST",
) {
  return new NextRequest(`http://localhost/api/chat/${token}/messages`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockActiveSession() {
  mockedRequireSession.mockResolvedValue({
    session: { userId: "u1" },
    error: null,
  } as never);
  mockedGetRoom.mockResolvedValue({ id: "r1", token: "token1234" } as never);
  mockedGetMembership.mockResolvedValue("active" as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/chat/[token]/messages", () => {
  it("returns 401 when not authenticated", async () => {
    const errorRes = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockedRequireSession.mockResolvedValue({ session: null, error: errorRes } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(
      makeRequest("token1234", { type: "text", content: "hi" }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 for invalid token", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1" },
      error: null,
    } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(
      makeRequest("abc", { type: "text", content: "hi" }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when room does not exist", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1" },
      error: null,
    } as never);
    mockedGetRoom.mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(
      makeRequest("token1234", { type: "text", content: "hi" }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not an active participant", async () => {
    mockedRequireSession.mockResolvedValue({
      session: { userId: "u1" },
      error: null,
    } as never);
    mockedGetRoom.mockResolvedValue({ id: "r1", token: "token1234" } as never);
    mockedGetMembership.mockResolvedValue("pending" as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(
      makeRequest("token1234", { type: "text", content: "hi" }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid JSON", async () => {
    mockActiveSession();

    const req = new NextRequest("http://localhost/api/chat/token1234/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid message type", async () => {
    mockActiveSession();

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(
      makeRequest("token1234", { type: "bogus", content: "hi" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when content is empty", async () => {
    mockActiveSession();

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(
      makeRequest("token1234", { type: "text", content: "   " }),
    );
    expect(res.status).toBe(400);
  });

  it("creates a text message and returns 201", async () => {
    mockActiveSession();
    mockedAddMessage.mockResolvedValue({
      id: "m1",
      content: "hello",
      type: "text",
    } as never);

    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(
      makeRequest("token1234", { type: "text", content: "hello" }),
    );
    expect(res.status).toBe(201);
    expect(mockedAddMessage).toHaveBeenCalledWith(
      "token1234",
      "u1",
      "text",
      "hello",
      undefined,
      false,
    );
    const body = await res.json();
    expect(body.id).toBe("m1");
  });

  it("rejects images that exceed the size limit", async () => {
    mockActiveSession();

    const bigContent = "A".repeat(5 * 1024 * 1024);
    const { POST } = await import("./route");
    const res = await (POST as (req: NextRequest) => Promise<NextResponse>)(
      makeRequest("token1234", { type: "image", content: bigContent }),
    );
    expect(res.status).toBe(413);
  });

  it("passes through replyToId and persistent when provided", async () => {
    mockActiveSession();
    mockedAddMessage.mockResolvedValue({ id: "m2" } as never);

    const { POST } = await import("./route");
    await (POST as (req: NextRequest) => Promise<NextResponse>)(
      makeRequest("token1234", {
        type: "text",
        content: "hi",
        replyToId: "prev-msg",
        persistent: true,
      }),
    );

    expect(mockedAddMessage).toHaveBeenCalledWith(
      "token1234",
      "u1",
      "text",
      "hi",
      "prev-msg",
      true,
    );
  });
});

describe("PATCH /api/chat/[token]/messages", () => {
  it("returns 401 when not authenticated", async () => {
    const errorRes = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockedRequireSession.mockResolvedValue({ session: null, error: errorRes } as never);

    const { PATCH } = await import("./route");
    const res = await (PATCH as (req: NextRequest) => Promise<NextResponse>)(
      makeRequest("token1234", { messageId: "m1", content: "x" }, "PATCH"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when messageId is missing", async () => {
    mockActiveSession();

    const { PATCH } = await import("./route");
    const res = await (PATCH as (req: NextRequest) => Promise<NextResponse>)(
      makeRequest("token1234", { content: "new content" }, "PATCH"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when message cannot be edited", async () => {
    mockActiveSession();
    mockedEditMessage.mockResolvedValue(null);

    const { PATCH } = await import("./route");
    const res = await (PATCH as (req: NextRequest) => Promise<NextResponse>)(
      makeRequest("token1234", { messageId: "m1", content: "new" }, "PATCH"),
    );
    expect(res.status).toBe(404);
  });

  it("returns the updated message on success", async () => {
    mockActiveSession();
    mockedEditMessage.mockResolvedValue({ id: "m1", content: "edited" } as never);

    const { PATCH } = await import("./route");
    const res = await (PATCH as (req: NextRequest) => Promise<NextResponse>)(
      makeRequest("token1234", { messageId: "m1", content: "edited" }, "PATCH"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe("edited");
    expect(mockedEditMessage).toHaveBeenCalledWith("m1", "u1", "edited");
  });
});
