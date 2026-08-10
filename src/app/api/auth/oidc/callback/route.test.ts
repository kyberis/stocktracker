import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  ensureDefaultPortfolio: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  findUserByReferralCode: vi.fn(),
  createUser: vi.fn(),
  createReferral: vi.fn(),
  acceptReferral: vi.fn(),
  trackEvent: vi.fn(),
  updateUserProfile: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  createSessionToken: vi.fn().mockResolvedValue("session-token"),
  getSessionCookieConfig: vi.fn().mockReturnValue({ name: "trefolio_session", value: "session-token" }),
}));

vi.mock("@/lib/auth/session-secret", () => ({
  ensureSessionSecret: vi.fn(),
}));

vi.mock("@/lib/auth/login-probe-log", () => ({
  authProbeLog: vi.fn(),
  authProbeWarn: vi.fn(),
  emailProbeHint: vi.fn(),
  subTail: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  authEventsTotal: { inc: vi.fn() },
}));

vi.mock("@/lib/idp/oidc", () => ({
  exchangeAuthorizationCode: vi.fn().mockResolvedValue({ id_token: "id-token" }),
  verifyIdToken: vi.fn(),
}));

vi.mock("@/lib/idp/entitlements", () => ({
  findLocalUserByIdpSub: vi.fn(),
  linkLocalUserToIdpSub: vi.fn(),
  syncEntitlementsForUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/idp/config", () => ({
  isIdpEnabled: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  getEmailLocale: vi.fn().mockReturnValue("en"),
}));

vi.mock("@/lib/http/request-public-origin", () => ({
  getRequestPublicOrigin: vi.fn().mockReturnValue("http://localhost"),
  isRequestPublicHttps: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/auth/admin-allowlist", () => ({
  ensureTrefolioAdminRoleForUser: vi.fn(),
}));

vi.mock("@/lib/prodops", () => ({
  enqueueProdOpsUserRegisteredEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/commerce-complimentary-pro", () => ({
  grantCommerceComplimentaryPro: vi.fn().mockResolvedValue({ granted: false, reason: "not_candidate" }),
}));

import {
  findUserByEmail,
  findUserById,
  findUserByReferralCode,
  createUser,
  createReferral,
  acceptReferral,
} from "@/lib/db";
import { exchangeAuthorizationCode, verifyIdToken } from "@/lib/idp/oidc";
import { findLocalUserByIdpSub } from "@/lib/idp/entitlements";
import { NextRequest } from "next/server";

const mockedFindUserByEmail = vi.mocked(findUserByEmail);
const mockedFindUserById = vi.mocked(findUserById);
const mockedFindUserByReferralCode = vi.mocked(findUserByReferralCode);
const mockedCreateUser = vi.mocked(createUser);
const mockedCreateReferral = vi.mocked(createReferral);
const mockedAcceptReferral = vi.mocked(acceptReferral);
const mockedVerifyIdToken = vi.mocked(verifyIdToken);
const mockedFindLocalUserByIdpSub = vi.mocked(findLocalUserByIdpSub);
const mockedExchangeAuthorizationCode = vi.mocked(exchangeAuthorizationCode);

const NEW_USER: Record<string, unknown> = {
  id: "new-user-1",
  username: "newuser",
  email: "newuser@example.com",
  role: "user",
  plan: "free",
  plan_expires_at: "",
  email_verified: 1,
  onboarding_completed: 0,
  password_hash: "",
};

function makeCallbackRequest(cookies: Record<string, string>) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  return new NextRequest(
    "http://localhost/api/auth/oidc/callback?code=auth-code&state=matching-state",
    { headers: cookieHeader ? { Cookie: cookieHeader } : {} },
  );
}

const BASE_COOKIES = {
  trefolio_oidc_state: "matching-state",
  trefolio_oidc_verifier: "verifier",
  trefolio_oidc_nonce: "nonce",
  trefolio_oidc_redirect: "/onboarding",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedExchangeAuthorizationCode.mockResolvedValue({ id_token: "id-token" } as never);
  // New-user resolution path: no existing local user by sub or email.
  mockedFindLocalUserByIdpSub.mockResolvedValue(null as never);
  mockedFindUserByEmail.mockResolvedValue(null as never);
  mockedCreateUser.mockResolvedValue(NEW_USER as never);
  mockedFindUserById.mockResolvedValue(NEW_USER as never);
});

function mockNewSignupClaims(overrides: Partial<Record<string, unknown>> = {}) {
  mockedVerifyIdToken.mockResolvedValue({
    sub: "idp-sub-123",
    email: "newuser@example.com",
    email_verified: true,
    name: "New User",
    entitlements: { trefolio_pro: false },
    ...overrides,
  } as never);
}

describe("GET /api/auth/oidc/callback — referral capture on new signup", () => {
  it("creates and immediately accepts a referral when a valid ref cookie and a verified email are present", async () => {
    mockNewSignupClaims();
    mockedFindUserByReferralCode.mockResolvedValue({ id: "referrer-1", email: "referrer@example.com" } as never);
    // findLocalUserByIdpSub is called again after creation to re-fetch the new user.
    mockedFindLocalUserByIdpSub.mockResolvedValueOnce(null as never).mockResolvedValue(NEW_USER as never);

    const { GET } = await import("./route");
    const req = makeCallbackRequest({ ...BASE_COOKIES, trefolio_oidc_ref: "REFCODE1" });
    await GET(req);

    expect(mockedFindUserByReferralCode).toHaveBeenCalledWith("REFCODE1");
    expect(mockedCreateReferral).toHaveBeenCalledWith("referrer-1", "new-user-1");
    expect(mockedAcceptReferral).toHaveBeenCalledWith("new-user-1");
  });

  it("creates the referral as pending (no accept) when the IdP reports the email as unverified", async () => {
    mockNewSignupClaims({ email_verified: false });
    mockedFindUserByReferralCode.mockResolvedValue({ id: "referrer-1", email: "referrer@example.com" } as never);
    mockedFindLocalUserByIdpSub.mockResolvedValueOnce(null as never).mockResolvedValue(NEW_USER as never);

    const { GET } = await import("./route");
    const req = makeCallbackRequest({ ...BASE_COOKIES, trefolio_oidc_ref: "REFCODE1" });
    await GET(req);

    expect(mockedCreateReferral).toHaveBeenCalledWith("referrer-1", "new-user-1");
    expect(mockedAcceptReferral).not.toHaveBeenCalled();
  });

  it("is a no-op when there is no referral cookie", async () => {
    mockNewSignupClaims();
    mockedFindLocalUserByIdpSub.mockResolvedValueOnce(null as never).mockResolvedValue(NEW_USER as never);

    const { GET } = await import("./route");
    const req = makeCallbackRequest({ ...BASE_COOKIES });
    await GET(req);

    expect(mockedFindUserByReferralCode).not.toHaveBeenCalled();
    expect(mockedCreateReferral).not.toHaveBeenCalled();
    expect(mockedAcceptReferral).not.toHaveBeenCalled();
  });

  it("does not record a self-referral when the referral code resolves to the new user themselves", async () => {
    mockNewSignupClaims();
    mockedFindUserByReferralCode.mockResolvedValue({ id: "new-user-1", email: "newuser@example.com" } as never);
    mockedFindLocalUserByIdpSub.mockResolvedValueOnce(null as never).mockResolvedValue(NEW_USER as never);

    const { GET } = await import("./route");
    const req = makeCallbackRequest({ ...BASE_COOKIES, trefolio_oidc_ref: "REFCODE1" });
    await GET(req);

    expect(mockedCreateReferral).not.toHaveBeenCalled();
  });

  it("ignores an unknown referral code (no matching referrer)", async () => {
    mockNewSignupClaims();
    mockedFindUserByReferralCode.mockResolvedValue(null as never);
    mockedFindLocalUserByIdpSub.mockResolvedValueOnce(null as never).mockResolvedValue(NEW_USER as never);

    const { GET } = await import("./route");
    const req = makeCallbackRequest({ ...BASE_COOKIES, trefolio_oidc_ref: "REFCODE1" });
    await GET(req);

    expect(mockedCreateReferral).not.toHaveBeenCalled();
  });
});
