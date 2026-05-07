import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getTrefolioAdminEmailSet, isTrefolioAdminEmail } from "./admin-allowlist";

describe("admin-allowlist", () => {
  const origTrefolio = process.env.TREFOLIO_ADMIN_EMAILS;
  const origIdp = process.env.IDP_ADMIN_EMAILS;

  beforeEach(() => {
    delete process.env.TREFOLIO_ADMIN_EMAILS;
    delete process.env.IDP_ADMIN_EMAILS;
  });

  afterEach(() => {
    if (origTrefolio !== undefined) process.env.TREFOLIO_ADMIN_EMAILS = origTrefolio;
    else delete process.env.TREFOLIO_ADMIN_EMAILS;
    if (origIdp !== undefined) process.env.IDP_ADMIN_EMAILS = origIdp;
    else delete process.env.IDP_ADMIN_EMAILS;
  });

  it("uses TREFOLIO_ADMIN_EMAILS when set", () => {
    process.env.TREFOLIO_ADMIN_EMAILS = "A@ExAmPlE.com , other@test.dev";
    process.env.IDP_ADMIN_EMAILS = "idp@only.com";
    expect(isTrefolioAdminEmail("a@example.com")).toBe(true);
    expect(isTrefolioAdminEmail("other@test.dev")).toBe(true);
    expect(isTrefolioAdminEmail("idp@only.com")).toBe(false);
  });

  it("falls back to IDP_ADMIN_EMAILS when TREFOLIO_ADMIN_EMAILS is empty", () => {
    process.env.IDP_ADMIN_EMAILS = "ops@corp.eu";
    expect(getTrefolioAdminEmailSet()).toEqual(new Set(["ops@corp.eu"]));
    expect(isTrefolioAdminEmail("Ops@corp.eu")).toBe(true);
  });

  it("returns false for empty allowlists", () => {
    expect(isTrefolioAdminEmail("any@where")).toBe(false);
    expect(isTrefolioAdminEmail(null)).toBe(false);
  });
});
