import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindUserIdByIdpSub = vi.fn();
const mockFindUserByEmail = vi.fn();
const mockLinkLocalUserToIdpSub = vi.fn();

vi.mock("@/lib/db", () => ({
  findUserIdByIdpSub: (...args: unknown[]) => mockFindUserIdByIdpSub(...args),
  findUserByEmail: (...args: unknown[]) => mockFindUserByEmail(...args),
}));

vi.mock("@/lib/idp/entitlements", () => ({
  linkLocalUserToIdpSub: (...args: unknown[]) => mockLinkLocalUserToIdpSub(...args),
}));

import { resolveClaraWarrenUser, trefolioPublicSignupUrl } from "./resolve-clara-warren-user";

describe("resolveClaraWarrenUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves by IdP sub first", async () => {
    mockFindUserIdByIdpSub.mockResolvedValue("u-sub");
    const id = await resolveClaraWarrenUser({ sub: "idp-1", email: "a@test.com" });
    expect(id).toBe("u-sub");
    expect(mockFindUserByEmail).not.toHaveBeenCalled();
  });

  it("falls back to email and backfills idp_sub when missing", async () => {
    mockFindUserIdByIdpSub.mockResolvedValue(null);
    mockFindUserByEmail.mockResolvedValue({ id: "u-email", idp_sub: "" });
    mockLinkLocalUserToIdpSub.mockResolvedValue(undefined);

    const id = await resolveClaraWarrenUser({ sub: "idp-1", email: "A@Test.com" });
    expect(id).toBe("u-email");
    expect(mockFindUserByEmail).toHaveBeenCalledWith("a@test.com");
    expect(mockLinkLocalUserToIdpSub).toHaveBeenCalledWith({
      localUserId: "u-email",
      idpSub: "idp-1",
    });
  });

  it("returns null when neither sub nor email match", async () => {
    mockFindUserIdByIdpSub.mockResolvedValue(null);
    mockFindUserByEmail.mockResolvedValue(null);
    await expect(resolveClaraWarrenUser({ sub: "missing", email: "x@test.com" })).resolves.toBeNull();
  });
});

describe("trefolioPublicSignupUrl", () => {
  it("defaults to production signup", () => {
    const prev = process.env.APP_BASE_URL;
    delete process.env.APP_BASE_URL;
    expect(trefolioPublicSignupUrl()).toBe("https://trefolio.com/signup");
    if (prev !== undefined) process.env.APP_BASE_URL = prev;
  });
});
