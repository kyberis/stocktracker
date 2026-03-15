import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("./session", () => ({
  verifySessionToken: vi.fn(),
}));

import { cookies } from "next/headers";
import { verifySessionToken } from "./session";
import { getServerSession } from "./server-session";

const mockCookies = cookies as unknown as ReturnType<typeof vi.fn>;
const mockVerify = verifySessionToken as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getServerSession", () => {
  it("returns null when no session cookie exists", async () => {
    mockCookies.mockResolvedValue({ get: () => undefined });
    const result = await getServerSession();
    expect(result).toBeNull();
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("returns session when valid cookie exists", async () => {
    mockCookies.mockResolvedValue({ get: () => ({ value: "valid-token" }) });
    const mockSession = { userId: "u1", username: "test", role: "user", plan: "free" };
    mockVerify.mockResolvedValue(mockSession);

    const result = await getServerSession();
    expect(result).toEqual(mockSession);
    expect(mockVerify).toHaveBeenCalledWith("valid-token");
  });

  it("returns null when token verification fails", async () => {
    mockCookies.mockResolvedValue({ get: () => ({ value: "bad-token" }) });
    mockVerify.mockResolvedValue(null);

    const result = await getServerSession();
    expect(result).toBeNull();
  });
});
