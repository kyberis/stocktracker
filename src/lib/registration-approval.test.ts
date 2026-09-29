import { afterEach, describe, expect, it } from "vitest";

import {
  createRegistrationApprovalJwt,
  isRegistrationApproved,
  registrationApprovedAtForLegacyCreate,
  requiresRegistrationApproval,
  verifyRegistrationApprovalJwt,
} from "./registration-approval";

describe("trefolio registration approval", () => {
  afterEach(() => {
    delete process.env.REGISTRATION_REQUIRES_APPROVAL;
    delete process.env.IDP_BASE_URL;
  });

  it("defaults the gate on", () => {
    delete process.env.REGISTRATION_REQUIRES_APPROVAL;
    expect(requiresRegistrationApproval()).toBe(true);
  });

  it("treats empty timestamp as pending when the gate is on", () => {
    process.env.REGISTRATION_REQUIRES_APPROVAL = "true";
    expect(isRegistrationApproved({ registration_approved_at: "" })).toBe(false);
    expect(isRegistrationApproved({ registration_approved_at: "2026-01-01T00:00:00.000Z" })).toBe(
      true,
    );
  });

  it("leaves legacy creates pending when IdP is off", () => {
    process.env.REGISTRATION_REQUIRES_APPROVAL = "true";
    delete process.env.IDP_BASE_URL;
    delete process.env.IDP_CLIENT_ID;
    delete process.env.IDP_CLIENT_SECRET;
    delete process.env.E2E;
    expect(registrationApprovedAtForLegacyCreate()).toBe("");
  });

  it("round-trips the approval JWT", async () => {
    process.env.APP_SESSION_SECRET = "test-trefolio-approval-secret";
    const token = await createRegistrationApprovalJwt({
      userId: "u1",
      email: "a@example.com",
    });
    expect(await verifyRegistrationApprovalJwt(token)).toEqual({
      userId: "u1",
      email: "a@example.com",
    });
  });
});
